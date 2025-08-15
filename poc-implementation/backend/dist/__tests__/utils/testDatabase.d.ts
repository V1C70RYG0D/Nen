/**
 * Test Database Utilities
 * Provides real database setup, seeding, and cleanup for comprehensive testing
 * Following GI guidelines - real implementations over mocks
 */
import { PrismaClient } from '@prisma/client';
declare let testPrisma: PrismaClient | null;
/**
 * Get database client - real or mock based on environment
 */
export declare const getTestDatabaseClient: () => any;
/**
 * Setup test database with clean slate
 */
export declare const setupTestDatabase: () => Promise<void>;
/**
 * Seed test database with realistic data
 */
export declare const seedTestDatabase: () => Promise<void>;
/**
 * Clean up test database
 */
export declare const teardownTestDatabase: () => Promise<void>;
/**
 * Get test data references for use in tests
 */
export declare const getTestData: () => {
    users: {
        testUser1: string;
        testUser2: string;
    };
    agents: {
        testAgent1: string;
        testAgent2: string;
    };
    matches: {
        testMatch1: string;
    };
    bets: {
        testBet1: string;
        testBet2: string;
    };
    wallets: {
        testWallet1: string;
        testWallet2: string;
    };
};
/**
 * Create isolated test transaction
 * Useful for tests that need to rollback changes
 */
export declare const withTestTransaction: <T>(callback: (client: PrismaClient) => Promise<T>) => Promise<T>;
/**
 * Wait for database to be ready
 */
export declare const waitForDatabase: (maxAttempts?: number, delay?: number) => Promise<void>;
export { testPrisma };
//# sourceMappingURL=testDatabase.d.ts.map