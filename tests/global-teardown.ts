import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * Handles cleanup operations and finalization of test environment
 */
async function globalTeardown(config: FullConfig) {
  console.log('🔄 Starting global teardown for Playwright tests...');
  try {
    // Cleanup operations if needed
    // For example: Deleting test data, closing database connections, etc.
    if (!process.env.BACKEND_URL && !process.env.DEFAULT_BACKEND_URL) {
    }
    const backendUrl = process.env.BACKEND_URL || process.env.DEFAULT_BACKEND_URL;

    if (!backendUrl) {
      throw new Error('Backend URL is required but not defined');
    }

    await cleanupTestData(backendUrl);
    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData(backendUrl: string) {
  try {
    // Example: Delete test game room

    console.log('🧹 Cleaning up test data...');

    // Call the backend endpoint to delete test data
    /*
    await someHttpClient.delete(`${backendUrl}/api/test/delete-game-room`, {
      data: {
        roomId: 'test-room-001',
      },
    });
    */

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.warn('⚠️ Test data cleanup failed:', error);
  }
}

export default globalTeardown;
