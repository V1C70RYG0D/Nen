import { MockRedisClient } from './mocks/redisMock';
import { MockDatabaseClient } from './mocks/databaseMock';
export declare function getTestRedisClient(): MockRedisClient;
export declare function getTestDatabaseClient(): MockDatabaseClient;
export declare function getTestSolanaConnection(): any;
export declare function setupTestEnvironment(): Promise<void>;
export declare function cleanupTestEnvironment(): Promise<void>;
export declare function validateTestEnvironment(): void;
//# sourceMappingURL=setup.d.ts.map