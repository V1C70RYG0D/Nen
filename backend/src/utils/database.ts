// Database initialization and connection management
import { Pool, PoolClient } from 'pg';
import { logger } from './logger';

let pool: Pool | null = null;

export interface DatabaseConfig {
  connectionString: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export async function initializeDatabase(config?: DatabaseConfig): Promise<Pool> {
  try {
    const connectionString = config?.connectionString || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    pool = new Pool({
      connectionString,
      ssl: config?.ssl || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: config?.max || 20,
      idleTimeoutMillis: config?.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config?.connectionTimeoutMillis || 2000,
    });

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    logger.info('Database connection established successfully');
    return pool;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

export function getDatabase(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection closed');
  }
}

// Helper function to run queries with automatic connection management
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const db = getDatabase();
  try {
    const result = await db.query(text, params);
    return result.rows;
  } catch (error) {
    logger.error('Database query error:', { text, params, error });
    throw error;
  }
}

// Helper function to run queries with a transaction
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const db = getDatabase();
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = getDatabase();
    const result = await db.query('SELECT 1 as healthy');
    return result.rows[0]?.healthy === 1;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}
