/**
 * Base Controller Class

 *
 * Provides common functionality for all controllers
 */
import { Request, Response, NextFunction } from 'express';
export declare abstract class BaseController {
    /**
     * Handle validation errors from express-validator
     */
    protected handleValidationErrors(req: Request, res: Response): boolean;
    /**
     * Send success response
     */
    protected sendSuccess(res: Response, data?: any, message?: string): void;
    /**
     * Send error response
     */
    protected sendError(res: Response, message: string, statusCode?: number, details?: any): void;
    /**
     * Async error handler wrapper
     */
    protected asyncHandler(fn: Function): (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=BaseController.d.ts.map