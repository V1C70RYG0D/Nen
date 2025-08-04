import { Request, Response } from 'express';
import { BaseController } from './BaseController';
export declare class GameController extends BaseController {
    private gameService;
    private aiService;
    constructor();
    getGames: (req: Request, res: Response, next: import("express").NextFunction) => void;
    createMatch: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getMatch: (req: Request, res: Response, next: import("express").NextFunction) => void;
    makeMove: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getPlayerMatches: (req: Request, res: Response, next: import("express").NextFunction) => void;
    surrenderMatch: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=GameController.d.ts.map