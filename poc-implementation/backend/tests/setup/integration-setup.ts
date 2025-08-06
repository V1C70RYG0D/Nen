/**
 * Integration Test Setup for Nen Platform Backend
 * Comprehensive test environment initialization and teardown
 */

import { Express } from 'express';
import request from 'supertest';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

import NenPlatformServer from '../../src/main';
import config from '../../src/config';
import { logger } from '../../src/utils/logger';

// Test environment configuration
export interface IntegrationTestConfig {
  server: {
    app: Express;
    instance: NenPlatformServer;
    baseUrl: string;
    port: number;
  };
  database: {
    client: PrismaClient;
    isConnected: boolean;
  };
  redis: {
    client: Redis;
    isConnected: boolean;
  };
  solana: {
    connection: Connection;
    testKeypairs: {
      payer: Keypair;
      user1: Keypair;
      user2: Keypair;
      agent1: Keypair;
      agent2: Keypair;
    };
  };
  services: {
    ai: {
      baseUrl: string;
      isHealthy: boolean;
    };
    auth: {
      testTokens: {
        validUser: string;
        validAdmin: string;
        expired: string;
      };
    };
  };
}

let testEnvironment: IntegrationTestConfig | null = null;

/**
 * Initialize the complete integration test environment
 */
export async function setupIntegrationEnvironment(): Promise<IntegrationTestConfig> {
  logger.info('Setting up integration test environment');

  try {
    // Initialize server instance
    const serverInstance = new NenPlatformServer();
    await serverInstance.start();
    const app = serverInstance.getApp();

    // Initialize database connection
    const prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url
        }
      }
    });
    await prismaClient.$connect();

    // Initialize Redis connection
    let redisClient: Redis | null = null;
    let redisConnected = false;
    
    if (config.redis.url) {
      redisClient = new Redis(config.redis.url);
      redisConnected = true;
      logger.info('Redis connected for integration tests');
    } else {
      logger.warn('Redis not configured for integration tests');
    }

    // Initialize Solana test environment
    const solanaConnection = new Connection(
      config.solana.rpcUrl || 'https://api.devnet.solana.com',
      'confirmed'
    );

    const testKeypairs = {
      payer: Keypair.generate(),
      user1: Keypair.generate(),
      user2: Keypair.generate(),
      agent1: Keypair.generate(),
      agent2: Keypair.generate()
    };

    // Test AI service connectivity
    let aiHealthy = false;
    try {
      const healthResponse = await fetch(`${config.externalServices.aiServiceUrl}/health`);
      aiHealthy = healthResponse.ok;
    } catch (error) {
      logger.warn('AI service not available for integration tests', { error });
    }

    // Generate test authentication tokens
    const testTokens = await generateTestTokens();

    testEnvironment = {
      server: {
        app,
        instance: serverInstance,
        baseUrl: `http://localhost:${config.server.port}`,
        port: config.server.port
      },
      database: {
        client: prismaClient,
        isConnected: true
      },
      redis: {
        client: redisClient!,
        isConnected: redisConnected
      },
      solana: {
        connection: solanaConnection,
        testKeypairs
      },
      services: {
        ai: {
          baseUrl: config.externalServices.aiServiceUrl,
          isHealthy: aiHealthy
        },
        auth: {
          testTokens
        }
      }
    };

    logger.info('Integration test environment setup completed');
    return testEnvironment;

  } catch (error) {
    logger.error('Failed to setup integration test environment', { error });
    throw error;
  }
}

/**
 * Cleanup integration test environment
 */
export async function teardownIntegrationEnvironment(): Promise<void> {
  if (!testEnvironment) {
    return;
  }

  logger.info('Tearing down integration test environment');

  try {
    // Cleanup database
    if (testEnvironment.database.isConnected) {
      await cleanupTestData();
      await testEnvironment.database.client.$disconnect();
    }

    // Cleanup Redis
    if (testEnvironment.redis.isConnected) {
      await testEnvironment.redis.client.flushall();
      testEnvironment.redis.client.disconnect();
    }

    // Graceful server shutdown would happen here in a real scenario
    // For tests, we'll let the test runner handle this

    testEnvironment = null;
    logger.info('Integration test environment teardown completed');

  } catch (error) {
    logger.error('Error during integration test teardown', { error });
    throw error;
  }
}

/**
 * Get the current test environment (must be called after setup)
 */
export function getTestEnvironment(): IntegrationTestConfig {
  if (!testEnvironment) {
    throw new Error('Test environment not initialized. Call setupIntegrationEnvironment first.');
  }
  return testEnvironment;
}

/**
 * Generate test authentication tokens for different user types
 */
