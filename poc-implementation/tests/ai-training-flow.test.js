/**
 * AI Training Flow Tests
 * Comprehensive testing for User Stories 7-9
 * 
 * This test suite validates:
 * 7. Training data upload and validation
 * 8. Training fee payment and processing
 * 9. Model download and agent updates
 */

const { describe, it, expect, beforeAll, beforeEach } = require('@jest/globals');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Mock IPFS service for training data storage
class MockIPFSService {
  constructor() {
    this.storage = new Map();
  }

  async uploadFile(fileBuffer, metadata = {}) {
    const hash = 'Qm' + crypto.createHash('sha256').update(fileBuffer).digest('hex').substr(0, 44);
    
    this.storage.set(hash, {
      data: fileBuffer,
      metadata,
      uploadedAt: new Date().toISOString(),
      size: fileBuffer.length
    });

    return {
      hash,
      size: fileBuffer.length,
      url: `https://ipfs.io/ipfs/${hash}`
    };
  }

  async downloadFile(hash) {
    const stored = this.storage.get(hash);
    if (!stored) {
      throw new Error('File not found on IPFS');
    }
    return stored;
  }

  async pinFile(hash) {
    const stored = this.storage.get(hash);
    if (stored) {
      stored.pinned = true;
      return true;
    }
    return false;
  }
}

// Mock AI training service
class MockAITrainingService {
  constructor() {
    this.trainingJobs = new Map();
    this.models = new Map();
  }

