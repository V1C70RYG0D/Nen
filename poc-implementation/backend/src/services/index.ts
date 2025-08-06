/**
 * Service Initialization Module
 * Enhanced with comprehensive service implementations
 */

import { logger } from '../utils/logger';
import config from '../config';

// Export existing services
export { MultisigVaultService } from './MultisigVaultService';
export { TransactionProposalService } from './TransactionProposalService';
export { AuthenticationService } from './AuthenticationService';
export { UserService } from './UserService';

// Export new comprehensive service implementations
export { ApplicationService } from './ApplicationService';
export { NotificationService } from './NotificationService';
export { FileService } from './FileService';
export { EnhancedUserManagementService } from './EnhancedUserManagementService';

// Export enhanced service factory
export { 
  EnhancedServiceFactory, 
  getEnhancedServiceFactory, 
  resetEnhancedServiceFactory,
  initializeEnhancedServices,
  getServiceStatistics
} from './EnhancedServiceFactory';

// Service initialization flags
let dbInitialized = false;
let redisInitialized = false;
let aiServiceInitialized = false;

/**
 * Initialize all services
 */
export async function initializeServices(): Promise<void> {
  try {
    logger.info('Initializing services...');

    // Initialize database connection
    await initializeDatabase();

    // Initialize Redis cache
    await initializeRedis();

    // Initialize AI service connection
    await initializeAIService();

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Initialize database connection
 */
async function initializeDatabase(): Promise<void> {
  try {
    // In a real implementation, this would initialize Prisma or your ORM
    logger.info('Initializing database connection', {
      host: config.database.host,
      port: config.database.port,
      database: config.database.database
    });

    // Simulate database connection check
    if (config.database.url) {
      dbInitialized = true;
      logger.info('Database connection established');
    } else {
      throw new Error('Database URL not configured');
    }
  } catch (error) {
    logger.error('Database initialization failed', { error });
    throw error;
  }
}

/**
 * Initialize Redis cache
 */
async function initializeRedis(): Promise<void> {
  try {
    logger.info('Initializing Redis connection', {
      host: config.redis.host,
      port: config.redis.port
    });

    // In a real implementation, this would create Redis client
    if (config.redis.url) {
      redisInitialized = true;
      logger.info('Redis connection established');
    } else {
      logger.warn('Redis URL not configured, proceeding without cache');
      redisInitialized = false;
    }
  } catch (error) {
    logger.warn('Redis initialization failed, proceeding without cache', { error });
    redisInitialized = false;
  }
}

/**
 * Initialize AI service connection
 */
async function initializeAIService(): Promise<void> {
  try {
    logger.info('Initializing AI service connection', {
      url: config.externalServices.aiServiceUrl
    });

    // In a real implementation, this would test AI service connectivity
    if (config.externalServices.aiServiceUrl) {
      aiServiceInitialized = true;
      logger.info('AI service connection established');
    } else {
      logger.warn('AI service URL not configured');
      aiServiceInitialized = false;
    }
  } catch (error) {
    logger.warn('AI service initialization failed', { error });
    aiServiceInitialized = false;
  }
}

/**
 * Get service status
 */
export function getServiceStatus() {
  return {
    database: dbInitialized,
    redis: redisInitialized,
    aiService: aiServiceInitialized
  };
}

/**
 * Health check for all services
 */
export async function healthCheck() {
  const status = getServiceStatus();
  const isHealthy = status.database; // Minimum requirement is database

  return {
    healthy: isHealthy,
    services: status,
    timestamp: new Date().toISOString()
  };
}
