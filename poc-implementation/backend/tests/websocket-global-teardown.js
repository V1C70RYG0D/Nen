/**
 * Global teardown for WebSocket tests
 * Cleans up services and test environment
 */
module.exports = async () => {
  console.log('🧹 Starting WebSocket test environment teardown...');

  try {
    // Clean up any running processes
    if (global.__WEBSOCKET_TEST_PROCESSES__) {
      console.log('🛑 Stopping test processes...');
      global.__WEBSOCKET_TEST_PROCESSES__.forEach(process => {
        try {
          if (process && !process.killed) {
            process.kill('SIGTERM');
          }
        } catch (error) {
          console.warn('Warning: Could not kill process:', error.message);
        }
      });
    }

    // Clean up Redis connections
    if (!process.env.USE_MOCK_REDIS) {
      try {
        console.log('🧹 Cleaning up Redis test data...');
        const redis = require('ioredis');
        const client = new redis(process.env.REDIS_URI);
        
        // Flush test databases
        await client.flushall();
        await client.quit();
        
        console.log('✅ Redis cleanup complete');
      } catch (error) {
        console.warn('⚠️  Redis cleanup failed:', error.message);
      }
    }

    // Clean up temporary files
    const fs = require('fs');
    const path = require('path');
    
    // Clean up any temporary test files
    const tempFiles = [
      'websocket-test.pid',
      'websocket-test.log'
    ];
    
    tempFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (error) {
          console.warn(`Warning: Could not delete ${file}:`, error.message);
        }
      }
    });

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    console.log('✅ WebSocket test environment teardown complete');

  } catch (error) {
    console.error('❌ Failed to teardown WebSocket test environment:', error);
    // Don't throw here as it might mask other test failures
  }
};
