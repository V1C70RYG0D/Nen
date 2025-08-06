"use strict";
/**
 * Test Utilities for Comprehensive Testing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestEnvironmentUtils = exports.ParameterizedTestHelpers = exports.ErrorTestUtils = exports.MockDataFactory = exports.ValidationTestUtils = exports.PerformanceTestUtils = exports.TestDataGenerator = void 0;
const jest_each_1 = __importDefault(require("jest-each"));
const faker_1 = require("@faker-js/faker");
// Test data generators using Faker for realistic data
class TestDataGenerator {
    static generateValidBetAmounts() {
        return [
            0.1, // Minimum
            0.5, // Low
            1.0, // Standard
            5.0, // Medium
            50.0, // High
            100.0 // Maximum
        ];
    }
    static generateInvalidBetAmounts() {
        return [
            0, // Zero
            0.05, // Below minimum
            -1, // Negative
            101, // Above maximum
            1000, // Way too high
            NaN, // Invalid number
            Infinity // Infinite
        ];
    }
    static generateWalletAddresses(count = 5) {
        return Array.from({ length: count }, () => faker_1.faker.string.alphanumeric(44) // Solana wallet length
        );
    }
    static generateMatchIds(count = 5) {
        return Array.from({ length: count }, () => `match-${faker_1.faker.string.uuid()}`);
    }
    static generateAgentIds() {
        return [
            'royal_guard_alpha',
            'phantom_striker',
            'quantum_bishop',
            'shadow_knight',
            'lightning_rook'
        ];
    }
    static generateBetScenarios() {
        return [
            {
                name: 'valid standard bet',
                wallet: this.generateWalletAddresses(1)[0],
                matchId: this.generateMatchIds(1)[0],
                amount: 1.5,
                agent: 'royal_guard_alpha',
                expectedSuccess: true
            },
            {
                name: 'minimum valid bet',
                wallet: this.generateWalletAddresses(1)[0],
                matchId: this.generateMatchIds(1)[0],
                amount: 0.1,
                agent: 'phantom_striker',
                expectedSuccess: true
            },
            {
                name: 'maximum valid bet',
                wallet: this.generateWalletAddresses(1)[0],
                matchId: this.generateMatchIds(1)[0],
                amount: 100.0,
                agent: 'quantum_bishop',
                expectedSuccess: true
            },
            {
                name: 'invalid low amount',
                wallet: this.generateWalletAddresses(1)[0],
                matchId: this.generateMatchIds(1)[0],
                amount: 0.05,
                agent: 'shadow_knight',
                expectedSuccess: false
            },
            {
                name: 'invalid high amount',
                wallet: this.generateWalletAddresses(1)[0],
                matchId: this.generateMatchIds(1)[0],
                amount: 150.0,
                agent: 'lightning_rook',
                expectedSuccess: false
            }
        ];
    }
}
exports.TestDataGenerator = TestDataGenerator;
// Performance test utilities
class PerformanceTestUtils {
    static async measureAsyncFunction(fn, iterations = 1) {
        const times = [];
        const results = [];
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            const result = await fn();
            const endTime = performance.now();
            times.push(endTime - startTime);
            results.push(result);
        }
        return {
            results,
            averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
            minTime: Math.min(...times),
            maxTime: Math.max(...times),
            totalTime: times.reduce((sum, time) => sum + time, 0)
        };
    }
    static createPerformanceThresholds() {
        return {
            betPlacement: 1000, // 1 second max
            oddsCalculation: 100, // 100ms max
            poolUpdate: 500, // 500ms max
            databaseWrite: 2000, // 2 seconds max
            redisCache: 50 // 50ms max
        };
    }
}
exports.PerformanceTestUtils = PerformanceTestUtils;
// Validation test utilities
class ValidationTestUtils {
    static createValidationTestCases() {
        return {
            walletValidation: [
                { input: '', valid: false, description: 'empty wallet' },
                { input: null, valid: false, description: 'null wallet' },
                { input: undefined, valid: false, description: 'undefined wallet' },
                { input: 'valid-wallet-123', valid: true, description: 'valid wallet' },
                { input: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', valid: true, description: 'valid solana wallet' }
            ],
            amountValidation: [
                { input: 0, valid: false, description: 'zero amount' },
                { input: -1, valid: false, description: 'negative amount' },
                { input: 0.05, valid: false, description: 'below minimum' },
                { input: 0.1, valid: true, description: 'minimum valid' },
                { input: 50, valid: true, description: 'mid-range valid' },
                { input: 100, valid: true, description: 'maximum valid' },
                { input: 101, valid: false, description: 'above maximum' },
                { input: NaN, valid: false, description: 'not a number' },
                { input: Infinity, valid: false, description: 'infinite' }
            ],
            matchIdValidation: [
                { input: '', valid: false, description: 'empty match ID' },
                { input: null, valid: false, description: 'null match ID' },
                { input: undefined, valid: false, description: 'undefined match ID' },
                { input: 'match-123', valid: true, description: 'valid match ID' },
                { input: faker_1.faker.string.uuid(), valid: true, description: 'UUID match ID' }
            ]
        };
    }
}
exports.ValidationTestUtils = ValidationTestUtils;
// Mock data factories
class MockDataFactory {
    static createBettingPool(overrides = {}) {
        return {
            matchId: faker_1.faker.string.uuid(),
            totalPool: 0,
            betsCount: 0,
            isActive: true,
            bets: [],
            createdAt: new Date(),
            ...overrides
        };
    }
    static createBetData(overrides = {}) {
        return {
            id: faker_1.faker.string.uuid(),
            matchId: faker_1.faker.string.uuid(),
            bettorWallet: faker_1.faker.string.alphanumeric(44),
            amount: faker_1.faker.number.int({ min: 100000000, max: 10000000000 }), // 0.1 to 100 SOL in lamports
            predictedWinner: faker_1.faker.helpers.arrayElement(TestDataGenerator.generateAgentIds()),
            predictedWinnerType: 'ai_agent',
            odds: faker_1.faker.number.float({ min: 1.01, max: 10.0, fractionDigits: 2 }),
            placedAt: faker_1.faker.date.recent(),
            status: 'active',
            potentialPayout: 0, // Will be calculated
            escrowAccount: `escrow-${faker_1.faker.string.uuid()}`,
            ...overrides
        };
    }
    static createMatchData(overrides = {}) {
        return {
            id: faker_1.faker.string.uuid(),
            players: [faker_1.faker.person.firstName(), faker_1.faker.person.firstName()],
            status: faker_1.faker.helpers.arrayElement(['pending', 'active', 'completed']),
            startTime: faker_1.faker.date.future(),
            endTime: null,
            winner: null,
            ...overrides
        };
    }
    static createUserData(overrides = {}) {
        return {
            id: faker_1.faker.string.uuid(),
            wallet: faker_1.faker.string.alphanumeric(44),
            balance: faker_1.faker.number.int({ min: 1000000000, max: 100000000000 }), // 1 to 1000 SOL in lamports
            username: faker_1.faker.internet.userName(),
            email: faker_1.faker.internet.email(),
            createdAt: faker_1.faker.date.past(),
            ...overrides
        };
    }
}
exports.MockDataFactory = MockDataFactory;
// Error testing utilities
class ErrorTestUtils {
    static createErrorScenarios() {
        return [
            {
                name: 'Network timeout',
                error: new Error('Network request timed out'),
                expectedBehavior: 'should retry with backoff'
            },
            {
                name: 'Invalid signature',
                error: new Error('Transaction signature verification failed'),
                expectedBehavior: 'should reject transaction'
            },
            {
                name: 'Insufficient funds',
                error: new Error('Insufficient funds for transaction'),
                expectedBehavior: 'should return user-friendly error'
            },
            {
                name: 'Service unavailable',
                error: new Error('Service temporarily unavailable'),
                expectedBehavior: 'should queue request for retry'
            }
        ];
    }
    static async expectAsyncError(fn, expectedError) {
        try {
            await fn();
            throw new Error('Expected function to throw an error');
        }
        catch (error) {
            if (typeof expectedError === 'string') {
                expect(error.message).toContain(expectedError);
            }
            else {
                expect(error.message).toMatch(expectedError);
            }
        }
    }
}
exports.ErrorTestUtils = ErrorTestUtils;
// Parameterized test helpers using jest-each
class ParameterizedTestHelpers {
    static createBetAmountTests() {
        const validAmounts = TestDataGenerator.generateValidBetAmounts();
        const invalidAmounts = TestDataGenerator.generateInvalidBetAmounts();
        return {
            validAmounts: (0, jest_each_1.default)(validAmounts.map(amount => [amount])),
            invalidAmounts: (0, jest_each_1.default)(invalidAmounts.map(amount => [amount])),
            mixedAmounts: (0, jest_each_1.default)([...validAmounts, ...invalidAmounts].map(amount => [amount, validAmounts.includes(amount)]))
        };
    }
    static createConcurrencyTests() {
        const concurrencyLevels = [1, 5, 10, 25, 50, 100];
        return (0, jest_each_1.default)(concurrencyLevels.map(level => [level]));
    }
    static createOddsCalculationTests() {
        return (0, jest_each_1.default)([
            [1000000000, 2000000000, 1.67], // 1 SOL bet, 2 SOL pool, expected odds ~1.67
            [500000000, 1000000000, 2.0], // 0.5 SOL bet, 1 SOL pool, expected odds ~2.0
            [2000000000, 1000000000, 1.5], // 2 SOL bet, 1 SOL pool, expected odds ~1.5
        ]);
    }
}
exports.ParameterizedTestHelpers = ParameterizedTestHelpers;
// Test environment utilities
class TestEnvironmentUtils {
    static setupTestTimeout(timeout = 30000) {
        jest.setTimeout(timeout);
    }
    static createTestLogger() {
        return {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };
    }
    static mockEnvironmentVariables(vars) {
        const originalEnv = process.env;
        beforeEach(() => {
            process.env = { ...originalEnv, ...vars };
        });
        afterEach(() => {
            process.env = originalEnv;
        });
    }
    static createCleanupHandler() {
        const resources = [];
        return {
            addCleanup: (cleanup) => {
                resources.push(cleanup);
            },
            cleanup: async () => {
                for (const cleanup of resources) {
                    await cleanup();
                }
                resources.length = 0;
            }
        };
    }
}
exports.TestEnvironmentUtils = TestEnvironmentUtils;
//# sourceMappingURL=testUtils.js.map