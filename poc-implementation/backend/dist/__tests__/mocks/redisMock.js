"use strict";
/**
 * Mock Implementation for Redis Cache Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockRedisClient = exports.MockRedisClient = void 0;
class MockRedisClient {
    constructor() {
        this.store = new Map();
    }
    async get(key) {
        return this.store.get(key) || null;
    }
    async set(key, value, mode, duration) {
        this.store.set(key, value);
        if (mode === 'EX' && duration) {
            // Mock expiration by setting a timeout
            setTimeout(() => {
                this.store.delete(key);
            }, duration * 1000);
        }
        return 'OK';
    }
    async del(key) {
        const existed = this.store.has(key);
        this.store.delete(key);
        return existed ? 1 : 0;
    }
    async exists(key) {
        return this.store.has(key) ? 1 : 0;
    }
    async flushall() {
        this.store.clear();
        return 'OK';
    }
    async ping() {
        return 'PONG';
    }
    async quit() {
        this.store.clear();
        return 'OK';
    }
    // Mock connection events
    on(event, callback) {
        // Mock event handling
        if (event === 'connect') {
            setTimeout(callback, 10);
        }
    }
}
exports.MockRedisClient = MockRedisClient;
const createMockRedisClient = () => {
    return new MockRedisClient();
};
exports.createMockRedisClient = createMockRedisClient;
//# sourceMappingURL=redisMock.js.map