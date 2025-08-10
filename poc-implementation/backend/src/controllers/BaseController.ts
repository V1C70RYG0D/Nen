/**
 * Base Controller Class

 *
 * Provides common functionality for all controllers
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export abstract class BaseController {
  /**
   * Handle validation errors from express-validator
   */
  protected handleValidationErrors(req: Request, res: Response): boolean {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
      return true;
    }
    return false;
  }

  /**
   * Send success response
   */
  protected sendSuccess(res: Response, data?: any, message?: string): void {
    res.json({
      success: true,
      message: message || 'Operation successful',
      data
    });
  }

  /**
   * Send error response
   */
  protected sendError(res: Response, message: string, statusCode: number = 500, details?: any): void {
    res.status(statusCode).json({
      success: false,
      message,
      details
    });
  }

  /**
   * Async error handler wrapper
   */
  protected asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}
