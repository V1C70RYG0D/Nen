"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.networkConditions = void 0;
exports.simulateNetworkConditions = simulateNetworkConditions;
exports.applyNetworkCondition = applyNetworkCondition;
const networkConditions = [
    { latency: 50, packetLoss: 0 },
    { latency: 200, packetLoss: 0.1 },
    { latency: 500, packetLoss: 0.3 },
];
exports.networkConditions = networkConditions;
function applyNetworkCondition(socket, condition) {
    socket.networkCondition = condition;
    socket.use((packet, next) => {
        const delay = Math.random() < socket.networkCondition.packetLoss ? Infinity : socket.networkCondition.latency;
        if (delay !== Infinity) {
            setTimeout(() => next(), delay);
        }
    });
}
// Simulate network conditions during tests
function simulateNetworkConditions(server, client) {
    const socket = server.sockets.sockets.values().next().value;
    if (socket) {
        networkConditions.forEach((condition) => {
            applyNetworkCondition(socket, condition);
            socket.emit('network-condition', condition);
            client.emit('network-condition', condition);
        });
    }
}
//# sourceMappingURL=networkSimulator.js.map