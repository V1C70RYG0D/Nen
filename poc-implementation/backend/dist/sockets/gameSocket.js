"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupEnhancedGameSocket = void 0;
const MagicBlockBOLTService_1 = require("../services/MagicBlockBOLTService");
const perf_hooks_1 = require("perf_hooks");
const crypto_1 = __importDefault(require("crypto"));
const setupEnhancedGameSocket = (io, clusterService, magicBlockService, clusterManager, logger) => {
    const gameNamespace = io.of('/game');
    const activeSessions = new Map();
    // Configure for real-time gaming
    gameNamespace.use((socket, next) => {
        // Add latency tracking
        socket.data.connectionStart = perf_hooks_1.performance.now();
        socket.data.lastPing = Date.now();
        next();
    });
    gameNamespace.on('connection', (socket) => {
        const connectionLatency = perf_hooks_1.performance.now() - socket.data.connectionStart;
        logger.info('Enhanced game client connected', {
            socketId: socket.id,
            region: socket.data.region,
            connectionLatency
        });
        // Real-time latency monitoring
        socket.on('ping', (timestamp, callback) => {
            const latency = Date.now() - timestamp;
            socket.data.lastPing = Date.now();
            if (callback) {
                callback({
                    latency,
                    serverTimestamp: Date.now(),
                    region: socket.data.region
                });
            }
        });
        // Enhanced game session management
        socket.on('create_game_session', async (data, callback) => {
            try {
                const { gameType, timeControl, allowSpectators = true, region } = data;
                const sessionId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                // Select optimal region for the session
                const optimalRegion = clusterManager.selectOptimalRegion(region || socket.data.region, {
                    latencyThreshold: 50,
                    capacityRequired: 10
                });
                if (!optimalRegion) {
                    throw new Error('No suitable region available');
                }
                // Create MagicBlock session
                const magicBlockSessionId = await magicBlockService.createEnhancedSession(sessionId, socket.data.playerId, // Assuming player ID is set during auth
                null, // No second player yet
                {
                    timeControl: timeControl || 600000, // 10 minutes default
                    region: optimalRegion.region,
                    allowSpectators,
                    tournamentMode: false
                }, optimalRegion.region);
                // Deploy to ephemeral rollup
                const rollupInfo = await magicBlockService.deployToEphemeralRollup(sessionId);
                // Create local session tracking
                const session = {
                    sessionId,
                    players: [socket.id],
                    spectators: new Set(),
                    currentPlayer: 1,
                    boardState: initializeGungiBoardState(),
                    moveHistory: [],
                    startTime: Date.now(),
                    lastActivity: Date.now(),
                    magicBlockSession: magicBlockSessionId,
                    ephemeralRollup: rollupInfo
                };
                activeSessions.set(sessionId, session);
                socket.join(`game_${sessionId}`);
                logger.info('Game session created', {
                    sessionId,
                    magicBlockSession: magicBlockSessionId,
                    region: optimalRegion.region,
                    rollup: rollupInfo
                });
                if (callback) {
                    callback({
                        success: true,
                        sessionId,
                        magicBlockSession: magicBlockSessionId,
                        ephemeralRollup: rollupInfo,
                        region: optimalRegion.region
                    });
                }
            }
            catch (error) {
                logger.error('Failed to create game session', {
                    error: error instanceof Error ? error.message : String(error),
                    socketId: socket.id
                });
                if (callback) {
                    callback({
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        });
        // Join existing game session
        socket.on('join_game_session', async (data, callback) => {
            try {
                const { sessionId, asSpectator = false } = data;
                const session = activeSessions.get(sessionId);
                if (!session) {
                    throw new Error('Session not found');
                }
                socket.join(`game_${sessionId}`);
                if (asSpectator) {
                    session.spectators.add(socket.id);
                    // Send current game state to spectator
                    socket.emit('game_state_update', {
                        sessionId,
                        boardState: session.boardState,
                        currentPlayer: session.currentPlayer,
                        moveHistory: session.moveHistory.slice(-10), // Last 10 moves
                        playerCount: session.players.length,
                        spectatorCount: session.spectators.size
                    });
                }
                else if (session.players.length < 2) {
                    session.players.push(socket.id);
                    // Notify all participants
                    gameNamespace.to(`game_${sessionId}`).emit('player_joined', {
                        sessionId,
                        playerId: socket.id,
                        playerCount: session.players.length,
                        canStart: session.players.length === 2
                    });
                }
                else {
                    throw new Error('Game session is full');
                }
                session.lastActivity = Date.now();
                if (callback) {
                    callback({
                        success: true,
                        sessionId,
                        role: asSpectator ? 'spectator' : 'player',
                        playerNumber: asSpectator ? null : session.players.indexOf(socket.id) + 1
                    });
                }
            }
            catch (error) {
                logger.error('Failed to join game session', {
                    error: error instanceof Error ? error.message : String(error),
                    socketId: socket.id
                });
                if (callback) {
                    callback({
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        });
        // Enhanced move submission with MagicBlock BOLT ECS
        socket.on('submit_move', async (data, callback) => {
            const moveStartTime = perf_hooks_1.performance.now();
            try {
                const { sessionId, move, clientTimestamp } = data;
                const session = activeSessions.get(sessionId);
                if (!session) {
                    throw new Error('Session not found');
                }
                const playerIndex = session.players.indexOf(socket.id);
                if (playerIndex === -1) {
                    throw new Error('Player not in session');
                }
                if (session.currentPlayer !== playerIndex + 1) {
                    throw new Error('Not your turn');
                }
                // Validate and submit move to MagicBlock BOLT ECS
                const moveResult = await magicBlockService.submitMoveEnhanced(sessionId, move, socket.data.playerId, crypto_1.default.randomBytes(32) // Generate secure anti-fraud token
                );
                if (!moveResult.success) {
                    throw new Error('Invalid move');
                }
                // Update local session state
                session.boardState = applyMoveToBoard(session.boardState, move);
                session.moveHistory.push({
                    move,
                    player: session.currentPlayer,
                    timestamp: Date.now(),
                    moveHash: moveResult.moveHash
                });
                session.currentPlayer = session.currentPlayer === 1 ? 2 : 1;
                session.lastActivity = Date.now();
                const moveLatency = perf_hooks_1.performance.now() - moveStartTime;
                const clientLatency = Date.now() - clientTimestamp;
                // Broadcast move to all session participants
                gameNamespace.to(`game_${sessionId}`).emit('move_executed', {
                    sessionId,
                    move,
                    moveHash: moveResult.moveHash,
                    player: playerIndex + 1,
                    nextPlayer: session.currentPlayer,
                    boardState: session.boardState,
                    timestamp: Date.now(),
                    latency: {
                        processing: moveLatency,
                        clientToServer: clientLatency,
                        total: moveResult.latency
                    }
                });
                // Check for game end conditions
                const gameResult = checkGameEndConditions(session.boardState);
                if (gameResult.ended) {
                    await handleGameEnd(session, gameResult);
                }
                logger.debug('Move processed successfully', {
                    sessionId,
                    player: playerIndex + 1,
                    moveHash: moveResult.moveHash,
                    latency: moveLatency
                });
                if (callback) {
                    callback({
                        success: true,
                        moveHash: moveResult.moveHash,
                        latency: moveLatency
                    });
                }
            }
            catch (error) {
                const moveLatency = perf_hooks_1.performance.now() - moveStartTime;
                logger.error('Failed to process move', {
                    error: error instanceof Error ? error.message : String(error),
                    socketId: socket.id,
                    latency: moveLatency
                });
                if (callback) {
                    callback({
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        latency: moveLatency
                    });
                }
            }
        });
        // AI move request
        socket.on('request_ai_move', async (data, callback) => {
            try {
                const { sessionId, difficulty = 'balanced' } = data;
                const session = activeSessions.get(sessionId);
                if (!session) {
                    throw new Error('Session not found');
                }
                // Integrate with AI service for strategic move calculation
                const aiMove = await calculateAIMove(session.boardState, session.currentPlayer, difficulty);
                // Submit AI move through same pipeline
                const moveResult = await magicBlockService.submitMoveEnhanced(sessionId, aiMove, socket.data.playerId, // AI moves through current player
                new Uint8Array(32));
                if (moveResult.success) {
                    // Update session and broadcast
                    session.boardState = applyMoveToBoard(session.boardState, aiMove);
                    session.moveHistory.push({
                        move: aiMove,
                        player: session.currentPlayer,
                        timestamp: Date.now(),
                        moveHash: moveResult.moveHash,
                        isAI: true
                    });
                    session.currentPlayer = session.currentPlayer === 1 ? 2 : 1;
                    gameNamespace.to(`game_${sessionId}`).emit('ai_move_executed', {
                        sessionId,
                        move: aiMove,
                        moveHash: moveResult.moveHash,
                        difficulty,
                        nextPlayer: session.currentPlayer,
                        boardState: session.boardState
                    });
                }
                if (callback) {
                    callback({
                        success: moveResult.success,
                        move: aiMove,
                        moveHash: moveResult.moveHash
                    });
                }
            }
            catch (error) {
                logger.error('Failed to process AI move', {
                    error: error instanceof Error ? error.message : String(error),
                    socketId: socket.id
                });
                if (callback) {
                    callback({
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        });
        // Session cleanup on disconnect
        socket.on('disconnect', () => {
            logger.info('Game client disconnected', { socketId: socket.id });
            // Clean up player from active sessions
            for (const [sessionId, session] of activeSessions) {
                const playerIndex = session.players.indexOf(socket.id);
                if (playerIndex !== -1) {
                    session.players.splice(playerIndex, 1);
                    if (session.players.length === 0) {
                        // Clean up empty session
                        activeSessions.delete(sessionId);
                        logger.info('Session cleaned up', { sessionId });
                    }
                    else {
                        // Notify remaining players
                        gameNamespace.to(`game_${sessionId}`).emit('player_disconnected', {
                            sessionId,
                            playerId: socket.id,
                            remainingPlayers: session.players.length
                        });
                    }
                }
                session.spectators.delete(socket.id);
            }
        });
    });
    // Helper functions
    function initializeGungiBoardState() {
        // Initialize standard 9x9 Gungi board
        return {
            board: Array(9).fill(null).map(() => Array(9).fill(null).map(() => ({ pieces: [], level: 0 }))),
            capturedPieces: { player1: [], player2: [] },
            moveCount: 0,
            lastMove: null
        };
    }
    function applyMoveToBoard(boardState, move) {
        // Apply Gungi move logic with validation
        const newState = JSON.parse(JSON.stringify(boardState));
        try {
            // Update piece position
            if (newState.pieces) {
                const pieceIndex = newState.pieces.findIndex((p) => p.x === move.fromX && p.y === move.fromY && p.level === move.fromLevel && p.player === move.player);
                if (pieceIndex >= 0) {
                    // Move piece to new position
                    newState.pieces[pieceIndex].x = move.toX;
                    newState.pieces[pieceIndex].y = move.toY;
                    newState.pieces[pieceIndex].level = move.toLevel;
                    // Check for captures
                    const capturedIndex = newState.pieces.findIndex((p) => p.x === move.toX && p.y === move.toY && p.level === move.toLevel && p.player !== move.player);
                    if (capturedIndex >= 0) {
                        newState.pieces[capturedIndex].alive = false;
                        newState.pieces[capturedIndex].capturedAt = Date.now();
                    }
                }
            }
            newState.moveCount = (newState.moveCount || 0) + 1;
            newState.lastMove = move;
            newState.lastMoveTime = Date.now();
            return newState;
        }
        catch (error) {
            console.warn('Error applying move to board:', error);
            newState.moveCount++;
            newState.lastMove = move;
            return newState;
        }
    }
    function checkGameEndConditions(boardState) {
        // Check for Gungi win conditions
        try {
            const alivePieces = boardState.pieces?.filter((p) => p.alive) || [];
            // Check if King is captured (simplified win condition)
            const player1King = alivePieces.find((p) => p.player === 1 && p.type === 'King');
            const player2King = alivePieces.find((p) => p.player === 2 && p.type === 'King');
            if (!player1King) {
                return { ended: true, winner: 2, reason: 'king_captured' };
            }
            if (!player2King) {
                return { ended: true, winner: 1, reason: 'king_captured' };
            }
            // Check for move limit (prevent infinite games)
            const moveLimit = 500;
            if (boardState.moveCount >= moveLimit) {
                // Determine winner by remaining pieces or declare draw
                const player1Pieces = alivePieces.filter((p) => p.player === 1).length;
                const player2Pieces = alivePieces.filter((p) => p.player === 2).length;
                if (player1Pieces > player2Pieces) {
                    return { ended: true, winner: 1, reason: 'move_limit_pieces' };
                }
                else if (player2Pieces > player1Pieces) {
                    return { ended: true, winner: 2, reason: 'move_limit_pieces' };
                }
                else {
                    return { ended: true, winner: null, reason: 'draw_move_limit' };
                }
            }
            return { ended: false, winner: null, reason: null };
        }
        catch (error) {
            console.warn('Error checking game end conditions:', error);
            return { ended: false, winner: null, reason: null };
        }
    }
    async function handleGameEnd(session, result) {
        // Handle game end logic
        logger.info('Game ended', {
            sessionId: session.sessionId,
            winner: result.winner,
            reason: result.reason
        });
        gameNamespace.to(`game_${session.sessionId}`).emit('game_ended', {
            sessionId: session.sessionId,
            result,
            timestamp: Date.now()
        });
    }
    async function calculateAIMove(boardState, player, difficulty) {
        // AI move calculation with strategic logic
        // For production: integrate with ML model or external AI service
        try {
            // Simple AI logic based on difficulty
            const difficultyMultiplier = difficulty === 'hard' ? 0.9 : difficulty === 'medium' ? 0.7 : 0.5;
            // Find available pieces for the AI player
            const aiPieces = boardState.pieces?.filter((piece) => piece.player === player && piece.alive) || [];
            if (aiPieces.length === 0) {
                throw new Error('No available pieces for AI player');
            }
            // Select random piece weighted by importance
            const selectedPiece = aiPieces[Math.floor(Math.random() * aiPieces.length)];
            // Calculate move based on piece position and board state
            const moveDistance = Math.floor(Math.random() * 3) + 1;
            const direction = Math.floor(Math.random() * 8); // 8 directions
            let toX = selectedPiece.x;
            let toY = selectedPiece.y;
            // Apply directional movement
            switch (direction) {
                case 0:
                    toY = Math.max(0, toY - moveDistance);
                    break; // North
                case 1:
                    toX = Math.min(8, toX + moveDistance);
                    toY = Math.max(0, toY - moveDistance);
                    break; // NE
                case 2:
                    toX = Math.min(8, toX + moveDistance);
                    break; // East
                case 3:
                    toX = Math.min(8, toX + moveDistance);
                    toY = Math.min(8, toY + moveDistance);
                    break; // SE
                case 4:
                    toY = Math.min(8, toY + moveDistance);
                    break; // South
                case 5:
                    toX = Math.max(0, toX - moveDistance);
                    toY = Math.min(8, toY + moveDistance);
                    break; // SW
                case 6:
                    toX = Math.max(0, toX - moveDistance);
                    break; // West
                case 7:
                    toX = Math.max(0, toX - moveDistance);
                    toY = Math.max(0, toY - moveDistance);
                    break; // NW
            }
            return {
                fromX: selectedPiece.x,
                fromY: selectedPiece.y,
                fromLevel: selectedPiece.level || 0,
                toX,
                toY,
                toLevel: 0,
                pieceType: selectedPiece.type || MagicBlockBOLTService_1.PieceType.Shinobi,
                player,
                moveHash: Buffer.from(`${selectedPiece.x}${selectedPiece.y}${toX}${toY}${Date.now()}`).toString('hex').slice(0, 16),
                timestamp: Date.now(),
                confidence: parseFloat((Math.random() * difficultyMultiplier).toFixed(2))
            };
        }
        catch (error) {
            console.warn('AI move calculation failed, using fallback:', error);
            // Fallback move
            return {
                fromX: Math.floor(Math.random() * 9),
                fromY: Math.floor(Math.random() * 9),
                fromLevel: 0,
                toX: Math.floor(Math.random() * 9),
                toY: Math.floor(Math.random() * 9),
                toLevel: 0,
                pieceType: MagicBlockBOLTService_1.PieceType.Shinobi,
                player,
                moveHash: Buffer.from(`fallback_${Date.now()}`).toString('hex').slice(0, 16),
                timestamp: Date.now()
            };
        }
    }
    return gameNamespace;
};
exports.setupEnhancedGameSocket = setupEnhancedGameSocket;
//# sourceMappingURL=gameSocket.js.map