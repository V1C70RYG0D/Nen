import { Server as SocketIOServer } from 'socket.io';
declare const router: import("express-serve-static-core").Router;
declare class WebSocketManager {
    private io;
    private connections;
    initialize(io: SocketIOServer): void;
    private setupEventHandlers;
    broadcast(event: string, data: any, room?: string): void;
    getConnectionCount(): number;
    getConnections(): any[];
    getRoomCount(room: string): number;
}
export declare const websocketManager: WebSocketManager;
export default router;
//# sourceMappingURL=websocket.d.ts.map