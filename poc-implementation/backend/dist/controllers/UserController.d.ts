/**
 * User Controller

 *
 * Handles all user-related HTTP requests
 */
import { Request, Response } from 'express';
import { BaseController } from './BaseController';
export declare class UserController extends BaseController {
    /**
     * Get user profile
     */
    getProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Update user profile
     */
    updateProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Get user statistics
     */
    getStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Get user's match history
     */
    getMatchHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Create a new user
     */
    createUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Delete user account
     */
    deleteUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=UserController.d.ts.map