import { PerformanceMonitor } from '../helpers/PerformanceMonitor';
import { AIService } from '../../services/AIService';
import { GameStateGenerator } from '../helpers/GameStateGenerator';

const aiService = new AIService();

describe('Performance Benchmarking', () => {
  let monitor: PerformanceMonitor;

  beforeAll(() => {
    monitor = new PerformanceMonitor();
  });

  it('should meet timing requirements for evaluation', async () => {
    const startTime = monitor.startMeasurement('evaluationBenchmark');
    const gameState = GameStateGenerator.createMidgameState();
    await aiService.getMove('sampleAgentId', gameState);
    const duration = monitor.endMeasurement('evaluationBenchmark', startTime);
    expect(duration).toBeLessThan(1000); // Assume 1 second requirement
  });

  afterAll(() => {
    console.log('Performance Stats:', monitor.getStatistics('evaluationBenchmark'));
  });
});