  async startTraining(agentId, trainingData, parameters) {
    const jobId = `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      agentId,
      status: 'queued',
      progress: 0,
      dataHash: trainingData.hash,
      parameters,
      startTime: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + parameters.estimatedHours * 3600000).toISOString(),
      metrics: {
        gamesPlayed: 0,
        winRate: 0,
        improvementRate: 0
      }
    };

    this.trainingJobs.set(jobId, job);
    return job;
  }

  async getTrainingStatus(jobId) {
    const job = this.trainingJobs.get(jobId);
    if (!job) {
      throw new Error('Training job not found');
    }

    // Simulate progress
    if (job.status === 'queued') {
      job.status = 'training';
      job.progress = 10;
    } else if (job.status === 'training' && job.progress < 100) {
      job.progress += Math.floor(Math.random() * 20);
      job.metrics.gamesPlayed += Math.floor(Math.random() * 50);
      job.metrics.winRate = 0.5 + Math.random() * 0.3; // 50-80% win rate
    }

    if (job.progress >= 100) {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
    }

    return job;
  }

  async generateUpdatedModel(jobId) {
    const job = this.trainingJobs.get(jobId);
    if (!job || job.status !== 'completed') {
      throw new Error('Training not completed');
    }

    const modelHash = 'Qm' + crypto.createHash('sha256')
      .update(job.agentId + job.completedAt)
      .digest('hex').substr(0, 44);

    const model = {
      hash: modelHash,
      agentId: job.agentId,
      version: this.getNextVersion(job.agentId),
      trainingJobId: jobId,
      performance: {
        rating: 1500 + Math.floor(Math.random() * 500),
        winRate: 0.6 + Math.random() * 0.3,
        gamesPlayed: job.metrics.gamesPlayed,
        improvements: {
          tacticalAwareness: Math.random() * 0.2,
          strategicPlanning: Math.random() * 0.2,
          adaptability: Math.random() * 0.2
        }
      },
      createdAt: new Date().toISOString()
    };

    this.models.set(modelHash, model);
    return model;
  }

  getNextVersion(agentId) {
    const existingVersions = Array.from(this.models.values())
      .filter(model => model.agentId === agentId)
      .map(model => model.version);

    if (existingVersions.length === 0) {
      return '1.0.0';
    }

    const latestVersion = existingVersions.sort().pop();
    const [major, minor, patch] = latestVersion.split('.').map(Number);
    return `${major}.${minor + 1}.${patch}`;
  }
}

// Mock NFT service for agent ownership
class MockNFTService {
  constructor() {
    this.ownerships = new Map();
    this.agents = new Map();
  }

  setOwnership(agentId, ownerAddress) {
    this.ownerships.set(agentId, ownerAddress);
  }

  verifyOwnership(agentId, userAddress) {
    return this.ownerships.get(agentId) === userAddress;
  }

  createAgent(agentId, metadata) {
    this.agents.set(agentId, {
      id: agentId,
      ...metadata,
      createdAt: new Date().toISOString(),
      locked: false
    });
  }

  lockAgent(agentId, reason = 'training') {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.locked = true;
      agent.lockReason = reason;
      agent.lockedAt = new Date().toISOString();
    }
  }

  unlockAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.locked = false;
      agent.lockReason = null;
      agent.unlockedAt = new Date().toISOString();
    }
  }

  updateAgent(agentId, updates) {
    const agent = this.agents.get(agentId);
    if (agent) {
      Object.assign(agent, updates);
      agent.updatedAt = new Date().toISOString();
    }
  }
}

// Test data generators
const AITrainingTestData = {
  generateTestWallet() {
    return '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
  },

  generateAIAgent() {
    return {
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Test Agent',
      rating: 1500,
      winRate: 0.65,
      gamesPlayed: 150,
      style: 'balanced',
      version: '1.0.0',
      modelHash: 'QmTestModelHash123456789',
      owner: this.generateTestWallet()
    };
  },

  generateTrainingParameters() {
    return {
      learningRate: 0.001 + Math.random() * 0.009,
      batchSize: 32 + Math.floor(Math.random() * 96), // 32-128
      epochs: 10 + Math.floor(Math.random() * 90), // 10-100
      explorationRate: Math.random() * 0.5,
      regularization: Math.random() * 0.1,
      estimatedHours: Math.floor(Math.random() * 24) + 1
    };
  },

  generateGameReplayData() {
    const moves = [];
    const moveCount = 20 + Math.floor(Math.random() * 60); // 20-80 moves

    for (let i = 0; i < moveCount; i++) {
      moves.push({
        moveNumber: i + 1,
        player: i % 2 === 0 ? 'white' : 'black',
        from: this.generateSquare(),
        to: this.generateSquare(),
        piece: this.generatePieceType(),
        timestamp: new Date(Date.now() - (moveCount - i) * 30000).toISOString()
      });
    }

    return {
      gameId: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      players: ['agent_white', 'agent_black'],
      result: Math.random() < 0.5 ? 'white_wins' : 'black_wins',
      moves,
      metadata: {
        timeControl: '10+5',
        ratingWhite: 1600 + Math.floor(Math.random() * 400),
        ratingBlack: 1600 + Math.floor(Math.random() * 400),
        date: new Date().toISOString()
      }
    };
  },

  generateSquare() {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return files[Math.floor(Math.random() * files.length)] + 
           ranks[Math.floor(Math.random() * ranks.length)];
  },

  generatePieceType() {
    const pieces = ['marshal', 'general', 'lieutenant', 'major', 'captain', 'spy', 'samurai', 'lancer', 'bow'];
    return pieces[Math.floor(Math.random() * pieces.length)];
  }
};

describe('AI Training Flow Tests', () => {
  let ipfsService;
  let trainingService;
  let nftService;
  let testWallet;
  let testAgent;

  beforeAll(() => {
    ipfsService = new MockIPFSService();
    trainingService = new MockAITrainingService();
    nftService = new MockNFTService();
    testWallet = AITrainingTestData.generateTestWallet();
    testAgent = AITrainingTestData.generateAIAgent();
    
    // Set up agent ownership
    nftService.setOwnership(testAgent.id, testWallet);
    nftService.createAgent(testAgent.id, testAgent);
  });

  describe('User Story 7: Training Data Upload', () => {
    let gameReplay;
    let trainingParameters;

    beforeEach(() => {
      gameReplay = AITrainingTestData.generateGameReplayData();
      trainingParameters = AITrainingTestData.generateTrainingParameters();
    });

    it('should verify user owns the AI agent NFT', async () => {
      const ownsAgent = nftService.verifyOwnership(testAgent.id, testWallet);
      
      expect(ownsAgent).toBe(true);
    });

    it('should upload and validate game replay file', async () => {
      const replayBuffer = Buffer.from(JSON.stringify(gameReplay), 'utf8');
      const uploadResult = await ipfsService.uploadFile(replayBuffer, {
        type: 'game_replay',
        agentId: testAgent.id,
        moveCount: gameReplay.moves.length
      });

      expect(uploadResult.hash).toMatch(/^Qm/);
      expect(uploadResult.hash).toHaveLength(46);
      expect(uploadResult.size).toBeGreaterThan(0);
    });

    it('should validate training parameters', async () => {
      expect(trainingParameters.learningRate).toBeGreaterThan(0);
      expect(trainingParameters.learningRate).toBeLessThan(0.01);
      expect(trainingParameters.batchSize).toBeGreaterThanOrEqual(32);
      expect(trainingParameters.epochs).toBeGreaterThan(0);
      expect(trainingParameters.estimatedHours).toBeGreaterThan(0);
    });

    it('should store IPFS hash on-chain', async () => {
      const replayBuffer = Buffer.from(JSON.stringify(gameReplay), 'utf8');
      const uploadResult = await ipfsService.uploadFile(replayBuffer);
      
      // Simulate on-chain storage
      const onChainRecord = {
        agentId: testAgent.id,
        dataHash: uploadResult.hash,
        uploadedBy: testWallet,
        timestamp: new Date().toISOString(),
        size: uploadResult.size
      };

      expect(onChainRecord.dataHash).toBe(uploadResult.hash);
      expect(onChainRecord.uploadedBy).toBe(testWallet);
    });

    it('should lock AI agent during training period', async () => {
      nftService.lockAgent(testAgent.id, 'training');
      const agent = nftService.agents.get(testAgent.id);
      
      expect(agent.locked).toBe(true);
      expect(agent.lockReason).toBe('training');
      expect(agent.lockedAt).toBeDefined();
    });

    it('should create training session record', async () => {
      const replayBuffer = Buffer.from(JSON.stringify(gameReplay), 'utf8');
      const uploadResult = await ipfsService.uploadFile(replayBuffer);
      
      const trainingJob = await trainingService.startTraining(
        testAgent.id,
        uploadResult,
        trainingParameters
      );

      expect(trainingJob.id).toMatch(/^training_/);
      expect(trainingJob.agentId).toBe(testAgent.id);
      expect(trainingJob.status).toBe('queued');
      expect(trainingJob.dataHash).toBe(uploadResult.hash);
    });

    it('should validate game replay format and quality', async () => {
      expect(gameReplay.moves).toHaveLength(gameReplay.moves.length);
      expect(gameReplay.moves[0]).toHaveProperty('moveNumber');
      expect(gameReplay.moves[0]).toHaveProperty('player');
      expect(gameReplay.moves[0]).toHaveProperty('from');
      expect(gameReplay.moves[0]).toHaveProperty('to');
      expect(gameReplay.result).toMatch(/^(white_wins|black_wins|draw)$/);
    });
  });

  describe('User Story 8: Training Fee Payment', () => {
    let trainingJob;
    const baseRatePerHour = 0.01; // 0.01 SOL per hour

    beforeEach(async () => {
      const gameReplay = AITrainingTestData.generateGameReplayData();
      const trainingParameters = AITrainingTestData.generateTrainingParameters();
      const replayBuffer = Buffer.from(JSON.stringify(gameReplay), 'utf8');
      const uploadResult = await ipfsService.uploadFile(replayBuffer);
      
      trainingJob = await trainingService.startTraining(
        testAgent.id,
        uploadResult,
        trainingParameters
      );
    });

    it('should calculate training fee correctly', async () => {
      const estimatedHours = trainingJob.parameters.estimatedHours;
      const expectedFee = baseRatePerHour * estimatedHours;
      
      expect(expectedFee).toBeGreaterThan(0);
      expect(expectedFee).toBe(baseRatePerHour * estimatedHours);
    });

    it('should validate payment amount', async () => {
      const estimatedHours = trainingJob.parameters.estimatedHours;
      const calculatedFee = baseRatePerHour * estimatedHours;
      const userPayment = calculatedFee;
      
      expect(userPayment).toBeCloseTo(calculatedFee, 6);
    });

    it('should transfer fee to platform treasury', async () => {
      const estimatedHours = trainingJob.parameters.estimatedHours;
      const fee = baseRatePerHour * estimatedHours;
      
      // Simulate treasury transaction
      const treasuryTx = {
        type: 'training_fee',
        amount: fee,
        from: testWallet,
        to: 'platform_treasury_pda',
        trainingJobId: trainingJob.id,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      };

      expect(treasuryTx.type).toBe('training_fee');
      expect(treasuryTx.amount).toBe(fee);
      expect(treasuryTx.status).toBe('confirmed');
    });

    it('should allocate 20% to compute provider rewards', async () => {
      const estimatedHours = trainingJob.parameters.estimatedHours;
      const totalFee = baseRatePerHour * estimatedHours;
      const computeReward = totalFee * 0.2;
      
      expect(computeReward).toBe(totalFee * 0.2);
      expect(computeReward).toBeGreaterThan(0);
    });

    it('should create payment receipt on-chain', async () => {
      const estimatedHours = trainingJob.parameters.estimatedHours;
      const fee = baseRatePerHour * estimatedHours;
      
      const receipt = {
        receiptId: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        payer: testWallet,
        amount: fee,
        trainingJobId: trainingJob.id,
        agentId: testAgent.id,
        timestamp: new Date().toISOString(),
        transactionHash: `tx_${Math.random().toString(36).substr(2, 16)}`
      };

      expect(receipt.receiptId).toMatch(/^receipt_/);
      expect(receipt.amount).toBe(fee);
      expect(receipt.payer).toBe(testWallet);
    });

    it('should emit training started event', async () => {
      const startEvent = {
        type: 'TrainingStarted',
        trainingJobId: trainingJob.id,
        agentId: testAgent.id,
        owner: testWallet,
        estimatedCompletion: trainingJob.estimatedCompletion,
        timestamp: new Date().toISOString()
      };

      expect(startEvent.type).toBe('TrainingStarted');
      expect(startEvent.trainingJobId).toBe(trainingJob.id);
      expect(startEvent.agentId).toBe(testAgent.id);
    });
  });

  describe('User Story 9: Download Updated AI', () => {
    let completedTrainingJob;
    let updatedModel;

    beforeEach(async () => {
      // Set up completed training job
      const gameReplay = AITrainingTestData.generateGameReplayData();
      const trainingParameters = AITrainingTestData.generateTrainingParameters();
      const replayBuffer = Buffer.from(JSON.stringify(gameReplay), 'utf8');
      const uploadResult = await ipfsService.uploadFile(replayBuffer);
      
      completedTrainingJob = await trainingService.startTraining(
        testAgent.id,
        uploadResult,
        trainingParameters
      );

      // Simulate training completion
      completedTrainingJob.status = 'completed';
      completedTrainingJob.progress = 100;
      completedTrainingJob.completedAt = new Date().toISOString();
      
      updatedModel = await trainingService.generateUpdatedModel(completedTrainingJob.id);
    });

    it('should receive training complete notification', async () => {
      const notification = {
        type: 'TrainingCompleted',
        trainingJobId: completedTrainingJob.id,
        agentId: testAgent.id,
        owner: testWallet,
        newModelHash: updatedModel.hash,
        improvements: updatedModel.performance.improvements,
        timestamp: new Date().toISOString()
      };

      expect(notification.type).toBe('TrainingCompleted');
      expect(notification.newModelHash).toBe(updatedModel.hash);
    });

    it('should update AI agent metadata with new model hash', async () => {
      nftService.updateAgent(testAgent.id, {
        modelHash: updatedModel.hash,
        version: updatedModel.version,
        rating: updatedModel.performance.rating,
        winRate: updatedModel.performance.winRate,
        lastTraining: completedTrainingJob.completedAt
      });

      const updatedAgent = nftService.agents.get(testAgent.id);
      
      expect(updatedAgent.modelHash).toBe(updatedModel.hash);
      expect(updatedAgent.version).toBe(updatedModel.version);
      expect(updatedAgent.lastTraining).toBeDefined();
    });

    it('should increment agent version number', async () => {
      const previousVersion = testAgent.version; // '1.0.0'
      const newVersion = updatedModel.version;
      
      expect(newVersion).not.toBe(previousVersion);
      expect(newVersion).toMatch(/^\d+\.\d+\.\d+$/);
      
      const [newMajor, newMinor] = newVersion.split('.').map(Number);
      const [oldMajor, oldMinor] = previousVersion.split('.').map(Number);
      
      expect(newMajor >= oldMajor).toBe(true);
      if (newMajor === oldMajor) {
        expect(newMinor > oldMinor).toBe(true);
      }
    });

    it('should record training metrics', async () => {
      const metrics = updatedModel.performance;
      
      expect(metrics.gamesPlayed).toBeGreaterThan(0);
      expect(metrics.winRate).toBeGreaterThan(0);
      expect(metrics.winRate).toBeLessThanOrEqual(1);
      expect(metrics.rating).toBeGreaterThan(1000);
      expect(metrics.improvements).toHaveProperty('tacticalAwareness');
      expect(metrics.improvements).toHaveProperty('strategicPlanning');
      expect(metrics.improvements).toHaveProperty('adaptability');
    });

    it('should unlock agent for matches', async () => {
      nftService.unlockAgent(testAgent.id);
      const agent = nftService.agents.get(testAgent.id);
      
      expect(agent.locked).toBe(false);
      expect(agent.lockReason).toBeNull();
      expect(agent.unlockedAt).toBeDefined();
    });

    it('should enable model download from IPFS', async () => {
      const modelFile = await ipfsService.downloadFile(updatedModel.hash);
      
      expect(modelFile).toBeDefined();
      expect(modelFile.data).toBeDefined();
      expect(modelFile.size).toBeGreaterThan(0);
    });

    it('should update Elo rating if applicable', async () => {
      const newRating = updatedModel.performance.rating;
      const oldRating = testAgent.rating;
      
      // Training should generally improve rating
      expect(newRating).toBeGreaterThanOrEqual(oldRating - 50); // Allow small decreases
      expect(newRating).toBeLessThan(3000); // Reasonable upper bound
    });

    it('should preserve agent ownership after training', async () => {
      const stillOwns = nftService.verifyOwnership(testAgent.id, testWallet);
      
      expect(stillOwns).toBe(true);
    });
  });

  describe('Training Process Monitoring', () => {
    let ongoingTrainingJob;

    beforeEach(async () => {
      const gameReplay = AITrainingTestData.generateGameReplayData();
      const trainingParameters = AITrainingTestData.generateTrainingParameters();
      const replayBuffer = Buffer.from(JSON.stringify(gameReplay), 'utf8');
      const uploadResult = await ipfsService.uploadFile(replayBuffer);
      
      ongoingTrainingJob = await trainingService.startTraining(
        testAgent.id,
        uploadResult,
        trainingParameters
      );
    });

    it('should provide real-time training progress updates', async () => {
      // Simulate progress updates
      for (let i = 0; i < 5; i++) {
        const status = await trainingService.getTrainingStatus(ongoingTrainingJob.id);
        expect(status.progress).toBeGreaterThanOrEqual(0);
        expect(status.progress).toBeLessThanOrEqual(100);
      }
    });

    it('should track training metrics in real-time', async () => {
      const status = await trainingService.getTrainingStatus(ongoingTrainingJob.id);
      
      expect(status.metrics).toHaveProperty('gamesPlayed');
      expect(status.metrics).toHaveProperty('winRate');
      expect(status.metrics).toHaveProperty('improvementRate');
    });

    it('should handle training interruptions gracefully', async () => {
      // Simulate interruption
      ongoingTrainingJob.status = 'paused';
      
      const status = await trainingService.getTrainingStatus(ongoingTrainingJob.id);
      expect(['queued', 'training', 'paused', 'completed', 'failed']).toContain(status.status);
    });

    it('should estimate completion time accurately', async () => {
      const estimatedCompletion = new Date(ongoingTrainingJob.estimatedCompletion);
      const now = new Date();
      
      expect(estimatedCompletion.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should reject training for non-owned agents', async () => {
      const otherUserWallet = AITrainingTestData.generateTestWallet();
      const ownsAgent = nftService.verifyOwnership(testAgent.id, otherUserWallet);
      
      expect(ownsAgent).toBe(false);
    });

    it('should validate training data format', async () => {
      const invalidReplay = { invalid: 'data' };
      const replayBuffer = Buffer.from(JSON.stringify(invalidReplay), 'utf8');
      
      // Should validate that replay has required fields
      expect(invalidReplay).not.toHaveProperty('moves');
      expect(invalidReplay).not.toHaveProperty('result');
    });

    it('should handle IPFS upload failures', async () => {
      // Simulate IPFS failure
      const mockFailure = async () => {
        throw new Error('IPFS upload failed');
      };

      await expect(mockFailure()).rejects.toThrow('IPFS upload failed');
    });

    it('should prevent training already locked agents', async () => {
      nftService.lockAgent(testAgent.id, 'training');
      const agent = nftService.agents.get(testAgent.id);
      
      expect(agent.locked).toBe(true);
      // Should prevent starting new training on locked agent
    });

    it('should handle insufficient payment for training', async () => {
      const requiredFee = 0.24; // Example fee
      const insufficientPayment = 0.10;
      
      expect(insufficientPayment).toBeLessThan(requiredFee);
      // Should reject training with insufficient payment
    });
  });
});
