"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PerformanceMonitor_1 = require("../helpers/PerformanceMonitor");
const AIService_1 = require("../../services/AIService");
const GameStateGenerator_1 = require("../helpers/GameStateGenerator");
const aiService = new AIService_1.AIService();
describe('Performance Benchmarking', () => {
    let monitor;
    beforeAll(() => {
        monitor = new PerformanceMonitor_1.PerformanceMonitor();
    });
    it('should meet timing requirements for evaluation', async () => {
        const startTime = monitor.startMeasurement('evaluationBenchmark');
        const gameState = GameStateGenerator_1.GameStateGenerator.createMidgameState();
        await aiService.getMove('sampleAgentId', gameState);
        const duration = monitor.endMeasurement('evaluationBenchmark', startTime);
        expect(duration).toBeLessThan(1000);
    });
    afterAll(() => {
        console.log('Performance Stats:', monitor.getStatistics('evaluationBenchmark'));
    });
});
//# sourceMappingURL=performance-benchmark.test.js.map