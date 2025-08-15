export interface RedisConfig {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    retryDelayOnFailover?: number;
    maxRetriesPerRequest?: number;
    lazyConnect?: boolean;
}
export declare class RedisConnection {
    private client;
    private isConnected;
    constructor(config?: string | RedisConfig);
    private setupEventHandlers;
    ping(): Promise<string>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<'OK'>;
    setex(key: string, seconds: number, value: string): Promise<'OK'>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<number>;
    mget(...keys: string[]): Promise<(string | null)[]>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    lpush(key: string, value: string): Promise<number>;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    publish(channel: string, message: string): Promise<number>;
    pipeline(): MockPipeline;
    on(event: string, callback: Function): void;
    quit(): Promise<'OK'>;
}
declare class MockPipeline {
    private redis;
    private commands;
    constructor(redis: MockRedis);
    incr(key: string): this;
    expire(key: string, seconds: number): this;
    setex(key: string, seconds: number, value: string): this;
    exec(): Promise<[null, any][]>;
}
export declare function initializeMockRedis(config?: MockRedisConfig): Promise<MockRedis>;
export declare function getMockRedis(): MockRedis;
export declare function closeMockRedis(): Promise<void>;
export declare class MockCacheService {
    private redis;
    constructor();
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    get<T = any>(key: string): Promise<T | null>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<void>;
    mget<T = any>(keys: string[]): Promise<(T | null)[]>;
    incr(key: string): Promise<number>;
    incrWithTTL(key: string, ttlSeconds?: number): Promise<number>;
    lpush(key: string, value: any): Promise<void>;
    lrange<T = any>(key: string, start?: number, stop?: number): Promise<T[]>;
    publish(channel: string, message: any): Promise<void>;
}
export declare function checkMockRedisHealth(): Promise<boolean>;
export {};
//# sourceMappingURL=mockRedis.d.ts.map