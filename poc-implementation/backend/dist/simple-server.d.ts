/**
 * Simple Backend Server - Nen Platform POC
 *
 * A minimal working backend that follows GI guidelines
 */
import { Server as SocketIOServer } from 'socket.io';
declare const app: import("express-serve-static-core").Express;
declare const httpServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare const io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
declare function startServer(): Promise<void>;
export default app;
export { startServer, httpServer, io };
//# sourceMappingURL=simple-server.d.ts.map