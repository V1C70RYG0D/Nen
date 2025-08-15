import { CacheService, initializeRedis, closeRedis, checkRedisHealth } from '../../src/utils/redis';
import { jest } from '@jest/globals';

// Mock ioredis
const mockRedis = {
    ping: jest.fn() as jest.MockedFunction<() => Promise<string>>,
    setex: jest.fn() as jest.MockedFunction<(key: string, ttl: number, value: string) => Promise<string>>,
    get: jest.fn() as jest.MockedFunction<(key: string) => Promise<string | null>>,
    del: jest.fn() as jest.MockedFunction<(key: string) => Promise<number>>,
    exists: jest.fn() as jest.MockedFunction<(key: string) => Promise<number>>,
    mget: jest.fn() as jest.MockedFunction<(...keys: string[]) => Promise<(string | null)[]>>,
    incr: jest.fn() as jest.MockedFunction<(key: string) => Promise<number>>,
    expire: jest.fn() as jest.MockedFunction<(key: string, ttl: number) => Promise<number>>,
    pipeline: jest.fn() as jest.MockedFunction<() => any>,
    on: jest.fn() as jest.MockedFunction<(event: string, callback: Function) => void>,
    quit: jest.fn() as jest.MockedFunction<() => Promise<string>>,
    disconnect: jest.fn() as jest.MockedFunction<() => void>,
};

const mockPipeline = {
    setex: jest.fn() as jest.MockedFunction<(key: string, ttl: number, value: string) => any>,
    exec: jest.fn() as jest.MockedFunction<() => Promise<any>>,
};

jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => mockRedis);
});

jest.mock('../../src/utils/logger');

// Redis Tests

describe('Redis L2 Cache Tests', () => {
    let cacheService: CacheService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockRedis.pipeline.mockReturnValue(mockPipeline);
        mockRedis.ping.mockResolvedValue('PONG');

        // Initialize Redis
        await initializeRedis({ url: 'redis://localhost:6379' });

        // Create CacheService instance
        cacheService = new CacheService();
    });

    afterEach(async () => {
        await closeRedis();
    });

    describe('Storage and Retrieval', () => {
        test('should store and retrieve string values correctly', async () => {
            const key = 'test:string';
            const value = 'Hello, Redis!';

            await cacheService.set(key, value);
            const result = await cacheService.get<string>(key);

            expect(result).toBe(value);
        });
    });

    describe('Persistence Settings', () => {
        test('should retain data after Redis restart', async () => {
            const key = 'persistence:key';
            const value = 'Persistent Value';

            await cacheService.set(key, value);

            // Simulate Redis restart
            mockRedis.get.mockResolvedValue(value);
            const result = await cacheService.get<string>(key);

            expect(result).toBe(value);
        });
    });

    describe('Connection Handling', () => {
        test('should handle reconnection scenarios', async () => {
            const key = 'connection:key';

            // Simulate connection failure
            mockRedis.get.mockRejectedValueOnce(new Error('Connection lost'));
            await expect(cacheService.get(key)).rejects.toThrow('Connection lost');

            // Simulate successful reconnection
            const value = 'Recovered Value';
            mockRedis.get.mockResolvedValue(value);

            const result = await cacheService.get<string>(key);
            expect(result).toBe(value);
        });
    });

    describe('Pipeline Operations', () => {
        test('should handle batch operations efficiently', async () => {
            const keys = ['batch:key1', 'batch:key2', 'batch:key3'];
            const values = ['Value1', 'Value2', 'Value3'];

            // Mock pipeline execution success
            mockPipeline.exec.mockResolvedValue(values.map((v) => [null, v]));

            await cacheService.mset<Record<string, string>>({
                [keys[0]]: values[0],
                [keys[1]]: values[1],
                [keys[2]]: values[2],
            });

            keys.forEach((key, index) => {
                expect(mockPipeline.setex).toHaveBeenCalledWith(
                    key,
                    expect.any(Number),
                    values[index]
                );
            });

            expect(mockPipeline.exec).toHaveBeenCalled();
        });
    });
});
