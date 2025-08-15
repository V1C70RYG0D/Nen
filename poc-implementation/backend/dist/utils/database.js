"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.getDatabase = getDatabase;
exports.closeDatabase = closeDatabase;
exports.query = query;
exports.transaction = transaction;
exports.checkDatabaseHealth = checkDatabaseHealth;
// Database initialization and connection management
const pg_1 = require("pg");
const logger_1 = require("./logger");
let pool = null;
async function initializeDatabase(config) {
    try {
        const connectionString = config?.connectionString || process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        pool = new pg_1.Pool({
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
        logger_1.logger.info('Database connection established successfully');
        return pool;
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize database:', error);
        throw error;
    }
}
function getDatabase() {
    if (!pool) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return pool;
}
async function closeDatabase() {
    if (pool) {
        await pool.end();
        pool = null;
        logger_1.logger.info('Database connection closed');
    }
}
// Helper function to run queries with automatic connection management
async function query(text, params) {
    const db = getDatabase();
    try {
        const result = await db.query(text, params);
        return result.rows;
    }
    catch (error) {
        logger_1.logger.error('Database query error:', { text, params, error });
        throw error;
    }
}
// Helper function to run queries with a transaction
async function transaction(callback) {
    const db = getDatabase();
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        logger_1.logger.error('Database transaction error:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
// Health check function
async function checkDatabaseHealth() {
    try {
        const db = getDatabase();
        const result = await db.query('SELECT 1 as healthy');
        return result.rows[0]?.healthy === 1;
    }
    catch (error) {
        logger_1.logger.error('Database health check failed:', error);
        return false;
    }
}
//# sourceMappingURL=database.js.map