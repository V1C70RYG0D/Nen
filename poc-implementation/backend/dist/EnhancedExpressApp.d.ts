/**
 * Enhanced Express App V2 - Final 5% Gap Closure
 * Complete integration of all enhanced services for 100% POC completion
 *
 * Enhancements:
 * - Enhanced AI Training Service V2 with weekly scheduling
 * - Advanced Load Testing Service for 1000+ concurrent games
 * - Enhanced Compliance Service V2 with fraud detection
 * - Comprehensive test coverage and production readiness
 */
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
declare class EnhancedExpressApp {
    private app;
    private server;
    private io;
    private isShuttingDown;
    constructor();
    /**
     * Initialize comprehensive middleware stack
     */
    private initializeMiddleware;
    /**
     * Initialize all API routes
     */
    private initializeRoutes;
    /**
     * Initialize WebSocket handlers for real-time functionality
     */
    private initializeWebSocketHandlers;
    /**
     * Initialize enhanced services
     */
    private initializeEnhancedServices;
    /**
     * Set up real-time event broadcasting
     */
    private setupRealTimeEvents;
    /**
     * Initialize comprehensive error handling
     */
    private initializeErrorHandling;
    /**
     * Graceful shutdown with enhanced cleanup
     */
    private gracefulShutdown;
    /**
     * Start the enhanced server
  
     */
    start(port?: number): Promise<void>;
    /**
     * Get Express app instance
     */
    getApp(): express.Application;
    /**
     * Get Socket.IO instance
     */
    getIO(): SocketIOServer;
    /**
     * Get HTTP server instance
     */
    getServer(): any;
}
export default EnhancedExpressApp;
//# sourceMappingURL=EnhancedExpressApp.d.ts.map