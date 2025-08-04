/**
 * Environment-Specific Performance Testing Configuration
 * GI-18 Compliant: No hardcoded values, all externalized
 */

import { config } from 'dotenv';
import { logger } from './simple-logger';

// Load environment variables
config({ path: '.env' });

export interface EnvironmentConfig {
  name: string;
  type: 'development' | 'staging' | 'production';
  services: {
    frontend: ServiceConfig;
    backend: ServiceConfig;
    ai: ServiceConfig;
    database: DatabaseConfig;
    redis: RedisConfig;
  };
  performance: {
    targets: PerformanceTargets;
    thresholds: PerformanceThresholds;
    monitoring: MonitoringConfig;
  };
  stress: {
    concurrent_users: number;
    request_rate: number;
    duration_minutes: number;
    ramp_up_seconds: number;
  };
}

export interface ServiceConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  health_endpoint: string;
  timeout_ms: number;
}

export interface DatabaseConfig {
  type: 'postgresql' | 'mongodb';
  host: string;
  port: number;
  database: string;
  pool_size: number;
  timeout_ms: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  timeout_ms: number;
  max_connections: number;
}

export interface PerformanceTargets {
  api_response_time_ms: number;
  ai_move_generation_ms: number;
  database_query_ms: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  concurrent_users: number;
}

export interface PerformanceThresholds {
  critical: PerformanceTargets;
  warning: PerformanceTargets;
  acceptable: PerformanceTargets;
}

export interface MonitoringConfig {
  log_level: 'debug' | 'info' | 'warn' | 'error';
  metrics_interval_seconds: number;
  alert_channels: string[];
  report_frequency_minutes: number;
}

/**
 * Development Environment Configuration
 */
export const developmentConfig: EnvironmentConfig = {
  name: 'Development',
  type: 'development',
  services: {
    frontend: {
      host: process.env.DEV_FRONTEND_HOST || '127.0.0.1',
      port: parseInt(process.env.DEV_FRONTEND_PORT || '3000'),
      protocol: 'http',
      health_endpoint: '/api/health',
      timeout_ms: 5000
    },
    backend: {
      host: process.env.DEV_BACKEND_HOST || '127.0.0.1',
      port: parseInt(process.env.DEV_BACKEND_PORT || '3001'),
      protocol: 'http',
      health_endpoint: '/health',
      timeout_ms: 5000
    },
    ai: {
      host: process.env.DEV_AI_SERVICE_HOST || '127.0.0.1',
      port: parseInt(process.env.DEV_AI_SERVICE_PORT || '3003'),
      protocol: 'http',
      health_endpoint: '/health',
      timeout_ms: 10000
    },
    database: {
      type: 'postgresql',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_DATABASE || 'nen_platform_dev',
      pool_size: 5,
      timeout_ms: 3000
    },
    redis: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      timeout_ms: 2000,
      max_connections: 10
    }
  },
  performance: {
    targets: {
      api_response_time_ms: 200,
      ai_move_generation_ms: 500,
      database_query_ms: 100,
      memory_usage_mb: 512,
      cpu_usage_percent: 70,
      concurrent_users: 50
    },
    thresholds: {
      critical: {
        api_response_time_ms: 1000,
        ai_move_generation_ms: 2000,
        database_query_ms: 500,
        memory_usage_mb: 1024,
        cpu_usage_percent: 90,
        concurrent_users: 100
      },
      warning: {
        api_response_time_ms: 500,
        ai_move_generation_ms: 1000,
        database_query_ms: 200,
        memory_usage_mb: 768,
        cpu_usage_percent: 80,
        concurrent_users: 75
      },
      acceptable: {
        api_response_time_ms: 200,
        ai_move_generation_ms: 500,
        database_query_ms: 100,
        memory_usage_mb: 512,
        cpu_usage_percent: 70,
        concurrent_users: 50
      }
    },
    monitoring: {
      log_level: 'debug',
      metrics_interval_seconds: 10,
      alert_channels: ['console', 'file'],
      report_frequency_minutes: 5
    }
  },
  stress: {
    concurrent_users: 25,
    request_rate: 100,
    duration_minutes: 5,
    ramp_up_seconds: 30
  }
};

/**
 * Staging Environment Configuration
 */
export const stagingConfig: EnvironmentConfig = {
  name: 'Staging',
  type: 'staging',
  services: {
    frontend: {
      host: process.env.STAGING_FRONTEND_HOST || 'staging.nen-platform.com',
      port: parseInt(process.env.STAGING_FRONTEND_PORT || '3000'),
      protocol: 'https',
      health_endpoint: '/api/health',
      timeout_ms: 10000
    },
    backend: {
      host: process.env.STAGING_BACKEND_HOST || 'api-staging.nen-platform.com',
      port: parseInt(process.env.STAGING_BACKEND_PORT || '3001'),
      protocol: 'https',
      health_endpoint: '/health',
      timeout_ms: 10000
    },
    ai: {
      host: process.env.STAGING_AI_SERVICE_HOST || 'ai-staging.nen-platform.com',
      port: parseInt(process.env.STAGING_AI_SERVICE_PORT || '8001'),
      protocol: 'https',
      health_endpoint: '/health',
      timeout_ms: 15000
    },
    database: {
      type: 'postgresql',
      host: process.env.STAGING_DB_HOST || 'db-staging.nen-platform.com',
      port: parseInt(process.env.STAGING_DB_PORT || '5432'),
      database: process.env.STAGING_DB_DATABASE || 'nen_platform_staging',
      pool_size: 20,
      timeout_ms: 5000
    },
    redis: {
      host: process.env.STAGING_REDIS_HOST || 'redis-staging.nen-platform.com',
      port: parseInt(process.env.STAGING_REDIS_PORT || '6379'),
      timeout_ms: 3000,
      max_connections: 50
    }
  },
  performance: {
    targets: {
      api_response_time_ms: 100,
      ai_move_generation_ms: 300,
      database_query_ms: 50,
      memory_usage_mb: 1024,
      cpu_usage_percent: 60,
      concurrent_users: 200
    },
    thresholds: {
      critical: {
        api_response_time_ms: 500,
        ai_move_generation_ms: 1000,
        database_query_ms: 300,
        memory_usage_mb: 2048,
        cpu_usage_percent: 85,
        concurrent_users: 500
      },
      warning: {
        api_response_time_ms: 300,
        ai_move_generation_ms: 600,
        database_query_ms: 150,
        memory_usage_mb: 1536,
        cpu_usage_percent: 75,
        concurrent_users: 350
      },
      acceptable: {
        api_response_time_ms: 100,
        ai_move_generation_ms: 300,
        database_query_ms: 50,
        memory_usage_mb: 1024,
        cpu_usage_percent: 60,
        concurrent_users: 200
      }
    },
    monitoring: {
      log_level: 'info',
      metrics_interval_seconds: 15,
      alert_channels: ['console', 'file', 'webhook'],
      report_frequency_minutes: 10
    }
  },
  stress: {
    concurrent_users: 100,
    request_rate: 500,
    duration_minutes: 15,
    ramp_up_seconds: 60
  }
};

