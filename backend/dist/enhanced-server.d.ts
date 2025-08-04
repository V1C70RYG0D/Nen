import express from 'express';
declare class EnhancedNenServer {
    private app;
    private port;
    constructor(port?: number);
    private initializeMiddleware;
    private initializeRoutes;
    private initializeErrorHandling;
    start(): Promise<void>;
    getApp(): express.Application;
}
export default EnhancedNenServer;
//# sourceMappingURL=enhanced-server.d.ts.map