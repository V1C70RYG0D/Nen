"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Match routes for creating and managing matches
const express_1 = require("express");
const GameService_1 = require("../services/GameService");
const BettingService_1 = require("../services/BettingService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const gameService = new GameService_1.GameService();
const bettingService = new BettingService_1.BettingService();
// Get active matches for betting
router.get('/', async (req, res) => {
    try {
        const matches = await gameService.getActiveMatches();
        // Enrich with betting data
        const enrichedMatches = await Promise.all(matches.map(async (match) => {
            try {
                const bettingPool = await bettingService.getBettingPool(match.id);
                return {
                    ...match,
                    bettingPool,
                };
            }
            catch (error) {
                logger_1.logger.warn('Failed to get betting pool for match', { matchId: match.id, error });
                return match;
            }
        }));
        res.json({
            success: true,
            data: enrichedMatches,
            count: enrichedMatches.length,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting active matches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve matches',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Get specific match by ID
router.get('/:matchId', async (req, res) => {
    try {
        const { matchId } = req.params;
        const match = await gameService.getMatch(matchId);
        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Match not found',
            });
        }
        // Get betting pool data
        let bettingPool;
        try {
            bettingPool = await bettingService.getBettingPool(matchId);
        }
        catch (error) {
            logger_1.logger.warn('Failed to get betting pool for match', { matchId, error });
        }
        return res.json({
            success: true,
            data: {
                ...match,
                bettingPool,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting match:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve match',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Create new match
router.post('/', async (req, res) => {
    try {
        const { matchType = 'ai_vs_ai', aiAgent1Id, aiAgent2Id, player1Id, player2Id, } = req.body;
        // Validate required fields based on match type
        if (matchType === 'ai_vs_ai') {
            if (!aiAgent1Id || !aiAgent2Id) {
                return res.status(400).json({
                    success: false,
                    error: 'AI vs AI matches require both aiAgent1Id and aiAgent2Id',
                });
            }
        }
        const match = await gameService.createMatch({
            matchType,
            aiAgent1Id,
            aiAgent2Id,
            player1Id,
            player2Id,
        });
        return res.status(201).json({
            success: true,
            data: match,
            message: 'Match created successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating match:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create match',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Start a match
router.post('/:matchId/start', async (req, res) => {
    try {
        const { matchId } = req.params;
        const match = await gameService.startMatch(matchId);
        return res.json({
            success: true,
            data: match,
            message: 'Match started successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error starting match:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to start match',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Make a move in a match
router.post('/:matchId/moves', async (req, res) => {
    try {
        const { matchId } = req.params;
        const { from, to, piece, playerId = 'demo-user' } = req.body;
        if (!from || !to || !piece) {
            return res.status(400).json({
                success: false,
                error: 'Move requires from, to, and piece fields',
            });
        }
        const move = await gameService.makeMove(matchId, {
            gameId: matchId,
            playerId,
            from,
            to,
            piece,
            isCapture: false, // Will be determined by game logic
        });
        return res.json({
            success: true,
            data: move,
            message: 'Move made successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error making move:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to make move',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// Get match history
router.get('/:matchId/history', async (req, res) => {
    try {
        const { matchId } = req.params;
        const match = await gameService.getMatch(matchId);
        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Match not found',
            });
        }
        return res.json({
            success: true,
            data: {
                matchId,
                moveHistory: match.gameState?.moveHistory || [],
                status: match.status,
                winner: match.winnerId,
                winnerType: match.winnerType,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting match history:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve match history',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=match.js.map