async function generateTestTokens() {
  const jwt = require('jsonwebtoken');
  
  const validUserPayload = {
    id: 'test-user-1',
    publicKey: Keypair.generate().publicKey.toBase58(),
    role: 'user'
  };

  const validAdminPayload = {
    id: 'test-admin-1', 
    publicKey: Keypair.generate().publicKey.toBase58(),
    role: 'admin'
  };

  const expiredPayload = {
    id: 'test-expired-user',
    publicKey: Keypair.generate().publicKey.toBase58(),
    role: 'user',
    exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
  };

  return {
    validUser: jwt.sign(validUserPayload, config.security.jwtSecret, { expiresIn: '1h' }),
    validAdmin: jwt.sign(validAdminPayload, config.security.jwtSecret, { expiresIn: '1h' }),
    expired: jwt.sign(expiredPayload, config.security.jwtSecret)
  };
}

/**
 * Clean up test data from database
 */
async function cleanupTestData(): Promise<void> {
  if (!testEnvironment?.database.client) {
    return;
  }

  const prisma = testEnvironment.database.client;
  
  try {
    // Clean up in reverse dependency order
    await prisma.bet.deleteMany({
      where: {
        userId: {
          startsWith: 'test-'
        }
      }
    });

    await prisma.game.deleteMany({
      where: {
        id: {
          startsWith: 'test-'
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          startsWith: 'test-'
        }
      }
    });

    logger.info('Test data cleanup completed');
  } catch (error) {
    logger.warn('Error during test data cleanup', { error });
  }
}

/**
 * Create test data for integration tests
 */
export async function createTestData() {
  const env = getTestEnvironment();
  const prisma = env.database.client;

  const testUser1 = await prisma.user.create({
    data: {
      id: 'test-user-1',
      username: 'testuser1',
      email: 'testuser1@test.com',
      publicKey: env.solana.testKeypairs.user1.publicKey.toBase58(),
      address: env.solana.testKeypairs.user1.publicKey.toBase58(),
      isActive: true,
      level: 1,
      experience: 100
    }
  });

  const testUser2 = await prisma.user.create({
    data: {
      id: 'test-user-2',
      username: 'testuser2',
      email: 'testuser2@test.com',
      publicKey: env.solana.testKeypairs.user2.publicKey.toBase58(),
      address: env.solana.testKeypairs.user2.publicKey.toBase58(),
      isActive: true,
      level: 1,
      experience: 100
    }
  });

  const testGame = await prisma.game.create({
    data: {
      id: 'test-game-1',
      player1Id: testUser1.id,
      player2Id: testUser2.id,
      status: 'pending',
      gameType: 'vs_ai',
      isActive: true
    }
  });

  return {
    users: [testUser1, testUser2],
    games: [testGame]
  };
}

/**
 * Make authenticated requests in tests
 */
export function makeAuthenticatedRequest(token: string) {
  const env = getTestEnvironment();
  return request(env.server.app)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Wait for service to be ready
 */
export async function waitForServiceReady(
  serviceName: string, 
  healthEndpoint: string, 
  maxAttempts: number = 10
): Promise<void> {
  const env = getTestEnvironment();
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await request(env.server.app)
        .get(healthEndpoint)
        .timeout(5000);
        
      if (response.status === 200) {
        logger.info(`${serviceName} is ready`);
        return;
      }
    } catch (error) {
      logger.warn(`${serviceName} not ready, attempt ${attempt}/${maxAttempts}`, { error: error.message });
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error(`${serviceName} failed to become ready after ${maxAttempts} attempts`);
}

/**
 * Test database connectivity and basic operations
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const env = getTestEnvironment();
    await env.database.client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error });
    return false;
  }
}

/**
 * Test Redis connectivity and basic operations
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const env = getTestEnvironment();
    if (!env.redis.isConnected) {
      return false;
    }
    
    const testKey = 'test:connection';
    await env.redis.client.set(testKey, 'test-value', 'EX', 60);
    const value = await env.redis.client.get(testKey);
    await env.redis.client.del(testKey);
    
    return value === 'test-value';
  } catch (error) {
    logger.error('Redis connection test failed', { error });
    return false;
  }
}

/**
 * Test Solana connection and basic operations
 */
export async function testSolanaConnection(): Promise<boolean> {
  try {
    const env = getTestEnvironment();
    const slot = await env.solana.connection.getSlot();
    return typeof slot === 'number' && slot > 0;
  } catch (error) {
    logger.error('Solana connection test failed', { error });
    return false;
  }
}

/**
 * Simulate network conditions for resilience testing
 */
export class NetworkConditionSimulator {
  private originalFetch: typeof global.fetch;

  constructor() {
    this.originalFetch = global.fetch;
  }

  simulateLatency(ms: number) {
    global.fetch = async (...args) => {
      await new Promise(resolve => setTimeout(resolve, ms));
      return this.originalFetch.apply(global, args);
    };
  }

  simulateTimeouts(timeoutMs: number) {
    global.fetch = async (...args) => {
      return Promise.race([
        this.originalFetch.apply(global, args),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        )
      ]) as Promise<Response>;
    };
  }

  simulateIntermittentFailures(failureRate: number) {
    global.fetch = async (...args) => {
      if (Math.random() < failureRate) {
        throw new Error('Simulated network failure');
      }
      return this.originalFetch.apply(global, args);
    };
  }

  restore() {
    global.fetch = this.originalFetch;
  }
}
