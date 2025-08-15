/**
 * Mock Implementation for Redis Cache Service
 */
export declare class MockRedisClient {
    private store;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: string, duration?: number): Promise<string>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<number>;
    flushall(): Promise<string>;
    ping(): Promise<string>;
    quit(): Promise<string>;
    on(event: string, callback: Function): void;
}
export declare const createMockRedisClient: () => MockRedisClient;
//# sourceMappingURL=redisMock.d.ts.map