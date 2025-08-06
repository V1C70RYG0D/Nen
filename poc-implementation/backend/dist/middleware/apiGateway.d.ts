/**
 * API Gateway Middleware
 */
import { Request, Response, NextFunction } from 'express';
export declare const createRateLimiter: (windowMs?: number, max?: number) => import("express-rate-limit").RateLimitRequestHandler;
export declare const createSlowDown: (windowMs?: number, delayAfter?: number) => import("express-rate-limit").RateLimitRequestHandler;
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const apiVersioning: (req: Request, res: Response, next: NextFunction) => void;
export declare const requestValidation: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const corsMiddleware: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const responseTimeTracking: (req: Request, res: Response, next: NextFunction) => void;
export declare const requestId: (req: Request, res: Response, next: NextFunction) => void;
export declare const apiGateway: ((req: Request, res: Response, next: NextFunction) => void)[];
export default apiGateway;
//# sourceMappingURL=apiGateway.d.ts.map