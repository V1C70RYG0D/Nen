import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
declare class EnhancedExpressApp {
    private app;
    private server;
    private io;
    private isShuttingDown;
    constructor();
    private initializeMiddleware;
    private initializeRoutes;
    private initializeWebSocketHandlers;
    private initializeEnhancedServices;
    private setupRealTimeEvents;
    private initializeErrorHandling;
    private gracefulShutdown;
    start(port?: number): Promise<void>;
    getApp(): express.Application;
    getIO(): SocketIOServer;
    getServer(): any;
}
export default EnhancedExpressApp;
//# sourceMappingURL=EnhancedExpressApp.d.ts.map