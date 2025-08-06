import { Server, Socket } from 'socket.io';
type NetworkCondition = {
    latency: number;
    packetLoss: number;
};
declare const networkConditions: NetworkCondition[];
type SocketWithNetworkCondition = Socket & {
    networkCondition?: NetworkCondition;
};
declare function applyNetworkCondition(socket: SocketWithNetworkCondition, condition: NetworkCondition): void;
declare function simulateNetworkConditions(server: Server, client: any): void;
export { simulateNetworkConditions, networkConditions, applyNetworkCondition, type NetworkCondition };
//# sourceMappingURL=networkSimulator.d.ts.map