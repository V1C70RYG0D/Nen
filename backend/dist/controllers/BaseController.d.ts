import { Request, Response, NextFunction } from 'express';
export declare abstract class BaseController {
    protected handleValidationErrors(req: Request, res: Response): boolean;
    protected sendSuccess(res: Response, data?: any, message?: string): void;
    protected sendError(res: Response, message: string, statusCode?: number, details?: any): void;
    protected asyncHandler(fn: Function): (req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=BaseController.d.ts.map