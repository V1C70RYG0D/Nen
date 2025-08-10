import { TestDataManager } from '../tests/e2e/utils/TestDataManager.js';

(async () => {
  const testDataManager = new TestDataManager();

  try {
    console.log('Seeding test data...');
    await testDataManager.seedTestData();
  } catch (error) {
    console.error('Error seeding test data:', error);
  }
})();
