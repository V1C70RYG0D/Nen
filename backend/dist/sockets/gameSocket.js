"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupEnhancedGameSocket = void 0;
const MagicBlockBOLTService_1 = require("../services/MagicBlockBOLTService");
const perf_hooks_1 = require("perf_hooks");
const setupEnhancedGameSocket = (io, clusterService, magicBlockService, clusterManager, logger) => {
    const gameNamespace = io.of('/game');
    const activeSessions = new Map();
    gameNamespace.use((socket, next) => {
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
        socket.on('create_game_session', async (data, callback) => {
            try {
                const { gameType, timeControl, allowSpectators = true, region } = data;
                const sessionId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const optimalRegion = clusterManager.selectOptimalRegion(region || socket.data.region, {
                    latencyThreshold: 50,
                    capacityRequired: 10
                });
                if (!optimalRegion) {
                    throw new Error('No suitable region available');
                }
                const magicBlockSessionId = await magicBlockService.createEnhancedSession(sessionId, socket.data.playerId, null, {
                    timeControl: timeControl || 600000,
                    region: optimalRegion.region,
                    allowSpectators,
                    tournamentMode: false
                }, optimalRegion.region);
                const rollupInfo = await magicBlockService.deployToEphemeralRollup(sessionId);
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
                    socket.emit('game_state_update', {
                        sessionId,
                        boardState: session.boardState,
                        currentPlayer: session.currentPlayer,
                        moveHistory: session.moveHistory.slice(-10),
                        playerCount: session.players.length,
                        spectatorCount: session.spectators.size
                    });
                }
                else if (session.players.length < 2) {
                    session.players.push(socket.id);
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
                const moveResult = await magicBlockService.submitMoveEnhanced(sessionId, move, socket.data.playerId, new Uint8Array(32));
                if (!moveResult.success) {
                    throw new Error('Invalid move');
                }
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
        socket.on('request_ai_move', async (data, callback) => {
            try {
                const { sessionId, difficulty = 'balanced' } = data;
                const session = activeSessions.get(sessionId);
                if (!session) {
                    throw new Error('Session not found');
                }
                const aiMove = await calculateAIMove(session.boardState, session.currentPlayer, difficulty);
                const moveResult = await magicBlockService.submitMoveEnhanced(sessionId, aiMove, socket.data.playerId, new Uint8Array(32));
                if (moveResult.success) {
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
        socket.on('disconnect', () => {
            logger.info('Game client disconnected', { socketId: socket.id });
            for (const [sessionId, session] of activeSessions) {
                const playerIndex = session.players.indexOf(socket.id);
                if (playerIndex !== -1) {
                    session.players.splice(playerIndex, 1);
                    if (session.players.length === 0) {
                        activeSessions.delete(sessionId);
                        logger.info('Session cleaned up', { sessionId });
                    }
                    else {
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
    function initializeGungiBoardState() {
        return {
            board: Array(9).fill(null).map(() => Array(9).fill(null).map(() => ({ pieces: [], level: 0 }))),
            capturedPieces: { player1: [], player2: [] },
            moveCount: 0,
            lastMove: null
        };
    }
    function applyMoveToBoard(boardState, move) {
        const newState = JSON.parse(JSON.stringify(boardState));
        try {
            if (newState.pieces) {
                const pieceIndex = newState.pieces.findIndex((p) => p.x === move.fromX && p.y === move.fromY && p.level === move.fromLevel && p.player === move.player);
                if (pieceIndex >= 0) {
                    newState.pieces[pieceIndex].x = move.toX;
                    newState.pieces[pieceIndex].y = move.toY;
                    newState.pieces[pieceIndex].level = move.toLevel;
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
        try {
            const alivePieces = boardState.pieces?.filter((p) => p.alive) || [];
            const player1King = alivePieces.find((p) => p.player === 1 && p.type === 'King');
            const player2King = alivePieces.find((p) => p.player === 2 && p.type === 'King');
            if (!player1King) {
                return { ended: true, winner: 2, reason: 'king_captured' };
            }
            if (!player2King) {
                return { ended: true, winner: 1, reason: 'king_captured' };
            }
            const moveLimit = 500;
            if (boardState.moveCount >= moveLimit) {
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
        try {
            const difficultyMultiplier = difficulty === 'hard' ? 0.9 : difficulty === 'medium' ? 0.7 : 0.5;
            const aiPieces = boardState.pieces?.filter((piece) => piece.player === player && piece.alive) || [];
            if (aiPieces.length === 0) {
                throw new Error('No available pieces for AI player');
            }
            const selectedPiece = aiPieces[Math.floor(Math.random() * aiPieces.length)];
            const moveDistance = Math.floor(Math.random() * 3) + 1;
            const direction = Math.floor(Math.random() * 8);
            let toX = selectedPiece.x;
            let toY = selectedPiece.y;
            switch (direction) {
                case 0:
                    toY = Math.max(0, toY - moveDistance);
                    break;
                case 1:
                    toX = Math.min(8, toX + moveDistance);
                    toY = Math.max(0, toY - moveDistance);
                    break;
                case 2:
                    toX = Math.min(8, toX + moveDistance);
                    break;
                case 3:
                    toX = Math.min(8, toX + moveDistance);
                    toY = Math.min(8, toY + moveDistance);
                    break;
                case 4:
                    toY = Math.min(8, toY + moveDistance);
                    break;
                case 5:
                    toX = Math.max(0, toX - moveDistance);
                    toY = Math.min(8, toY + moveDistance);
                    break;
                case 6:
                    toX = Math.max(0, toX - moveDistance);
                    break;
                case 7:
                    toX = Math.max(0, toX - moveDistance);
                    toY = Math.max(0, toY - moveDistance);
                    break;
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