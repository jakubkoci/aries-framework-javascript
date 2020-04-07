/* eslint-disable */
const io = require('socket.io-client');

console.log('io', io)

const socket = io.connect('http://localhost:3001');

socket.on('connect', () => {
  console.log('client connected');
});

setInterval(() => {
  console.log('emit')
  socket.emit('message', { data: 'emit from client' });
}, 1000);
