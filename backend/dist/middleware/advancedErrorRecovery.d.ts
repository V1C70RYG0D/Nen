import { Request, Response, NextFunction } from 'express';
interface ErrorContext {
    requestId: string;
    timestamp: Date;
    method: string;
    url: string;
    userAgent?: string;
    ip?: string;
    userId?: string;
    stackTrace?: string;
    recovery?: {
        attempts: number;
        successful: boolean;
        strategy: string;
        duration: number;
    };
}
export declare class AdvancedErrorRecovery {
    private static instance;
    private strategies;
    private metrics;
    private circuitBreakers;
    static getInstance(): AdvancedErrorRecovery;
    attemptRecovery(error: Error, context: ErrorContext): Promise<{
        recovered: boolean;
        data?: any;
        strategy?: string;
    }>;
    private isCircuitOpen;
    private recordSuccess;
    private recordFailure;
    getHealthStatus(): any;
}
export declare const enhancedErrorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createError: (message: string, statusCode?: number) => Error;
export declare const setupGlobalErrorHandlers: () => void;
export default enhancedErrorHandler;
//# sourceMappingURL=advancedErrorRecovery.d.ts.map