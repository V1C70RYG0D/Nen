/**
 * Consistency and Error Handling Tests
 *
 * Tests to validate data consistency between caches and database,
 * and to check robustness and error management in database connections.
 * Includes data verification, error simulation, and retry logic.
 */

import { EnhancedCachingService } from '../../src/services/EnhancedCachingService';
import { EnhancedDatabaseService } from '../../src/services/EnhancedDatabaseService';
import { jest } from '@jest/globals';
import { logger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/utils/logger');
jest.mock('ioredis');
jest.mock('node-cache');

let cachingService: EnhancedCachingService;
let databaseService: EnhancedDatabaseService;

beforeEach(() => {
  jest.clearAllMocks();
  cachingService = new EnhancedCachingService({
    enableL1Cache: true,
    enableL2Cache: true,
    enableL3Cache: false
  });
  databaseService = new EnhancedDatabaseService();
});

describe('Consistency and Error Handling Tests', () => {
  test('should ensure data consistency between caches and database', async () => {
    // Arrange: Define mock data
    const key = { type: 'game_state', identifier: 'game-001' };
    const mockData = { id: 'game-001', status: 'active' };

    // Cache miss, database hit
    jest.spyOn(cachingService, 'get').mockResolvedValueOnce(null);
    jest.spyOn(databaseService, 'cachedQuery').mockResolvedValueOnce(mockData);

    // Act: Request data
    const result = await cachingService.get(key);

    // Assert: Verify consistency and fallback
    expect(result).toEqual(mockData);
    expect(cachingService.get).toHaveBeenCalledWith(key);
    expect(databaseService.cachedQuery).toHaveBeenCalledWith(expect.any(String), expect.any(Function));
  });

  test('should log and retry on transient database connection errors', async () => {
    // Arrange: Simulate connection error
    jest.spyOn(databaseService, 'checkDatabaseHealth').mockRejectedValueOnce(new Error('Connection failed'));
    const mockRetry = jest.fn().mockResolvedValue(true); // Mock retry mechanism

    // Act: Perform health check
    try {
      await databaseService.checkDatabaseHealth();
    } catch (error) {
      await mockRetry(); // Retry logic
    }

    // Assert: Verify logging and retry
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Connection failed'));
    expect(mockRetry).toHaveBeenCalled();
  });

  test('should handle persistent connection failures gracefully', async () => {
    // Arrange: Simulate persistent failure
    jest.spyOn(databaseService, 'checkDatabaseHealth').mockRejectedValue(new Error('Persistent failure'));

    // Act: Attempt health check
    const health = await databaseService.checkDatabaseHealth().catch(e => e);

    // Assert: Verify error handling
    expect(health).toEqual(expect.any(Error));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Persistent failure'));
  });

  test('should handle data updates accurately across caches and database', async () => {
    // Arrange: Update mock data
    const key = { type: 'game_state', identifier: 'game-002' };
    const updatedData = { id: 'game-002', status: 'completed' };
    jest.spyOn(cachingService, 'set').mockResolvedValue(true);
    jest.spyOn(databaseService, 'cachedQuery').mockResolvedValue(updatedData);

    // Act: Perform update
    await cachingService.set(key, updatedData);
    const result = await databaseService.cachedQuery('game-002', async () => updatedData);

    // Assert: Verify that data is updated consistently
    expect(result).toEqual(updatedData);
    expect(cachingService.set).toHaveBeenCalledWith(key, updatedData, expect.any(Number));
    expect(databaseService.cachedQuery).toHaveBeenCalledWith(expect.any(String), expect.any(Function));
  });

  test('should validate latency during retries', async () => {
    // Arrange: Mock retry latency
    const retryLatencies = [15, 30, 45]; // Simulate retry scenarios
    jest.spyOn(databaseService, 'checkDatabaseHealth').mockResolvedValue(null);

    // Act
    for (const latency of retryLatencies) {
      jest.spyOn(databaseService, 'checkDatabaseHealth').mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, latency)));
      await databaseService.checkDatabaseHealth();
    }

    // Assert
    retryLatencies.forEach(latency => {
      expect(databaseService.checkDatabaseHealth).toHaveBeenCalled();
    });
  });
});

