"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameController = void 0;
const BaseController_1 = require("./BaseController");
const GameService_1 = require("../services/GameService");
const AIServiceIntegration_1 = require("../services/AIServiceIntegration");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
class GameController extends BaseController_1.BaseController {
    gameService;
    aiService;
    constructor() {
        super();
        this.gameService = new GameService_1.GameService();
        this.aiService = new AIServiceIntegration_1.AIServiceIntegration();
    }
    getGames = this.asyncHandler(async (req, res) => {
        if (this.handleValidationErrors(req, res))
            return;
        try {
            const games = await this.gameService.getAvailableGames();
            logger_1.logger.info('Available games retrieved', { count: games.length });
            this.sendSuccess(res, games, 'Games retrieved successfully');
        }
        catch (error) {
            logger_1.logger.error('Error retrieving games:', error);
            this.sendError(res, 'Failed to retrieve available games', 500);
        }
    });
    createMatch = this.asyncHandler(async (req, res) => {
        if (this.handleValidationErrors(req, res))
            return;
        try {
            const { gameType, difficulty, betAmount, matchType, player1Id, player2Id } = req.body;
            if (!gameType || !matchType) {
                return this.sendError(res, 'Game type and match type are required', 400);
            }
            const matchData = {
                matchType,
                player1Id,
                player2Id,
                bettingPoolSol: betAmount || 0
            };
            const match = await this.gameService.createMatch(matchData);
            if (matchType === 'ai_vs_ai' || matchType === 'human_vs_ai') {
                await this.aiService.initializeAgentForMatch(match.id, difficulty || config_1.config.ai.defaultDifficulty);
            }
            logger_1.logger.info('Match created successfully', {
                matchId: match.id,
                matchType: match.matchType,
                bettingPool: match.bettingPoolSol
            });
            this.sendSuccess(res, match, 'Match created successfully');
        }
        catch (error) {
            logger_1.logger.error('Error creating match:', error);
            this.sendError(res, 'Failed to create match', 500);
        }
    });
    getMatch = this.asyncHandler(async (req, res) => {
        try {
            const { matchId } = req.params;
            if (!matchId) {
                return this.sendError(res, 'Match ID is required', 400);
            }
            const match = await this.gameService.getMatchById(matchId);
            if (!match) {
                return this.sendError(res, 'Match not found', 404);
            }
            logger_1.logger.info('Match retrieved', { matchId, status: match.status });
            this.sendSuccess(res, match, 'Match retrieved successfully');
        }
        catch (error) {
            logger_1.logger.error('Error retrieving match:', error);
            this.sendError(res, 'Failed to retrieve match', 500);
        }
    });
    makeMove = this.asyncHandler(async (req, res) => {
        if (this.handleValidationErrors(req, res))
            return;
        try {
            const { matchId } = req.params;
            const { move, playerId } = req.body;
            if (!matchId || !move || !playerId) {
                return this.sendError(res, 'Match ID, move, and player ID are required', 400);
            }
            const result = await this.gameService.executeMove(matchId, playerId, move);
            if (!result.valid) {
                logger_1.logger.warn('Invalid move attempted', { matchId, playerId, move });
                return this.sendError(res, result.error || 'Invalid move', 400);
            }
            if (result.nextPlayerType === 'ai' && result.nextPlayerId) {
                await this.aiService.requestAIMove(matchId, result.nextPlayerId);
            }
            logger_1.logger.info('Move executed successfully', {
                matchId,
                playerId,
                moveNumber: result.moveNumber,
                gameStatus: result.gameState?.status
            });
            this.sendSuccess(res, result, 'Move executed successfully');
        }
        catch (error) {
            logger_1.logger.error('Error executing move:', error);
            this.sendError(res, 'Failed to execute move', 500);
        }
    });
    getPlayerMatches = this.asyncHandler(async (req, res) => {
        try {
            const { playerId } = req.params;
            const { limit = config_1.config.api.defaultPageSize, offset = 0 } = req.query;
            if (!playerId) {
                return this.sendError(res, 'Player ID is required', 400);
            }
            const matches = await this.gameService.getPlayerMatches(playerId, parseInt(limit), parseInt(offset));
            logger_1.logger.info('Player matches retrieved', {
                playerId,
                count: matches.length
            });
            this.sendSuccess(res, matches, 'Player matches retrieved successfully');
        }
        catch (error) {
            logger_1.logger.error('Error retrieving player matches:', error);
            this.sendError(res, 'Failed to retrieve player matches', 500);
        }
    });
    surrenderMatch = this.asyncHandler(async (req, res) => {
        try {
            const { matchId } = req.params;
            const { playerId } = req.body;
            if (!matchId || !playerId) {
                return this.sendError(res, 'Match ID and player ID are required', 400);
            }
            const result = await this.gameService.surrenderMatch(matchId, playerId);
            logger_1.logger.info('Match surrendered', { matchId, playerId, winnerId: result.winnerId });
            this.sendSuccess(res, result, 'Match surrendered successfully');
        }
        catch (error) {
            logger_1.logger.error('Error surrendering match:', error);
            this.sendError(res, 'Failed to surrender match', 500);
        }
    });
}
exports.GameController = GameController;
//# sourceMappingURL=GameController.js.map