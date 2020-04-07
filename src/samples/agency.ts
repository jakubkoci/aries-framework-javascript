import express, { Express } from 'express';
import socketio, { Socket } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import config from './config';
import logger from '../lib/logger';
import { Agent, InboundTransporter, OutboundTransporter, encodeInvitationToUrl } from '../lib';
import { OutboundPackage } from '../lib/types';
import indy from 'indy-sdk';

const PORT = config.port;

class HttpInboundTransporter implements InboundTransporter {
  app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  start(agent: Agent) {
    this.app.post('/msg', async (req, res) => {
      const message = req.body;
      const packedMessage = JSON.parse(message);
      await agent.receiveMessage(packedMessage);
      res.status(200).end();
    });
  }
}

class WebSocketInboundTransporter implements InboundTransporter {
  app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  start(agent: Agent) {
    const http = require('http').Server(this.app);
    const io = socketio(http);

    io.on('connection', socket => {
      logger.log('a user connected - inbound');

      socket.on('message', (from, msg) => {
        logger.log('I received a private message by ', from, ' saying ', msg);
      });

      socket.on('disconnect', () => {
        logger.log('user disconnected');
      });
    });

    this.app.post('/msg', async (req, res) => {
      const message = req.body;
      const packedMessage = JSON.parse(message);
      await agent.receiveMessage(packedMessage);
      res.status(200).end();
    });

    http.listen(PORT, async () => {
      // await agent.init();
      // this.start(agent);
      logger.log(`Application started on port ${PORT}`);
    });
  }
}

class WebSocketOutboundTransporter implements OutboundTransporter {
  socket: Socket | undefined;
  constructor(app: Express) {
    const http = require('http').Server(app);
    const io = socketio(http);

    io.on('connection', socket => {
      logger.log('a user connected - outbound');

      this.socket = socket;

      socket.on('message', (from, msg) => {
        logger.log('I received a private message by ', from, ' saying ', msg);
      });

      socket.on('disconnect', () => {
        logger.log('user disconnected');
      });
    });
  }

  async sendMessage(outboundPackage: OutboundPackage) {
    if (this.socket) {
      this.socket.emit('message', { data: 'emit from server' });
    }
  }
}

class StorageOutboundTransporter implements OutboundTransporter {
  messages: { [key: string]: any } = {};

  async sendMessage(outboundPackage: OutboundPackage) {
    const { connection, payload } = outboundPackage;

    if (!connection) {
      throw new Error(`Missing connection. I don't know how and where to send the message.`);
    }

    if (!connection.theirKey) {
      throw new Error('Trying to save message without theirKey!');
    }

    if (!this.messages[connection.theirKey]) {
      this.messages[connection.theirKey] = [];
    }

    logger.logJson('Storing message', { connection, payload });

    this.messages[connection.theirKey].push(payload);
  }

  takeFirstMessage(verkey: Verkey) {
    if (this.messages[verkey]) {
      return this.messages[verkey].shift();
    }
    return null;
  }
}

const app = express();

app.use(cors());
app.use(bodyParser.text());
app.set('json spaces', 2);

const messageSender = new StorageOutboundTransporter();
const messageReceiver = new WebSocketInboundTransporter(app);
const agent = new Agent(config, messageReceiver, messageSender, indy);

app.get('/', async (req, res) => {
  const agentDid = agent.getPublicDid();
  res.send(agentDid);
});

// Create new invitation as inviter to invitee
app.get('/invitation', async (req, res) => {
  const connection = await agent.createConnection();
  const { invitation } = connection;

  if (!invitation) {
    throw new Error('There is no invitation in newly created connection!');
  }

  const invitationUrl = encodeInvitationToUrl(invitation);
  res.send(invitationUrl);
});

app.get('/api/connections/:verkey/message', async (req, res) => {
  const verkey = req.params.verkey;
  const message = messageSender.takeFirstMessage(verkey);
  res.send(message);
});

app.get('/api/connections/:verkey', async (req, res) => {
  // TODO This endpoint is for testing purpose only. Return agency connection by their verkey.
  const verkey = req.params.verkey;
  const connection = agent.findConnectionByTheirKey(verkey);
  res.send(connection);
});

app.get('/api/connections', async (req, res) => {
  // TODO This endpoint is for testing purpose only. Return agency connection by their verkey.
  const connections = agent.getConnections();
  res.json(connections);
});

app.get('/api/routes', async (req, res) => {
  // TODO This endpoint is for testing purpose only. Return agency connection by their verkey.
  const routes = agent.getRoutes();
  res.send(routes);
});

app.get('/api/messages', async (req, res) => {
  // TODO This endpoint is for testing purpose only.
  res.send(messageSender.messages);
});

// app.listen(PORT, async () => {
//   await agent.init();
//   messageReceiver.start(agent);
//   logger.log(`Application started on port ${PORT}`);
// });

agent.init();
