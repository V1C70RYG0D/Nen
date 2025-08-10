/**
 * Global Test Teardown for Nen Platform Backend
 */

import { postgresContainer, redisContainer } from './globalSetup';

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');

  try {
    // Stop test containers if they were started
    if (postgresContainer) {
      await postgresContainer.stop();
      console.log('✅ PostgreSQL test container stopped');
    }

    if (redisContainer) {
      await redisContainer.stop();
      console.log('✅ Redis test container stopped');
    }

    console.log('✅ Global test teardown completed');

  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't throw error to prevent Jest from failing
  }
}
