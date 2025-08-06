/**
 * Application Service Implementation for Nen Platform
 *
 * This service manages applications, API keys, rate limiting, and application metrics
 * following production-ready implementation standards with comprehensive error handling,
 * security measures, and performance optimizations.
 */
import { IApplicationService, IApplication, IApiKey, IRateLimit, IApplicationUsageMetrics, ServiceResponse, PaginatedResponse, ServiceConfig } from '../interfaces/ServiceInterfaces';
export declare class ApplicationService implements IApplicationService {
    private logger;
    private applications;
    private apiKeys;
    private usageMetrics;
    private rateLimitStore;
    private config;
    constructor(config: ServiceConfig);
    /**
     * Create a new application
     */
    createApplication(appData: Partial<IApplication>): Promise<ServiceResponse<IApplication>>;
    /**
     * Get application by ID
     */
    getApplication(appId: string): Promise<ServiceResponse<IApplication | null>>;
    /**
     * Update application
     */
    updateApplication(appId: string, updates: Partial<IApplication>): Promise<ServiceResponse<IApplication>>;
    /**
     * Delete application
     */
    deleteApplication(appId: string): Promise<ServiceResponse<void>>;
    /**
     * List applications for owner
     */
    listApplications(ownerId: string): Promise<ServiceResponse<PaginatedResponse<IApplication>>>;
    /**
     * Generate API key for application
     */
    generateApiKey(appId: string, keyData: Partial<IApiKey>): Promise<ServiceResponse<IApiKey>>;
    /**
     * Revoke API key
     */
    revokeApiKey(appId: string, keyId: string): Promise<ServiceResponse<void>>;
    /**
     * Update rate limit for application
     */
    updateRateLimit(appId: string, limits: IRateLimit): Promise<ServiceResponse<void>>;
    /**
     * Get application metrics
     */
    getApplicationMetrics(appId: string, period: '1h' | '1d' | '7d' | '30d'): Promise<ServiceResponse<IApplicationUsageMetrics>>;
    /**
     * Validate API key
     */
    validateApiKey(apiKey: string): Promise<ServiceResponse<IApplication | null>>;
    /**
     * Log API usage
     */
    logApiUsage(apiKey: string, endpoint: string, responseTime: number, success: boolean): Promise<ServiceResponse<void>>;
    /**
     * Suspend application
     */
    suspendApplication(appId: string, reason: string): Promise<ServiceResponse<void>>;
    /**
     * Activate application
     */
    activateApplication(appId: string): Promise<ServiceResponse<void>>;
    private generateSecureApiKey;
    private checkRateLimit;
    private initializeMetrics;
    private getDefaultMetrics;
    private startCleanupTasks;
    private cleanupExpiredApiKeys;
}
//# sourceMappingURL=ApplicationService.d.ts.map