"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.ConfigManager = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const configPath = path_1.default.resolve(process.cwd(), 'config', '.env');
dotenv_1.default.config({ path: configPath });
dotenv_1.default.config();
class ConfigManager {
    static instance;
    database;
    redis;
    solana;
    security;
    server;
    externalServices;
    ai;
    api;
    logging;
    constructor() {
        this.validateRequiredEnvVars();
        if (!process.env.DB_HOST) {
            throw new Error('DB_HOST must be configured via environment variables');
        }
        if (!process.env.REDIS_HOST && process.env.NODE_ENV === 'production') {
            throw new Error('REDIS_HOST must be configured via environment variables in production');
        }
        if (!process.env.DATABASE_URL && !process.env.DB_USERNAME) {
            throw new Error('Either DATABASE_URL or DB_USERNAME must be configured');
        }
        this.database = {
            url: this.getRequiredEnv('DATABASE_URL'),
            host: this.getRequiredEnv('DB_HOST'),
            port: parseInt(this.getRequiredEnv('DB_PORT')),
            username: this.getRequiredEnv('DB_USERNAME'),
            password: this.getRequiredEnv('DB_PASSWORD'),
            database: this.getRequiredEnv('DB_NAME')
        };
        this.redis = {
            url: process.env.REDIS_URL || '',
            host: process.env.REDIS_HOST || '',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD
        };
        this.solana = {
            network: this.getRequiredEnv('SOLANA_NETWORK'),
            rpcUrl: this.getRequiredEnv('SOLANA_RPC_URL'),
            programId: this.getRequiredEnv('SOLANA_PROGRAM_ID'),
            commitment: this.getRequiredEnv('SOLANA_COMMITMENT')
        };
        this.security = {
            jwtSecret: process.env.JWT_SECRET || (this.isProduction() ? this.getRequiredEnv('JWT_SECRET') : 'dev-jwt-secret-not-for-production'),
            rateLimitWindowMs: parseInt(this.getRequiredEnv('RATE_LIMIT_WINDOW_MS')),
            rateLimitMaxRequests: parseInt(this.getRequiredEnv('RATE_LIMIT_MAX_REQUESTS')),
            corsOrigin: this.getRequiredEnv('CORS_ORIGIN'),
            corsCredentials: this.getRequiredEnv('CORS_CREDENTIALS') === 'true'
        };
        this.server = {
            port: parseInt(this.getRequiredEnv('PORT')),
            wsPort: parseInt(this.getRequiredEnv('WS_PORT')),
            environment: this.getRequiredEnv('NODE_ENV'),
            host: this.getRequiredEnv('API_HOST'),
            apiTimeout: parseInt(this.getRequiredEnv('API_TIMEOUT')),
            websocketTimeout: parseInt(this.getRequiredEnv('WEBSOCKET_TIMEOUT')),
            metricsEnabled: process.env.METRICS_ENABLED === 'true',
            metricsPath: process.env.METRICS_PATH || '/metrics'
        };
        this.externalServices = {
            aiServiceUrl: this.getRequiredEnv('AI_SERVICE_URL'),
            magicBlockApiKey: this.getRequiredEnv('MAGICBLOCK_API_KEY'),
            magicBlockEndpoint: this.getRequiredEnv('MAGICBLOCK_ENDPOINT'),
            frontendUrl: this.getRequiredEnv('FRONTEND_URL')
        };
        this.logging = {
            level: process.env.LOG_LEVEL || 'info',
            filePath: process.env.LOG_FILE_PATH || './logs/backend.log',
            format: process.env.LOG_FORMAT || 'json'
        };
        this.ai = {
            defaultDifficulty: process.env.AI_DEFAULT_DIFFICULTY || 'medium',
            serviceTimeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000'),
            maxConcurrentRequests: parseInt(process.env.AI_MAX_CONCURRENT_REQUESTS || '5')
        };
        this.api = {
            defaultPageSize: parseInt(process.env.API_DEFAULT_PAGE_SIZE || '20'),
            maxPageSize: parseInt(process.env.API_MAX_PAGE_SIZE || '100'),
            requestTimeout: parseInt(process.env.API_REQUEST_TIMEOUT || '30000')
        };
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    validateRequiredEnvVars() {
        const requiredVars = [
            'DATABASE_URL',
            'SOLANA_PROGRAM_ID'
        ];
        if (process.env.NODE_ENV === 'production') {
            requiredVars.push('JWT_SECRET');
        }
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
    }
    getRequiredEnv(varName) {
        const value = process.env[varName];
        if (!value) {
            throw new Error(`Required environment variable ${varName} is not set. Please configure ${varName} in your environment.`);
        }
        return value;
    }
    buildDatabaseUrl() {
        if (!this.database?.username || !this.database?.password || !this.database?.host || !this.database?.port || !this.database?.database) {
            throw new Error('Database configuration incomplete. All database parameters must be configured via environment variables.');
        }
        return `postgresql://${this.database.username}:${this.database.password}@${this.database.host}:${this.database.port}/${this.database.database}`;
    }
    buildRedisUrl() {
        if (!this.redis?.host || !this.redis?.port || this.redis.host === '') {
            return '';
        }
        const auth = this.redis.password ? `:${this.redis.password}@` : '';
        return `redis://${auth}${this.redis.host}:${this.redis.port}`;
    }
    generateSecureDefault() {
        if (this.server?.environment === 'production') {
            throw new Error('JWT_SECRET must be set in production environment');
        }
        return 'dev-secret-change-in-production';
    }
    isProduction() {
        return this.server.environment === 'production';
    }
    isDevelopment() {
        return this.server.environment === 'development';
    }
    getConfig() {
        return {
            database: this.database,
            redis: this.redis,
            solana: this.solana,
            security: this.security,
            server: this.server,
            externalServices: this.externalServices,
            logging: this.logging
        };
    }
}
exports.ConfigManager = ConfigManager;
exports.config = ConfigManager.getInstance();
exports.default = exports.config;
//# sourceMappingURL=index.js.map