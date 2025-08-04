/**
 * Global Test Setup for Nen Platform Backend
 */

import { config } from 'dotenv';
import path from 'path';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import Redis from 'ioredis';
import { Client } from 'pg';

// Global test containers
let postgresContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...');

  // Load test environment
  config({ path: path.resolve(__dirname, '..', '.env.test') });

  try {
    // Check if external services are available first
    const useExternalServices = await checkExternalServices();

    if (!useExternalServices) {
      console.log('🐳 Starting test containers...');

      // Start PostgreSQL test container
      postgresContainer = await new GenericContainer('postgres:15-alpine')
        .withEnvironment({
          POSTGRES_DB: 'nen_platform_test',
          POSTGRES_USER: 'postgres',
          POSTGRES_PASSWORD: 'test_password'
        })
        .withExposedPorts(5432)
        .withWaitStrategy({
          type: 'log',
          message: 'database system is ready to accept connections'
        })
        .start();

      // Start Redis test container
      redisContainer = await new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .withWaitStrategy({
          type: 'log',
          message: 'Ready to accept connections'
        })
        .start();

      // Update environment variables with container ports
      process.env.DATABASE_URL = `postgresql://postgres:test_password@localhost:${postgresContainer.getMappedPort(5432)}/nen_platform_test`;
      process.env.DB_PORT = postgresContainer.getMappedPort(5432).toString();
      process.env.REDIS_URL = `redis://localhost:${redisContainer.getMappedPort(6379)}/1`;
      process.env.REDIS_PORT = redisContainer.getMappedPort(6379).toString();

      console.log('✅ Test containers started successfully');
    } else {
      console.log('🔗 Using external test services');
    }

    // Initialize test database schema
    await initializeTestDatabase();

    // Initialize test Redis data
    await initializeTestRedis();

    console.log('✅ Global test setup completed');

  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}

async function checkExternalServices(): Promise<boolean> {
  try {
    // Check PostgreSQL
    const pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3000
    });
    await pgClient.connect();
    await pgClient.end();

    // Check Redis
    const redisClient = new Redis(process.env.REDIS_URL!, {
      connectTimeout: 3000,
      lazyConnect: true
    });
    await redisClient.connect();
    await redisClient.disconnect();

    return true;
  } catch {
    return false;
  }
}

async function initializeTestDatabase(): Promise<void> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();

    // Create basic test tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id VARCHAR(255) PRIMARY KEY,
        creator_id INTEGER REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'waiting',
        players JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS websocket_connections (
        socket_id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        session_id VARCHAR(255),
        connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert test users
    await client.query(`
      INSERT INTO users (email, password_hash) VALUES
      ('test@nen.platform', '$2b$10$dummy.hash.for.testing'),
      ('admin@nen.platform', '$2b$10$dummy.hash.for.testing'),
      ('player1@nen.platform', '$2b$10$dummy.hash.for.testing'),
      ('player2@nen.platform', '$2b$10$dummy.hash.for.testing')
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log('✅ Test database initialized');

  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function initializeTestRedis(): Promise<void> {
  const redis = new Redis(process.env.REDIS_URL!);

  try {
    await redis.flushdb();

    // Set up test data
    await redis.setex('test:setup', 3600, JSON.stringify({
      timestamp: Date.now(),
      environment: 'test'
    }));

    console.log('✅ Test Redis initialized');

  } catch (error) {
    console.error('❌ Failed to initialize test Redis:', error);
    throw error;
  } finally {
    await redis.disconnect();
  }
}

// Export cleanup function for global teardown
export { postgresContainer, redisContainer };
