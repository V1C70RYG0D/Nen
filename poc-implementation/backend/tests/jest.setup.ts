/**
 * Global Jest Setup for Nen Platform Backend Testing
 */

import 'jest-extended';
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '..', '.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Configure test timeouts based on test type
const testTimeouts = {
  unit: parseInt(process.env.TEST_TIMEOUT_UNIT || '5000'),
  integration: parseInt(process.env.TEST_TIMEOUT_INTEGRATION || '15000'),
  e2e: parseInt(process.env.TEST_TIMEOUT_E2E || '30000')
};

// Global test configuration
globalThis.testConfig = {
  timeouts: testTimeouts,
  databases: {
    postgres: {
      url: process.env.DATABASE_URL!,
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT!),
      database: process.env.DB_NAME!,
      username: process.env.DB_USERNAME!,
      password: process.env.DB_PASSWORD!
    },
    redis: {
      url: process.env.REDIS_URL!,
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT!),
      db: parseInt(process.env.REDIS_DB!)
    }
  },
  services: {
    ai: process.env.AI_SERVICE_URL!,
    frontend: process.env.FRONTEND_URL!
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    sessionSecret: process.env.SESSION_SECRET!
  },
  testData: {
    userEmail: process.env.TEST_USER_EMAIL!,
    userPassword: process.env.TEST_USER_PASSWORD!,
    adminEmail: process.env.TEST_ADMIN_EMAIL!,
    adminPassword: process.env.TEST_ADMIN_PASSWORD!
  }
};

// Global test utilities
globalThis.testUtils = {
  /**
   * Generate a unique test identifier
   */
  generateTestId: (): string => {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Wait for a condition to be true
   */
  waitFor: async (
    condition: () => Promise<boolean> | boolean,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Create a delay for testing timing-sensitive operations
   */
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Extend Jest matchers with custom ones
expect.extend({
  toBeValidUUID(received: any) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  toBeValidEmail(received: any) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  toBeValidSolanaAddress(received: any) {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const pass = typeof received === 'string' && solanaAddressRegex.test(received);

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid Solana address`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid Solana address`,
        pass: false,
      };
    }
  }
});

// Type declarations for global test utilities
declare global {
  var testConfig: {
    timeouts: {
      unit: number;
      integration: number;
      e2e: number;
    };
    databases: {
      postgres: {
        url: string;
        host: string;
        port: number;
        database: string;
        username: string;
        password: string;
      };
      redis: {
        url: string;
        host: string;
        port: number;
        db: number;
      };
    };
    services: {
      ai: string;
      frontend: string;
    };
    auth: {
      jwtSecret: string;
      sessionSecret: string;
    };
    testData: {
      userEmail: string;
      userPassword: string;
      adminEmail: string;
      adminPassword: string;
    };
  };

  var testUtils: {
    generateTestId: () => string;
    waitFor: (condition: () => Promise<boolean> | boolean, timeout?: number, interval?: number) => Promise<void>;
    delay: (ms: number) => Promise<void>;
  };

  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidSolanaAddress(): R;
    }
  }
}

export {};
