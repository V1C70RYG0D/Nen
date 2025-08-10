/**
 * Jest Test Setup File
 * Following GI guidelines - real implementations with comprehensive testing
 */
import 'jest-extended';
import { setupTestDatabase, teardownTestDatabase } from './utils/testDatabase';
declare global {
    namespace jest {
        interface Matchers<R> {
            toHaveProperty(property: string, value?: any): R;
            toBe(expected: any): R;
            toEqual(expected: any): R;
        }
    }
}
export declare function getTestRedisClient(): {
    get: jest.Mock<any, any, any>;
    set: jest.Mock<any, any, any>;
    del: jest.Mock<any, any, any>;
    exists: jest.Mock<any, any, any>;
    hget: jest.Mock<any, any, any>;
    hset: jest.Mock<any, any, any>;
    hgetall: jest.Mock<any, any, any>;
    incr: jest.Mock<any, any, any>;
    expire: jest.Mock<any, any, any>;
    ttl: jest.Mock<any, any, any>;
    flushall: jest.Mock<any, any, any>;
    disconnect: jest.Mock<any, any, any>;
};
export declare function getTestSolanaConnection(): {
    getBalance: jest.Mock<any, any, any>;
    getAccountInfo: jest.Mock<any, any, any>;
    sendTransaction: jest.Mock<any, any, any>;
    confirmTransaction: jest.Mock<any, any, any>;
    getRecentBlockhash: jest.Mock<any, any, any>;
    requestAirdrop: jest.Mock<any, any, any>;
};
export declare function cleanupTestEnvironment(): Promise<void>;
export { setupTestDatabase, teardownTestDatabase };
export {};
//# sourceMappingURL=setup.d.ts.map