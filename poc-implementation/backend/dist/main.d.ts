/**
 * Main Server Entry Point - Nen Platform POC

 *
 * Features:
 * - Consolidated server configuration
 * - Environment-based configuration
 * - Comprehensive error handling
 * - Health monitoring
 * - Graceful shutdown
 * - Production optimizations
 */
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
declare class NenPlatformServer {
    private app;
    private httpServer;
    private io;
    private logger;
    constructor();
    private setupLogger;
    private setupMiddleware;
    private setupRoutes;
    private setupWebSocket;
    private setupErrorHandling;
    start(): Promise<void>;
    private logServerStatus;
    private gracefulShutdown;
    getApp(): express.Application;
    getServer(): any;
    getIO(): SocketIOServer | undefined;
}
export default NenPlatformServer;
export { NenPlatformServer };
//# sourceMappingURL=main.d.ts.map