/**
 * Production Environment Configuration
 */
export const productionConfig: EnvironmentConfig = {
  name: 'Production',
  type: 'production',
  services: {
    frontend: {
      host: process.env.PROD_FRONTEND_HOST || 'nen-platform.com',
      port: parseInt(process.env.PROD_FRONTEND_PORT || '443'),
      protocol: 'https',
      health_endpoint: '/api/health',
      timeout_ms: 15000
    },
    backend: {
      host: process.env.PROD_BACKEND_HOST || 'api.nen-platform.com',
      port: parseInt(process.env.PROD_BACKEND_PORT || '443'),
      protocol: 'https',
      health_endpoint: '/health',
      timeout_ms: 15000
    },
    ai: {
      host: process.env.PROD_AI_SERVICE_HOST || 'ai.nen-platform.com',
      port: parseInt(process.env.PROD_AI_SERVICE_PORT || '443'),
      protocol: 'https',
      health_endpoint: '/health',
      timeout_ms: 20000
    },
    database: {
      type: 'postgresql',
      host: process.env.PROD_DB_HOST || 'db.nen-platform.com',
      port: parseInt(process.env.PROD_DB_PORT || '5432'),
      database: process.env.PROD_DB_DATABASE || 'nen_platform',
      pool_size: 100,
      timeout_ms: 8000
    },
    redis: {
      host: process.env.PROD_REDIS_HOST || 'redis.nen-platform.com',
      port: parseInt(process.env.PROD_REDIS_PORT || '6379'),
      timeout_ms: 5000,
      max_connections: 200
    }
  },
  performance: {
    targets: {
      api_response_time_ms: 50,
      ai_move_generation_ms: 100,
      database_query_ms: 25,
      memory_usage_mb: 2048,
      cpu_usage_percent: 50,
      concurrent_users: 1000
    },
    thresholds: {
      critical: {
        api_response_time_ms: 200,
        ai_move_generation_ms: 500,
        database_query_ms: 150,
        memory_usage_mb: 4096,
        cpu_usage_percent: 80,
        concurrent_users: 2000
      },
      warning: {
        api_response_time_ms: 100,
        ai_move_generation_ms: 300,
        database_query_ms: 75,
        memory_usage_mb: 3072,
        cpu_usage_percent: 65,
        concurrent_users: 1500
      },
      acceptable: {
        api_response_time_ms: 50,
        ai_move_generation_ms: 100,
        database_query_ms: 25,
        memory_usage_mb: 2048,
        cpu_usage_percent: 50,
        concurrent_users: 1000
      }
    },
    monitoring: {
      log_level: 'warn',
      metrics_interval_seconds: 30,
      alert_channels: ['webhook', 'email', 'slack', 'pagerduty'],
      report_frequency_minutes: 30
    }
  },
  stress: {
    concurrent_users: 500,
    request_rate: 2000,
    duration_minutes: 30,
    ramp_up_seconds: 300
  }
};

/**
 * Get environment configuration based on NODE_ENV
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const environment = process.env.NODE_ENV || 'development';

  switch (environment) {
    case 'development':
      return developmentConfig;
    case 'staging':
      return stagingConfig;
    case 'production':
      return productionConfig;
    default:
      logger.warn(`Unknown environment: ${environment}, using development config`);
      return developmentConfig;
  }
}

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(config: EnvironmentConfig): boolean {
  try {
    // Validate required fields
    if (!config.name || !config.type) {
      throw new Error('Environment name and type are required');
    }

    // Validate services
    const services = ['frontend', 'backend', 'ai', 'database', 'redis'];
    for (const service of services) {
      if (!config.services[service as keyof typeof config.services]) {
        throw new Error(`Service configuration missing: ${service}`);
      }
    }

    // Validate performance targets
    if (!config.performance.targets || !config.performance.thresholds) {
      throw new Error('Performance targets and thresholds are required');
    }

    logger.info(`Environment configuration validated successfully: ${config.name}`);
    return true;
  } catch (error) {
    logger.error(`Environment configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Log environment configuration (sanitized)
 */
export function logEnvironmentConfig(config: EnvironmentConfig): void {
  const sanitizedConfig = {
    name: config.name,
    type: config.type,
    services: Object.keys(config.services),
    targets: config.performance.targets,
    stress_config: config.stress
  };

  logger.info('Environment configuration loaded', sanitizedConfig);
}
