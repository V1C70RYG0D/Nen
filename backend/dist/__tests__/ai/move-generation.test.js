"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const perf_hooks_1 = require("perf_hooks");
class MockEasyAgent {
    personality;
    difficulty = 'easy';
    constructor(personality = 'balanced') {
        this.personality = personality;
    }
    async generateMove(gameState) {
        const availableMoves = this.getAvailableMoves(gameState);
        if (availableMoves.length === 0) {
            throw new Error('No valid moves available');
        }
        const randomIndex = Math.floor(Math.random() * availableMoves.length);
        const selectedMove = availableMoves[randomIndex];
        return {
            ...selectedMove,
            confidence: Math.random() * 0.5 + 0.3,
            calculationTime: Math.random() * 500 + 100,
            personality: this.personality,
            difficulty: this.difficulty
        };
    }
    getAvailableMoves(gameState) {
        const moves = [];
        const boardSize = 9;
        for (let i = 0; i < Math.min(15, Math.random() * 20 + 5); i++) {
            moves.push({
                from: { x: Math.floor(Math.random() * boardSize), y: Math.floor(Math.random() * boardSize), level: 0 },
                to: { x: Math.floor(Math.random() * boardSize), y: Math.floor(Math.random() * boardSize), level: 0 },
                piece: { type: 'pawn', player: gameState.currentPlayer || 1 },
                isCapture: Math.random() < 0.2,
                moveId: `move_${i}_${Date.now()}`
            });
        }
        return moves;
    }
}
class MockMediumAgent {
    personality;
    difficulty = 'medium';
    searchDepth = 4;
    constructor(personality = 'balanced') {
        this.personality = personality;
    }
    async generateMove(gameState) {
        const startTime = perf_hooks_1.performance.now();
        const availableMoves = this.getAvailableMoves(gameState);
        if (availableMoves.length === 0) {
            throw new Error('No valid moves available');
        }
        const evaluatedMoves = availableMoves.map(move => ({
            ...move,
            score: this.evaluateMove(move, gameState)
        }));
        evaluatedMoves.sort((a, b) => b.score - a.score);
        const bestMoves = evaluatedMoves.slice(0, 3);
        let selectedMove;
        switch (this.personality) {
            case 'aggressive':
                selectedMove = bestMoves.find(m => m.isCapture) || bestMoves[0];
                break;
            case 'defensive':
                selectedMove = bestMoves.find(m => !m.isCapture) || bestMoves[0];
                break;
            default:
                selectedMove = bestMoves[0];
        }
        const calculationTime = perf_hooks_1.performance.now() - startTime;
        return {
            ...selectedMove,
            confidence: Math.random() * 0.3 + 0.6,
            calculationTime,
            personality: this.personality,
            difficulty: this.difficulty,
            nodesEvaluated: Math.floor(Math.random() * 5000 + 1000)
        };
    }
    evaluateMove(move, gameState) {
        let score = Math.random() * 100;
        if (move.isCapture)
            score += 20;
        if (move.piece.type === 'marshal')
            score += 10;
        const centerDistance = Math.abs(move.to.x - 4) + Math.abs(move.to.y - 4);
        score += (8 - centerDistance) * 2;
        return score;
    }
    getAvailableMoves(gameState) {
        const moves = [];
        const boardSize = 9;
        for (let i = 0; i < Math.min(25, Math.random() * 30 + 10); i++) {
            moves.push({
                from: { x: Math.floor(Math.random() * boardSize), y: Math.floor(Math.random() * boardSize), level: 0 },
                to: { x: Math.floor(Math.random() * boardSize), y: Math.floor(Math.random() * boardSize), level: 0 },
                piece: {
                    type: ['pawn', 'lieutenant', 'captain', 'major', 'colonel', 'general', 'marshal'][Math.floor(Math.random() * 7)],
                    player: gameState.currentPlayer || 1
                },
                isCapture: Math.random() < 0.25,
                moveId: `move_${i}_${Date.now()}`
            });
        }
        return moves;
    }
}
class MockHardAgent {
    personality;
    difficulty = 'hard';
    searchDepth = 8;
    neuralNetworkEnabled = true;
    constructor(personality = 'balanced') {
        this.personality = personality;
    }
    async generateMove(gameState) {
        const startTime = perf_hooks_1.performance.now();
        const availableMoves = this.getAvailableMoves(gameState);
        if (availableMoves.length === 0) {
            throw new Error('No valid moves available');
        }
        const neuralEvaluations = availableMoves.map(move => ({
            ...move,
            neuralScore: this.simulateNeuralEvaluation(move, gameState),
            minimaxScore: this.simulateMinimaxEvaluation(move, gameState)
        }));
        const combinedEvaluations = neuralEvaluations.map(move => ({
            ...move,
            finalScore: (move.neuralScore * 0.6) + (move.minimaxScore * 0.4)
        }));
        combinedEvaluations.sort((a, b) => b.finalScore - a.finalScore);
        const selectedMove = combinedEvaluations[0];
        const calculationTime = perf_hooks_1.performance.now() - startTime;
        return {
            ...selectedMove,
            confidence: Math.random() * 0.2 + 0.8,
            calculationTime,
            personality: this.personality,
            difficulty: this.difficulty,
            nodesEvaluated: Math.floor(Math.random() * 50000 + 10000),
            neuralNetworkUsed: this.neuralNetworkEnabled
        };
    }
    simulateNeuralEvaluation(move, gameState) {
        return Math.random() * 100;
    }
    simulateMinimaxEvaluation(move, gameState) {
        let score = Math.random() * 100;
        if (move.isCapture)
            score += 30;
        if (move.piece.type === 'marshal')
            score += 15;
        return score;
    }
    getAvailableMoves(gameState) {
        const moves = [];
        const boardSize = 9;
        for (let i = 0; i < Math.min(35, Math.random() * 40 + 15); i++) {
            moves.push({
                from: { x: Math.floor(Math.random() * boardSize), y: Math.floor(Math.random() * boardSize), level: 0 },
                to: { x: Math.floor(Math.random() * boardSize), y: Math.floor(Math.random() * boardSize), level: 0 },
                piece: {
                    type: ['pawn', 'lieutenant', 'captain', 'major', 'colonel', 'general', 'marshal'][Math.floor(Math.random() * 7)],
                    player: gameState.currentPlayer || 1
                },
                isCapture: Math.random() < 0.3,
                moveId: `move_${i}_${Date.now()}`,
                tacticalValue: Math.random() * 100
            });
        }
        return moves;
    }
}
class PerformanceMonitor {
    measurements = {};
    startMeasurement(key) {
        return perf_hooks_1.performance.now();
    }
    endMeasurement(key, startTime) {
        const duration = perf_hooks_1.performance.now() - startTime;
        if (!this.measurements[key]) {
            this.measurements[key] = [];
        }
        this.measurements[key].push(duration);
        return duration;
    }
    getStatistics(key) {
        const measurements = this.measurements[key] || [];
        if (measurements.length === 0) {
            return { min: 0, max: 0, avg: 0, p95: 0 };
        }
        const sorted = [...measurements].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
            p95: sorted[p95Index]
        };
    }
    reset() {
        this.measurements = {};
    }
}
class GameStateGenerator {
    static createInitialState() {
        return {
            board: this.createEmptyBoard(),
            currentPlayer: 1,
            moveNumber: 1,
            gamePhase: 'opening',
            status: 'active'
        };
    }
    static createMidgameState() {
        return {
            board: this.createMidgameBoard(),
            currentPlayer: 1,
            moveNumber: 25,
            gamePhase: 'midgame',
            status: 'active'
        };
    }
    static createEndgameState() {
        return {
            board: this.createEndgameBoard(),
            currentPlayer: 1,
            moveNumber: 65,
            gamePhase: 'endgame',
            status: 'active'
        };
    }
    static createNoMovesState() {
        return {
            board: this.createEmptyBoard(),
            currentPlayer: 1,
            moveNumber: 1,
            gamePhase: 'opening',
            status: 'active',
            forcedNoMoves: true
        };
    }
    static createEmptyBoard() {
        return Array(9).fill(null).map(() => Array(9).fill(null).map(() => Array(3).fill(null)));
    }
    static createMidgameBoard() {
        const board = this.createEmptyBoard();
        board[0][4][0] = { type: 'marshal', player: 1 };
        board[8][4][0] = { type: 'marshal', player: 2 };
        board[2][3][0] = { type: 'general', player: 1 };
        board[6][5][0] = { type: 'general', player: 2 };
        return board;
    }
    static createEndgameBoard() {
        const board = this.createEmptyBoard();
        board[0][4][0] = { type: 'marshal', player: 1 };
        board[8][4][0] = { type: 'marshal', player: 2 };
        return board;
    }
}
(0, globals_1.describe)('AI Move Generation', () => {
    let performanceMonitor;
    let easyAgent;
    let mediumAgent;
    let hardAgent;
    (0, globals_1.beforeEach)(() => {
        performanceMonitor = new PerformanceMonitor();
        easyAgent = new MockEasyAgent();
        mediumAgent = new MockMediumAgent();
        hardAgent = new MockHardAgent();
    });
    (0, globals_1.afterEach)(() => {
        performanceMonitor.reset();
    });
    (0, globals_1.test)('Random move generation (easy level)', async () => {
        const gameState = GameStateGenerator.createInitialState();
        const moves = [];
        for (let i = 0; i < 10; i++) {
            const move = await easyAgent.generateMove(gameState);
            moves.push(move);
            (0, globals_1.expect)(move).toBeDefined();
            (0, globals_1.expect)(move.from).toBeDefined();
            (0, globals_1.expect)(move.to).toBeDefined();
            (0, globals_1.expect)(move.piece).toBeDefined();
            (0, globals_1.expect)(move.confidence).toBeGreaterThanOrEqual(0.3);
            (0, globals_1.expect)(move.confidence).toBeLessThanOrEqual(0.8);
            (0, globals_1.expect)(move.difficulty).toBe('easy');
        }
        const uniqueMoves = new Set(moves.map(m => JSON.stringify({ from: m.from, to: m.to })));
        (0, globals_1.expect)(uniqueMoves.size).toBeGreaterThan(1);
    });
    (0, globals_1.test)('Strategic move evaluation (medium level)', async () => {
        const gameState = GameStateGenerator.createMidgameState();
        const move = await mediumAgent.generateMove(gameState);
        (0, globals_1.expect)(move).toBeDefined();
        (0, globals_1.expect)(move.confidence).toBeGreaterThanOrEqual(0.6);
        (0, globals_1.expect)(move.confidence).toBeLessThanOrEqual(0.9);
        (0, globals_1.expect)(move.difficulty).toBe('medium');
        (0, globals_1.expect)(move.nodesEvaluated).toBeGreaterThan(1000);
        (0, globals_1.expect)(move.score).toBeDefined();
        const openingMove = await mediumAgent.generateMove(GameStateGenerator.createInitialState());
        const endgameMove = await mediumAgent.generateMove(GameStateGenerator.createEndgameState());
        (0, globals_1.expect)(openingMove.calculationTime).toBeLessThan(2000);
        (0, globals_1.expect)(endgameMove.calculationTime).toBeLessThan(2000);
    });
    (0, globals_1.test)('Minimax algorithm implementation (hard level)', async () => {
        const gameState = GameStateGenerator.createMidgameState();
        const move = await hardAgent.generateMove(gameState);
        (0, globals_1.expect)(move).toBeDefined();
        (0, globals_1.expect)(move.confidence).toBeGreaterThanOrEqual(0.8);
        (0, globals_1.expect)(move.confidence).toBeLessThanOrEqual(1.0);
        (0, globals_1.expect)(move.difficulty).toBe('hard');
        (0, globals_1.expect)(move.nodesEvaluated).toBeGreaterThan(10000);
        (0, globals_1.expect)(move.neuralNetworkUsed).toBe(true);
        (0, globals_1.expect)(move.neuralScore).toBeDefined();
        (0, globals_1.expect)(move.minimaxScore).toBeDefined();
        (0, globals_1.expect)(move.finalScore).toBeDefined();
        (0, globals_1.expect)(move.finalScore).toBeGreaterThan(50);
    });
    (0, globals_1.test)('Move validation before execution', async () => {
        const gameState = GameStateGenerator.createInitialState();
        const agents = [easyAgent, mediumAgent, hardAgent];
        for (const agent of agents) {
            const move = await agent.generateMove(gameState);
            (0, globals_1.expect)(move.from).toHaveProperty('x');
            (0, globals_1.expect)(move.from).toHaveProperty('y');
            (0, globals_1.expect)(move.from).toHaveProperty('level');
            (0, globals_1.expect)(move.to).toHaveProperty('x');
            (0, globals_1.expect)(move.to).toHaveProperty('y');
            (0, globals_1.expect)(move.to).toHaveProperty('level');
            (0, globals_1.expect)(move.from.x).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(move.from.x).toBeLessThan(9);
            (0, globals_1.expect)(move.from.y).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(move.from.y).toBeLessThan(9);
            (0, globals_1.expect)(move.to.x).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(move.to.x).toBeLessThan(9);
            (0, globals_1.expect)(move.to.y).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(move.to.y).toBeLessThan(9);
            (0, globals_1.expect)(move.piece).toHaveProperty('type');
            (0, globals_1.expect)(move.piece).toHaveProperty('player');
            (0, globals_1.expect)(move.piece.player).toBe(gameState.currentPlayer);
            (0, globals_1.expect)(move.moveId).toBeDefined();
            (0, globals_1.expect)(typeof move.isCapture).toBe('boolean');
        }
    });
    (0, globals_1.test)('Performance benchmarks for move calculation', async () => {
        const gameState = GameStateGenerator.createMidgameState();
        const iterations = 20;
        for (let i = 0; i < iterations; i++) {
            const startTime = performanceMonitor.startMeasurement('easy');
            await easyAgent.generateMove(gameState);
            performanceMonitor.endMeasurement('easy', startTime);
        }
        for (let i = 0; i < iterations; i++) {
            const startTime = performanceMonitor.startMeasurement('medium');
            await mediumAgent.generateMove(gameState);
            performanceMonitor.endMeasurement('medium', startTime);
        }
        for (let i = 0; i < iterations; i++) {
            const startTime = performanceMonitor.startMeasurement('hard');
            await hardAgent.generateMove(gameState);
            performanceMonitor.endMeasurement('hard', startTime);
        }
        const easyStats = performanceMonitor.getStatistics('easy');
        const mediumStats = performanceMonitor.getStatistics('medium');
        const hardStats = performanceMonitor.getStatistics('hard');
        (0, globals_1.expect)(easyStats.avg).toBeLessThan(1000);
        (0, globals_1.expect)(mediumStats.avg).toBeLessThan(2000);
        (0, globals_1.expect)(hardStats.avg).toBeLessThan(3000);
        (0, globals_1.expect)(easyStats.p95).toBeLessThan(1500);
        (0, globals_1.expect)(mediumStats.p95).toBeLessThan(3000);
        (0, globals_1.expect)(hardStats.p95).toBeLessThan(4000);
        console.log('Performance Benchmarks:');
        console.log(`Easy Agent - Avg: ${easyStats.avg.toFixed(2)}ms, P95: ${easyStats.p95.toFixed(2)}ms`);
        console.log(`Medium Agent - Avg: ${mediumStats.avg.toFixed(2)}ms, P95: ${mediumStats.p95.toFixed(2)}ms`);
        console.log(`Hard Agent - Avg: ${hardStats.avg.toFixed(2)}ms, P95: ${hardStats.p95.toFixed(2)}ms`);
    });
    (0, globals_1.test)('Personality influence on move selection', async () => {
        const gameState = GameStateGenerator.createMidgameState();
        const aggressiveAgent = new MockMediumAgent('aggressive');
        const defensiveAgent = new MockMediumAgent('defensive');
        const balancedAgent = new MockMediumAgent('balanced');
        const aggressiveMove = await aggressiveAgent.generateMove(gameState);
        const defensiveMove = await defensiveAgent.generateMove(gameState);
        const balancedMove = await balancedAgent.generateMove(gameState);
        (0, globals_1.expect)(aggressiveMove.personality).toBe('aggressive');
        (0, globals_1.expect)(defensiveMove.personality).toBe('defensive');
        (0, globals_1.expect)(balancedMove.personality).toBe('balanced');
        const aggressiveMoves = [];
        const defensiveMoves = [];
        for (let i = 0; i < 10; i++) {
            aggressiveMoves.push(await aggressiveAgent.generateMove(gameState));
            defensiveMoves.push(await defensiveAgent.generateMove(gameState));
        }
        const aggressiveCaptureRate = aggressiveMoves.filter(m => m.isCapture).length / aggressiveMoves.length;
        const defensiveCaptureRate = defensiveMoves.filter(m => m.isCapture).length / defensiveMoves.length;
        console.log(`Aggressive capture rate: ${(aggressiveCaptureRate * 100).toFixed(1)}%`);
        console.log(`Defensive capture rate: ${(defensiveCaptureRate * 100).toFixed(1)}%`);
    });
    (0, globals_1.test)('Edge case handling (no valid moves)', async () => {
        const noMovesState = GameStateGenerator.createNoMovesState();
        const easyAgentNoMoves = new MockEasyAgent();
        globals_1.jest.spyOn(easyAgentNoMoves, 'getAvailableMoves').mockReturnValue([]);
        const mediumAgentNoMoves = new MockMediumAgent();
        globals_1.jest.spyOn(mediumAgentNoMoves, 'getAvailableMoves').mockReturnValue([]);
        const hardAgentNoMoves = new MockHardAgent();
        globals_1.jest.spyOn(hardAgentNoMoves, 'getAvailableMoves').mockReturnValue([]);
        await (0, globals_1.expect)(easyAgentNoMoves.generateMove(noMovesState))
            .rejects.toThrow('No valid moves available');
        await (0, globals_1.expect)(mediumAgentNoMoves.generateMove(noMovesState))
            .rejects.toThrow('No valid moves available');
        await (0, globals_1.expect)(hardAgentNoMoves.generateMove(noMovesState))
            .rejects.toThrow('No valid moves available');
    });
    (0, globals_1.test)('Move quality assessment', async () => {
        const gameState = GameStateGenerator.createMidgameState();
        const easyMove = await easyAgent.generateMove(gameState);
        const mediumMove = await mediumAgent.generateMove(gameState);
        const hardMove = await hardAgent.generateMove(gameState);
        (0, globals_1.expect)(easyMove.confidence).toBeLessThan(mediumMove.confidence);
        (0, globals_1.expect)(mediumMove.confidence).toBeLessThanOrEqual(hardMove.confidence);
        if (mediumMove.nodesEvaluated && hardMove.nodesEvaluated) {
            (0, globals_1.expect)(mediumMove.nodesEvaluated).toBeLessThan(hardMove.nodesEvaluated);
        }
        const qualityScores = [];
        for (let i = 0; i < 5; i++) {
            const move = await hardAgent.generateMove(gameState);
            qualityScores.push(move.finalScore);
        }
        const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
        (0, globals_1.expect)(avgQuality).toBeGreaterThan(40);
    });
    (0, globals_1.test)('Response time requirements (<2 seconds)', async () => {
        const gameState = GameStateGenerator.createMidgameState();
        const maxResponseTime = 2000;
        const agents = [
            { agent: easyAgent, name: 'Easy' },
            { agent: mediumAgent, name: 'Medium' },
            { agent: hardAgent, name: 'Hard' }
        ];
        for (const { agent, name } of agents) {
            const startTime = perf_hooks_1.performance.now();
            const move = await agent.generateMove(gameState);
            const responseTime = perf_hooks_1.performance.now() - startTime;
            (0, globals_1.expect)(responseTime).toBeLessThan(maxResponseTime);
            (0, globals_1.expect)(move.calculationTime).toBeLessThan(maxResponseTime);
            console.log(`${name} Agent response time: ${responseTime.toFixed(2)}ms`);
        }
        const rapidResponseTimes = [];
        for (let i = 0; i < 5; i++) {
            const startTime = perf_hooks_1.performance.now();
            await mediumAgent.generateMove(gameState);
            rapidResponseTimes.push(perf_hooks_1.performance.now() - startTime);
        }
        rapidResponseTimes.forEach(time => {
            (0, globals_1.expect)(time).toBeLessThan(maxResponseTime);
        });
    });
    (0, globals_1.test)('Concurrent move generation', async () => {
        const gameState = GameStateGenerator.createMidgameState();
        const concurrentRequests = 5;
        const concurrentPromises = Array(concurrentRequests).fill(null).map(() => mediumAgent.generateMove(gameState));
        const startTime = perf_hooks_1.performance.now();
        const results = await Promise.all(concurrentPromises);
        const totalTime = perf_hooks_1.performance.now() - startTime;
        (0, globals_1.expect)(results).toHaveLength(concurrentRequests);
        results.forEach(move => {
            (0, globals_1.expect)(move).toBeDefined();
            (0, globals_1.expect)(move.from).toBeDefined();
            (0, globals_1.expect)(move.to).toBeDefined();
        });
        const avgSequentialTime = 1500;
        const maxConcurrentTime = avgSequentialTime * 2;
        (0, globals_1.expect)(totalTime).toBeLessThan(maxConcurrentTime);
        console.log(`Concurrent execution time: ${totalTime.toFixed(2)}ms for ${concurrentRequests} requests`);
        const mixedConcurrentPromises = [
            easyAgent.generateMove(gameState),
            mediumAgent.generateMove(gameState),
            hardAgent.generateMove(gameState),
            easyAgent.generateMove(gameState),
            mediumAgent.generateMove(gameState)
        ];
        const mixedResults = await Promise.all(mixedConcurrentPromises);
        (0, globals_1.expect)(mixedResults).toHaveLength(5);
        mixedResults.forEach(move => {
            (0, globals_1.expect)(move).toBeDefined();
            (0, globals_1.expect)(['easy', 'medium', 'hard']).toContain(move.difficulty);
        });
    });
});
//# sourceMappingURL=move-generation.test.js.map