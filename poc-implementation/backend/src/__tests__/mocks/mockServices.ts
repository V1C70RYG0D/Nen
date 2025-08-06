/**
 * Mock Database Services for Testing
 * Provides mock implementations to test enhanced features without Prisma
 */

export const mockPrismaClient = {
  user: {
    findUnique: jest.fn().mockResolvedValue({
      id: 'test_user_1',
      wallet_address: 'test_wallet',
      balance: 10.0,
      kyc_status: 'approved',
      kyc_verified_at: new Date(),
      verification_level: 'basic',
      bets: []
    }),
    count: jest.fn().mockResolvedValue(100),
    update: jest.fn().mockResolvedValue({
      id: 'test_user_1',
      wallet_address: 'test_wallet',
      balance: 8.0
    })
  },
  bet: {
    count: jest.fn().mockResolvedValue(5),
    findMany: jest.fn().mockResolvedValue([
      {
        id: 'bet_1',
        amount: 2.0,
        created_at: new Date(),
        user: { wallet_address: 'test_wallet' }
      }
    ]),
    create: jest.fn().mockResolvedValue({
      id: 'new_bet_1',
      amount: 1.0
    })
  },
  match: {
    findMany: jest.fn().mockResolvedValue([
      {
        id: 'match_1',
        status: 'in_progress',
        ai_agent_1: { id: 'agent_1', name: 'Agent 1' },
        ai_agent_2: { id: 'agent_2', name: 'Agent 2' },
        bets: []
      }
    ])
  },
  aiAgent: {
    findUnique: jest.fn().mockResolvedValue({
      id: 'test_agent_1',
      name: 'Test Agent',
      elo_rating: 1200,
      games_played: 50,
      win_rate: 0.6
    }),
    update: jest.fn().mockResolvedValue({
      id: 'test_agent_1',
      elo_rating: 1220
    })
  },
  $queryRaw: jest.fn().mockResolvedValue([{ count: 10 }]),
  $executeRaw: jest.fn().mockResolvedValue(1),
  $transaction: jest.fn().mockImplementation((fn) => fn(mockPrismaClient)),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $on: jest.fn()
};

export const mockRedisClient = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  quit: jest.fn().mockResolvedValue('OK')
};

// Mock the enhanced database service
export const mockEnhancedDatabaseService = {
  cachedQuery: jest.fn().mockImplementation((key, queryFn) => queryFn()),
  checkDatabaseHealth: jest.fn().mockResolvedValue({
    isConnected: true,
    lastChecked: new Date(),
    averageResponseTime: 5,
    connectionPoolSize: 10,
    activeConnections: 2
  }),
  getPerformanceMetrics: jest.fn().mockReturnValue({
    totalQueries: 100,
    averageQueryTime: 8,
    slowQueries: 5,
    fastQueries: 95,
    cacheHits: 50,
    cacheMisses: 50
  }),
  getPrismaClient: jest.fn().mockReturnValue(mockPrismaClient),
  getRedisClient: jest.fn().mockReturnValue(mockRedisClient),
  shutdown: jest.fn().mockResolvedValue(undefined)
};

