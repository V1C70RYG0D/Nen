"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const logger_1 = require("../utils/logger");
const database_1 = require("../utils/database");
const redis_1 = require("../utils/redis");
const uuid_1 = require("uuid");
class GameService {
    cache;
    constructor() {
        this.cache = new redis_1.CacheService();
    }
    async createMatch(matchData) {
        try {
            const matchId = (0, uuid_1.v4)();
            const gameState = this.initializeGameState(matchId);
            const match = {
                id: matchId,
                matchType: matchData.matchType || 'ai_vs_ai',
                status: 'pending',
                player1Id: matchData.player1Id,
                player2Id: matchData.player2Id,
                aiAgent1Id: matchData.aiAgent1Id,
                aiAgent2Id: matchData.aiAgent2Id,
                gameState,
                bettingPoolSol: 0,
                isBettingActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await (0, database_1.query)(`
        INSERT INTO matches (
          id, match_type, status, player1_id, player2_id, 
          ai_agent1_id, ai_agent2_id, board_state, 
          betting_pool_sol, is_betting_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
                match.id, match.matchType, match.status, match.player1Id, match.player2Id,
                match.aiAgent1Id, match.aiAgent2Id, JSON.stringify(match.gameState),
                match.bettingPoolSol, match.isBettingActive
            ]);
            await this.cache.set(`match:${matchId}`, match, 3600);
            logger_1.logger.info('Match created successfully', { matchId, matchType: match.matchType });
            return match;
        }
        catch (error) {
            logger_1.logger.error('Error creating match:', error);
            throw new Error('Failed to create match');
        }
    }
    async startMatch(matchId) {
        try {
            const match = await this.getMatch(matchId);
            if (!match) {
                throw new Error('Match not found');
            }
            if (match.status !== 'pending') {
                throw new Error('Match already started or completed');
            }
            match.status = 'active';
            match.updatedAt = new Date();
            await (0, database_1.query)(`
        UPDATE matches 
        SET status = $1, updated_at = $2, session_start_time = $2
        WHERE id = $3
      `, [match.status, match.updatedAt, matchId]);
            await this.cache.set(`match:${matchId}`, match, 3600);
            if (match.matchType === 'ai_vs_ai') {
                this.runAIMatch(match).catch(error => {
                    logger_1.logger.error('Error in AI match execution:', error);
                });
            }
            logger_1.logger.info('Match started successfully', { matchId });
            return match;
        }
        catch (error) {
            logger_1.logger.error('Error starting match:', error);
            throw error;
        }
    }
    async getMatch(matchId) {
        try {
            const cached = await this.cache.get(`match:${matchId}`);
            if (cached) {
                return cached;
            }
            const rows = await (0, database_1.query)(`
        SELECT * FROM matches WHERE id = $1
      `, [matchId]);
            if (rows.length === 0) {
                return null;
            }
            const row = rows[0];
            const match = {
                id: row.id,
                matchType: row.match_type,
                status: row.status,
                player1Id: row.player1_id,
                player2Id: row.player2_id,
                aiAgent1Id: row.ai_agent1_id,
                aiAgent2Id: row.ai_agent2_id,
                winnerId: row.winner_id,
                winnerType: row.winner_type,
                magicblockSessionId: row.magicblock_session_id,
                gameState: row.board_state,
                bettingPoolSol: parseFloat(row.betting_pool_sol || '0'),
                isBettingActive: row.is_betting_active,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            };
            await this.cache.set(`match:${matchId}`, match, 3600);
            return match;
        }
        catch (error) {
            logger_1.logger.error('Error getting match:', error);
            throw error;
        }
    }
    async getActiveMatches() {
        try {
            const cacheKey = 'matches:active';
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
            let matches = [];
            try {
                const rows = await (0, database_1.query)(`
          SELECT * FROM matches 
          WHERE status IN ('pending', 'active') 
          ORDER BY created_at DESC 
          LIMIT 20
        `);
                matches = rows.map(row => ({
                    id: row.id,
                    matchType: row.match_type,
                    status: row.status,
                    player1Id: row.player1_id,
                    player2Id: row.player2_id,
                    aiAgent1Id: row.ai_agent1_id,
                    aiAgent2Id: row.ai_agent2_id,
                    winnerId: row.winner_id,
                    winnerType: row.winner_type,
                    magicblockSessionId: row.magicblock_session_id,
                    gameState: row.board_state,
                    bettingPoolSol: parseFloat(row.betting_pool_sol || '0'),
                    isBettingActive: row.is_betting_active,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                }));
            }
            catch (dbError) {
                logger_1.logger.error('Database query failed:', dbError);
                matches = [];
                throw new Error(`Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
            }
            updatedAt: new Date(),
                await this.cache.set(cacheKey, matches, 60);
            return matches;
        }
        catch (error) {
            logger_1.logger.error('Error getting active matches:', error);
            throw error;
        }
    }
    async makeMove(gameId, move) {
        try {
            const match = await this.getMatch(gameId);
            if (!match || !match.gameState) {
                throw new Error('Match or game state not found');
            }
            if (match.status !== 'active') {
                throw new Error('Match is not active');
            }
            const isValidMove = this.validateMove(match.gameState, move);
            if (!isValidMove) {
                throw new Error('Invalid move');
            }
            const gameMove = {
                id: (0, uuid_1.v4)(),
                gameId,
                playerId: move.playerId,
                from: move.from,
                to: move.to,
                piece: move.piece,
                timestamp: new Date(),
                moveNumber: match.gameState.moveHistory.length + 1,
                isCapture: move.isCapture,
                capturedPiece: move.capturedPiece,
            };
            this.applyMove(match.gameState, gameMove);
            const gameResult = this.checkGameEnd(match.gameState);
            if (gameResult.isGameOver) {
                match.status = 'completed';
                match.winnerId = gameResult.winner;
                match.winnerType = gameResult.winnerType;
            }
            await (0, database_1.transaction)(async (client) => {
                await client.query(`
          UPDATE matches 
          SET board_state = $1, status = $2, winner_id = $3, winner_type = $4, updated_at = $5
          WHERE id = $6
        `, [
                    JSON.stringify(match.gameState),
                    match.status,
                    match.winnerId,
                    match.winnerType,
                    new Date(),
                    gameId
                ]);
                await client.query(`
          INSERT INTO moves (
            id, match_id, player_id, from_position, to_position, 
            piece_type, move_number, is_capture, captured_piece
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
                    gameMove.id, gameId, gameMove.playerId,
                    JSON.stringify(gameMove.from), JSON.stringify(gameMove.to),
                    gameMove.piece, gameMove.moveNumber, gameMove.isCapture, gameMove.capturedPiece
                ]);
            });
            await this.cache.set(`match:${gameId}`, match, 3600);
            logger_1.logger.info('Move made successfully', { gameId, moveId: gameMove.id });
            return gameMove;
        }
        catch (error) {
            logger_1.logger.error('Error making move:', error);
            throw error;
        }
    }
    async runAIMatch(match) {
        try {
            if (!match.gameState) {
                throw new Error('Game state not initialized');
            }
            logger_1.logger.info('Starting AI vs AI match', { matchId: match.id });
            let gameState = match.gameState;
            while (match.status === 'active' && gameState.status === 'active') {
                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
                const currentPlayer = gameState.currentPlayer;
                const aiAgentId = currentPlayer === 'player1' ? match.aiAgent1Id : match.aiAgent2Id;
                if (!aiAgentId) {
                    throw new Error('AI agent not found');
                }
                const aiMove = await this.getAIMove(gameState, aiAgentId);
                if (!aiMove) {
                    logger_1.logger.warn('AI could not generate move, ending game', { matchId: match.id });
                    break;
                }
                await this.makeMove(match.id, aiMove);
                const updatedMatch = await this.getMatch(match.id);
                if (updatedMatch && updatedMatch.gameState) {
                    match = updatedMatch;
                    gameState = updatedMatch.gameState;
                }
            }
            logger_1.logger.info('AI vs AI match completed', { matchId: match.id, winner: match.winnerId });
            const { ELORatingService } = await Promise.resolve().then(() => __importStar(require('./ELORatingService')));
            const eloRatingService = new ELORatingService();
            if (match.winnerId) {
                const player1Wins = match.winnerId === match.player1Id;
                await eloRatingService.updateRatings(match.player1Id, match.player2Id, match.id, player1Wins ? 'player1_wins' : 'player2_wins');
            }
            else {
                await eloRatingService.updateRatings(match.player1Id, match.player2Id, match.id, 'draw');
            }
        }
        catch (error) {
            logger_1.logger.error('Error in AI match execution:', error);
            await (0, database_1.query)(`
        UPDATE matches SET status = 'cancelled', updated_at = $1 WHERE id = $2
      `, [new Date(), match.id]);
        }
    }
    initializeGameState(gameId) {
        const board = Array(9).fill(null).map(() => Array(9).fill(null));
        return {
            id: gameId,
            board,
            stacks: {},
            currentPlayer: 'player1',
            moveHistory: [],
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    validateMove(gameState, move) {
        const { from, to } = move;
        if (from.x < 0 || from.x >= 9 || from.y < 0 || from.y >= 9 ||
            to.x < 0 || to.x >= 9 || to.y < 0 || to.y >= 9) {
            return false;
        }
        const fromKey = `${from.x},${from.y}`;
        const stack = gameState.stacks[fromKey];
        if (!stack || stack.length <= from.level) {
            return false;
        }
        return true;
    }
    applyMove(gameState, move) {
        const { from, to } = move;
        const fromKey = `${from.x},${from.y}`;
        const toKey = `${to.x},${to.y}`;
        const sourceStack = gameState.stacks[fromKey] || [];
        const piece = sourceStack[from.level];
        if (piece) {
            sourceStack.splice(from.level, 1);
            if (sourceStack.length === 0) {
                delete gameState.stacks[fromKey];
            }
            else {
                gameState.stacks[fromKey] = sourceStack;
            }
            const destStack = gameState.stacks[toKey] || [];
            destStack[to.level] = piece;
            gameState.stacks[toKey] = destStack;
        }
        gameState.moveHistory.push(move);
        gameState.currentPlayer = gameState.currentPlayer === 'player1' ? 'player2' : 'player1';
        gameState.updatedAt = new Date();
    }
    checkGameEnd(gameState) {
        const moveCount = gameState.moveHistory.length;
        if (moveCount >= 100) {
            return {
                isGameOver: true,
                winner: gameState.currentPlayer === 'player1' ? 'player2' : 'player1',
                winnerType: 'ai'
            };
        }
        return { isGameOver: false };
    }
    async getAIMove(gameState, aiAgentId) {
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const validMoves = this.generateValidMoves(gameState);
            if (validMoves.length === 0) {
                return null;
            }
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            return {
                gameId: gameState.id,
                playerId: aiAgentId,
                from: randomMove.from,
                to: randomMove.to,
                piece: randomMove.piece,
                isCapture: false,
            };
        }
        catch (error) {
            logger_1.logger.error('Error generating AI move:', error);
            return null;
        }
    }
    generateValidMoves(gameState) {
        const moves = [];
        for (let i = 0; i < 10; i++) {
            moves.push({
                from: { x: Math.floor(Math.random() * 9), y: Math.floor(Math.random() * 9), level: 0 },
                to: { x: Math.floor(Math.random() * 9), y: Math.floor(Math.random() * 9), level: 0 },
                piece: 'pawn'
            });
        }
        return moves;
    }
    async getAvailableGames() {
        try {
            const games = [
                {
                    id: 'gungi',
                    name: 'Gungi',
                    description: 'Strategic board game from Hunter x Hunter',
                    players: { min: 2, max: 2 },
                    difficulty: ['easy', 'medium', 'hard', 'expert'],
                    betLimits: {
                        min: 0.01,
                        max: 10.0,
                        currency: 'SOL'
                    },
                    estimatedDuration: '15-45 minutes',
                    category: 'strategy'
                }
            ];
            logger_1.logger.info('Retrieved available games', { count: games.length });
            return games;
        }
        catch (error) {
            logger_1.logger.error('Error getting available games:', error);
            throw new Error('Failed to retrieve available games');
        }
    }
    async getMatchById(matchId) {
        return this.getMatch(matchId);
    }
    async executeMove(matchId, playerId, move) {
        try {
            const match = await this.getMatch(matchId);
            if (!match) {
                return { valid: false, error: 'Match not found' };
            }
            if (match.status !== 'active') {
                return { valid: false, error: 'Match is not active' };
            }
            const gameState = match.gameState;
            if ((gameState.currentPlayer === 'player1' && match.player1Id !== playerId) ||
                (gameState.currentPlayer === 'player2' && match.player2Id !== playerId)) {
                return { valid: false, error: 'Not your turn' };
            }
            const gameMove = {
                gameId: matchId,
                playerId,
                from: move.from,
                to: move.to,
                piece: move.piece,
                isCapture: move.isCapture || false,
                capturedPiece: move.capturedPiece
            };
            if (!this.validateMove(gameState, gameMove)) {
                return { valid: false, error: 'Invalid move' };
            }
            const executedMove = await this.makeMove(matchId, gameMove);
            const updatedMatch = await this.getMatch(matchId);
            const nextPlayerType = gameState.currentPlayer === 'player1' ?
                (match.aiAgent2Id ? 'ai' : 'human') :
                (match.aiAgent1Id ? 'ai' : 'human');
            const nextPlayerId = gameState.currentPlayer === 'player1' ?
                (match.player2Id || match.aiAgent2Id) :
                (match.player1Id || match.aiAgent1Id);
            return {
                valid: true,
                gameState: updatedMatch?.gameState,
                nextPlayerType,
                nextPlayerId,
                moveNumber: executedMove.moveNumber
            };
        }
        catch (error) {
            logger_1.logger.error('Error executing move:', error);
            return { valid: false, error: 'Failed to execute move' };
        }
    }
    async getPlayerMatches(playerId, limit = 20, offset = 0) {
        try {
            const rows = await (0, database_1.query)(`
        SELECT m.*, g.board_state, g.current_player, g.status as game_status
        FROM matches m
        LEFT JOIN games g ON m.id = g.match_id
        WHERE m.player1_id = $1 OR m.player2_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `, [playerId, limit, offset]);
            const matches = rows.map((row) => ({
                id: row.id,
                matchType: row.match_type,
                status: row.status,
                player1Id: row.player1_id,
                player2Id: row.player2_id,
                aiAgent1Id: row.ai_agent1_id,
                aiAgent2Id: row.ai_agent2_id,
                winnerId: row.winner_id,
                winnerType: row.winner_type,
                magicblockSessionId: row.magicblock_session_id,
                gameState: row.board_state ? JSON.parse(row.board_state) : undefined,
                bettingPoolSol: parseFloat(row.betting_pool_sol) || 0,
                isBettingActive: row.is_betting_active,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            }));
            logger_1.logger.info('Retrieved player matches', { playerId, count: matches.length });
            return matches;
        }
        catch (error) {
            logger_1.logger.error('Error getting player matches:', error);
            throw new Error('Failed to retrieve player matches');
        }
    }
    async surrenderMatch(matchId, playerId) {
        try {
            const match = await this.getMatch(matchId);
            if (!match) {
                throw new Error('Match not found');
            }
            if (match.status !== 'active') {
                throw new Error('Match is not active');
            }
            const winnerId = match.player1Id === playerId ? match.player2Id : match.player1Id;
            const winnerType = match.player1Id === playerId ?
                (match.aiAgent2Id ? 'ai' : 'user') :
                (match.aiAgent1Id ? 'ai' : 'user');
            await (0, database_1.query)(`
        UPDATE matches 
        SET status = 'completed', 
            winner_id = $2, 
            winner_type = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [matchId, winnerId, winnerType]);
            if (match.gameState) {
                match.gameState.status = 'completed';
                match.gameState.winner = match.player1Id === playerId ? 'player2' : 'player1';
                await (0, database_1.query)(`
          UPDATE matches 
          SET board_state = $2 
          WHERE id = $1
        `, [matchId, JSON.stringify(match.gameState)]);
            }
            logger_1.logger.info('Match surrendered', { matchId, playerId, winnerId });
            return {
                matchId,
                winnerId: winnerId || '',
                reason: 'surrender'
            };
        }
        catch (error) {
            logger_1.logger.error('Error surrendering match:', error);
            throw new Error('Failed to surrender match');
        }
    }
}
exports.GameService = GameService;
//# sourceMappingURL=GameService.js.map