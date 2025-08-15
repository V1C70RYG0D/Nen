/**
 * Configuration Management for Nen Platform

 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from config directory
const configPath = path.resolve(process.cwd(), 'config', '.env');
dotenv.config({ path: configPath });

// Also try loading from current directory for backwards compatibility
dotenv.config();

interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

interface RedisConfig {
  url: string;
  host: string;
  port: number;
  password?: string;
}

interface SolanaConfig {
  network: string;
  rpcUrl: string;
  programId: string;
  commitment: string;
}

interface SecurityConfig {
  jwtSecret: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  corsOrigin: string;
  corsCredentials: boolean;
}

interface ServerConfig {
  port: number;
  wsPort: number;
  environment: string;
  host: string;
  apiTimeout: number;
  websocketTimeout: number;
  metricsEnabled: boolean;
  metricsPath: string;
}

interface ExternalServicesConfig {
  aiServiceUrl: string;
  magicBlockApiKey: string;
  magicBlockEndpoint: string;
  frontendUrl: string;
}

interface AIConfig {
  defaultDifficulty: string;
  serviceTimeout: number;
  maxConcurrentRequests: number;
}

interface APIConfig {
  defaultPageSize: number;
  maxPageSize: number;
  requestTimeout: number;
}

export class ConfigManager {
  private static instance: ConfigManager;

  public readonly database: DatabaseConfig;
  public readonly redis: RedisConfig;
  public readonly solana: SolanaConfig;
  public readonly security: SecurityConfig;
  public readonly server: ServerConfig;
  public readonly externalServices: ExternalServicesConfig;
  public readonly ai: AIConfig;
  public readonly api: APIConfig;
  public readonly logging: {
    level: string;
    filePath: string;
    format: string;
  };

  private constructor() {
    // Validate required environment variables
    this.validateRequiredEnvVars();

    // Database Configuration - All values must be explicitly configured
    if (!process.env.DB_HOST) {
      throw new Error('DB_HOST must be configured via environment variables');
    }
    // Redis is optional for local development
    if (!process.env.REDIS_HOST && process.env.NODE_ENV === 'production') {
      throw new Error('REDIS_HOST must be configured via environment variables in production');
    }
    if (!process.env.DATABASE_URL && !process.env.DB_USERNAME) {
      throw new Error('Either DATABASE_URL or DB_USERNAME must be configured');
    }

    // Database Configuration - All values must be explicitly configured
    this.database = {
      url: this.getRequiredEnv('DATABASE_URL'),
      host: this.getRequiredEnv('DB_HOST'),
      port: parseInt(this.getRequiredEnv('DB_PORT')),
      username: this.getRequiredEnv('DB_USERNAME'),
      password: this.getRequiredEnv('DB_PASSWORD'),
      database: this.getRequiredEnv('DB_NAME')
    };

    // Redis Configuration - Optional for local development
    this.redis = {
      url: process.env.REDIS_URL || '',
      host: process.env.REDIS_HOST || '',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD // Optional
    };

    // Solana Configuration - All values must be explicitly configured
    this.solana = {
      network: this.getRequiredEnv('SOLANA_NETWORK'),
      rpcUrl: this.getRequiredEnv('SOLANA_RPC_URL'),
      programId: this.getRequiredEnv('SOLANA_PROGRAM_ID'),
      commitment: this.getRequiredEnv('SOLANA_COMMITMENT')
    };

    // Security Configuration - All values must be explicitly configured
    // Check environment directly to avoid circular dependency
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    
    this.security = {
      jwtSecret: process.env.JWT_SECRET || (isProduction ? this.getRequiredEnv('JWT_SECRET') : 'dev-jwt-secret-not-for-production'),
      rateLimitWindowMs: parseInt(this.getRequiredEnv('RATE_LIMIT_WINDOW_MS')),
      rateLimitMaxRequests: parseInt(this.getRequiredEnv('RATE_LIMIT_MAX_REQUESTS')),
      corsOrigin: this.getRequiredEnv('CORS_ORIGIN'),
      corsCredentials: this.getRequiredEnv('CORS_CREDENTIALS') === 'true'
    };

// Server Configuration - All values must be explicitly configured
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

    // External Services Configuration - All values must be explicitly configured
    this.externalServices = {
      aiServiceUrl: this.getRequiredEnv('AI_SERVICE_URL'),
      magicBlockApiKey: this.getRequiredEnv('MAGICBLOCK_API_KEY'),
      magicBlockEndpoint: this.getRequiredEnv('MAGICBLOCK_ENDPOINT'),
      frontendUrl: this.getRequiredEnv('FRONTEND_URL')
    };

    // Logging Configuration - Use defaults if not specified (logging is less critical)
    this.logging = {
      level: process.env.LOG_LEVEL || 'info',
      filePath: process.env.LOG_FILE_PATH || './logs/backend.log',
      format: process.env.LOG_FORMAT || 'json'
    };

    // AI Configuration - Following GI #18: No hardcoding
    this.ai = {
      defaultDifficulty: process.env.AI_DEFAULT_DIFFICULTY || 'medium',
      serviceTimeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000'),
      maxConcurrentRequests: parseInt(process.env.AI_MAX_CONCURRENT_REQUESTS || '5')
    };

    // API Configuration - Following GI #18: No hardcoding
    this.api = {
      defaultPageSize: parseInt(process.env.API_DEFAULT_PAGE_SIZE || '20'),
      maxPageSize: parseInt(process.env.API_MAX_PAGE_SIZE || '100'),
      requestTimeout: parseInt(process.env.API_REQUEST_TIMEOUT || '30000')
    };
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private validateRequiredEnvVars(): void {
    const requiredVars = [
      'DATABASE_URL',
      'SOLANA_PROGRAM_ID'
    ];

    // JWT_SECRET is only required in production
    if (process.env.NODE_ENV === 'production') {
      requiredVars.push('JWT_SECRET');
    }

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  private getRequiredEnv(varName: string): string {
    const value = process.env[varName];
    if (!value) {
      throw new Error(`Required environment variable ${varName} is not set. Please configure ${varName} in your environment.`);
    }
    return value;
  }

  private buildDatabaseUrl(): string {
    if (!this.database?.username || !this.database?.password || !this.database?.host || !this.database?.port || !this.database?.database) {
      throw new Error('Database configuration incomplete. All database parameters must be configured via environment variables.');
    }
    return `postgresql://${this.database.username}:${this.database.password}@${this.database.host}:${this.database.port}/${this.database.database}`;
  }

  private buildRedisUrl(): string {
    if (!this.redis?.host || !this.redis?.port || this.redis.host === '') {
      // Return empty string for local development without Redis
      return '';
    }
    const auth = this.redis.password ? `:${this.redis.password}@` : '';
    return `redis://${auth}${this.redis.host}:${this.redis.port}`;
  }

  private generateSecureDefault(): string {
    if (this.server?.environment === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    return 'dev-secret-change-in-production';
  }

  public isProduction(): boolean {
    return this.server.environment === 'production';
  }

  public isDevelopment(): boolean {
    return this.server.environment === 'development';
  }

  public getConfig() {
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

export const config = ConfigManager.getInstance();
export default config;
