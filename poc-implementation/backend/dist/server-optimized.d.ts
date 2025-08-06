/**
 * Optimized Production Server - Final 5% Gap Closure
 * Complete server implementation with all performance optimizations and enhancements
 * Following GI.md guidelines for production-ready, launch-grade quality
 */
import { Server as SocketIOServer } from 'socket.io';
import winston from 'winston';
declare const logger: winston.Logger;
declare const app: import("express-serve-static-core").Express;
declare const httpServer: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
declare const io: SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export { app, httpServer, io, logger };
export default app;
//# sourceMappingURL=server-optimized.d.ts.map