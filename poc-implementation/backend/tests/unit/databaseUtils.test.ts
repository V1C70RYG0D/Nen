import { initializeDatabase, closeDatabase, query, checkDatabaseHealth } from '../../src/utils/database';
import { jest } from '@jest/globals';

// Mock pg Pool
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
      release: jest.fn()
    }),
    query: jest.fn().mockResolvedValue({ rows: [{ healthy: 1 }] }),
    end: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../../src/utils/logger');

describe('Database Utilities', () => {
  test('initializeDatabase should throw error if no connection string', async () => {
    await expect(initializeDatabase()).rejects.toThrow('DATABASE_URL environment variable is required');
  });

  test('query should run a basic query', async () => {
    const db = await initializeDatabase({ connectionString: 'fakeConnectionString' });
    await expect(query('SELECT NOW()', [])).resolves.not.toThrow();
    await closeDatabase();
  });
});
