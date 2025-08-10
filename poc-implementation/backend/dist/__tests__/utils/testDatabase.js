"use strict";
/**
 * Test Database Utilities
 * Provides real database setup, seeding, and cleanup for comprehensive testing
 * Following GI guidelines - real implementations over mocks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPrisma = exports.waitForDatabase = exports.withTestTransaction = exports.getTestData = exports.teardownTestDatabase = exports.seedTestDatabase = exports.setupTestDatabase = exports.getTestDatabaseClient = void 0;
const client_1 = require("@prisma/client");
const mockServices_1 = require("../mocks/mockServices");
let testPrisma = null;
exports.testPrisma = testPrisma;
let useRealDatabase = false;
// Determine if we should use real database or mock
const shouldUseRealDatabase = () => {
    return Boolean(process.env.NODE_ENV === 'test' &&
        process.env.DATABASE_URL &&
        process.env.USE_REAL_DB_FOR_TESTS === 'true');
};
/**
 * Get database client - real or mock based on environment
 */
const getTestDatabaseClient = () => {
    if (shouldUseRealDatabase()) {
        if (!testPrisma) {
            exports.testPrisma = testPrisma = new client_1.PrismaClient({
                datasources: {
                    db: {
                        url: process.env.DATABASE_URL + '_test' // Use separate test database
                    }
                },
                log: process.env.LOG_LEVEL === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error']
            });
            useRealDatabase = true;
        }
        return testPrisma;
    }
    return mockServices_1.mockPrismaClient;
};
exports.getTestDatabaseClient = getTestDatabaseClient;
/**
 * Setup test database with clean slate
 */
const setupTestDatabase = async () => {
    const client = (0, exports.getTestDatabaseClient)();
    if (useRealDatabase && testPrisma) {
        try {
            // Clear existing test data in correct order due to foreign key constraints
            await testPrisma.$executeRaw `TRUNCATE TABLE "moves" CASCADE`;
            await testPrisma.$executeRaw `TRUNCATE TABLE "bets" CASCADE`;
            await testPrisma.$executeRaw `TRUNCATE TABLE "games" CASCADE`;
            await testPrisma.$executeRaw `TRUNCATE TABLE "training_results" CASCADE`;
            await testPrisma.$executeRaw `TRUNCATE TABLE "notifications" CASCADE`;
            await testPrisma.$executeRaw `TRUNCATE TABLE "nfts" CASCADE`;
            await testPrisma.$executeRaw `TRUNCATE TABLE "sessions" CASCADE`;
            await testPrisma.$executeRaw `TRUNCATE TABLE "users" CASCADE`;
            // Create test data
            await (0, exports.seedTestDatabase)();
            console.log('Test database setup completed with real database');
        }
        catch (error) {
            console.error('Test database setup failed:', error);
            throw error;
        }
    }
    else {
        // Reset mocks for consistent state
        Object.values(mockServices_1.mockPrismaClient).forEach((model) => {
            if (model && typeof model === 'object') {
                Object.values(model).forEach((method) => {
                    if (jest.isMockFunction(method)) {
                        method.mockClear();
                    }
                });
            }
        });
        console.log('Test database setup completed with mocks');
    }
};
exports.setupTestDatabase = setupTestDatabase;
/**
 * Seed test database with realistic data
 */
