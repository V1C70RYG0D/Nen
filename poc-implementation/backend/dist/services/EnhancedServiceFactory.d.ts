/**
 * Enhanced Service Factory Implementation for Nen Platform
 *
 * This factory creates and manages the new comprehensive service instances with proper
 * configuration, dependency injection, and lifecycle management. Follows the Factory
 * design pattern for centralized service creation and management.
 */
import { Logger } from 'winston';
import { IServiceFactory, IAuthenticationService, IUserManagementService, IApplicationService, INotificationService, IFileService, ServiceConfig } from '../interfaces/ServiceInterfaces';
/**
 * Enhanced Service Factory implementing the IServiceFactory interface
 */
export declare class EnhancedServiceFactory implements IServiceFactory {
    private logger;
    private serviceInstances;
    constructor(logger: Logger);
    /**
     * Create or get cached authentication service instance
     */
    createAuthenticationService(config: ServiceConfig): IAuthenticationService;
    /**
     * Create or get cached user management service instance
     */
    createUserManagementService(config: ServiceConfig): IUserManagementService;
    /**
     * Create or get cached application service instance
     */
    createApplicationService(config: ServiceConfig): IApplicationService;
    /**
     * Create or get cached notification service instance
     */
    createNotificationService(config: ServiceConfig): INotificationService;
    /**
     * Create or get cached file service instance
     */
    createFileService(config: ServiceConfig): IFileService;
    /**
     * Get all created service instances
     */
    getAllServices(): Map<string, any>;
    /**
     * Clear all cached service instances
     */
    clearCache(): void;
    /**
     * Get service health status
     */
    getHealthStatus(): {
        [serviceName: string]: boolean;
    };
    /**
     * Initialize all services with given configuration
     */
    initializeAllServices(config: ServiceConfig): Promise<{
        authService: IAuthenticationService;
        userService: IUserManagementService;
        appService: IApplicationService;
        notificationService: INotificationService;
        fileService: IFileService;
    }>;
    /**
     * Get detailed service information
     */
    getServiceInfo(): Array<{
        name: string;
        type: string;
        status: string;
        createdAt?: Date;
        features: string[];
    }>;
    /**
     * Create service configuration from environment with validation
     */
    static createServiceConfig(logger: Logger): ServiceConfig;
    /**
     * Validate service configuration
     */
    static validateServiceConfig(config: ServiceConfig): boolean;
    private getServiceFeatures;
}
/**
 * Get the global enhanced service factory instance
 */
export declare function getEnhancedServiceFactory(logger?: Logger): EnhancedServiceFactory;
/**
 * Reset the global enhanced service factory instance (mainly for testing)
 */
export declare function resetEnhancedServiceFactory(): void;
/**
 * Initialize all services and return configured instances
 */
export declare function initializeEnhancedServices(logger: Logger): Promise<{
    authService: IAuthenticationService;
    userService: IUserManagementService;
    appService: IApplicationService;
    notificationService: INotificationService;
    fileService: IFileService;
}>;
/**
 * Get service statistics
 */
export declare function getServiceStatistics(factory?: EnhancedServiceFactory): {
    totalServices: number;
    activeServices: number;
    healthyServices: number;
    services: Array<{
        name: string;
        type: string;
        status: string;
        features: string[];
    }>;
};
//# sourceMappingURL=EnhancedServiceFactory.d.ts.map