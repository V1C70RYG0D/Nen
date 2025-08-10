import { GameService } from '../../src/services/GameService';
import { initializeRedis, closeRedis } from '../../src/utils/redis';
import { jest } from '@jest/globals';

describe('Match Timeout Management Tests', () => {
  let gameService: GameService;

  beforeAll(async () => {
    await initializeRedis();
    gameService = new GameService();
  });

  afterAll(async () => {
    await closeRedis();
  });

  test('should detect match timeout', async () => {
    const match = await gameService.createMatch({ matchType: 'ai_vs_ai' });
    // Simulate passage of time
    jest.advanceTimersByTime(120000); // 2 minutes
    await gameService.checkTimeouts();
    const updatedMatch = await gameService.getMatch(match.id);
    expect(updatedMatch.status).toBe('timeout');
  });

  test('should terminate match automatically after timeout', async () => {
    const match = await gameService.createMatch({ matchType: 'ai_vs_ai' });
    jest.advanceTimersByTime(120000);
    await gameService.checkTimeouts();
    const updatedMatch = await gameService.getMatch(match.id);
    expect(updatedMatch.status).toBe('completed');
  });

  test('should respect configurable timeout values', async () => {
    process.env.TIMEOUT_DURATION = '180';
    const match = await gameService.createMatch({ matchType: 'ai_vs_ai' });
    jest.advanceTimersByTime(180000);
    await gameService.checkTimeouts();
    const updatedMatch = await gameService.getMatch(match.id);
    expect(updatedMatch.status).toBe('timeout');
  });

  test('should clean resources after timeout', async () => {
    const match = await gameService.createMatch({ matchType: 'ai_vs_ai' });
    jest.advanceTimersByTime(120000);
    await gameService.checkTimeouts();
    expect(await gameService.getMatch(match.id)).toBeNull();
  });

  test('should extend timeout correctly', async () => {
    const match = await gameService.createMatch({ matchType: 'ai_vs_ai' });
    await gameService.extendTimeout(match.id, 60); // Extend by 60 seconds
    jest.advanceTimersByTime(180000); // Originally 120 + 60
    await gameService.checkTimeouts();
    const updatedMatch = await gameService.getMatch(match.id);
    expect(updatedMatch.status).toBe('timeout');
  });

  test('should notify on timeout', async () => {
    const match = await gameService.createMatch({ matchType: 'ai_vs_ai' });
    jest.advanceTimersByTime(120000);
    const loggerSpy = jest.spyOn(console, 'log');
    await gameService.checkTimeouts();
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Match timed out'));
  });
});
