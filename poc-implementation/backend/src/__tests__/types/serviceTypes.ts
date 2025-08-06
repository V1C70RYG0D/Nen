/**
 * Service Type Definitions for Testing
 * Ensures mock implementations match actual service interfaces
 * Following GI guidelines for real implementations and proper typing
 */

export interface SelfPlaySession {
  id: string;
  agentId: string;
  opponentId: string;
  gamesPlayed: number;
  targetGames: number;
  winRate: number;
  averageGameLength: number;
  eloChange: number;
  started: Date;
  completed?: Date;
  status: 'running' | 'completed' | 'failed' | 'paused';
  learningData: any[];
  computeTime: number;
}

export interface TrainingMetrics {
  totalSessions: number;
  totalGames: number;
  averageWinRate: number;
  eloImprovement: number;
  lastUpdate: Date;
  nextScheduledUpdate: Date;
  computeEfficiency: number;
}

export interface LoadTestResult {
  testId: string;
  concurrent_users: number;
  duration: number;
  status: 'running' | 'completed' | 'failed';
  results: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    average_response_time: number;
    max_response_time: number;
    min_response_time: number;
  };
}

export interface FraudDetectionResult {
  riskScore: number;
  isHighRisk: boolean;
  flaggedReasons: string[];
  recommendedAction: 'allow' | 'review' | 'block';
  confidence: number;
}

export interface KYCComplianceResult {
  walletAddress: string;
  isCompliant: boolean;
  status: 'approved' | 'pending' | 'rejected';
  verificationLevel: 'basic' | 'enhanced' | 'unverified';
  lastCheck: Date;
  expiryDate?: Date;
  documents: any[];
}

export interface DatabaseHealthCheck {
  isConnected: boolean;
  lastChecked: Date;
  averageResponseTime: number;
  connectionPoolSize: number;
  activeConnections: number;
}

export interface DatabasePerformanceMetrics {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  fastQueries: number;
  cacheHits: number;
  cacheMisses: number;
}

// Enhanced AI Training Service Interface
export interface IEnhancedAITrainingService {
  scheduleWeeklyTraining(agentId: string, gamesPerSession?: number, priority?: 'low' | 'medium' | 'high'): Promise<void>;
  startSelfPlayTraining(agentId: string, numberOfGames: number): Promise<SelfPlaySession>;
  startAdvancedSelfPlayTraining(agentId: string, numberOfGames: number): Promise<SelfPlaySession>;
  getTrainingMetrics(): Promise<TrainingMetrics>;
  getActiveSessions(): SelfPlaySession[];
  stopTraining(sessionId: string): Promise<void>;
  pauseTraining(sessionId: string): Promise<void>;
  resumeTraining(sessionId: string): Promise<void>;
  getComputeEfficiency(): number;
  shutdown(): Promise<void>;
}

// Advanced Load Testing Service Interface  
export interface IAdvancedLoadTestingService {
  runLoadTest(config: {
    concurrent_users: number;
    duration: number;
    endpoints: string[];
  }): Promise<LoadTestResult>;
  getMetrics(): Promise<{
    activeTests: number;
    totalTests: number;
    successRate: number;
  }>;
  stopAllTests(): Promise<void>;
  shutdown(): Promise<void>;
}

// Enhanced Compliance Service Interface
export interface IEnhancedComplianceService {
  initialize?(): Promise<void>;
  detectFraud(walletAddress: string, amount: number): Promise<FraudDetectionResult>;
  checkKYCCompliance(walletAddress: string): Promise<KYCComplianceResult>;
  getComplianceMetrics?(): Promise<{
    totalUsers: number;
    compliantUsers: number;
    pendingVerifications: number;
    flaggedTransactions: number;
    blockedTransactions: number;
    averageRiskScore: number;
    complianceRate: number;
  }>;
  analyzeTransactionPatterns?(walletAddress: string): Promise<{
    walletAddress: string;
    totalTransactions: number;
    totalVolume: number;
    averageAmount: number;
    maxAmount: number;
    timeSpan: number;
    frequency: number;
    isAnomalous: boolean;
  }>;
  shutdown(): Promise<void>;
}

