/**
 * Mock Database Services for Testing
 * Provides mock implementations to test enhanced features without Prisma
 */
export declare const mockPrismaClient: {
    user: {
        findUnique: jest.Mock<any, any, any>;
        count: jest.Mock<any, any, any>;
        update: jest.Mock<any, any, any>;
    };
    bet: {
        count: jest.Mock<any, any, any>;
        findMany: jest.Mock<any, any, any>;
        create: jest.Mock<any, any, any>;
    };
    match: {
        findMany: jest.Mock<any, any, any>;
    };
    aiAgent: {
        findUnique: jest.Mock<any, any, any>;
        update: jest.Mock<any, any, any>;
    };
    $queryRaw: jest.Mock<any, any, any>;
    $executeRaw: jest.Mock<any, any, any>;
    $transaction: jest.Mock<any, any, any>;
    $disconnect: jest.Mock<any, any, any>;
    $on: jest.Mock<any, any, any>;
};
export declare const mockRedisClient: {
    get: jest.Mock<any, any, any>;
    set: jest.Mock<any, any, any>;
    setex: jest.Mock<any, any, any>;
    del: jest.Mock<any, any, any>;
    quit: jest.Mock<any, any, any>;
};
export declare const mockEnhancedDatabaseService: {
    cachedQuery: jest.Mock<any, any, any>;
    checkDatabaseHealth: jest.Mock<any, any, any>;
    getPerformanceMetrics: jest.Mock<any, any, any>;
    getPrismaClient: jest.Mock<any, any, any>;
    getRedisClient: jest.Mock<any, any, any>;
    shutdown: jest.Mock<any, any, any>;
};
export declare const mockEnhancedComplianceService: {
    detectFraud: jest.Mock<any, any, any>;
    checkKYCCompliance: jest.Mock<any, any, any>;
    getComplianceMetrics: jest.Mock<any, any, any>;
    analyzeTransactionPatterns: jest.Mock<any, any, any>;
};
export declare const mockEnhancedAITrainingService: {
    scheduleWeeklyTraining: jest.Mock<any, any, any>;
    startSelfPlayTraining: jest.Mock<any, any, any>;
    getTrainingMetrics: jest.Mock<any, any, any>;
    getActiveSessions: jest.Mock<any, any, any>;
    stopTraining: jest.Mock<any, any, any>;
    shutdown: jest.Mock<any, any, any>;
    startAdvancedSelfPlayTraining: jest.Mock<any, any, any>;
    pauseTraining: jest.Mock<any, any, any>;
    resumeTraining: jest.Mock<any, any, any>;
    getComputeEfficiency: jest.Mock<any, any, any>;
};
export declare const mockAdvancedLoadTestingService: {
    runLoadTest: jest.Mock<any, any, any>;
    getMetrics: jest.Mock<any, any, any>;
    stopAllTests: jest.Mock<any, any, any>;
    shutdown: jest.Mock<any, any, any>;
};
export declare const mockEnhancedComplianceServiceV2: {
    initialize: jest.Mock<any, any, any>;
    detectFraud: jest.Mock<any, any, any>;
    checkKYCCompliance: jest.Mock<any, any, any>;
    shutdown: jest.Mock<any, any, any>;
};
//# sourceMappingURL=mockServices.d.ts.map