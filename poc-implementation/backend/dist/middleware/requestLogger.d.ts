/**
 * Request Logger Middleware

 */
import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            correlationId?: string;
            startTime?: number;
        }
    }
}
/**
 * Request logger middleware
 */
export declare function requestLogger(req: Request, res: Response, next: NextFunction): void;
/**
 * Error logger middleware
 */
export declare function errorLogger(error: any, req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=requestLogger.d.ts.map