// Enhanced Database Service Interface
export interface IEnhancedDatabaseService {
  cachedQuery<T>(key: string, queryFn: () => Promise<T>, cacheTtl?: number): Promise<T>;
  checkDatabaseHealth(): Promise<DatabaseHealthCheck>;
  getPerformanceMetrics(): DatabasePerformanceMetrics;
  getPrismaClient(): any;
  getRedisClient(): any;
  shutdown(): Promise<void>;
}

// Betting Service Interface
export interface IBettingService {
  placeBet(userId: string, matchId: string, agentId: string, amount: number): Promise<{
    id: string;
    status: string;
    odds: number;
  }>;
  calculateOdds(matchId: string): Promise<{
    [agentId: string]: number;
  }>;
  resolveBets(matchId: string, winnerId: string): Promise<void>;
  getUserBets(userId: string): Promise<any[]>;
  getMatchBets(matchId: string): Promise<any[]>;
}

// AI Service Interface
export interface IAIService {
  generateMove(gameState: any, agentId: string): Promise<{
    move: any;
    confidence: number;
    evaluationScore: number;
  }>;
  trainAgent(agentId: string, trainingData: any[]): Promise<void>;
  getAgentStats(agentId: string): Promise<{
    elo_rating: number;
    games_played: number;
    win_rate: number;
  }>;
  simulateGame(agent1Id: string, agent2Id: string): Promise<{
    winner: string;
    moves: any[];
    duration: number;
  }>;
}

// User Service Interface
export interface IUserService {
  createUser(walletAddress: string, userdata?: any): Promise<{
    id: string;
    wallet_address: string;
    balance: number;
  }>;
  getUserByWallet(walletAddress: string): Promise<any>;
  updateUserBalance(userId: string, amount: number, operation: 'add' | 'subtract'): Promise<any>;
  getUserStats(userId: string): Promise<{
    totalBets: number;
    totalWinnings: number;
    winRate: number;
  }>;
}

// WebSocket Service Interface
export interface IWebSocketService {
  broadcast(event: string, data: any): void;
  sendToUser(userId: string, event: string, data: any): void;
  sendToMatch(matchId: string, event: string, data: any): void;
  getConnectedUsers(): string[];
  getMatchSubscribers(matchId: string): string[];
}

// Service Factory Interface for dependency injection
export interface IServiceFactory {
  getDatabaseService(): IEnhancedDatabaseService;
  getAITrainingService(): IEnhancedAITrainingService;
  getLoadTestingService(): IAdvancedLoadTestingService;
  getComplianceService(): IEnhancedComplianceService;
  getBettingService(): IBettingService;
  getAIService(): IAIService;
  getUserService(): IUserService;
  getWebSocketService(): IWebSocketService;
}

// Test Service Configuration
export interface TestServiceConfig {
  useRealServices: boolean;
  enableCaching: boolean;
  enableLogging: boolean;
  mockExternalAPIs: boolean;
  testTimeout: number;
  maxRetries: number;
}

// Error types for consistent error handling
export class ServiceTestError extends Error {
  constructor(
    message: string,
    public serviceName: string,
    public operation: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ServiceTestError';
  }
}

export class DatabaseTestError extends ServiceTestError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, 'Database', operation, originalError);
    this.name = 'DatabaseTestError';
  }
}

export class AIServiceTestError extends ServiceTestError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, 'AIService', operation, originalError);
    this.name = 'AIServiceTestError';
  }
}

export class ComplianceTestError extends ServiceTestError {
  constructor(message: string, operation: string, originalError?: Error) {
    super(message, 'ComplianceService', operation, originalError);
    this.name = 'ComplianceTestError';
  }
}
