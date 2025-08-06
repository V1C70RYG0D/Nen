/**
 * Test Service Factory
 * Provides consistent service creation for testing with proper mocking and types
 * Following GI guidelines for real implementations over mocks
 */

import {
  IEnhancedAITrainingService,
  IAdvancedLoadTestingService,
  IEnhancedComplianceService,
  IEnhancedDatabaseService,
  IBettingService,
  IAIService,
  IUserService,
  IWebSocketService,
  IServiceFactory,
  TestServiceConfig
} from '../types/serviceTypes';

import {
  mockEnhancedAITrainingService,
  mockAdvancedLoadTestingService,
  mockEnhancedComplianceServiceV2,
  mockEnhancedDatabaseService,
  mockPrismaClient,
  mockRedisClient
} from '../mocks/mockServices';

import { getTestDatabaseClient } from './testDatabase';
import { createMockLogger } from '../mocks/logger';

/**
 * Default test service configuration
 */
const defaultTestConfig: TestServiceConfig = {
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
class TestServiceFactory implements IServiceFactory {
  private config: TestServiceConfig;
  private logger = createMockLogger();

  constructor(config: Partial<TestServiceConfig> = {}) {
    this.config = { ...defaultTestConfig, ...config };
  }

  getDatabaseService(): IEnhancedDatabaseService {
    if (this.config.useRealServices) {
      // Use real database service if available and configured
      try {
        const { getEnhancedDatabaseService } = require('../../services/EnhancedDatabaseService');
        return getEnhancedDatabaseService();
      } catch (error) {
        this.logger.warn('Could not load real database service, using mock', { error });
      }
    }

    return {
      ...mockEnhancedDatabaseService,
      getPrismaClient: () => getTestDatabaseClient(),
      cachedQuery: jest.fn().mockImplementation(async (key, queryFn) => {
        if (this.config.enableCaching) {
          // Simple in-memory cache for tests
          return await queryFn();
        }
        return await queryFn();
      })
    };
  }

  getAITrainingService(): IEnhancedAITrainingService {
    if (this.config.useRealServices) {
      try {
        const { getEnhancedAITrainingServiceV2 } = require('../../services/EnhancedAITrainingServiceV2');
        return getEnhancedAITrainingServiceV2();
      } catch (error) {
        this.logger.warn('Could not load real AI training service, using mock', { error });
      }
    }

    return mockEnhancedAITrainingService as IEnhancedAITrainingService;
  }

  getLoadTestingService(): IAdvancedLoadTestingService {
    if (this.config.useRealServices) {
      try {
        const { getAdvancedLoadTestingService } = require('../../services/AdvancedLoadTestingService');
        return getAdvancedLoadTestingService();
      } catch (error) {
        this.logger.warn('Could not load real load testing service, using mock', { error });
      }
    }

    return mockAdvancedLoadTestingService as IAdvancedLoadTestingService;
  }

  getComplianceService(): IEnhancedComplianceService {
    if (this.config.useRealServices) {
      try {
        const { getEnhancedComplianceService } = require('../../services/EnhancedComplianceService');
        return getEnhancedComplianceService();
      } catch (error) {
        this.logger.warn('Could not load real compliance service, using mock', { error });
      }
    }

    return mockEnhancedComplianceServiceV2 as IEnhancedComplianceService;
  }

  getBettingService(): IBettingService {
    const mockBettingService: IBettingService = {
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

  getAIService(): IAIService {
    const mockAIService: IAIService = {
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

  getUserService(): IUserService {
    const mockUserService: IUserService = {
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

  getWebSocketService(): IWebSocketService {
    const mockWebSocketService: IWebSocketService = {
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
  updateConfig(config: Partial<TestServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset all service mocks to clean state
   */
  resetMocks(): void {
    // Reset all mock functions
    jest.clearAllMocks();
    
    // Reset specific service states if needed
    Object.values(mockEnhancedAITrainingService).forEach(method => {
      if (jest.isMockFunction(method)) {
        method.mockClear();
      }
    });

    Object.values(mockAdvancedLoadTestingService).forEach(method => {
      if (jest.isMockFunction(method)) {
        method.mockClear();
      }
    });

    Object.values(mockEnhancedComplianceServiceV2).forEach(method => {
      if (jest.isMockFunction(method)) {
        method.mockClear();
      }
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): TestServiceConfig {
    return { ...this.config };
  }
}

// Global test service factory instance
let testServiceFactory: TestServiceFactory;

/**
 * Get test service factory instance
 */
export const getTestServiceFactory = (config?: Partial<TestServiceConfig>): TestServiceFactory => {
  if (!testServiceFactory || config) {
    testServiceFactory = new TestServiceFactory(config);
  }
  return testServiceFactory;
};

/**
 * Reset test service factory to clean state
 */
export const resetTestServiceFactory = (): void => {
  if (testServiceFactory) {
    testServiceFactory.resetMocks();
  }
};

/**
 * Create a new test service factory for isolated testing
 */
export const createTestServiceFactory = (config?: Partial<TestServiceConfig>): TestServiceFactory => {
  return new TestServiceFactory(config);
};

/**
 * Helper function to create services with test-specific configuration
 */
export const createTestServices = (config?: Partial<TestServiceConfig>) => {
  const factory = createTestServiceFactory(config);
  
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

export { TestServiceFactory };
