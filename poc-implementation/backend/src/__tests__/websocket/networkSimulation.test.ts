import { Server } from 'socket.io';
import { createServer } from 'http';
import { Socket } from 'socket.io-client';
const Client = require('socket.io-client');
import { simulateNetworkConditions } from '../../utils/networkSimulator';

describe('WebSocket Client Testing with Network Simulations', () => {
  let httpServer: any;
  let io: Server;
  let clientSocket: any;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);

    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  it('should handle varying network conditions', (done) => {
    simulateNetworkConditions(io, clientSocket);

clientSocket.on('network-condition', (condition: any) => {
      console.log(`Simulating network condition:`, condition);
    });

    setTimeout(() => {
      clientSocket.disconnect();
      done();
    }, 5000);
  });
});

