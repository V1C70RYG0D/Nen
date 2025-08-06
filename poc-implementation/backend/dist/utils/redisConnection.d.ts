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
    mget(keys: string[]): Promise<(string | null)[]>;
    incr(key: string): Promise<number>;
    lpush(key: string, ...values: string[]): Promise<number>;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
    hset(key: string, field: string, value: string): Promise<number>;
    hget(key: string, field: string): Promise<string | null>;
    hgetall(key: string): Promise<Record<string, string>>;
    publish(channel: string, message: string): Promise<number>;
    pipeline(): import("ioredis").ChainableCommander;
    quit(): Promise<'OK'>;
    disconnect(): Promise<void>;
    get connected(): boolean;
}
export declare function initializeRedis(config?: RedisConfig): Promise<RedisConnection>;
export declare function getRedis(): RedisConnection;
export declare function closeRedis(): Promise<void>;
export declare class RedisPool {
    private connections;
    private maxConnections;
    private currentIndex;
    constructor(maxConnections?: number);
    initialize(config?: RedisConfig): Promise<void>;
    getConnection(): RedisConnection;
    close(): Promise<void>;
}
export default RedisConnection;
//# sourceMappingURL=redisConnection.d.ts.map