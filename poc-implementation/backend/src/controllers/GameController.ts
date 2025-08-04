/**
 * Game Controller

 *
 * Handles all game-related HTTP requests with real database operations
 */

import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { GameService, MatchData } from '../services/GameService';
import { AIServiceIntegration } from '../services/AIServiceIntegration';
import { logger } from '../utils/logger';
import { config } from '../config';

export class GameController extends BaseController {
  private gameService: GameService;
  private aiService: AIServiceIntegration;

  constructor() {
    super();
    this.gameService = new GameService();
    this.aiService = new AIServiceIntegration();
  }

  /**
   * Get available games with real configuration
   * Following GI #2: Real implementation using environment configuration
   */
  public getGames = this.asyncHandler(async (req: Request, res: Response) => {
    if (this.handleValidationErrors(req, res)) return;

    try {
      const games = await this.gameService.getAvailableGames();
      logger.info('Available games retrieved', { count: games.length });
      this.sendSuccess(res, games, 'Games retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving games:', error);
      this.sendError(res, 'Failed to retrieve available games', 500);
    }
  });

  /**
   * Create new game match with real database persistence
   * Following GI #2: Real implementation with actual database operations
   */
  public createMatch = this.asyncHandler(async (req: Request, res: Response) => {
    if (this.handleValidationErrors(req, res)) return;

    try {
      const { gameType, difficulty, betAmount, matchType, player1Id, player2Id } = req.body;

      // Validate required fields
      if (!gameType || !matchType) {
        return this.sendError(res, 'Game type and match type are required', 400);
      }

      const matchData: Partial<MatchData> = {
        matchType,
        player1Id,
        player2Id,
        bettingPoolSol: betAmount || 0
      };

      // Create match using real game service
      const match = await this.gameService.createMatch(matchData);

      // Initialize AI agents if needed
      if (matchType === 'ai_vs_ai' || matchType === 'human_vs_ai') {
        await this.aiService.initializeAgentForMatch(match.id, difficulty || config.ai.defaultDifficulty);
      }

      logger.info('Match created successfully', {
        matchId: match.id,
        matchType: match.matchType,
        bettingPool: match.bettingPoolSol
      });

      this.sendSuccess(res, match, 'Match created successfully');
    } catch (error) {
      logger.error('Error creating match:', error);
      this.sendError(res, 'Failed to create match', 500);
    }
  });

  /**
   * Get match details from real database
   * Following GI #2: Real implementation with database queries
   */
  public getMatch = this.asyncHandler(async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;

      if (!matchId) {
        return this.sendError(res, 'Match ID is required', 400);
      }

      const match = await this.gameService.getMatchById(matchId);

      if (!match) {
        return this.sendError(res, 'Match not found', 404);
      }

      logger.info('Match retrieved', { matchId, status: match.status });
      this.sendSuccess(res, match, 'Match retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving match:', error);
      this.sendError(res, 'Failed to retrieve match', 500);
    }
  });

  /**
   * Make a move in the game with real validation and state updates
   * Following GI #2: Real implementation with move validation and database updates
   */
  public makeMove = this.asyncHandler(async (req: Request, res: Response) => {
    if (this.handleValidationErrors(req, res)) return;

    try {
      const { matchId } = req.params;
      const { move, playerId } = req.body;

      if (!matchId || !move || !playerId) {
        return this.sendError(res, 'Match ID, move, and player ID are required', 400);
      }

      // Validate and execute move using real game logic
      const result = await this.gameService.executeMove(matchId, playerId, move);

      if (!result.valid) {
        logger.warn('Invalid move attempted', { matchId, playerId, move });
        return this.sendError(res, result.error || 'Invalid move', 400);
      }

      // Trigger AI response if needed
      if (result.nextPlayerType === 'ai' && result.nextPlayerId) {
        await this.aiService.requestAIMove(matchId, result.nextPlayerId);
      }

      logger.info('Move executed successfully', {
        matchId,
        playerId,
        moveNumber: result.moveNumber,
        gameStatus: result.gameState?.status
      });

      this.sendSuccess(res, result, 'Move executed successfully');
    } catch (error) {
      logger.error('Error executing move:', error);
      this.sendError(res, 'Failed to execute move', 500);
    }
  });

  /**
   * Get match history for a player
   * Following GI #2: Real implementation with database queries
   */
  public getPlayerMatches = this.asyncHandler(async (req: Request, res: Response) => {
    try {
      const { playerId } = req.params;
      const { limit = config.api.defaultPageSize, offset = 0 } = req.query;

      if (!playerId) {
        return this.sendError(res, 'Player ID is required', 400);
      }

      const matches = await this.gameService.getPlayerMatches(
        playerId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      logger.info('Player matches retrieved', {
        playerId,
        count: matches.length
      });

      this.sendSuccess(res, matches, 'Player matches retrieved successfully');
    } catch (error) {
      logger.error('Error retrieving player matches:', error);
      this.sendError(res, 'Failed to retrieve player matches', 500);
    }
  });

  /**
   * Surrender/forfeit a match
   * Following GI #2: Real implementation with game state updates
   */
  public surrenderMatch = this.asyncHandler(async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const { playerId } = req.body;

      if (!matchId || !playerId) {
        return this.sendError(res, 'Match ID and player ID are required', 400);
      }

      const result = await this.gameService.surrenderMatch(matchId, playerId);

      logger.info('Match surrendered', { matchId, playerId, winnerId: result.winnerId });
      this.sendSuccess(res, result, 'Match surrendered successfully');
    } catch (error) {
      logger.error('Error surrendering match:', error);
      this.sendError(res, 'Failed to surrender match', 500);
    }
  });
}