// Mock the enhanced compliance service
export const mockEnhancedComplianceService = {
  detectFraud: jest.fn().mockImplementation((walletAddress, amount) => {
    const isNewUser = walletAddress === 'new_user_wallet';
    const isLargeAmount = amount > 50;
    const isInvalidWallet = !walletAddress;

    let riskScore = 10;
    const flaggedReasons = [];

    if (isInvalidWallet) {
      riskScore = 100;
      flaggedReasons.push('Invalid wallet address');
    } else if (isNewUser && amount > 10) {
      riskScore += 40;
      flaggedReasons.push('Large amount for new user');
    }

    if (isLargeAmount) {
      riskScore += 30;
      flaggedReasons.push('Very large transaction amount');
    }

    return Promise.resolve({
      riskScore,
      isHighRisk: riskScore >= 80,
      flaggedReasons,
      recommendedAction: riskScore >= 80 ? 'block' : riskScore >= 60 ? 'review' : 'allow',
      confidence: 0.8
    });
  }),
  checkKYCCompliance: jest.fn().mockResolvedValue({
    walletAddress: 'test_wallet',
    isCompliant: true,
    status: 'approved',
    verificationLevel: 'basic',
    lastCheck: new Date(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    documents: []
  }),
  getComplianceMetrics: jest.fn().mockResolvedValue({
    totalUsers: 100,
    compliantUsers: 85,
    pendingVerifications: 15,
    flaggedTransactions: 5,
    blockedTransactions: 2,
    averageRiskScore: 25,
    complianceRate: 85
  }),
  analyzeTransactionPatterns: jest.fn().mockResolvedValue({
    walletAddress: 'test_wallet',
    totalTransactions: 10,
    totalVolume: 25.5,
    averageAmount: 2.55,
    maxAmount: 5.0,
    timeSpan: 1440, // 24 hours in minutes
    frequency: 0.4, // transactions per hour
    isAnomalous: false
  })
};

// Mock the enhanced AI training service V2
export const mockEnhancedAITrainingService = {
  scheduleWeeklyTraining: jest.fn().mockResolvedValue(undefined),
  startSelfPlayTraining: jest.fn().mockImplementation((agentId, numberOfGames) => {
    return Promise.resolve({
      id: `self_play_${agentId}_${Date.now()}`,
      agentId,
      opponentId: agentId,
      gamesPlayed: 0,
      targetGames: numberOfGames,
      winRate: 0,
      averageGameLength: 0,
      eloChange: 0,
      started: new Date(),
      status: 'running',
      learningData: [],
      computeTime: 0
    });
  }),
  getTrainingMetrics: jest.fn().mockResolvedValue({
    totalSessions: 5,
    totalGames: 250,
    averageWinRate: 0.52,
    eloImprovement: 50,
    lastUpdate: new Date(),
    nextScheduledUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    computeEfficiency: 0.85
  }),
  getActiveSessions: jest.fn().mockReturnValue([]),
  stopTraining: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
  startAdvancedSelfPlayTraining: jest.fn().mockResolvedValue({
    id: `advanced_training_${Date.now()}`,
    agentId: 'test-agent',
    status: 'running',
    gamesPlayed: 0,
    targetGames: 100,
    started: new Date()
  }),
  pauseTraining: jest.fn().mockResolvedValue(undefined),
  resumeTraining: jest.fn().mockResolvedValue(undefined),
  getComputeEfficiency: jest.fn().mockReturnValue(0.85)
};

// Mock Advanced Load Testing Service
export const mockAdvancedLoadTestingService = {
  runLoadTest: jest.fn().mockResolvedValue({
    testId: `load_test_${Date.now()}`,
    concurrent_users: 100,
    duration: 300,
    status: 'completed',
    results: {
      total_requests: 10000,
      successful_requests: 9950,
      failed_requests: 50,
      average_response_time: 120,
      max_response_time: 2500,
      min_response_time: 45
    }
  }),
  getMetrics: jest.fn().mockResolvedValue({
    activeTests: 0,
    totalTests: 5,
    successRate: 0.995
  }),
  stopAllTests: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined)
};

// Mock Enhanced Compliance Service
export const mockEnhancedComplianceServiceV2 = {
  initialize: jest.fn().mockResolvedValue(undefined),
  detectFraud: jest.fn().mockImplementation((walletAddress, amount) => {
    const isNewUser = walletAddress === 'new_user_wallet';
    const isLargeAmount = amount > 50;
    const isInvalidWallet = !walletAddress;

    let riskScore = 10;
    const flaggedReasons = [];

    if (isInvalidWallet) {
      riskScore = 100;
      flaggedReasons.push('Invalid wallet address');
    } else if (isNewUser && amount > 10) {
      riskScore += 40;
      flaggedReasons.push('Large amount for new user');
    }

    if (isLargeAmount) {
      riskScore += 30;
      flaggedReasons.push('Very large transaction amount');
    }

    return Promise.resolve({
      riskScore,
      isHighRisk: riskScore >= 80,
      flaggedReasons,
      recommendedAction: riskScore >= 80 ? 'block' : riskScore >= 60 ? 'review' : 'allow',
      confidence: 0.8
    });
  }),
  checkKYCCompliance: jest.fn().mockResolvedValue({
    walletAddress: 'test_wallet',
    isCompliant: true,
    status: 'approved',
    verificationLevel: 'basic',
    lastCheck: new Date(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    documents: []
  }),
  shutdown: jest.fn().mockResolvedValue(undefined)
};
