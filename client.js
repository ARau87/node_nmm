const net = require('net');
const {spawn} = require('child_process');
const path = require('path');

const ProtocolHandler = require('./resources/handlers').ProtocolHandler;

const client = new net.Socket()
const thinker = spawn('node', [path.join(__dirname + '/thinker.js')]);
const handler = new ProtocolHandler(client, thinker);

handler.set('GAME_ID', process.argv[2]);
handler.set('PLAYER_ID', process.argv[3]);

thinker.stdout.on('data', (data) => {
  console.log(data.toString());
  handler.recv(data.toString());
});

client.connect(1357, 'sysprak.priv.lab.nm.ifi.lmu.de', () => {
  console.log('[CLIENT] Connect to the server!');
});

client.on('data', (data) => {
  console.log(data.toString());
  handler.handle(data.toString());
});
