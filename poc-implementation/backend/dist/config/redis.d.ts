import Redis from 'ioredis';
declare class RedisClient {
    private static instance;
    private client;
    private subscriber;
    private publisher;
    private constructor();
    static getInstance(): RedisClient;
    private setupEventHandlers;
    getClient(): Redis;
    getSubscriber(): Redis;
    getPublisher(): Redis;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<boolean>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    get(key: string): Promise<any>;
    del(key: string | string[]): Promise<number>;
    exists(key: string): Promise<boolean>;
    expire(key: string, ttl: number): Promise<boolean>;
    publish(channel: string, message: any): Promise<number>;
    subscribe(channel: string, callback: (message: any) => void): Promise<void>;
    unsubscribe(channel?: string): Promise<void>;
    hset(key: string, field: string, value: any): Promise<number>;
    hget(key: string, field: string): Promise<any>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    lpush(key: string, ...values: any[]): Promise<number>;
    rpop(key: string): Promise<any>;
    sadd(key: string, ...members: any[]): Promise<number>;
    smembers(key: string): Promise<any[]>;
}
export declare const getRedisClient: () => RedisClient;
export { RedisClient };
export default RedisClient;
//# sourceMappingURL=redis.d.ts.map