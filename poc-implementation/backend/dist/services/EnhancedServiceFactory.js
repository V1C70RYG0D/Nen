"use strict";
/**
 * Enhanced Service Factory Implementation for Nen Platform
 *
 * This factory creates and manages the new comprehensive service instances with proper
 * configuration, dependency injection, and lifecycle management. Follows the Factory
 * design pattern for centralized service creation and management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedServiceFactory = void 0;
exports.getEnhancedServiceFactory = getEnhancedServiceFactory;
exports.resetEnhancedServiceFactory = resetEnhancedServiceFactory;
exports.initializeEnhancedServices = initializeEnhancedServices;
exports.getServiceStatistics = getServiceStatistics;
const AuthenticationService_1 = require("./AuthenticationService");
const UserService_1 = require("./UserService");
const EnhancedUserManagementService_1 = require("./EnhancedUserManagementService");
const ApplicationService_1 = require("./ApplicationService");
const NotificationService_1 = require("./NotificationService");
const FileService_1 = require("./FileService");
/**
 * Enhanced Service Factory implementing the IServiceFactory interface
 */
class EnhancedServiceFactory {
    constructor(logger) {
        this.serviceInstances = new Map();
        this.logger = logger.child({ factory: 'EnhancedServiceFactory' });
        this.logger.info('Enhanced Service Factory initialized');
    }
    /**
     * Create or get cached authentication service instance
     */
    createAuthenticationService(config) {
        const cacheKey = 'AuthenticationService';
        if (this.serviceInstances.has(cacheKey)) {
            this.logger.debug('Returning cached authentication service');
            return this.serviceInstances.get(cacheKey);
        }
        this.logger.info('Creating new authentication service');
        const service = new AuthenticationService_1.AuthenticationService(config.logger);
        this.serviceInstances.set(cacheKey, service);
        return service;
    }
    /**
     * Create or get cached user management service instance
     */
    createUserManagementService(config) {
        const cacheKey = 'UserManagementService';
        if (this.serviceInstances.has(cacheKey)) {
            this.logger.debug('Returning cached user management service');
            return this.serviceInstances.get(cacheKey);
        }
        this.logger.info('Creating new user management service');
        // Create base user service first
        const userService = new UserService_1.UserService();
        // Create enhanced user management service
        const service = new EnhancedUserManagementService_1.EnhancedUserManagementService(config, userService);
        this.serviceInstances.set(cacheKey, service);
        return service;
    }
    /**
     * Create or get cached application service instance
     */
    createApplicationService(config) {
        const cacheKey = 'ApplicationService';
        if (this.serviceInstances.has(cacheKey)) {
            this.logger.debug('Returning cached application service');
            return this.serviceInstances.get(cacheKey);
        }
        this.logger.info('Creating new application service');
        const service = new ApplicationService_1.ApplicationService(config);
        this.serviceInstances.set(cacheKey, service);
        return service;
    }
    /**
     * Create or get cached notification service instance
     */
    createNotificationService(config) {
        const cacheKey = 'NotificationService';
        if (this.serviceInstances.has(cacheKey)) {
            this.logger.debug('Returning cached notification service');
            return this.serviceInstances.get(cacheKey);
        }
        this.logger.info('Creating new notification service');
        const service = new NotificationService_1.NotificationService(config);
        this.serviceInstances.set(cacheKey, service);
        return service;
    }
    /**
     * Create or get cached file service instance
     */
    createFileService(config) {
        const cacheKey = 'FileService';
        if (this.serviceInstances.has(cacheKey)) {
            this.logger.debug('Returning cached file service');
            return this.serviceInstances.get(cacheKey);
        }
        this.logger.info('Creating new file service');
        const service = new FileService_1.FileService(config);
        this.serviceInstances.set(cacheKey, service);
        return service;
    }
    /**
     * Get all created service instances
     */
    getAllServices() {
        return new Map(this.serviceInstances);
    }
    /**
     * Clear all cached service instances
     */
    clearCache() {
        this.logger.info('Clearing service cache', {
            cachedServices: this.serviceInstances.size
        });
        // Perform cleanup on services that need it
        for (const [serviceName, service] of this.serviceInstances.entries()) {
            if (typeof service.cleanup === 'function') {
                try {
                    service.cleanup();
                    this.logger.debug('Cleaned up service', { serviceName });
                }
                catch (error) {
                    this.logger.error('Failed to cleanup service', {
                        serviceName,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        }
        this.serviceInstances.clear();
    }
    /**
     * Get service health status
     */
    getHealthStatus() {
        const healthStatus = {};
        for (const [serviceName, service] of this.serviceInstances.entries()) {
            try {
                // Check if service has a health check method
                if (typeof service.healthCheck === 'function') {
                    healthStatus[serviceName] = service.healthCheck();
                }
                else {
                    // Assume healthy if service exists and is truthy
                    healthStatus[serviceName] = !!service;
                }
            }
            catch (error) {
                this.logger.error('Health check failed for service', {
                    serviceName,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                healthStatus[serviceName] = false;
            }
        }
        return healthStatus;
    }
    /**
     * Initialize all services with given configuration
     */
    async initializeAllServices(config) {
        try {
            this.logger.info('Initializing all enhanced services');
            // Initialize services in dependency order
            const authService = this.createAuthenticationService(config);
            const userService = this.createUserManagementService(config);
            const appService = this.createApplicationService(config);
            const notificationService = this.createNotificationService(config);
            const fileService = this.createFileService(config);
            this.logger.info('All enhanced services initialized successfully', {
                servicesCount: this.serviceInstances.size,
                services: Array.from(this.serviceInstances.keys())
            });
            return {
                authService,
                userService,
                appService,
                notificationService,
                fileService
            };
        }
        catch (error) {
            this.logger.error('Failed to initialize all services', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Get detailed service information
     */
    getServiceInfo() {
        const serviceInfo = [];
        for (const [name, service] of this.serviceInstances.entries()) {
            const info = {
                name,
                type: service.constructor.name,
                status: 'active',
                features: this.getServiceFeatures(service)
            };
            serviceInfo.push(info);
        }
        return serviceInfo;
    }
    /**
     * Create service configuration from environment with validation
     */
    static createServiceConfig(logger) {
        const environment = process.env.NODE_ENV || 'development';
        const enableCaching = process.env.ENABLE_CACHING !== 'false';
        const enableMetrics = process.env.ENABLE_METRICS !== 'false';
        logger.info('Creating service configuration', {
            environment,
            enableCaching,
            enableMetrics
        });
        return {
            environment,
            logger,
            enableCaching,
            enableMetrics
        };
    }
    /**
     * Validate service configuration
     */
    static validateServiceConfig(config) {
        if (!config.logger) {
            throw new Error('Logger is required in service configuration');
        }
        if (!['development', 'staging', 'production'].includes(config.environment)) {
            throw new Error(`Invalid environment: ${config.environment}`);
        }
        return true;
    }
    // Private helper methods
    getServiceFeatures(service) {
        const features = [];
        // Check common service features
        if (typeof service.createUser === 'function') {
            features.push('user_creation');
        }
        if (typeof service.sendNotification === 'function') {
            features.push('notifications');
        }
        if (typeof service.uploadFile === 'function') {
            features.push('file_upload');
        }
        if (typeof service.createApplication === 'function') {
            features.push('application_management');
        }
        if (typeof service.login === 'function') {
            features.push('authentication');
        }
        if (typeof service.generateApiKey === 'function') {
            features.push('api_key_management');
        }
        if (typeof service.scheduleNotification === 'function') {
            features.push('scheduled_notifications');
        }
        if (typeof service.scanForViruses === 'function') {
            features.push('virus_scanning');
        }
        return features;
    }
}
exports.EnhancedServiceFactory = EnhancedServiceFactory;
/**
 * Singleton instance for global access
 */
let enhancedServiceFactoryInstance = null;
/**
 * Get the global enhanced service factory instance
 */
function getEnhancedServiceFactory(logger) {
    if (!enhancedServiceFactoryInstance) {
        if (!logger) {
            throw new Error('Logger is required for first-time enhanced service factory initialization');
        }
        enhancedServiceFactoryInstance = new EnhancedServiceFactory(logger);
    }
    return enhancedServiceFactoryInstance;
}
/**
 * Reset the global enhanced service factory instance (mainly for testing)
 */
function resetEnhancedServiceFactory() {
    if (enhancedServiceFactoryInstance) {
        enhancedServiceFactoryInstance.clearCache();
        enhancedServiceFactoryInstance = null;
    }
}
/**
 * Initialize all services and return configured instances
 */
async function initializeEnhancedServices(logger) {
    const factory = getEnhancedServiceFactory(logger);
    const config = EnhancedServiceFactory.createServiceConfig(logger);
    // Validate configuration
    EnhancedServiceFactory.validateServiceConfig(config);
    // Initialize and return all services
    return await factory.initializeAllServices(config);
}
/**
 * Get service statistics
 */
function getServiceStatistics(factory) {
    const serviceFactory = factory || enhancedServiceFactoryInstance;
    if (!serviceFactory) {
        return {
            totalServices: 0,
            activeServices: 0,
            healthyServices: 0,
            services: []
        };
    }
    const healthStatus = serviceFactory.getHealthStatus();
    const serviceInfo = serviceFactory.getServiceInfo();
    return {
        totalServices: serviceInfo.length,
        activeServices: serviceInfo.filter(s => s.status === 'active').length,
        healthyServices: Object.values(healthStatus).filter(h => h).length,
        services: serviceInfo
    };
}
//# sourceMappingURL=EnhancedServiceFactory.js.map