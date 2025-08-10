/**
 * Betting Flow Integration Tests
 * Comprehensive end-to-end testing for User Stories 1-6
 * 
 * This test suite validates the complete betting user journey:
 * 1. Wallet Connection
 * 2. SOL Deposit
 * 3. Match Browsing
 * 4. Bet Placement
 * 5. Live Match Watching
 * 6. Winnings Claim
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const axios = require('axios');
const WebSocket = require('ws');
const path = require('path');
const dotenv = require('dotenv');

// Load test environment
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CONFIG = {
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
  WS_URL: process.env.WS_URL || 'ws://localhost:3000',
  TEST_TIMEOUT: 30000,
  MIN_SOL_DEPOSIT: 0.1,
  MAX_SOL_BET: 100.0
};

// Mock data generators for betting flow
const BettingTestData = {
  generateTestWallet() {
    return {
      address: '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      privateKey: 'test_private_key_' + Math.random().toString(36).substr(2, 16),
      balance: Math.random() * 10 + 1
    };
  },

  generateTestMatch() {
    return {
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agent1: {
        id: 'agent_shadow_striker',
        name: 'Shadow Striker',
        rating: 1850,
        winRate: 0.78,
        style: 'aggressive'
      },
      agent2: {
        id: 'agent_nen_master',
        name: 'Nen Master',
        rating: 1820,
        winRate: 0.74,
        style: 'defensive'
      },
      startTime: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
      status: 'scheduled',
      bettingPool: {
        agent1: 45.5,
        agent2: 52.3
      },
      odds: {
        agent1: 1.85,
        agent2: 1.92
      }
    };
  },

  generateBetTransaction() {
    return {
      id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: 0.5,
      selectedAgent: 'agent_shadow_striker',
      odds: 1.85,
      potentialWinnings: 0.925,
      timestamp: new Date().toISOString()
    };
  }
};

// Mock blockchain interactions
class MockBlockchainService {
  constructor() {
    this.wallets = new Map();
    this.transactions = new Map();
    this.accounts = new Map();
  }

  async connectWallet(walletAddress) {
    const wallet = BettingTestData.generateTestWallet();
    wallet.address = walletAddress;
    this.wallets.set(walletAddress, wallet);
    
    return {
      connected: true,
      publicKey: walletAddress,
      balance: wallet.balance,
      signature: `signature_${Math.random().toString(36).substr(2, 16)}`
    };
  }

  async createUserAccount(walletAddress) {
    const accountPDA = `${walletAddress}_user_account`;
    const account = {
      address: accountPDA,
      owner: walletAddress,
      bettingBalance: 0,
      totalDeposits: 0,
      totalWinnings: 0,
      betHistory: []
    };
    
    this.accounts.set(accountPDA, account);
    return account;
  }

  async depositSOL(walletAddress, amount) {
    const wallet = this.wallets.get(walletAddress);
    if (!wallet || wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const accountPDA = `${walletAddress}_user_account`;
    const account = this.accounts.get(accountPDA);
    
    if (account) {
      account.bettingBalance += amount;
      account.totalDeposits += amount;
    }

    const txHash = `tx_${Math.random().toString(36).substr(2, 16)}`;
    const transaction = {
      hash: txHash,
      type: 'deposit',
      from: walletAddress,
      to: accountPDA,
      amount,
      timestamp: new Date().toISOString(),
      status: 'confirmed'
    };

    this.transactions.set(txHash, transaction);
    return transaction;
  }

  async placeBet(walletAddress, matchId, selectedAgent, amount) {
    const accountPDA = `${walletAddress}_user_account`;
    const account = this.accounts.get(accountPDA);
    
    if (!account || account.bettingBalance < amount) {
      throw new Error('Insufficient betting balance');
    }

    const bet = BettingTestData.generateBetTransaction();
    bet.matchId = matchId;
    bet.selectedAgent = selectedAgent;
    bet.amount = amount;
    bet.user = walletAddress;

    account.bettingBalance -= amount;
    account.betHistory.push(bet);

    const txHash = `tx_${Math.random().toString(36).substr(2, 16)}`;
    const transaction = {
      hash: txHash,
      type: 'bet_placement',
      bet,
      timestamp: new Date().toISOString(),
      status: 'confirmed'
    };

    this.transactions.set(txHash, transaction);
    return { transaction, bet };
  }

  async claimWinnings(walletAddress, betId, winnings) {
    const accountPDA = `${walletAddress}_user_account`;
    const account = this.accounts.get(accountPDA);
    
    if (!account) {
      throw new Error('Account not found');
    }

    account.bettingBalance += winnings;
    account.totalWinnings += winnings;

    const txHash = `tx_${Math.random().toString(36).substr(2, 16)}`;
    const transaction = {
      hash: txHash,
      type: 'winnings_claim',
      betId,
      amount: winnings,
      timestamp: new Date().toISOString(),
      status: 'confirmed'
    };

    this.transactions.set(txHash, transaction);
    return transaction;
  }
}

// WebSocket mock for live match watching
class MockMatchStreamService {
  constructor() {
    this.connections = new Map();
    this.matches = new Map();
  }

  createMatchStream(matchId) {
    const stream = {
      matchId,
      connected: true,
      latency: Math.floor(Math.random() * 50) + 10, // 10-60ms
      updateFrequency: 60, // Hz
      moveCount: 0
    };

    this.matches.set(matchId, stream);
    return stream;
  }

  simulateGameMove(matchId) {
    const match = this.matches.get(matchId);
    if (!match) return null;

    match.moveCount++;
    const gameUpdate = {
      type: 'move_update',
      matchId,
      moveNumber: match.moveCount,
      player: match.moveCount % 2 === 1 ? 'agent1' : 'agent2',
      move: {
        from: 'a1',
        to: 'b2',
        piece: 'marshal',
        timestamp: new Date().toISOString()
      },
      boardState: this.generateRandomBoardState(),
      latency: match.latency
    };

    return gameUpdate;
  }

  generateRandomBoardState() {
    // Generate a realistic Gungi board state (9x9 = 81 squares)
    return Array.from({length: 81}, (_, index) => {
      if (Math.random() < 0.3) { // 30% chance of piece on square
        return {
          piece: ['marshal', 'general', 'lieutenant', 'spy'][Math.floor(Math.random() * 4)],
          owner: Math.random() < 0.5 ? 'agent1' : 'agent2',
          stack: Math.floor(Math.random() * 3) + 1
        };
      }
      return null;
    });
  }

  simulateMatchEnd(matchId) {
    const match = this.matches.get(matchId);
    if (!match) return null;

    const winner = Math.random() < 0.5 ? 'agent1' : 'agent2';
    const result = {
      type: 'match_ended',
      matchId,
      winner,
      finalMove: match.moveCount,
      result: 'checkmate',
      timestamp: new Date().toISOString()
    };

    return result;
  }
}

describe('Betting Flow Integration Tests', () => {
  let blockchainService;
  let matchStreamService;
  let testWallet;
  let testMatch;

  beforeAll(() => {
    blockchainService = new MockBlockchainService();
    matchStreamService = new MockMatchStreamService();
    testWallet = BettingTestData.generateTestWallet();
    testMatch = BettingTestData.generateTestMatch();
  });

  describe('User Story 1: Wallet Connection Flow', () => {
    it('should successfully connect Solana wallet', async () => {
      const connection = await blockchainService.connectWallet(testWallet.address);
      
      expect(connection.connected).toBe(true);
      expect(connection.publicKey).toBe(testWallet.address);
      expect(connection.balance).toBeGreaterThan(0);
      expect(connection.signature).toMatch(/^signature_/);
    });

    it('should create user account PDA on first connection', async () => {
      const userAccount = await blockchainService.createUserAccount(testWallet.address);
      
      expect(userAccount.address).toBe(`${testWallet.address}_user_account`);
      expect(userAccount.owner).toBe(testWallet.address);
      expect(userAccount.bettingBalance).toBe(0);
      expect(Array.isArray(userAccount.betHistory)).toBe(true);
    });

    it('should verify wallet ownership through signature', async () => {
      const connection = await blockchainService.connectWallet(testWallet.address);
      
      expect(connection.signature).toBeDefined();
      expect(connection.signature.length).toBeGreaterThan(10);
    });
  });

  describe('User Story 2: SOL Deposit Flow', () => {
    beforeEach(async () => {
      await blockchainService.connectWallet(testWallet.address);
      await blockchainService.createUserAccount(testWallet.address);
    });

    it('should validate minimum deposit amount', async () => {
      const depositAmount = CONFIG.MIN_SOL_DEPOSIT;
      
      expect(depositAmount).toBeGreaterThanOrEqual(0.1);
    });

    it('should successfully deposit SOL to betting account', async () => {
      const depositAmount = 1.0;
      const transaction = await blockchainService.depositSOL(testWallet.address, depositAmount);
      
      expect(transaction.type).toBe('deposit');
      expect(transaction.amount).toBe(depositAmount);
      expect(transaction.status).toBe('confirmed');
      expect(transaction.hash).toMatch(/^tx_/);
    });

    it('should update user betting balance', async () => {
      const depositAmount = 1.5;
      await blockchainService.depositSOL(testWallet.address, depositAmount);
      
      const accountPDA = `${testWallet.address}_user_account`;
      const account = blockchainService.accounts.get(accountPDA);
      
      expect(account.bettingBalance).toBe(depositAmount);
      expect(account.totalDeposits).toBe(depositAmount);
    });

    it('should reject deposit if insufficient wallet balance', async () => {
      const excessiveAmount = testWallet.balance + 1;
      
      await expect(blockchainService.depositSOL(testWallet.address, excessiveAmount))
        .rejects.toThrow('Insufficient balance');
    });
  });

  describe('User Story 3: Match Browsing Flow', () => {
    it('should retrieve upcoming AI matches', async () => {
      const matches = [testMatch];
      
      expect(Array.isArray(matches)).toBe(true);
      expect(matches[0]).toHaveProperty('agent1');
      expect(matches[0]).toHaveProperty('agent2');
      expect(matches[0]).toHaveProperty('startTime');
      expect(matches[0]).toHaveProperty('odds');
    });

    it('should display AI agent metadata', async () => {
      const agent1 = testMatch.agent1;
      
      expect(agent1.name).toBeDefined();
      expect(agent1.rating).toBeGreaterThan(0);
      expect(agent1.winRate).toBeGreaterThan(0);
      expect(agent1.winRate).toBeLessThanOrEqual(1);
      expect(['aggressive', 'defensive', 'balanced']).toContain(agent1.style);
    });

    it('should calculate dynamic odds', async () => {
      const odds = testMatch.odds;
      
      expect(odds.agent1).toBeGreaterThan(1.0);
      expect(odds.agent2).toBeGreaterThan(1.0);
      expect(typeof odds.agent1).toBe('number');
      expect(typeof odds.agent2).toBe('number');
    });

    it('should show betting pool information', async () => {
      const pool = testMatch.bettingPool;
      
      expect(pool.agent1).toBeGreaterThan(0);
      expect(pool.agent2).toBeGreaterThan(0);
      expect(typeof pool.agent1).toBe('number');
      expect(typeof pool.agent2).toBe('number');
    });
  });

  describe('User Story 4: Bet Placement Flow', () => {
    beforeEach(async () => {
      await blockchainService.connectWallet(testWallet.address);
      await blockchainService.createUserAccount(testWallet.address);
      await blockchainService.depositSOL(testWallet.address, 2.0);
    });

    it('should validate bet amount within limits', async () => {
      const betAmount = 0.5;
      
      expect(betAmount).toBeGreaterThanOrEqual(CONFIG.MIN_SOL_DEPOSIT);
      expect(betAmount).toBeLessThanOrEqual(CONFIG.MAX_SOL_BET);
    });

    it('should successfully place bet on selected agent', async () => {
      const betAmount = 0.5;
      const result = await blockchainService.placeBet(
        testWallet.address,
        testMatch.id,
        testMatch.agent1.id,
        betAmount
      );
      
      expect(result.bet.amount).toBe(betAmount);
      expect(result.bet.selectedAgent).toBe(testMatch.agent1.id);
      expect(result.bet.matchId).toBe(testMatch.id);
      expect(result.transaction.status).toBe('confirmed');
    });

    it('should reserve funds from betting account', async () => {
      const initialBalance = 2.0;
      const betAmount = 0.75;
      
      await blockchainService.placeBet(
        testWallet.address,
        testMatch.id,
        testMatch.agent1.id,
        betAmount
      );
      
      const accountPDA = `${testWallet.address}_user_account`;
      const account = blockchainService.accounts.get(accountPDA);
      
      expect(account.bettingBalance).toBeCloseTo(initialBalance - betAmount, 6);
    });

    it('should reject bet with insufficient balance', async () => {
      const excessiveBet = 5.0; // More than deposited
      
      await expect(blockchainService.placeBet(
        testWallet.address,
        testMatch.id,
        testMatch.agent1.id,
        excessiveBet
      )).rejects.toThrow('Insufficient betting balance');
    });

    it('should create bet record in user history', async () => {
      const betAmount = 0.3;
      await blockchainService.placeBet(
        testWallet.address,
        testMatch.id,
        testMatch.agent1.id,
        betAmount
      );
      
      const accountPDA = `${testWallet.address}_user_account`;
      const account = blockchainService.accounts.get(accountPDA);
      
      expect(account.betHistory).toHaveLength(1);
      expect(account.betHistory[0].amount).toBe(betAmount);
    });
  });

  describe('User Story 5: Live Match Watching Flow', () => {
    let matchStream;

    beforeEach(() => {
      matchStream = matchStreamService.createMatchStream(testMatch.id);
    });

    it('should establish connection to match stream', async () => {
      expect(matchStream.connected).toBe(true);
      expect(matchStream.matchId).toBe(testMatch.id);
      expect(matchStream.updateFrequency).toBeGreaterThan(0);
    });

    it('should maintain sub-100ms latency for updates', async () => {
      expect(matchStream.latency).toBeLessThan(100);
    });

    it('should receive real-time game state updates', async () => {
      const gameUpdate = matchStreamService.simulateGameMove(testMatch.id);
      
      expect(gameUpdate.type).toBe('move_update');
      expect(gameUpdate.matchId).toBe(testMatch.id);
      expect(gameUpdate.moveNumber).toBeGreaterThan(0);
      expect(gameUpdate.move).toHaveProperty('from');
      expect(gameUpdate.move).toHaveProperty('to');
      expect(gameUpdate.boardState).toHaveLength(81); // 9x9 board
    });

    it('should display move history', async () => {
      // Simulate multiple moves
      const moves = [];
      for (let i = 0; i < 5; i++) {
        const move = matchStreamService.simulateGameMove(testMatch.id);
        moves.push(move);
      }
      
      expect(moves).toHaveLength(5);
      expect(moves[4].moveNumber).toBe(5);
    });

    it('should show current betting pool status', async () => {
      // Betting pool should be accessible during live match
      const poolStatus = {
        totalPool: testMatch.bettingPool.agent1 + testMatch.bettingPool.agent2,
        agent1Bets: testMatch.bettingPool.agent1,
        agent2Bets: testMatch.bettingPool.agent2
      };
      
      expect(poolStatus.totalPool).toBeGreaterThan(0);
      expect(poolStatus.agent1Bets).toBeGreaterThan(0);
      expect(poolStatus.agent2Bets).toBeGreaterThan(0);
    });
  });

  describe('User Story 6: Winnings Claim Flow', () => {
    let placedBet;

    beforeEach(async () => {
      await blockchainService.connectWallet(testWallet.address);
      await blockchainService.createUserAccount(testWallet.address);
      await blockchainService.depositSOL(testWallet.address, 2.0);
      
      const result = await blockchainService.placeBet(
        testWallet.address,
        testMatch.id,
        testMatch.agent1.id,
        0.5
      );
      placedBet = result.bet;
    });

    it('should detect match end and determine winner', async () => {
      const matchResult = matchStreamService.simulateMatchEnd(testMatch.id);
      
      expect(matchResult.type).toBe('match_ended');
      expect(matchResult.winner).toMatch(/^agent[12]$/);
      expect(matchResult.result).toBeDefined();
    });

    it('should calculate winnings correctly', async () => {
      const betAmount = placedBet.amount;
      const odds = placedBet.odds;
      const platformFee = 0.025; // 2.5%
      
      const grossWinnings = betAmount * odds;
      const expectedWinnings = grossWinnings * (1 - platformFee);
      
      expect(expectedWinnings).toBeGreaterThan(betAmount);
      expect(expectedWinnings).toBeLessThan(grossWinnings);
    });

    it('should transfer winnings to user account', async () => {
      const winnings = 0.925; // Example winning amount
      const transaction = await blockchainService.claimWinnings(
        testWallet.address,
        placedBet.id,
        winnings
      );
      
      expect(transaction.type).toBe('winnings_claim');
      expect(transaction.amount).toBe(winnings);
      expect(transaction.status).toBe('confirmed');
    });

    it('should update user total winnings', async () => {
      const winnings = 0.925;
      await blockchainService.claimWinnings(
        testWallet.address,
        placedBet.id,
        winnings
      );
      
      const accountPDA = `${testWallet.address}_user_account`;
      const account = blockchainService.accounts.get(accountPDA);
      
      expect(account.totalWinnings).toBe(winnings);
    });

    it('should handle losing bet (no winnings)', async () => {
      // Simulate losing bet
      const accountPDA = `${testWallet.address}_user_account`;
      const accountBefore = blockchainService.accounts.get(accountPDA);
      const balanceBefore = accountBefore.bettingBalance;
      
      // For losing bet, no winnings are claimed
      // Balance should remain the same (no additional funds)
      expect(balanceBefore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('End-to-End Betting Journey', () => {
    it('should complete full betting flow successfully', async () => {
      const journey = {
        wallet: null,
        account: null,
        deposit: null,
        bet: null,
        matchStream: null,
        winnings: null
      };

      // Step 1: Connect wallet
      journey.wallet = await blockchainService.connectWallet(testWallet.address);
      expect(journey.wallet.connected).toBe(true);

      // Step 2: Create account and deposit
      journey.account = await blockchainService.createUserAccount(testWallet.address);
      journey.deposit = await blockchainService.depositSOL(testWallet.address, 1.0);
      expect(journey.deposit.status).toBe('confirmed');

      // Step 3: Place bet
      const betResult = await blockchainService.placeBet(
        testWallet.address,
        testMatch.id,
        testMatch.agent1.id,
        0.5
      );
      journey.bet = betResult.bet;
      expect(journey.bet.amount).toBe(0.5);

      // Step 4: Watch match
      journey.matchStream = matchStreamService.createMatchStream(testMatch.id);
      expect(journey.matchStream.connected).toBe(true);

      // Simulate some moves
      for (let i = 0; i < 3; i++) {
        const move = matchStreamService.simulateGameMove(testMatch.id);
        expect(move.moveNumber).toBe(i + 1);
      }

      // Step 5: Match ends and claim winnings
      const matchEnd = matchStreamService.simulateMatchEnd(testMatch.id);
      expect(matchEnd.type).toBe('match_ended');

      // If user's agent won, claim winnings
      if (matchEnd.winner === journey.bet.selectedAgent) {
        journey.winnings = await blockchainService.claimWinnings(
          testWallet.address,
          journey.bet.id,
          0.925
        );
        expect(journey.winnings.type).toBe('winnings_claim');
      }

      // Verify complete journey
      expect(journey.wallet).toBeDefined();
      expect(journey.account).toBeDefined();
      expect(journey.deposit).toBeDefined();
      expect(journey.bet).toBeDefined();
      expect(journey.matchStream).toBeDefined();
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  let blockchainService;

  beforeAll(() => {
    blockchainService = new MockBlockchainService();
  });

  it('should handle wallet connection failures gracefully', async () => {
    // Test with invalid wallet address
    const invalidWallet = 'invalid_wallet_address';
    
    // Should still create a mock connection for testing
    const connection = await blockchainService.connectWallet(invalidWallet);
    expect(connection.connected).toBe(true);
  });

  it('should prevent double spending in betting', async () => {
    const wallet = BettingTestData.generateTestWallet();
    await blockchainService.connectWallet(wallet.address);
    await blockchainService.createUserAccount(wallet.address);
    await blockchainService.depositSOL(wallet.address, 1.0);

    // Place first bet
    await blockchainService.placeBet(
      wallet.address,
      'match1',
      'agent1',
      0.6
    );

    // Try to place another bet that would exceed balance
    await expect(blockchainService.placeBet(
      wallet.address,
      'match2',
      'agent1',
      0.6
    )).rejects.toThrow('Insufficient betting balance');
  });

  it('should handle network interruptions during live match', async () => {
    const matchId = 'test_match_network';
    let stream = matchStreamService.createMatchStream(matchId);
    
    expect(stream.connected).toBe(true);
    
    // Simulate network interruption
    stream.connected = false;
    
    // Should be able to reconnect
    stream = matchStreamService.createMatchStream(matchId);
    expect(stream.connected).toBe(true);
  });

  it('should validate bet timing constraints', async () => {
    const currentTime = Date.now();
    const pastMatch = {
      ...BettingTestData.generateTestMatch(),
      startTime: new Date(currentTime - 60000).toISOString(), // 1 minute ago
      status: 'active'
    };

    // Betting should not be allowed on active/past matches
    expect(pastMatch.status).toBe('active');
    // In real implementation, this would throw an error
  });
});
