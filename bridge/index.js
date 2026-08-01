const net = require('net');
const http = require('http');
const { Server } = require('socket.io');

const UNIX_SOCKET_PATH = '/tmp/xdp_firewall.sock';
const PORT = 3002;

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Client connected to WebSocket');

  socket.on('block_ip', (ip) => {
    console.log(`Blocking IP: ${ip}`);
    sendCommand(`BLOCK ${ip}`, socket);
  });

  socket.on('unblock_ip', (ip) => {
    console.log(`Unblocking IP: ${ip}`);
    sendCommand(`UNBLOCK ${ip}`, socket);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

function sendCommand(cmd, wsSocket) {
  const client = net.createConnection(UNIX_SOCKET_PATH);

  client.on('connect', () => {
    client.write(cmd);
  });

  client.on('data', (data) => {
    console.log(`Response from loader: ${data.toString()}`);
    wsSocket.emit('response', data.toString());
    client.end();
  });

  client.on('error', (err) => {
    console.error(`Error connecting to unix socket: ${err.message}`);
    wsSocket.emit('response', `Error: ${err.message}`);
  });
}

server.listen(PORT, () => {
  console.log(`Bridge listening on port ${PORT}`);
});
