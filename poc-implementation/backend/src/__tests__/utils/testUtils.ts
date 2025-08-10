/**
 * Test Utilities for Comprehensive Testing
 */

import each from 'jest-each';
import { faker } from '@faker-js/faker';

// Test data generators using Faker for realistic data
export class TestDataGenerator {
  static generateValidBetAmounts(): number[] {
    return [
      0.1,   // Minimum
      0.5,   // Low
      1.0,   // Standard
      5.0,   // Medium
      50.0,  // High
      100.0  // Maximum
    ];
  }

  static generateInvalidBetAmounts(): number[] {
    return [
      0,      // Zero
      0.05,   // Below minimum
      -1,     // Negative
      101,    // Above maximum
      1000,   // Way too high
      NaN,    // Invalid number
      Infinity // Infinite
    ];
  }

  static generateWalletAddresses(count: number = 5): string[] {
    return Array.from({ length: count }, () =>
      faker.string.alphanumeric(44) // Solana wallet length
    );
  }

  static generateMatchIds(count: number = 5): string[] {
    return Array.from({ length: count }, () =>
      `match-${faker.string.uuid()}`
    );
  }

  static generateAgentIds(): string[] {
    return [
      'royal_guard_alpha',
      'phantom_striker',
      'quantum_bishop',
      'shadow_knight',
      'lightning_rook'
    ];
  }

  static generateBetScenarios(): Array<{
    name: string;
    wallet: string;
    matchId: string;
    amount: number;
    agent: string;
    expectedSuccess: boolean;
  }> {
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

// Performance test utilities
export class PerformanceTestUtils {
  static async measureAsyncFunction<T>(
    fn: () => Promise<T>,
    iterations: number = 1
  ): Promise<{
    results: T[];
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
  }> {
    const times: number[] = [];
    const results: T[] = [];

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
      betPlacement: 1000,      // 1 second max
      oddsCalculation: 100,    // 100ms max
      poolUpdate: 500,         // 500ms max
      databaseWrite: 2000,     // 2 seconds max
      redisCache: 50           // 50ms max
    };
  }
}

// Validation test utilities
export class ValidationTestUtils {
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
        { input: faker.string.uuid(), valid: true, description: 'UUID match ID' }
      ]
    };
  }
}

// Mock data factories
export class MockDataFactory {
  static createBettingPool(overrides: any = {}) {
    return {
      matchId: faker.string.uuid(),
      totalPool: 0,
      betsCount: 0,
      isActive: true,
      bets: [],
      createdAt: new Date(),
      ...overrides
    };
  }

  static createBetData(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      matchId: faker.string.uuid(),
      bettorWallet: faker.string.alphanumeric(44),
      amount: faker.number.int({ min: 100000000, max: 10000000000 }), // 0.1 to 100 SOL in lamports
      predictedWinner: faker.helpers.arrayElement(TestDataGenerator.generateAgentIds()),
      predictedWinnerType: 'ai_agent',
      odds: faker.number.float({ min: 1.01, max: 10.0, fractionDigits: 2 }),
      placedAt: faker.date.recent(),
      status: 'active' as const,
      potentialPayout: 0, // Will be calculated
      escrowAccount: `escrow-${faker.string.uuid()}`,
      ...overrides
    };
  }

  static createMatchData(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      players: [faker.person.firstName(), faker.person.firstName()],
      status: faker.helpers.arrayElement(['pending', 'active', 'completed']),
      startTime: faker.date.future(),
      endTime: null,
      winner: null,
      ...overrides
    };
  }

  static createUserData(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      wallet: faker.string.alphanumeric(44),
      balance: faker.number.int({ min: 1000000000, max: 100000000000 }), // 1 to 1000 SOL in lamports
      username: faker.internet.userName(),
      email: faker.internet.email(),
      createdAt: faker.date.past(),
      ...overrides
    };
  }
}

// Error testing utilities
export class ErrorTestUtils {
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

  static async expectAsyncError(
    fn: () => Promise<any>,
    expectedError: string | RegExp
  ): Promise<void> {
    try {
      await fn();
      throw new Error('Expected function to throw an error');
    } catch (error: any) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError);
      } else {
        expect(error.message).toMatch(expectedError);
      }
    }
  }
}

// Parameterized test helpers using jest-each
export class ParameterizedTestHelpers {
  static createBetAmountTests() {
    const validAmounts = TestDataGenerator.generateValidBetAmounts();
    const invalidAmounts = TestDataGenerator.generateInvalidBetAmounts();

    return {
      validAmounts: each(validAmounts.map(amount => [amount])),
      invalidAmounts: each(invalidAmounts.map(amount => [amount])),
      mixedAmounts: each([...validAmounts, ...invalidAmounts].map(amount => [amount, validAmounts.includes(amount)]))
    };
  }

  static createConcurrencyTests() {
    const concurrencyLevels = [1, 5, 10, 25, 50, 100];
    return each(concurrencyLevels.map(level => [level]));
  }

  static createOddsCalculationTests() {
    return each([
      [1000000000, 2000000000, 1.67], // 1 SOL bet, 2 SOL pool, expected odds ~1.67
      [500000000, 1000000000, 2.0],   // 0.5 SOL bet, 1 SOL pool, expected odds ~2.0
      [2000000000, 1000000000, 1.5],  // 2 SOL bet, 1 SOL pool, expected odds ~1.5
    ]);
  }
}

// Test environment utilities
export class TestEnvironmentUtils {
  static setupTestTimeout(timeout: number = 30000): void {
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

  static mockEnvironmentVariables(vars: Record<string, string>) {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, ...vars };
    });

    afterEach(() => {
      process.env = originalEnv;
    });
  }

  static createCleanupHandler() {
    const resources: Array<() => Promise<void> | void> = [];

    return {
      addCleanup: (cleanup: () => Promise<void> | void) => {
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
