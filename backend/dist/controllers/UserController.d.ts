import { Request, Response } from 'express';
import { BaseController } from './BaseController';
export declare class UserController extends BaseController {
    getProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateProfile: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getMatchHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
    createUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=UserController.d.ts.map