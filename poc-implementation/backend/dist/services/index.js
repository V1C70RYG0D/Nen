"use strict";
/**
 * Service Initialization Module
 * Enhanced with comprehensive service implementations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceStatistics = exports.initializeEnhancedServices = exports.resetEnhancedServiceFactory = exports.getEnhancedServiceFactory = exports.EnhancedServiceFactory = exports.EnhancedUserManagementService = exports.FileService = exports.NotificationService = exports.ApplicationService = exports.UserService = exports.AuthenticationService = exports.TransactionProposalService = exports.MultisigVaultService = void 0;
exports.initializeServices = initializeServices;
exports.getServiceStatus = getServiceStatus;
exports.healthCheck = healthCheck;
const logger_1 = require("../utils/logger");
const config_1 = __importDefault(require("../config"));
// Export existing services
var MultisigVaultService_1 = require("./MultisigVaultService");
Object.defineProperty(exports, "MultisigVaultService", { enumerable: true, get: function () { return MultisigVaultService_1.MultisigVaultService; } });
var TransactionProposalService_1 = require("./TransactionProposalService");
Object.defineProperty(exports, "TransactionProposalService", { enumerable: true, get: function () { return TransactionProposalService_1.TransactionProposalService; } });
var AuthenticationService_1 = require("./AuthenticationService");
Object.defineProperty(exports, "AuthenticationService", { enumerable: true, get: function () { return AuthenticationService_1.AuthenticationService; } });
var UserService_1 = require("./UserService");
Object.defineProperty(exports, "UserService", { enumerable: true, get: function () { return UserService_1.UserService; } });
// Export new comprehensive service implementations
var ApplicationService_1 = require("./ApplicationService");
Object.defineProperty(exports, "ApplicationService", { enumerable: true, get: function () { return ApplicationService_1.ApplicationService; } });
var NotificationService_1 = require("./NotificationService");
Object.defineProperty(exports, "NotificationService", { enumerable: true, get: function () { return NotificationService_1.NotificationService; } });
var FileService_1 = require("./FileService");
Object.defineProperty(exports, "FileService", { enumerable: true, get: function () { return FileService_1.FileService; } });
var EnhancedUserManagementService_1 = require("./EnhancedUserManagementService");
Object.defineProperty(exports, "EnhancedUserManagementService", { enumerable: true, get: function () { return EnhancedUserManagementService_1.EnhancedUserManagementService; } });
// Export enhanced service factory
var EnhancedServiceFactory_1 = require("./EnhancedServiceFactory");
Object.defineProperty(exports, "EnhancedServiceFactory", { enumerable: true, get: function () { return EnhancedServiceFactory_1.EnhancedServiceFactory; } });
Object.defineProperty(exports, "getEnhancedServiceFactory", { enumerable: true, get: function () { return EnhancedServiceFactory_1.getEnhancedServiceFactory; } });
Object.defineProperty(exports, "resetEnhancedServiceFactory", { enumerable: true, get: function () { return EnhancedServiceFactory_1.resetEnhancedServiceFactory; } });
Object.defineProperty(exports, "initializeEnhancedServices", { enumerable: true, get: function () { return EnhancedServiceFactory_1.initializeEnhancedServices; } });
Object.defineProperty(exports, "getServiceStatistics", { enumerable: true, get: function () { return EnhancedServiceFactory_1.getServiceStatistics; } });
// Service initialization flags
let dbInitialized = false;
let redisInitialized = false;
let aiServiceInitialized = false;
/**
 * Initialize all services
 */
async function initializeServices() {
    try {
        logger_1.logger.info('Initializing services...');
        // Initialize database connection
        await initializeDatabase();
        // Initialize Redis cache
        await initializeRedis();
        // Initialize AI service connection
        await initializeAIService();
        logger_1.logger.info('All services initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize services', {
            error: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}
/**
 * Initialize database connection
 */
async function initializeDatabase() {
    try {
        // In a real implementation, this would initialize Prisma or your ORM
        logger_1.logger.info('Initializing database connection', {
            host: config_1.default.database.host,
            port: config_1.default.database.port,
            database: config_1.default.database.database
        });
        // Simulate database connection check
        if (config_1.default.database.url) {
            dbInitialized = true;
            logger_1.logger.info('Database connection established');
        }
        else {
            throw new Error('Database URL not configured');
        }
    }
    catch (error) {
        logger_1.logger.error('Database initialization failed', { error });
        throw error;
    }
}
/**
 * Initialize Redis cache
 */
async function initializeRedis() {
    try {
        logger_1.logger.info('Initializing Redis connection', {
            host: config_1.default.redis.host,
            port: config_1.default.redis.port
        });
        // In a real implementation, this would create Redis client
        if (config_1.default.redis.url) {
            redisInitialized = true;
            logger_1.logger.info('Redis connection established');
        }
        else {
            logger_1.logger.warn('Redis URL not configured, proceeding without cache');
            redisInitialized = false;
        }
    }
    catch (error) {
        logger_1.logger.warn('Redis initialization failed, proceeding without cache', { error });
        redisInitialized = false;
    }
}
/**
 * Initialize AI service connection
 */
async function initializeAIService() {
    try {
        logger_1.logger.info('Initializing AI service connection', {
            url: config_1.default.externalServices.aiServiceUrl
        });
        // In a real implementation, this would test AI service connectivity
        if (config_1.default.externalServices.aiServiceUrl) {
            aiServiceInitialized = true;
            logger_1.logger.info('AI service connection established');
        }
        else {
            logger_1.logger.warn('AI service URL not configured');
            aiServiceInitialized = false;
        }
    }
    catch (error) {
        logger_1.logger.warn('AI service initialization failed', { error });
        aiServiceInitialized = false;
    }
}
/**
 * Get service status
 */
function getServiceStatus() {
    return {
        database: dbInitialized,
        redis: redisInitialized,
        aiService: aiServiceInitialized
    };
}
/**
 * Health check for all services
 */
async function healthCheck() {
    const status = getServiceStatus();
    const isHealthy = status.database; // Minimum requirement is database
    return {
        healthy: isHealthy,
        services: status,
        timestamp: new Date().toISOString()
    };
}
//# sourceMappingURL=index.js.map