const seedTestDatabase = async () => {
    const client = (0, exports.getTestDatabaseClient)();
    if (useRealDatabase && testPrisma) {
        try {
            // Create test users using actual schema fields
            const testUser1 = await testPrisma.user.create({
                data: {
                    id: 'test-user-1',
                    username: 'testuser1',
                    email: 'testuser1@example.com',
                    address: '4A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z',
                    level: 1,
                    experience: 0,
                    winRate: 0.65,
                    totalGames: 10,
                    isActive: true
                }
            });
            const testUser2 = await testPrisma.user.create({
                data: {
                    id: 'test-user-2',
                    username: 'testuser2',
                    email: 'testuser2@example.com',
                    address: '5B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z1A',
                    level: 2,
                    experience: 150,
                    winRate: 0.58,
                    totalGames: 8,
                    isActive: true
                }
            });
            // Create test games (not AI agents - this schema doesn't have separate AI agents)
            const testGame = await testPrisma.game.create({
                data: {
                    id: 'test-game-1',
                    player1Id: testUser1.id,
                    player2Id: testUser2.id,
                    status: 'WAITING',
                    betAmount: 10.0,
                    aiDifficulty: 'medium',
                    boardState: {
                        pieces: [],
                        turn: 'player1'
                    },
                    moveHistory: []
                }
            });
            // Create test bets
            await testPrisma.bet.createMany({
                data: [
                    {
                        id: 'test-bet-1',
                        userId: testUser1.id,
                        gameId: testGame.id,
                        agentId: testUser1.id,
                        amount: 10.0,
                        odds: 1.5,
                        status: 'PENDING'
                    },
                    {
                        id: 'test-bet-2',
                        userId: testUser2.id,
                        gameId: testGame.id,
                        agentId: testUser2.id,
                        amount: 5.0,
                        odds: 2.0,
                        status: 'PENDING'
                    }
                ]
            });
            console.log('Test database seeded successfully');
        }
        catch (error) {
            console.error('Test database seeding failed:', error);
            throw error;
        }
    }
    // For mocks, the data is already set up in mockServices.ts
};
exports.seedTestDatabase = seedTestDatabase;
/**
 * Clean up test database
 */
const teardownTestDatabase = async () => {
    if (useRealDatabase && testPrisma) {
        try {
            // Clean up all test data in correct order
            await testPrisma.bet.deleteMany();
            await testPrisma.game.deleteMany();
            await testPrisma.user.deleteMany();
            // Disconnect from database
            await testPrisma.$disconnect();
            exports.testPrisma = testPrisma = null;
            console.log('Test database teardown completed');
        }
        catch (error) {
            console.error('Test database teardown failed:', error);
            // Still disconnect even if cleanup failed
            if (testPrisma) {
                await testPrisma.$disconnect();
                exports.testPrisma = testPrisma = null;
            }
        }
    }
    useRealDatabase = false;
};
exports.teardownTestDatabase = teardownTestDatabase;
/**
 * Get test data references for use in tests
 */
const getTestData = () => ({
    users: {
        testUser1: 'test-user-1',
        testUser2: 'test-user-2'
    },
    agents: {
        testAgent1: 'test-agent-1',
        testAgent2: 'test-agent-2'
    },
    matches: {
        testMatch1: 'test-match-1'
    },
    bets: {
        testBet1: 'test-bet-1',
        testBet2: 'test-bet-2'
    },
    wallets: {
        testWallet1: '4A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z',
        testWallet2: '5B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z1A'
    }
});
exports.getTestData = getTestData;
/**
 * Create isolated test transaction
 * Useful for tests that need to rollback changes
 */
const withTestTransaction = async (callback) => {
    const client = (0, exports.getTestDatabaseClient)();
    if (useRealDatabase && testPrisma) {
        return await testPrisma.$transaction(async (tx) => {
            return await callback(tx);
        });
    }
    else {
        // For mocks, just run the callback
        return await callback(client);
    }
};
exports.withTestTransaction = withTestTransaction;
/**
 * Wait for database to be ready
 */
const waitForDatabase = async (maxAttempts = 30, delay = 1000) => {
    const client = (0, exports.getTestDatabaseClient)();
    if (useRealDatabase && testPrisma) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await testPrisma.$queryRaw `SELECT 1`;
                console.log(`Database connection established on attempt ${attempt}`);
                return;
            }
            catch (error) {
                if (attempt === maxAttempts) {
                    throw new Error(`Database not ready after ${maxAttempts} attempts: ${error}`);
                }
                console.log(`Database not ready, attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    // Mocks are always "ready"
};
exports.waitForDatabase = waitForDatabase;
//# sourceMappingURL=testDatabase.js.map