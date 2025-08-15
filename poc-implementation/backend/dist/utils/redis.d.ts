import Redis from 'ioredis';
export interface RedisConfig {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    retryDelayOnFailover?: number;
    maxRetriesPerRequest?: number;
    lazyConnect?: boolean;
}
export declare function initializeRedis(config?: RedisConfig): Promise<Redis>;
export declare function getRedis(): Redis;
export declare function closeRedis(): Promise<void>;
export declare class CacheService {
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
export declare function checkRedisHealth(): Promise<boolean>;
//# sourceMappingURL=redis.d.ts.map