import { OutboundMessage, OutboundPackage } from '../types';
import { OutboundTransporter } from '../transport/OutboundTransporter';
import { EnvelopeService } from './EnvelopeService';
import { ReturnRouteTypes } from '../decorators/transport/TransportDecorator';
import { AgentMessage } from './AgentMessage';
import { Constructor } from '../utils/mixins';
import { InboundMessageContext } from './models/InboundMessageContext';
import { JsonTransformer } from '../utils/JsonTransformer';
import { HttpTransport, TransportService } from './TransportService';

class MessageSender {
  private envelopeService: EnvelopeService;
  private transportService: TransportService;
  private outboundTransporter: OutboundTransporter;

  public constructor(
    envelopeService: EnvelopeService,
    transportService: TransportService,
    outboundTransporter: OutboundTransporter
  ) {
    this.envelopeService = envelopeService;
    this.transportService = transportService;
    this.outboundTransporter = outboundTransporter;
  }

  public async packMessage(outboundMessage: OutboundMessage): Promise<OutboundPackage> {
    return this.envelopeService.packMessage(outboundMessage);
  }

  public async sendMessage(outboundMessage: OutboundMessage): Promise<void> {
    const outboundPackage = await this.envelopeService.packMessage(outboundMessage);
    const transport = this.transportService.getTransport(outboundMessage.connection.id);
    if (transport) {
      outboundPackage.transport = transport;
    } else {
      outboundPackage.transport = new HttpTransport(outboundMessage.endpoint);
    }
    await this.outboundTransporter.sendMessage(outboundPackage, false);
  }

  public async sendMessageWithReturnRoute(outboundMessage: OutboundMessage): Promise<void> {
    outboundMessage.payload.setReturnRouting(ReturnRouteTypes.all);
    const outboundPackage = await this.envelopeService.packMessage(outboundMessage);
    const transport = this.transportService.getTransport(outboundMessage.connection.id);
    if (transport) {
      outboundPackage.transport = transport;
    } else {
      outboundPackage.transport = new HttpTransport(outboundMessage.endpoint);
    }
    await this.outboundTransporter.sendMessage(outboundPackage, true);
  }

  public async sendAndReceiveMessage<T extends AgentMessage>(
    outboundMessage: OutboundMessage,
    ReceivedMessageClass: Constructor<T>
  ): Promise<InboundMessageContext<T>> {
    outboundMessage.payload.setReturnRouting(ReturnRouteTypes.all);

    const outboundPackage = await this.envelopeService.packMessage(outboundMessage);
    const transport = this.transportService.getTransport(outboundMessage.connection.id);
    if (transport) {
      outboundPackage.transport = transport;
    } else {
      outboundPackage.transport = new HttpTransport(outboundMessage.endpoint);
    }
    const inboundPackedMessage = await this.outboundTransporter.sendAndReceiveMessage(outboundPackage);
    const inboundUnpackedMessage = await this.envelopeService.unpackMessage(inboundPackedMessage);

    const message = JsonTransformer.fromJSON(inboundUnpackedMessage.message, ReceivedMessageClass);

    const messageContext = new InboundMessageContext(message, {
      connection: outboundMessage.connection,
      recipientVerkey: inboundUnpackedMessage.recipient_verkey,
      senderVerkey: inboundUnpackedMessage.sender_verkey,
    });

    return messageContext;
  }
}

export { MessageSender };
