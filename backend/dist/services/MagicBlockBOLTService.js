"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MagicBlockBOLTService = exports.PersonalityType = exports.PieceType = void 0;
const web3_js_1 = require("@solana/web3.js");
const perf_hooks_1 = require("perf_hooks");
var PieceType;
(function (PieceType) {
    PieceType["Marshal"] = "Marshal";
    PieceType["General"] = "General";
    PieceType["Lieutenant"] = "Lieutenant";
    PieceType["Major"] = "Major";
    PieceType["Minor"] = "Minor";
    PieceType["Shinobi"] = "Shinobi";
    PieceType["Bow"] = "Bow";
})(PieceType || (exports.PieceType = PieceType = {}));
var PersonalityType;
(function (PersonalityType) {
    PersonalityType["Aggressive"] = "Aggressive";
    PersonalityType["Defensive"] = "Defensive";
    PersonalityType["Balanced"] = "Balanced";
})(PersonalityType || (exports.PersonalityType = PersonalityType = {}));
class MagicBlockBOLTService {
    connection;
    provider;
    program;
    logger;
    sessionCache = new Map();
    performanceTracker = new Map();
    constructor(connection, provider, logger) {
        this.connection = connection;
        this.provider = provider;
        this.logger = logger;
        this.initializeBOLTService();
    }
    async initializeBOLTService() {
        try {
            this.logger.info('MagicBlock BOLT ECS service initialized', {
                endpoint: this.connection.rpcEndpoint,
                wallet: this.provider.wallet.publicKey.toString()
            });
            this.startPerformanceMonitoring();
        }
        catch (error) {
            this.logger.error('Failed to initialize BOLT service', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async createEnhancedSession(sessionId, player1, player2, config, region) {
        const startTime = perf_hooks_1.performance.now();
        const perfMetrics = {};
        try {
            const step1Start = perf_hooks_1.performance.now();
            this.logger.debug('Creating enhanced MagicBlock session', {
                sessionId,
                region
            });
            perfMetrics.logging = perf_hooks_1.performance.now() - step1Start;
            const step2Start = perf_hooks_1.performance.now();
            const sessionKeypair = web3_js_1.Keypair.generate();
            perfMetrics.keypairGeneration = perf_hooks_1.performance.now() - step2Start;
            const step3Start = perf_hooks_1.performance.now();
            const initialWorldState = this.initializeBOLTWorldOptimized();
            perfMetrics.worldStateInit = perf_hooks_1.performance.now() - step3Start;
            const step4Start = perf_hooks_1.performance.now();
            const sessionData = {
                sessionId,
                player1,
                player2,
                config,
                region,
                worldState: initialWorldState,
                createdAt: Date.now(),
                status: 'waiting',
                currentTurn: 1,
                moveNumber: 0
            };
            perfMetrics.sessionDataCreation = perf_hooks_1.performance.now() - step4Start;
            const step5Start = perf_hooks_1.performance.now();
            this.sessionCache.set(sessionId, sessionData);
            this.performanceTracker.set(sessionId, {
                averageMoveLatency: 0,
                totalMoves: 0,
                peakLatency: 0,
                errorCount: 0,
                lastUpdateTime: Date.now()
            });
            perfMetrics.cacheOperations = perf_hooks_1.performance.now() - step5Start;
            const totalLatency = perf_hooks_1.performance.now() - startTime;
            if (totalLatency > 50) {
                this.logger.warn('Session creation performance breakdown', {
                    sessionId,
                    totalLatency,
                    breakdown: perfMetrics
                });
            }
            this.logger.info('Enhanced session created successfully', {
                sessionId,
                publicKey: sessionKeypair.publicKey.toString(),
                latency: totalLatency
            });
            return sessionKeypair.publicKey.toString();
        }
        catch (error) {
            this.logger.error('Failed to create enhanced session', {
                sessionId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    initializeBOLTWorldOptimized() {
        const positions = new Array(9);
        const pieces = [];
        for (let x = 0; x < 9; x++) {
            positions[x] = new Array(9);
            for (let y = 0; y < 9; y++) {
                positions[x][y] = {
                    x,
                    y,
                    level: 0,
                    entityId: `pos_${x}_${y}_0`
                };
            }
        }
        const startingPieces = this.getOptimizedStartingPosition();
        pieces.push(...startingPieces);
        return {
            positions,
            pieces,
            entities: this.generateEntityIdsOptimized(pieces.length),
            systems: ['movement', 'capture']
        };
    }
    initializeBOLTWorld() {
        const positions = [];
        const pieces = [];
        for (let x = 0; x < 9; x++) {
            positions[x] = [];
            for (let y = 0; y < 9; y++) {
                for (let level = 0; level < 3; level++) {
                    positions[x][y] = {
                        x,
                        y,
                        level,
                        entityId: `pos_${x}_${y}_${level}`
                    };
                }
            }
        }
        const startingPieces = this.getGungiStartingPosition();
        pieces.push(...startingPieces);
        return {
            positions,
            pieces,
            entities: this.generateEntityIds(pieces.length),
            systems: ['movement', 'stacking', 'capture', 'ai_decision']
        };
    }
    getGungiStartingPosition() {
        const pieces = [];
        const player1Pieces = [
            { type: PieceType.Marshal, x: 4, y: 0 },
            { type: PieceType.General, x: 3, y: 0 },
            { type: PieceType.General, x: 5, y: 0 },
            { type: PieceType.Lieutenant, x: 2, y: 0 },
            { type: PieceType.Lieutenant, x: 6, y: 0 },
        ];
        const player2Pieces = [
            { type: PieceType.Marshal, x: 4, y: 8 },
            { type: PieceType.General, x: 3, y: 8 },
            { type: PieceType.General, x: 5, y: 8 },
            { type: PieceType.Lieutenant, x: 2, y: 8 },
            { type: PieceType.Lieutenant, x: 6, y: 8 },
        ];
        player1Pieces.forEach((piece, index) => {
            pieces.push({
                pieceType: piece.type,
                owner: 1,
                hasMoved: false,
                captured: false,
                entityId: `p1_piece_${index}`
            });
        });
        player2Pieces.forEach((piece, index) => {
            pieces.push({
                pieceType: piece.type,
                owner: 2,
                hasMoved: false,
                captured: false,
                entityId: `p2_piece_${index}`
            });
        });
        return pieces;
    }
    getOptimizedStartingPosition() {
        const pieces = [];
        pieces.push({
            pieceType: PieceType.Marshal,
            owner: 1,
            hasMoved: false,
            captured: false,
            entityId: 'p1_marshal'
        }, {
            pieceType: PieceType.Marshal,
            owner: 2,
            hasMoved: false,
            captured: false,
            entityId: 'p2_marshal'
        });
        return pieces;
    }
    generateEntityIdsOptimized(count) {
        const ids = new Array(count);
        for (let i = 0; i < count; i++) {
            ids[i] = `entity_${i}`;
        }
        return ids;
    }
    generateEntityIds(count) {
        return Array.from({ length: count }, (_, i) => `entity_${i}`);
    }
    async submitMoveEnhanced(sessionId, moveData, playerId, antiFraudToken) {
        const startTime = perf_hooks_1.performance.now();
        try {
            const session = this.sessionCache.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            const isValidMove = await this.validateMoveBOLTECS(session, moveData);
            if (!isValidMove) {
                throw new Error('Invalid move');
            }
            await this.applyMoveToBOLTECS(session, moveData);
            const moveHash = this.generateMoveHash(moveData);
            session.moveNumber += 1;
            session.currentTurn = session.currentTurn === 1 ? 2 : 1;
            session.lastMoveAt = Date.now();
            const latency = perf_hooks_1.performance.now() - startTime;
            this.updatePerformanceMetrics(sessionId, latency);
            this.emitBOLTUpdate(sessionId, {
                moveData,
                moveHash,
                worldState: session.worldState,
                latency
            });
            this.logger.info('Move submitted successfully', {
                sessionId,
                moveHash,
                latency,
                player: playerId.toString()
            });
            return { success: true, moveHash, latency };
        }
        catch (error) {
            const latency = perf_hooks_1.performance.now() - startTime;
            this.updateErrorMetrics(sessionId);
            this.logger.error('Failed to submit move', {
                sessionId,
                error: error instanceof Error ? error.message : String(error),
                latency
            });
            return { success: false, moveHash: '', latency };
        }
    }
    async validateMoveBOLTECS(session, moveData) {
        const { worldState } = session;
        const { fromX, fromY, fromLevel, toX, toY, toLevel, pieceType, player } = moveData;
        if (fromX < 0 || fromX > 8 || fromY < 0 || fromY > 8)
            return false;
        if (toX < 0 || toX > 8 || toY < 0 || toY > 8)
            return false;
        if (fromLevel < 0 || fromLevel > 2 || toLevel < 0 || toLevel > 2)
            return false;
        const sourcePiece = this.findPieceAtPosition(worldState, fromX, fromY, fromLevel);
        if (!sourcePiece || sourcePiece.owner !== player)
            return false;
        const isValidMovement = this.validatePieceMovement(pieceType, fromX, fromY, toX, toY, worldState);
        if (!isValidMovement)
            return false;
        const destinationPiece = this.findPieceAtPosition(worldState, toX, toY, toLevel);
        if (destinationPiece && destinationPiece.owner === player)
            return false;
        return true;
    }
    findPieceAtPosition(worldState, x, y, level) {
        return worldState.pieces.find((piece) => {
            return piece.entityId.includes(`${x}_${y}_${level}`);
        }) || null;
    }
    validatePieceMovement(pieceType, fromX, fromY, toX, toY, worldState) {
        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);
        switch (pieceType) {
            case PieceType.Marshal:
                return dx <= 1 && dy <= 1 && (dx + dy > 0);
            case PieceType.General:
                return (dx === 0 || dy === 0 || dx === dy) && (dx + dy > 0);
            case PieceType.Lieutenant:
                return (dx === 0 || dy === 0) && (dx + dy > 0);
            case PieceType.Major:
                return dx === dy && dx > 0;
            case PieceType.Minor:
                return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
            case PieceType.Shinobi:
                return dx <= 1 && dy === 1;
            case PieceType.Bow:
                return (dx === 0 || dy === 0) && (dx + dy > 0);
            default:
                return false;
        }
    }
    async applyMoveToBOLTECS(session, moveData) {
        const { worldState } = session;
        const { fromX, fromY, fromLevel, toX, toY, toLevel, player } = moveData;
        const piece = this.findPieceAtPosition(worldState, fromX, fromY, fromLevel);
        if (piece) {
            piece.hasMoved = true;
            const capturedPiece = this.findPieceAtPosition(worldState, toX, toY, toLevel);
            if (capturedPiece && capturedPiece.owner !== player) {
                capturedPiece.captured = true;
            }
            piece.entityId = `pos_${toX}_${toY}_${toLevel}`;
        }
    }
    generateMoveHash(moveData) {
        const hashInput = `${moveData.fromX}_${moveData.fromY}_${moveData.fromLevel}_${moveData.toX}_${moveData.toY}_${moveData.toLevel}_${moveData.timestamp}`;
        return Buffer.from(hashInput).toString('base64');
    }
    updatePerformanceMetrics(sessionId, latency) {
        const metrics = this.performanceTracker.get(sessionId);
        if (metrics) {
            metrics.totalMoves += 1;
            metrics.averageMoveLatency = (metrics.averageMoveLatency * (metrics.totalMoves - 1) + latency) / metrics.totalMoves;
            metrics.peakLatency = Math.max(metrics.peakLatency, latency);
            metrics.lastUpdateTime = Date.now();
        }
    }
    updateErrorMetrics(sessionId) {
        const metrics = this.performanceTracker.get(sessionId);
        if (metrics) {
            metrics.errorCount += 1;
            metrics.lastUpdateTime = Date.now();
        }
    }
    emitBOLTUpdate(sessionId, updateData) {
        this.logger.debug('BOLT ECS update emitted', {
            sessionId,
            updateType: 'move_applied',
            latency: updateData.latency
        });
    }
    startPerformanceMonitoring() {
        setInterval(() => {
            this.performanceTracker.forEach((metrics, sessionId) => {
                if (Date.now() - metrics.lastUpdateTime > 300000) {
                    this.performanceTracker.delete(sessionId);
                    this.sessionCache.delete(sessionId);
                }
            });
        }, 60000);
    }
    getSessionMetrics(sessionId) {
        return this.performanceTracker.get(sessionId) || null;
    }
    async deployToEphemeralRollup(sessionId) {
        try {
            const rollupId = `rollup_${sessionId}_${Date.now()}`;
            const endpoint = `wss://ephemeral-${rollupId}.magicblock.gg`;
            this.logger.info('Deploying to ephemeral rollup', {
                sessionId,
                rollupId,
                endpoint
            });
            return { rollupId, endpoint };
        }
        catch (error) {
            this.logger.error('Failed to deploy to ephemeral rollup', {
                sessionId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async shutdown() {
        this.logger.info('Shutting down MagicBlock BOLT service');
        this.sessionCache.clear();
        this.performanceTracker.clear();
    }
}
exports.MagicBlockBOLTService = MagicBlockBOLTService;
//# sourceMappingURL=MagicBlockBOLTService.js.map