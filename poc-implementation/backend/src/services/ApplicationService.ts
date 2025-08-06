/**
 * Application Service Implementation for Nen Platform
 * 
 * This service manages applications, API keys, rate limiting, and application metrics
 * following production-ready implementation standards with comprehensive error handling,
 * security measures, and performance optimizations.
 */

import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  IApplicationService,
  IApplication,
  IApiKey,
  IRateLimit,
  IWebhook,
  IApplicationUsageMetrics,
  ApplicationStatus,
  ServiceResponse,
  PaginatedResponse,
  ServiceError,
  ServiceConfig
} from '../interfaces/ServiceInterfaces';

export class ApplicationService implements IApplicationService {
  private logger: Logger;
  private applications: Map<string, IApplication> = new Map();
  private apiKeys: Map<string, { appId: string; keyData: IApiKey }> = new Map();
  private usageMetrics: Map<string, IApplicationUsageMetrics> = new Map();
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
  private config: ServiceConfig;

  constructor(config: ServiceConfig) {
    this.config = config;
    this.logger = config.logger.child({ service: 'ApplicationService' });
    this.logger.info('ApplicationService initialized', {
      environment: config.environment,
      cachingEnabled: config.enableCaching,
      metricsEnabled: config.enableMetrics
    });

    // Start cleanup tasks
    this.startCleanupTasks();
  }

