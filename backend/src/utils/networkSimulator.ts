import { Server, Socket } from 'socket.io';
import { createServer } from 'http';

// Network condition simulation for testing
type NetworkCondition = {
  latency: number;
  packetLoss: number;
};

const networkConditions: NetworkCondition[] = [
  { latency: 50, packetLoss: 0 },
  { latency: 200, packetLoss: 0.1 },
  { latency: 500, packetLoss: 0.3 },
];

// Apply network conditions to a socket
type SocketWithNetworkCondition = Socket & { networkCondition?: NetworkCondition };

function applyNetworkCondition(socket: SocketWithNetworkCondition, condition: NetworkCondition) {
  socket.networkCondition = condition;

  socket.use((packet, next) => {
    const delay = Math.random() < socket.networkCondition!.packetLoss ? Infinity : socket.networkCondition!.latency;

    if (delay !== Infinity) {
      setTimeout(() => next(), delay);
    }
  });
}

// Simulate network conditions during tests
function simulateNetworkConditions(server: Server, client: any) {
  const socket = server.sockets.sockets.values().next().value as SocketWithNetworkCondition;

  if (socket) {
    networkConditions.forEach((condition) => {
      applyNetworkCondition(socket, condition);

      socket.emit('network-condition', condition);
      client.emit('network-condition', condition);
    });
  }
}

// Export for testing
export {
  simulateNetworkConditions,
  networkConditions,
  applyNetworkCondition,
  type NetworkCondition
};
