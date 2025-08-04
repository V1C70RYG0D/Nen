"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionProposalService = exports.MultisigVaultService = void 0;
exports.initializeServices = initializeServices;
exports.getServiceStatus = getServiceStatus;
exports.healthCheck = healthCheck;
const logger_1 = require("../utils/logger");
const config_1 = __importDefault(require("../config"));
var MultisigVaultService_1 = require("./MultisigVaultService");
Object.defineProperty(exports, "MultisigVaultService", { enumerable: true, get: function () { return MultisigVaultService_1.MultisigVaultService; } });
var TransactionProposalService_1 = require("./TransactionProposalService");
Object.defineProperty(exports, "TransactionProposalService", { enumerable: true, get: function () { return TransactionProposalService_1.TransactionProposalService; } });
let dbInitialized = false;
let redisInitialized = false;
let aiServiceInitialized = false;
async function initializeServices() {
    try {
        logger_1.logger.info('Initializing services...');
        await initializeDatabase();
        await initializeRedis();
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
async function initializeDatabase() {
    try {
        logger_1.logger.info('Initializing database connection', {
            host: config_1.default.database.host,
            port: config_1.default.database.port,
            database: config_1.default.database.database
        });
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
async function initializeRedis() {
    try {
        logger_1.logger.info('Initializing Redis connection', {
            host: config_1.default.redis.host,
            port: config_1.default.redis.port
        });
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
async function initializeAIService() {
    try {
        logger_1.logger.info('Initializing AI service connection', {
            url: config_1.default.externalServices.aiServiceUrl
        });
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
function getServiceStatus() {
    return {
        database: dbInitialized,
        redis: redisInitialized,
        aiService: aiServiceInitialized
    };
}
async function healthCheck() {
    const status = getServiceStatus();
    const isHealthy = status.database;
    return {
        healthy: isHealthy,
        services: status,
        timestamp: new Date().toISOString()
    };
}
//# sourceMappingURL=index.js.map