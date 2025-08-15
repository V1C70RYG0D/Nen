/**
 * Test Service Factory
 * Provides consistent service creation for testing with proper mocking and types
 * Following GI guidelines for real implementations over mocks
 */
import { IEnhancedAITrainingService, IAdvancedLoadTestingService, IEnhancedComplianceService, IEnhancedDatabaseService, IBettingService, IAIService, IUserService, IWebSocketService, IServiceFactory, TestServiceConfig } from '../types/serviceTypes';
/**
 * Test Service Factory Implementation
 */
declare class TestServiceFactory implements IServiceFactory {
    private config;
    private logger;
    constructor(config?: Partial<TestServiceConfig>);
    getDatabaseService(): IEnhancedDatabaseService;
    getAITrainingService(): IEnhancedAITrainingService;
    getLoadTestingService(): IAdvancedLoadTestingService;
    getComplianceService(): IEnhancedComplianceService;
    getBettingService(): IBettingService;
    getAIService(): IAIService;
    getUserService(): IUserService;
    getWebSocketService(): IWebSocketService;
    /**
     * Update configuration for specific tests
     */
    updateConfig(config: Partial<TestServiceConfig>): void;
    /**
     * Reset all service mocks to clean state
     */
    resetMocks(): void;
    /**
     * Get current configuration
     */
    getConfig(): TestServiceConfig;
}
/**
 * Get test service factory instance
 */
export declare const getTestServiceFactory: (config?: Partial<TestServiceConfig>) => TestServiceFactory;
/**
 * Reset test service factory to clean state
 */
export declare const resetTestServiceFactory: () => void;
/**
 * Create a new test service factory for isolated testing
 */
export declare const createTestServiceFactory: (config?: Partial<TestServiceConfig>) => TestServiceFactory;
/**
 * Helper function to create services with test-specific configuration
 */
export declare const createTestServices: (config?: Partial<TestServiceConfig>) => {
    databaseService: IEnhancedDatabaseService;
    aiTrainingService: IEnhancedAITrainingService;
    loadTestingService: IAdvancedLoadTestingService;
    complianceService: IEnhancedComplianceService;
    bettingService: IBettingService;
    aiService: IAIService;
    userService: IUserService;
    webSocketService: IWebSocketService;
    factory: TestServiceFactory;
};
export { TestServiceFactory };
//# sourceMappingURL=testServiceFactory.d.ts.map