  /**
   * Create a new application
   */
  async createApplication(appData: Partial<IApplication>): Promise<ServiceResponse<IApplication>> {
    try {
      this.logger.info('Creating new application', { 
        name: appData.name, 
        owner: appData.owner 
      });

      // Validate required fields
      if (!appData.name || !appData.owner) {
        throw new ServiceError(
          'VALIDATION_ERROR',
          'Application name and owner are required'
        );
      }

      // Check if application name already exists for this owner
      const existingApp = Array.from(this.applications.values())
        .find(app => app.name === appData.name && app.owner === appData.owner);
      
      if (existingApp) {
        throw new ServiceError(
          'DUPLICATE_APPLICATION',
          'Application with this name already exists for this owner'
        );
      }

      const applicationId = uuidv4();
      const now = new Date();

      const application: IApplication = {
        id: applicationId,
        name: appData.name,
        version: appData.version || '1.0.0',
        description: appData.description || '',
        status: ApplicationStatus.PENDING_APPROVAL,
        owner: appData.owner,
        permissions: appData.permissions || [],
        apiKeys: [],
        rateLimit: appData.rateLimit || {
          requestsPerMinute: 100,
          requestsPerHour: 5000,
          requestsPerDay: 50000,
          concurrentRequests: 10
        },
        webhooks: appData.webhooks || [],
        createdAt: now,
        updatedAt: now,
        metadata: appData.metadata || {}
      };

      // Store application
      this.applications.set(applicationId, application);

      // Initialize metrics
      if (this.config.enableMetrics) {
        this.initializeMetrics(applicationId);
      }

      this.logger.info('Application created successfully', {
        applicationId,
        name: application.name,
        owner: application.owner
      });

      return {
        success: true,
        data: application,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to create application', {
        error: error instanceof Error ? error.message : 'Unknown error',
        appData: { name: appData.name, owner: appData.owner }
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to create application',
        code: error instanceof ServiceError ? error.code : 'INTERNAL_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get application by ID
   */
  async getApplication(appId: string): Promise<ServiceResponse<IApplication | null>> {
    try {
      this.logger.debug('Retrieving application', { appId });

      const application = this.applications.get(appId);
      if (!application) {
        return {
          success: true,
          data: null,
          timestamp: new Date()
        };
      }

      // Update last accessed time
      application.lastAccessedAt = new Date();
      this.applications.set(appId, application);

      return {
        success: true,
        data: application,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to retrieve application', {
        appId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to retrieve application',
        code: 'RETRIEVAL_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Update application
   */
  async updateApplication(appId: string, updates: Partial<IApplication>): Promise<ServiceResponse<IApplication>> {
    try {
      this.logger.info('Updating application', { appId });

      const application = this.applications.get(appId);
      if (!application) {
        throw new ServiceError('NOT_FOUND', 'Application not found');
      }

      // Prevent updating sensitive fields
      const { id, owner, createdAt, apiKeys, ...allowedUpdates } = updates;

      const updatedApplication: IApplication = {
        ...application,
        ...allowedUpdates,
        updatedAt: new Date()
      };

      this.applications.set(appId, updatedApplication);

      this.logger.info('Application updated successfully', {
        appId,
        updatedFields: Object.keys(allowedUpdates)
      });

      return {
        success: true,
        data: updatedApplication,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to update application', {
        appId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to update application',
        code: error instanceof ServiceError ? error.code : 'UPDATE_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Delete application
   */
  async deleteApplication(appId: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Deleting application', { appId });

      const application = this.applications.get(appId);
      if (!application) {
        throw new ServiceError('NOT_FOUND', 'Application not found');
      }

      // Remove all associated API keys
      application.apiKeys.forEach(key => {
        this.apiKeys.delete(key.key);
      });

      // Remove application
      this.applications.delete(appId);

      // Clean up metrics
      this.usageMetrics.delete(appId);

      this.logger.info('Application deleted successfully', { appId });

      return {
        success: true,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to delete application', {
        appId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to delete application',
        code: error instanceof ServiceError ? error.code : 'DELETE_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * List applications for owner
   */
  async listApplications(ownerId: string): Promise<ServiceResponse<PaginatedResponse<IApplication>>> {
    try {
      this.logger.debug('Listing applications', { ownerId });

      const userApplications = Array.from(this.applications.values())
        .filter(app => app.owner === ownerId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const paginatedResponse: PaginatedResponse<IApplication> = {
        items: userApplications,
        total: userApplications.length,
        page: 1,
        pageSize: userApplications.length,
        hasNextPage: false,
        hasPreviousPage: false
      };

      return {
        success: true,
        data: paginatedResponse,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to list applications', {
        ownerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to list applications',
        code: 'LIST_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate API key for application
   */
  async generateApiKey(appId: string, keyData: Partial<IApiKey>): Promise<ServiceResponse<IApiKey>> {
    try {
      this.logger.info('Generating API key', { appId });

      const application = this.applications.get(appId);
      if (!application) {
        throw new ServiceError('NOT_FOUND', 'Application not found');
      }

      // Generate secure API key
      const keyId = uuidv4();
      const key = this.generateSecureApiKey();

      const apiKey: IApiKey = {
        id: keyId,
        key,
        name: keyData.name || 'Default API Key',
        permissions: keyData.permissions || [],
        expiresAt: keyData.expiresAt,
        isActive: true,
        usageCount: 0,
        createdAt: new Date()
      };

      // Add to application
      application.apiKeys.push(apiKey);
      this.applications.set(appId, application);

      // Store key mapping
      this.apiKeys.set(key, { appId, keyData: apiKey });

      this.logger.info('API key generated successfully', {
        appId,
        keyId,
        keyName: apiKey.name
      });

      return {
        success: true,
        data: apiKey,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to generate API key', {
        appId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to generate API key',
        code: error instanceof ServiceError ? error.code : 'KEY_GENERATION_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(appId: string, keyId: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Revoking API key', { appId, keyId });

      const application = this.applications.get(appId);
      if (!application) {
        throw new ServiceError('NOT_FOUND', 'Application not found');
      }

      // Find and remove the key
      const keyIndex = application.apiKeys.findIndex(key => key.id === keyId);
      if (keyIndex === -1) {
        throw new ServiceError('NOT_FOUND', 'API key not found');
      }

      const apiKey = application.apiKeys[keyIndex];
      
      // Remove from application
      application.apiKeys.splice(keyIndex, 1);
      this.applications.set(appId, application);

      // Remove from key mapping
      this.apiKeys.delete(apiKey.key);

      this.logger.info('API key revoked successfully', { appId, keyId });

      return {
        success: true,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to revoke API key', {
        appId,
        keyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to revoke API key',
        code: error instanceof ServiceError ? error.code : 'KEY_REVOCATION_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Update rate limit for application
   */
  async updateRateLimit(appId: string, limits: IRateLimit): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Updating rate limit', { appId, limits });

      const application = this.applications.get(appId);
      if (!application) {
        throw new ServiceError('NOT_FOUND', 'Application not found');
      }

      // Validate rate limits
      if (limits.requestsPerMinute < 0 || limits.requestsPerHour < 0 || limits.requestsPerDay < 0) {
        throw new ServiceError('VALIDATION_ERROR', 'Rate limits must be non-negative');
      }

      application.rateLimit = limits;
      application.updatedAt = new Date();
      this.applications.set(appId, application);

      this.logger.info('Rate limit updated successfully', { appId });

      return {
        success: true,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to update rate limit', {
        appId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to update rate limit',
        code: error instanceof ServiceError ? error.code : 'RATE_LIMIT_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get application metrics
   */
  async getApplicationMetrics(appId: string, period: '1h' | '1d' | '7d' | '30d'): Promise<ServiceResponse<IApplicationUsageMetrics>> {
    try {
      this.logger.debug('Retrieving application metrics', { appId, period });

      const application = this.applications.get(appId);
      if (!application) {
        throw new ServiceError('NOT_FOUND', 'Application not found');
      }

      const metrics = this.usageMetrics.get(appId) || this.getDefaultMetrics();

      return {
        success: true,
        data: metrics,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to retrieve application metrics', {
        appId,
        period,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to retrieve metrics',
        code: error instanceof ServiceError ? error.code : 'METRICS_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<ServiceResponse<IApplication | null>> {
    try {
      const keyInfo = this.apiKeys.get(apiKey);
      if (!keyInfo) {
        return {
          success: true,
          data: null,
          timestamp: new Date()
        };
      }

      const application = this.applications.get(keyInfo.appId);
      if (!application || application.status !== ApplicationStatus.ACTIVE) {
        return {
          success: true,
          data: null,
          timestamp: new Date()
        };
      }

      // Check if key is active and not expired
      const key = keyInfo.keyData;
      if (!key.isActive || (key.expiresAt && new Date() > key.expiresAt)) {
        return {
          success: true,
          data: null,
          timestamp: new Date()
        };
      }

      // Check rate limits
      const rateLimitResult = this.checkRateLimit(apiKey, application.rateLimit);
      if (!rateLimitResult.allowed) {
        throw new ServiceError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded');
      }

      // Update usage
      key.lastUsedAt = new Date();
      key.usageCount++;

      return {
        success: true,
        data: application,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('API key validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'API key validation failed',
        code: error instanceof ServiceError ? error.code : 'VALIDATION_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Log API usage
   */
  async logApiUsage(apiKey: string, endpoint: string, responseTime: number, success: boolean): Promise<ServiceResponse<void>> {
    try {
      const keyInfo = this.apiKeys.get(apiKey);
      if (!keyInfo || !this.config.enableMetrics) {
        return {
          success: true,
          timestamp: new Date()
        };
      }

      const metrics = this.usageMetrics.get(keyInfo.appId) || this.getDefaultMetrics();
      
      metrics.totalRequests++;
      if (success) {
        metrics.successfulRequests++;
      }
      
      metrics.errorRate = ((metrics.totalRequests - metrics.successfulRequests) / metrics.totalRequests) * 100;
      metrics.averageResponseTime = ((metrics.averageResponseTime * (metrics.totalRequests - 1)) + responseTime) / metrics.totalRequests;

      this.usageMetrics.set(keyInfo.appId, metrics);

      return {
        success: true,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to log API usage', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to log API usage',
        code: 'LOGGING_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Suspend application
   */
  async suspendApplication(appId: string, reason: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Suspending application', { appId, reason });

      const application = this.applications.get(appId);
      if (!application) {
        throw new ServiceError('NOT_FOUND', 'Application not found');
      }

      application.status = ApplicationStatus.SUSPENDED;
      application.updatedAt = new Date();
      application.metadata.suspensionReason = reason;
      application.metadata.suspendedAt = new Date();

      this.applications.set(appId, application);

      this.logger.info('Application suspended successfully', { appId });

      return {
        success: true,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to suspend application', {
        appId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to suspend application',
        code: error instanceof ServiceError ? error.code : 'SUSPENSION_ERROR',
        timestamp: new Date()
      };
    }
  }

  /**
   * Activate application
   */
  async activateApplication(appId: string): Promise<ServiceResponse<void>> {
    try {
      this.logger.info('Activating application', { appId });

      const application = this.applications.get(appId);
      if (!application) {
        throw new ServiceError('NOT_FOUND', 'Application not found');
      }

      application.status = ApplicationStatus.ACTIVE;
      application.updatedAt = new Date();
      
      // Remove suspension metadata
      delete application.metadata.suspensionReason;
      delete application.metadata.suspendedAt;

      this.applications.set(appId, application);

      this.logger.info('Application activated successfully', { appId });

      return {
        success: true,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to activate application', {
        appId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof ServiceError ? error.message : 'Failed to activate application',
        code: error instanceof ServiceError ? error.code : 'ACTIVATION_ERROR',
        timestamp: new Date()
      };
    }
  }

  // Private helper methods

  private generateSecureApiKey(): string {
    const prefix = 'nen_';
    const randomBytes = crypto.randomBytes(32);
    return prefix + randomBytes.toString('hex');
  }

  private checkRateLimit(apiKey: string, limits: IRateLimit): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const key = `${apiKey}_rate_limit`;
    
    const existing = this.rateLimitStore.get(key);
    if (!existing) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
      return { allowed: true };
    }

    if (now > existing.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + 60000 });
      return { allowed: true };
    }

    if (existing.count >= limits.requestsPerMinute) {
      return { allowed: false, resetTime: existing.resetTime };
    }

    existing.count++;
    this.rateLimitStore.set(key, existing);
    return { allowed: true };
  }

  private initializeMetrics(appId: string): void {
    this.usageMetrics.set(appId, this.getDefaultMetrics());
  }

  private getDefaultMetrics(): IApplicationUsageMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      errorRate: 0,
      averageResponseTime: 0,
      peakUsage: 0,
      bandwidthUsed: 0,
      dailyActiveUsers: 0,
      monthlyActiveUsers: 0
    };
  }

  private startCleanupTasks(): void {
    // Clean up expired rate limits every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.rateLimitStore.entries()) {
        if (now > data.resetTime) {
          this.rateLimitStore.delete(key);
        }
      }
    }, 5 * 60 * 1000);

    // Clean up expired API keys every hour
    setInterval(() => {
      this.cleanupExpiredApiKeys();
    }, 60 * 60 * 1000);
  }

  private cleanupExpiredApiKeys(): void {
    try {
      const now = new Date();
      let cleanedCount = 0;

      for (const [appId, application] of this.applications.entries()) {
        const activeKeys = application.apiKeys.filter(key => {
          const isExpired = key.expiresAt && now > key.expiresAt;
          if (isExpired) {
            this.apiKeys.delete(key.key);
            cleanedCount++;
            return false;
          }
          return true;
        });

        if (activeKeys.length !== application.apiKeys.length) {
          application.apiKeys = activeKeys;
          this.applications.set(appId, application);
        }
      }

      if (cleanedCount > 0) {
        this.logger.info('Cleaned up expired API keys', { cleanedCount });
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired API keys', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
