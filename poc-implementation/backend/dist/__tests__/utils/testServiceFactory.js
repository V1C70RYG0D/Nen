"use strict";
/**
 * Test Service Factory
 * Provides consistent service creation for testing with proper mocking and types
 * Following GI guidelines for real implementations over mocks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestServiceFactory = exports.createTestServices = exports.createTestServiceFactory = exports.resetTestServiceFactory = exports.getTestServiceFactory = void 0;
const mockServices_1 = require("../mocks/mockServices");
const testDatabase_1 = require("./testDatabase");
const logger_1 = require("../mocks/logger");
/**
 * Default test service configuration
 */
const defaultTestConfig = {
    useRealServices: process.env.USE_REAL_SERVICES_FOR_TESTS === 'true',
    enableCaching: false,
    enableLogging: false,
    mockExternalAPIs: true,
    testTimeout: 10000,
    maxRetries: 3
};
/**
 * Test Service Factory Implementation
 */
class TestServiceFactory {
    constructor(config = {}) {
        this.logger = (0, logger_1.createMockLogger)();
        this.config = { ...defaultTestConfig, ...config };
    }
    getDatabaseService() {
        if (this.config.useRealServices) {
            // Use real database service if available and configured
            try {
                const { getEnhancedDatabaseService } = require('../../services/EnhancedDatabaseService');
                return getEnhancedDatabaseService();
            }
            catch (error) {
                this.logger.warn('Could not load real database service, using mock', { error });
            }
        }
        return {
            ...mockServices_1.mockEnhancedDatabaseService,
            getPrismaClient: () => (0, testDatabase_1.getTestDatabaseClient)(),
            cachedQuery: jest.fn().mockImplementation(async (key, queryFn) => {
                if (this.config.enableCaching) {
                    // Simple in-memory cache for tests
                    return await queryFn();
                }
                return await queryFn();
            })
        };
    }
    getAITrainingService() {
        if (this.config.useRealServices) {
            try {
                const { getEnhancedAITrainingServiceV2 } = require('../../services/EnhancedAITrainingServiceV2');
                return getEnhancedAITrainingServiceV2();
            }
            catch (error) {
                this.logger.warn('Could not load real AI training service, using mock', { error });
            }
        }
        return mockServices_1.mockEnhancedAITrainingService;
    }
    getLoadTestingService() {
        if (this.config.useRealServices) {
            try {
                const { getAdvancedLoadTestingService } = require('../../services/AdvancedLoadTestingService');
                return getAdvancedLoadTestingService();
            }
            catch (error) {
                this.logger.warn('Could not load real load testing service, using mock', { error });
            }
        }
        return mockServices_1.mockAdvancedLoadTestingService;
    }
    getComplianceService() {
        if (this.config.useRealServices) {
            try {
                const { getEnhancedComplianceService } = require('../../services/EnhancedComplianceService');
                return getEnhancedComplianceService();
            }
            catch (error) {
                this.logger.warn('Could not load real compliance service, using mock', { error });
            }
        }
        return mockServices_1.mockEnhancedComplianceServiceV2;
    }
    getBettingService() {
        const mockBettingService = {
            placeBet: jest.fn().mockResolvedValue({
                id: 'test-bet-1',
                status: 'pending',
                odds: 1.5
            }),
            calculateOdds: jest.fn().mockResolvedValue({
                'agent-1': 1.5,
                'agent-2': 2.5
            }),
            resolveBets: jest.fn().mockResolvedValue(undefined),
            getUserBets: jest.fn().mockResolvedValue([]),
            getMatchBets: jest.fn().mockResolvedValue([])
        };
        return mockBettingService;
    }
    getAIService() {
        const mockAIService = {
            generateMove: jest.fn().mockResolvedValue({
                move: { from: [0, 0], to: [0, 1] },
                confidence: 0.85,
                evaluationScore: 0.2
            }),
            trainAgent: jest.fn().mockResolvedValue(undefined),
            getAgentStats: jest.fn().mockResolvedValue({
                elo_rating: 1200,
                games_played: 50,
                win_rate: 0.65
            }),
            simulateGame: jest.fn().mockResolvedValue({
                winner: 'agent-1',
                moves: [],
                duration: 1800
            })
        };
        return mockAIService;
    }
    getUserService() {
        const mockUserService = {
            createUser: jest.fn().mockResolvedValue({
                id: 'test-user-1',
                wallet_address: 'test-wallet',
                balance: 100.0
            }),
            getUserByWallet: jest.fn().mockResolvedValue({
                id: 'test-user-1',
                wallet_address: 'test-wallet',
                balance: 100.0
            }),
            updateUserBalance: jest.fn().mockResolvedValue({
                id: 'test-user-1',
                balance: 95.0
            }),
            getUserStats: jest.fn().mockResolvedValue({
                totalBets: 10,
                totalWinnings: 50.0,
                winRate: 0.6
            })
        };
        return mockUserService;
    }
    getWebSocketService() {
        const mockWebSocketService = {
            broadcast: jest.fn(),
            sendToUser: jest.fn(),
            sendToMatch: jest.fn(),
            getConnectedUsers: jest.fn().mockReturnValue(['user-1', 'user-2']),
            getMatchSubscribers: jest.fn().mockReturnValue(['user-1'])
        };
        return mockWebSocketService;
    }
    /**
     * Update configuration for specific tests
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Reset all service mocks to clean state
     */
    resetMocks() {
        // Reset all mock functions
        jest.clearAllMocks();
        // Reset specific service states if needed
        Object.values(mockServices_1.mockEnhancedAITrainingService).forEach(method => {
            if (jest.isMockFunction(method)) {
                method.mockClear();
            }
        });
        Object.values(mockServices_1.mockAdvancedLoadTestingService).forEach(method => {
            if (jest.isMockFunction(method)) {
                method.mockClear();
            }
        });
        Object.values(mockServices_1.mockEnhancedComplianceServiceV2).forEach(method => {
            if (jest.isMockFunction(method)) {
                method.mockClear();
            }
        });
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.TestServiceFactory = TestServiceFactory;
// Global test service factory instance
let testServiceFactory;
/**
 * Get test service factory instance
 */
const getTestServiceFactory = (config) => {
    if (!testServiceFactory || config) {
        testServiceFactory = new TestServiceFactory(config);
    }
    return testServiceFactory;
};
exports.getTestServiceFactory = getTestServiceFactory;
/**
 * Reset test service factory to clean state
 */
const resetTestServiceFactory = () => {
    if (testServiceFactory) {
        testServiceFactory.resetMocks();
    }
};
exports.resetTestServiceFactory = resetTestServiceFactory;
/**
 * Create a new test service factory for isolated testing
 */
const createTestServiceFactory = (config) => {
    return new TestServiceFactory(config);
};
exports.createTestServiceFactory = createTestServiceFactory;
/**
 * Helper function to create services with test-specific configuration
 */
const createTestServices = (config) => {
    const factory = (0, exports.createTestServiceFactory)(config);
    return {
        databaseService: factory.getDatabaseService(),
        aiTrainingService: factory.getAITrainingService(),
        loadTestingService: factory.getLoadTestingService(),
        complianceService: factory.getComplianceService(),
        bettingService: factory.getBettingService(),
        aiService: factory.getAIService(),
        userService: factory.getUserService(),
        webSocketService: factory.getWebSocketService(),
        factory
    };
};
exports.createTestServices = createTestServices;
//# sourceMappingURL=testServiceFactory.js.map