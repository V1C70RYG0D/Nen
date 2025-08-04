/**
 * Jest Global Teardown
 */

module.exports = async () => {
  // Clean up global test resources
  console.log('🧹 Cleaning up global test environment...');

  // Calculate test duration
  const testDuration = Date.now() - (global.__TEST_START_TIME__ || 0);
  console.log(`⏱️  Total test duration: ${testDuration}ms`);

  // Add any global cleanup here
};
