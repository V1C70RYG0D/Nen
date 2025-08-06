/**
 * Game Controller

 *
 * Handles all game-related HTTP requests with real database operations
 */
import { Request, Response } from 'express';
import { BaseController } from './BaseController';
export declare class GameController extends BaseController {
    private gameService;
    private aiService;
    constructor();
    /**
     * Get available games with real configuration
     * Following GI #2: Real implementation using environment configuration
     */
    getGames: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Create new game match with real database persistence
     * Following GI #2: Real implementation with actual database operations
     */
    createMatch: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Get match details from real database
     * Following GI #2: Real implementation with database queries
     */
    getMatch: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Make a move in the game with real validation and state updates
     * Following GI #2: Real implementation with move validation and database updates
     */
    makeMove: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Get match history for a player
     * Following GI #2: Real implementation with database queries
     */
    getPlayerMatches: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Surrender/forfeit a match
     * Following GI #2: Real implementation with game state updates
     */
    surrenderMatch: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
//# sourceMappingURL=GameController.d.ts.map