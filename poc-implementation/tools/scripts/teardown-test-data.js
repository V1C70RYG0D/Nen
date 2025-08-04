import { TestDataManager } from '../tests/e2e/utils/TestDataManager.js';

(async () => {
  const testDataManager = new TestDataManager();

  try {
    console.log('Cleaning up test data...');
    await testDataManager.cleanupTestData();
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
})();

