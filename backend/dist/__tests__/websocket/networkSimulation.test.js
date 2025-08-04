"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const Client = require('socket.io-client');
const networkSimulator_1 = require("../../utils/networkSimulator");
describe('WebSocket Client Testing with Network Simulations', () => {
    let httpServer;
    let io;
    let clientSocket;
    beforeAll((done) => {
        httpServer = (0, http_1.createServer)();
        io = new socket_io_1.Server(httpServer);
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
        (0, networkSimulator_1.simulateNetworkConditions)(io, clientSocket);
        clientSocket.on('network-condition', (condition) => {
            console.log(`Simulating network condition:`, condition);
        });
        setTimeout(() => {
            clientSocket.disconnect();
            done();
        }, 5000);
    });
});
//# sourceMappingURL=networkSimulation.test.js.map