/**
 * Multi-Signature Vault Security Tests - Backend Testing Assignment 3.4
 * Following GI.md Guidelines: Real implementations, Production readiness, 100% test coverage
 *
 * Test Objectives:
 * - Multi-signature vault creation and configuration (GI #2: Real implementations over simulations)
 * - Transaction proposal and signature collection mechanisms (GI #6: Handle integrations carefully)
 * - Secure transaction execution with required signatures (GI #13: Security measures)
 * - Vault balance tracking and access control (GI #15: Error-free, working systems)
 * - Emergency procedures and recovery mechanisms (GI #20: Robust error handling)
 * - Complete audit trail and history tracking (GI #8: Test extensively at every stage)
 *
 * Security Requirements:
 * - 3-of-5 operational vault creation and management
 * - 5-of-9 treasury vault configuration with enhanced security
 * - Secure transaction proposal workflow with validation
 * - Multi-party signature collection and verification
 * - Atomic transaction execution with required threshold
 * - Real-time balance tracking with consistency checks
 * - Emergency procedures with proper authorization
 * - Comprehensive access control and permissions
 * - Complete transaction history and auditing
 * - Vault recovery mechanisms with security safeguards
 *
 * Coverage Requirements:
 * ✅ 3-of-5 operational vault creation
 * ✅ 5-of-9 treasury vault configuration
 * ✅ Transaction proposal mechanism
 * ✅ Signature collection workflow
 * ✅ Transaction execution with required signatures
 * ✅ Vault balance tracking
 * ✅ Emergency procedures
 * ✅ Vault access control
 * ✅ Transaction history and auditing
 * ✅ Vault recovery mechanisms
 */

import { describe, test, beforeAll, afterAll, beforeEach, afterEach, expect } from '@jest/globals';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
import { sign } from 'tweetnacl';
import { getTestRedisClient, getTestSolanaConnection, cleanupTestEnvironment } from '../setup';
import { MultisigVaultService } from '../../services/MultisigVaultService';
import { TransactionProposalService } from '../../services/TransactionProposalService';
import { logger } from '../../utils/logger';
import Redis from 'ioredis';

// Multi-signature Vault Test Configuration (externalized per GI #18)
const MULTISIG_TEST_CONFIG = {
  operational: {
    requiredSignatures: 3,
    totalSigners: 5,
    minBalance: 1 * LAMPORTS_PER_SOL,
    maxBalance: 100 * LAMPORTS_PER_SOL,
  },
  treasury: {
    requiredSignatures: 5,
    totalSigners: 9,
    minBalance: 10 * LAMPORTS_PER_SOL,
    maxBalance: 10000 * LAMPORTS_PER_SOL,
  },
  transaction: {
    maxProposalAge: 24 * 60 * 60 * 1000, // 24 hours
    signatureTimeout: 2 * 60 * 60 * 1000, // 2 hours
    maxAmount: 1000 * LAMPORTS_PER_SOL,
  },
  emergency: {
    timelock: 24 * 60 * 60 * 1000, // 24 hours
    requiredEmergencySignatures: 7, // For 5-of-9 treasury
    maxEmergencyAmount: 50 * LAMPORTS_PER_SOL,
  },
  security: {
    maxFailedAttempts: 3,
    lockoutPeriod: 30 * 60 * 1000, // 30 minutes
    auditRetention: 365 * 24 * 60 * 60 * 1000, // 1 year
  }
};

interface MultisigVault {
  id: string;
  publicKey: PublicKey;
  requiredSignatures: number;
  totalSigners: number;
  signers: PublicKey[];
  balance: number;
  type: 'operational' | 'treasury';
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  emergencyMode: boolean;
}

interface TransactionProposal {
  id: string;
  vaultId: string;
  proposer: PublicKey;
  recipient: PublicKey;
  amount: number;
  description: string;
  signatures: Map<string, string>;
  requiredSignatures: number;
  status: 'pending' | 'approved' | 'executed' | 'rejected' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  executedAt?: Date;
  transactionHash?: string;
}

interface VaultSignature {
  signer: PublicKey;
  signature: string;
  timestamp: Date;
  verified: boolean;
}

describe('Multi-Signature Vault Security', () => {
  let connection: Connection;
  let redisClient: Redis;
  let multisigService: MultisigVaultService;
  let proposalService: TransactionProposalService;

  // Test accounts
  let masterKeypair: Keypair;
  let operationalSigners: Keypair[];
  let treasurySigners: Keypair[];
  let testVaults: MultisigVault[];
  let unauthorizedUser: Keypair;

  beforeAll(async () => {
    // Initialize real connections (GI #2: Real implementations)
    connection = getTestSolanaConnection();
    redisClient = await getTestRedisClient();

    // Initialize services with real implementations
    multisigService = new MultisigVaultService(connection, redisClient);
    proposalService = new TransactionProposalService(connection, redisClient, multisigService);

    // Generate test keypairs
    masterKeypair = Keypair.generate();
    unauthorizedUser = Keypair.generate();

    // Generate operational vault signers (5 signers for 3-of-5)
    operationalSigners = Array.from({ length: 5 }, () => Keypair.generate());

    // Generate treasury vault signers (9 signers for 5-of-9)
    treasurySigners = Array.from({ length: 9 }, () => Keypair.generate());

    // Initialize testVaults array
    testVaults = [];

    // Fund critical accounts for testing (reduce airdrop requests)
    const criticalKeypairs = [masterKeypair, operationalSigners[0], treasurySigners[0]];

    for (const keypair of criticalKeypairs) {
      try {
        const signature = await connection.requestAirdrop(
          keypair.publicKey,
          2 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(signature);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.warn(`Failed to fund account ${keypair.publicKey.toBase58()}: ${error}`);
      }
    }

    logger.info('Multi-signature vault test environment initialized');
  }, 30000); // Increase timeout to 30 seconds

  afterAll(async () => {
    await cleanupTestEnvironment();
    logger.info('Multi-signature vault test environment cleaned up');
  });

  beforeEach(async () => {
    // Clear any existing test data
    await redisClient.flushdb();
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (testVaults && Array.isArray(testVaults)) {
      for (const vault of testVaults) {
        try {
          await multisigService.deactivateVault(vault.id, masterKeypair);
        } catch (error) {
          // Ignore cleanup errors
          logger.warn(`Failed to deactivate vault ${vault.id}:`, error);
        }
      }
    }
    testVaults = [];
  });

  test('3-of-5 operational vault creation', async () => {
    const startTime = performance.now();

    try {
      logger.info('🏗️ Testing 3-of-5 operational vault creation...');

      // Step 1: Create 3-of-5 operational vault
      const vaultConfig = {
        requiredSignatures: MULTISIG_TEST_CONFIG.operational.requiredSignatures,
        totalSigners: MULTISIG_TEST_CONFIG.operational.totalSigners,
        signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
        type: 'operational' as const,
        initialBalance: MULTISIG_TEST_CONFIG.operational.minBalance
      };

      const vault = await multisigService.createVault(vaultConfig, masterKeypair);
      testVaults.push(vault);

      // Step 2: Verify vault configuration
      expect(vault.requiredSignatures).toBe(3);
      expect(vault.totalSigners).toBe(5);
      expect(vault.type).toBe('operational');
      expect(vault.signers).toHaveLength(5);
      expect(vault.isActive).toBe(true);
      expect(vault.emergencyMode).toBe(false);

      // Step 3: Verify signers are correctly set
      const expectedSigners = operationalSigners.slice(0, 5).map(k => k.publicKey.toBase58());
      const actualSigners = vault.signers.map((s: PublicKey) => s.toBase58());
      expect(actualSigners.sort()).toEqual(expectedSigners.sort());

      // Step 4: Verify vault is stored in Redis
      const storedVault = await redisClient.hgetall(`vault:${vault.id}`);
      expect(storedVault.id).toBe(vault.id);
      expect(parseInt(storedVault.requiredSignatures)).toBe(3);
      expect(parseInt(storedVault.totalSigners)).toBe(5);

      // Step 5: Verify vault balance tracking
      const balance = await multisigService.getVaultBalance(vault.id);
      expect(balance).toBeGreaterThanOrEqual(0);

      // Step 6: Test vault access permissions
      const signerAccess = await multisigService.checkSignerAccess(vault.id, operationalSigners[0].publicKey);
      expect(signerAccess).toBe(true);

      const unauthorizedAccess = await multisigService.checkSignerAccess(vault.id, unauthorizedUser.publicKey);
      expect(unauthorizedAccess).toBe(false);

      const latency = performance.now() - startTime;
      expect(latency).toBeLessThan(5000); // Performance requirement

      logger.info(`✅ 3-of-5 operational vault created successfully in ${latency.toFixed(2)}ms`);

    } catch (error) {
      logger.error('❌ 3-of-5 operational vault creation failed:', error);
      throw error;
    }
  });

  test('5-of-9 treasury vault configuration', async () => {
    const startTime = performance.now();

    try {
      logger.info('🏛️ Testing 5-of-9 treasury vault configuration...');

      // Step 1: Create 5-of-9 treasury vault with enhanced security
      const vaultConfig = {
        requiredSignatures: MULTISIG_TEST_CONFIG.treasury.requiredSignatures,
        totalSigners: MULTISIG_TEST_CONFIG.treasury.totalSigners,
        signers: treasurySigners.map(k => k.publicKey),
        type: 'treasury' as const,
        initialBalance: MULTISIG_TEST_CONFIG.treasury.minBalance,
        emergencyThreshold: MULTISIG_TEST_CONFIG.emergency.requiredEmergencySignatures
      };

      const vault = await multisigService.createVault(vaultConfig, masterKeypair);
      testVaults.push(vault);

      // Step 2: Verify enhanced treasury configuration
      expect(vault.requiredSignatures).toBe(5);
      expect(vault.totalSigners).toBe(9);
      expect(vault.type).toBe('treasury');
      expect(vault.signers).toHaveLength(9);

      // Step 3: Verify treasury-specific security settings
      const vaultDetails = await multisigService.getVaultDetails(vault.id);
      expect(vaultDetails.emergencyThreshold).toBe(7);
      expect(vaultDetails.timelock).toBeGreaterThan(0);

      // Step 4: Test treasury balance limits
      const maxBalance = await multisigService.getMaxBalance(vault.id);
      expect(maxBalance).toBe(MULTISIG_TEST_CONFIG.treasury.maxBalance);

      // Step 5: Verify all treasury signers have access
      for (const signer of treasurySigners) {
        const hasAccess = await multisigService.checkSignerAccess(vault.id, signer.publicKey);
        expect(hasAccess).toBe(true);
      }

      // Step 6: Test treasury-specific audit requirements
      const auditConfig = await multisigService.getAuditConfiguration(vault.id);
      expect(auditConfig.retentionPeriod).toBe(MULTISIG_TEST_CONFIG.security.auditRetention);
      expect(auditConfig.detailedLogging).toBe(true);

      const latency = performance.now() - startTime;
      expect(latency).toBeLessThan(7000); // Slightly higher for treasury complexity

      logger.info(`✅ 5-of-9 treasury vault configured successfully in ${latency.toFixed(2)}ms`);

    } catch (error) {
      logger.error('❌ 5-of-9 treasury vault configuration failed:', error);
      throw error;
    }
  });

  test('Transaction proposal mechanism', async () => {
    const startTime = performance.now();

    try {
      logger.info('📝 Testing transaction proposal mechanism...');

      // Step 1: Create operational vault for testing
      const vault = await multisigService.createVault({
        requiredSignatures: 3,
        totalSigners: 5,
        signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
        type: 'operational',
        initialBalance: 10 * LAMPORTS_PER_SOL
      }, masterKeypair);
      testVaults.push(vault);

      // Step 2: Create transaction proposal
      const proposalData = {
        vaultId: vault.id,
        recipient: Keypair.generate().publicKey,
        amount: 2 * LAMPORTS_PER_SOL,
        description: 'Test operational transfer',
        metadata: {
          purpose: 'testing',
          urgency: 'normal'
        }
      };

      const proposal = await proposalService.createProposal(
        proposalData,
        operationalSigners[0] // First signer proposes
      );

      // Step 3: Verify proposal structure
      expect(proposal.vaultId).toBe(vault.id);
      expect(proposal.amount).toBe(proposalData.amount);
      expect(proposal.requiredSignatures).toBe(3);
      expect(proposal.status).toBe('pending');
      expect(proposal.signatures.size).toBe(1); // Proposer auto-signs

      // Step 4: Verify proposal validation
      expect(proposal.amount).toBeLessThanOrEqual(MULTISIG_TEST_CONFIG.transaction.maxAmount);
      expect(proposal.expiresAt.getTime() - proposal.createdAt.getTime())
        .toBe(MULTISIG_TEST_CONFIG.transaction.maxProposalAge);

      // Step 5: Test proposal retrieval
      const retrievedProposal = await proposalService.getProposal(proposal.id);
      expect(retrievedProposal.id).toBe(proposal.id);
      expect(retrievedProposal.description).toBe(proposalData.description);

      // Step 6: Verify proposal is stored in Redis
      const storedProposal = await redisClient.hgetall(`proposal:${proposal.id}`);
      expect(storedProposal.vaultId).toBe(vault.id);
      expect(parseInt(storedProposal.amount)).toBe(proposalData.amount);

      // Step 7: Test proposal access control
      const canView = await proposalService.canViewProposal(proposal.id, operationalSigners[1].publicKey);
      expect(canView).toBe(true);

      const unauthorizedView = await proposalService.canViewProposal(proposal.id, unauthorizedUser.publicKey);
      expect(unauthorizedView).toBe(false);

      const latency = performance.now() - startTime;
      expect(latency).toBeLessThan(3000);

      logger.info(`✅ Transaction proposal mechanism validated in ${latency.toFixed(2)}ms`);

    } catch (error) {
      logger.error('❌ Transaction proposal mechanism failed:', error);
      throw error;
    }
  });

  test('Signature collection workflow', async () => {
    const startTime = performance.now();

    try {
      logger.info('✍️ Testing signature collection workflow...');

      // Step 1: Setup vault and proposal
      const vault = await multisigService.createVault({
        requiredSignatures: 3,
        totalSigners: 5,
        signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
        type: 'operational',
        initialBalance: 10 * LAMPORTS_PER_SOL
      }, masterKeypair);
      testVaults.push(vault);

      const proposal = await proposalService.createProposal({
        vaultId: vault.id,
        recipient: Keypair.generate().publicKey,
        amount: 1 * LAMPORTS_PER_SOL,
        description: 'Signature collection test'
      }, operationalSigners[0]);

      // Step 2: Collect signatures from authorized signers
      const signatureResults = [];

      // First signature (proposer already signed)
      expect(proposal.signatures.size).toBe(1);

      // Second signature
      const signature2 = await proposalService.addSignature(
        proposal.id,
        operationalSigners[1]
      );
      signatureResults.push(signature2);
      expect(signature2.verified).toBe(true);

      // Third signature (reaches threshold)
      const signature3 = await proposalService.addSignature(
        proposal.id,
        operationalSigners[2]
      );
      signatureResults.push(signature3);
      expect(signature3.verified).toBe(true);

      // Step 3: Verify signature collection status
      const updatedProposal = await proposalService.getProposal(proposal.id);
      expect(updatedProposal.signatures.size).toBe(3);
      expect(updatedProposal.status).toBe('approved'); // Threshold reached

      // Step 4: Test duplicate signature prevention
      try {
        await proposalService.addSignature(proposal.id, operationalSigners[1]);
        throw new Error('Should not allow duplicate signatures');
      } catch (error) {
        expect((error as Error).message).toContain('already signed');
      }

      // Step 5: Test unauthorized signature rejection
      try {
        await proposalService.addSignature(proposal.id, unauthorizedUser);
        throw new Error('Should not allow unauthorized signatures');
      } catch (error) {
        expect((error as Error).message).toContain('not authorized');
      }

      // Step 6: Verify signature verification
      for (const sigResult of signatureResults) {
        const isValid = await proposalService.verifySignature(
          proposal.id,
          sigResult.signer,
          sigResult.signature
        );
        expect(isValid).toBe(true);
      }

      // Step 7: Test signature timeout handling
      const expiredProposal = await proposalService.createProposal({
        vaultId: vault.id,
        recipient: Keypair.generate().publicKey,
        amount: 0.5 * LAMPORTS_PER_SOL,
        description: 'Timeout test'
      }, operationalSigners[3]);

      // Simulate expired proposal
      await proposalService.expireProposal(expiredProposal.id);

      try {
        await proposalService.addSignature(expiredProposal.id, operationalSigners[4]);
        throw new Error('Should not allow signatures on expired proposals');
      } catch (error) {
        expect((error as Error).message).toContain('expired');
      }

      const latency = performance.now() - startTime;
      expect(latency).toBeLessThan(5000);

      logger.info(`✅ Signature collection workflow validated in ${latency.toFixed(2)}ms`);

    } catch (error) {
      logger.error('❌ Signature collection workflow failed:', error);
      throw error;
    }
  });

  test('Transaction execution with required signatures', async () => {
    const startTime = performance.now();

    try {
      logger.info('⚡ Testing transaction execution with required signatures...');

      // Step 1: Setup vault with sufficient balance
      const vault = await multisigService.createVault({
        requiredSignatures: 3,
        totalSigners: 5,
        signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
        type: 'operational',
        initialBalance: 20 * LAMPORTS_PER_SOL
      }, masterKeypair);
      testVaults.push(vault);

      // Fund the vault
      await multisigService.fundVault(vault.id, 10 * LAMPORTS_PER_SOL, masterKeypair);

      // Step 2: Create and approve proposal
      const recipient = Keypair.generate().publicKey;
      const transferAmount = 3 * LAMPORTS_PER_SOL;

      const proposal = await proposalService.createProposal({
        vaultId: vault.id,
        recipient,
        amount: transferAmount,
        description: 'Execution test transfer'
      }, operationalSigners[0]);

      // Collect required signatures
      await proposalService.addSignature(proposal.id, operationalSigners[1]);
      await proposalService.addSignature(proposal.id, operationalSigners[2]);

      // Step 3: Record pre-execution state
      const preVaultBalance = await multisigService.getVaultBalance(vault.id);
      const preRecipientBalance = await connection.getBalance(recipient);

      // Step 4: Execute transaction
      const executionResult = await proposalService.executeTransaction(proposal.id, operationalSigners[0]);

      expect(executionResult.success).toBe(true);
      expect(executionResult.transactionHash).toBeDefined();
      expect(executionResult.transactionHash).toMatch(/^[a-zA-Z0-9]{64,}$/); // Valid transaction hash format

      // Step 5: Verify transaction execution
      const executedProposal = await proposalService.getProposal(proposal.id);
      expect(executedProposal.status).toBe('executed');
      expect(executedProposal.executedAt).toBeDefined();
      expect(executedProposal.transactionHash).toBe(executionResult.transactionHash);

      // Step 6: Verify balance changes
      const postVaultBalance = await multisigService.getVaultBalance(vault.id);
      const postRecipientBalance = await connection.getBalance(recipient);

      expect(postVaultBalance).toBeLessThan(preVaultBalance);
      expect(postRecipientBalance).toBeGreaterThan(preRecipientBalance);

      // Account for transaction fees in balance verification
      const balanceChange = preVaultBalance - postVaultBalance;
      expect(balanceChange).toBeGreaterThanOrEqual(transferAmount);
      expect(balanceChange).toBeLessThan(transferAmount + (0.01 * LAMPORTS_PER_SOL)); // Max fee tolerance

      // Step 7: Test execution with insufficient signatures
      const insufficientProposal = await proposalService.createProposal({
        vaultId: vault.id,
        recipient: Keypair.generate().publicKey,
        amount: 1 * LAMPORTS_PER_SOL,
        description: 'Insufficient signatures test'
      }, operationalSigners[3]);

      // Only one signature (insufficient)
      try {
        await proposalService.executeTransaction(insufficientProposal.id, operationalSigners[3]);
        throw new Error('Should not execute with insufficient signatures');
      } catch (error) {
        expect((error as Error).message).toContain('insufficient signatures');
      }

      // Step 8: Test execution idempotency
      try {
        await proposalService.executeTransaction(proposal.id, operationalSigners[0]);
        throw new Error('Should not allow double execution');
      } catch (error) {
        expect((error as Error).message).toContain('already executed');
      }

      const latency = performance.now() - startTime;
      expect(latency).toBeLessThan(10000); // Higher limit for blockchain transactions

      logger.info(`✅ Transaction execution validated in ${latency.toFixed(2)}ms`);

    } catch (error) {
      logger.error('❌ Transaction execution failed:', error);
      throw error;
    }
  });

  test('Vault balance tracking', async () => {
    const startTime = performance.now();

    try {
      logger.info('💰 Testing vault balance tracking...');

      // Step 1: Create vault with initial balance
      const initialBalance = 15 * LAMPORTS_PER_SOL;
      const vault = await multisigService.createVault({
        requiredSignatures: 3,
        totalSigners: 5,
        signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
        type: 'operational',
        initialBalance
      }, masterKeypair);
      testVaults.push(vault);

      // Step 2: Verify initial balance tracking
      const balance1 = await multisigService.getVaultBalance(vault.id);
      expect(balance1).toBeGreaterThanOrEqual(0); // May be 0 if not funded yet

      // Step 3: Fund vault and track balance change
      const fundingAmount = 10 * LAMPORTS_PER_SOL;
      await multisigService.fundVault(vault.id, fundingAmount, masterKeypair);

      const balance2 = await multisigService.getVaultBalance(vault.id);
      expect(balance2).toBeGreaterThan(balance1);

      // Step 4: Test real-time balance updates
      const balanceHistory = await multisigService.getBalanceHistory(vault.id);
      expect(balanceHistory).toHaveLength(2); // Initial + funding
      expect(balanceHistory[1].amount).toBeGreaterThan(balanceHistory[0].amount);

      // Step 5: Execute transaction and verify balance decrease
      const proposal = await proposalService.createProposal({
        vaultId: vault.id,
        recipient: Keypair.generate().publicKey,
        amount: 2 * LAMPORTS_PER_SOL,
        description: 'Balance tracking test'
      }, operationalSigners[0]);

      await proposalService.addSignature(proposal.id, operationalSigners[1]);
      await proposalService.addSignature(proposal.id, operationalSigners[2]);
      await proposalService.executeTransaction(proposal.id, operationalSigners[0]);

      const balance3 = await multisigService.getVaultBalance(vault.id);
      expect(balance3).toBeLessThan(balance2);

      // Step 6: Test balance consistency checks
      const onChainBalance = await connection.getBalance(vault.publicKey);
      const trackedBalance = await multisigService.getVaultBalance(vault.id);

      // Allow small discrepancy for transaction fees
      const discrepancy = Math.abs(onChainBalance - trackedBalance);
      expect(discrepancy).toBeLessThan(0.01 * LAMPORTS_PER_SOL);

      // Step 7: Test balance limit enforcement
      try {
        await multisigService.fundVault(vault.id, 1000000 * LAMPORTS_PER_SOL, masterKeypair);
        throw new Error('Should enforce maximum balance limits');
      } catch (error) {
        expect((error as Error).message).toContain('exceeds maximum balance');
      }

      // Step 8: Test balance history retention
      const fullHistory = await multisigService.getBalanceHistory(vault.id, { limit: 100 });
      expect(fullHistory.length).toBeGreaterThan(2);

      // Verify history is chronologically ordered
      for (let i = 1; i < fullHistory.length; i++) {
        expect(fullHistory[i].timestamp.getTime()).toBeGreaterThanOrEqual(fullHistory[i-1].timestamp.getTime());
      }

      const latency = performance.now() - startTime;
      expect(latency).toBeLessThan(8000);

      logger.info(`✅ Vault balance tracking validated in ${latency.toFixed(2)}ms`);

    } catch (error) {
      logger.error('❌ Vault balance tracking failed:', error);
      throw error;
    }
  });

  test('Emergency procedures', async () => {
    const startTime = performance.now();

    try {
      logger.info('🚨 Testing emergency procedures...');

      // Step 1: Create treasury vault for emergency testing
      const vault = await multisigService.createVault({
        requiredSignatures: 5,
        totalSigners: 9,
        signers: treasurySigners.map(k => k.publicKey),
        type: 'treasury',
        initialBalance: 50 * LAMPORTS_PER_SOL,
        emergencyThreshold: 7
      }, masterKeypair);
      testVaults.push(vault);

      // Fund vault
      await multisigService.fundVault(vault.id, 30 * LAMPORTS_PER_SOL, masterKeypair);

      // Step 2: Test emergency mode activation
      const emergencyReason = 'Security breach detected - immediate action required';
      const emergencyResult = await multisigService.activateEmergencyMode(
        vault.id,
        emergencyReason,
        treasurySigners.slice(0, 7) // 7 signers for emergency activation
      );

      expect(emergencyResult.success).toBe(true);
      expect(emergencyResult.emergencyId).toBeDefined();

      // Step 3: Verify emergency mode status
      const vaultStatus = await multisigService.getVaultDetails(vault.id);
      expect(vaultStatus.emergencyMode).toBe(true);
      expect(vaultStatus.emergencyActivatedAt).toBeDefined();

      // Step 4: Test emergency transaction limits
      try {
        const emergencyProposal = await proposalService.createProposal({
          vaultId: vault.id,
          recipient: Keypair.generate().publicKey,
          amount: 100 * LAMPORTS_PER_SOL, // Exceeds emergency limit
          description: 'Emergency transfer - large amount'
        }, treasurySigners[0]);

        throw new Error('Should enforce emergency transaction limits');
      } catch (error) {
        expect((error as Error).message).toContain('exceeds emergency limit');
      }

      // Step 5: Test valid emergency transaction
      const emergencyProposal = await proposalService.createProposal({
        vaultId: vault.id,
        recipient: Keypair.generate().publicKey,
        amount: MULTISIG_TEST_CONFIG.emergency.maxEmergencyAmount,
        description: 'Emergency transfer - within limits',
        isEmergency: true
      }, treasurySigners[0]);

      // Collect emergency signatures (7 required)
      for (let i = 1; i < 7; i++) {
        await proposalService.addSignature(emergencyProposal.id, treasurySigners[i]);
      }

      // Step 6: Test emergency timelock bypass
      const executionResult = await proposalService.executeTransaction(
        emergencyProposal.id,
        treasurySigners[0],
        { bypassTimelock: true }
      );

      expect(executionResult.success).toBe(true);
      expect(executionResult.emergencyExecution).toBe(true);

      // Step 7: Test emergency mode deactivation
      const deactivationResult = await multisigService.deactivateEmergencyMode(
        vault.id,
        treasurySigners.slice(0, 7),
        'Security issue resolved'
      );

      expect(deactivationResult.success).toBe(true);

      const deactivatedVault = await multisigService.getVaultDetails(vault.id);
      expect(deactivatedVault.emergencyMode).toBe(false);

      // Step 8: Test emergency audit trail
      const emergencyHistory = await multisigService.getEmergencyHistory(vault.id);
      expect(emergencyHistory).toHaveLength(1);
      expect(emergencyHistory[0].reason).toBe(emergencyReason);
      expect(emergencyHistory[0].deactivatedAt).toBeDefined();

      const latency = performance.now() - startTime;
      expect(latency).toBeLessThan(15000); // Higher limit for emergency procedures

      logger.info(`✅ Emergency procedures validated in ${latency.toFixed(2)}ms`);

    } catch (error) {
      logger.error('❌ Emergency procedures failed:', error);
      throw error;
    }
  });

  test('Vault access control', async () => {
    const startTime = performance.now();

    try {
      logger.info('🔐 Testing vault access control...');

      // Step 1: Create vault with specific signers
      const vault = await multisigService.createVault({
        requiredSignatures: 3,
        totalSigners: 5,
        signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
        type: 'operational',
        initialBalance: 10 * LAMPORTS_PER_SOL
      }, masterKeypair);
      testVaults.push(vault);

      // Step 2: Test authorized signer access
      for (let i = 0; i < 5; i++) {
        const hasAccess = await multisigService.checkSignerAccess(vault.id, operationalSigners[i].publicKey);
        expect(hasAccess).toBe(true);
      }

      // Step 3: Test unauthorized access prevention
      const unauthorizedAccess = await multisigService.checkSignerAccess(vault.id, unauthorizedUser.publicKey);
      expect(unauthorizedAccess).toBe(false);

      // Step 4: Test role-based permissions
      const permissions = await multisigService.getSignerPermissions(vault.id, operationalSigners[0].publicKey);
      expect(permissions.canPropose).toBe(true);
      expect(permissions.canSign).toBe(true);
      expect(permissions.canView).toBe(true);

      const noPermissions = await multisigService.getSignerPermissions(vault.id, unauthorizedUser.publicKey);
      expect(noPermissions.canPropose).toBe(false);
      expect(noPermissions.canSign).toBe(false);
      expect(noPermissions.canView).toBe(false);

      // Step 5: Test access attempt logging
      await multisigService.checkSignerAccess(vault.id, unauthorizedUser.publicKey);

      const accessLogs = await multisigService.getAccessLogs(vault.id);
      const unauthorizedAttempts = accessLogs.filter((log: any) =>
        log.signer.equals(unauthorizedUser.publicKey) && !log.granted
      );
      expect(unauthorizedAttempts.length).toBeGreaterThan(0);

      // Step 6: Test failed access lockout
      for (let i = 0; i < MULTISIG_TEST_CONFIG.security.maxFailedAttempts + 1; i++) {
        try {
          await proposalService.createProposal({
            vaultId: vault.id,
            recipient: Keypair.generate().publicKey,
            amount: 1 * LAMPORTS_PER_SOL,
            description: 'Unauthorized proposal attempt'
          }, unauthorizedUser);
        } catch (error) {
          // Expected to fail
        }
      }

      // Verify lockout is in effect
      const lockoutStatus = await multisigService.getSignerLockoutStatus(vault.id, unauthorizedUser.publicKey);
      expect(lockoutStatus.isLockedOut).toBe(true);
      expect(lockoutStatus.lockedUntil!.getTime()).toBeGreaterThan(new Date().getTime());

      // Step 7: Test admin override capabilities
      const adminOverride = await multisigService.overrideLockout(
        vault.id,
        unauthorizedUser.publicKey,
        masterKeypair,
        'Administrative override for testing'
      );
      expect(adminOverride.success).toBe(true);

      // Step 8: Test signer rotation
      const newSigner = Keypair.generate();
      await connection.requestAirdrop(newSigner.publicKey, 5 * LAMPORTS_PER_SOL);

      const rotationResult = await multisigService.rotateSigner(
        vault.id,
        operationalSigners[4].publicKey, // Remove
        newSigner.publicKey, // Add
        operationalSigners.slice(0, 3), // 3 signatures required
        'Signer rotation test'
      );

      expect(rotationResult.success).toBe(true);

      // Verify new signer has access
      const newSignerAccess = await multisigService.checkSignerAccess(vault.id, newSigner.publicKey);
      expect(newSignerAccess).toBe(true);

      // Verify old signer access revoked
      const oldSignerAccess = await multisigService.checkSignerAccess(vault.id, operationalSigners[4].publicKey);
      expect(oldSignerAccess).toBe(false);

      const latency = performance.now() - startTime;
      expect(latency).toBeLessThan(12000);

      logger.info(`✅ Vault access control validated in ${latency.toFixed(2)}ms`);

    } catch (error) {
      logger.error('❌ Vault access control failed:', error);
      throw error;
    }
  });

  test('Transaction history and auditing', async () => {
    const startTime = performance.now();

    try {
      logger.info('📊 Testing transaction history and auditing...');

      // Step 1: Create vault for audit testing
      const vault = await multisigService.createVault({
        requiredSignatures: 3,
        totalSigners: 5,
        signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
        type: 'operational',
        initialBalance: 25 * LAMPORTS_PER_SOL
      }, masterKeypair);
      testVaults.push(vault);

      await multisigService.fundVault(vault.id, 15 * LAMPORTS_PER_SOL, masterKeypair);

      // Step 2: Execute multiple transactions for audit trail
      const transactions = [];

      for (let i = 0; i < 3; i++) {
        const proposal = await proposalService.createProposal({
          vaultId: vault.id,
          recipient: Keypair.generate().publicKey,
          amount: (i + 1) * LAMPORTS_PER_SOL,
          description: `Audit test transaction ${i + 1}`
        }, operationalSigners[0]);

        await proposalService.addSignature(proposal.id, operationalSigners[1]);
        await proposalService.addSignature(proposal.id, operationalSigners[2]);

        const result = await proposalService.executeTransaction(proposal.id, operationalSigners[0]);
        transactions.push({ proposal, result });

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 3: Verify complete transaction history
      const history = await multisigService.getTransactionHistory(vault.id);
      expect(history.length).toBeGreaterThanOrEqual(3);

      // Verify each transaction is recorded
      for (const { proposal, result } of transactions) {
        const historyEntry = history.find((h: any) => h.proposalId === proposal.id);
        expect(historyEntry).toBeDefined();
        expect(historyEntry.transactionHash).toBe(result.transactionHash);
        expect(historyEntry.amount).toBe(proposal.amount);
      }

      // Step 4: Test audit trail completeness
      for (const { proposal } of transactions) {
        const auditTrail = await multisigService.getAuditTrail(proposal.id);

        expect(auditTrail.proposalCreated).toBeDefined();
        expect(auditTrail.signaturesCollected).toHaveLength(3);
        expect(auditTrail.transactionExecuted).toBeDefined();

        // Verify signature audit
        for (const sigEntry of auditTrail.signaturesCollected) {
          expect(sigEntry.signer).toBeDefined();
          expect(sigEntry.timestamp).toBeDefined();
          expect(sigEntry.verified).toBe(true);
        }
      }

      // Step 5: Test audit search and filtering
      const auditSearch = await multisigService.searchAuditHistory(vault.id, {
        fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        toDate: new Date(),
        minAmount: 1 * LAMPORTS_PER_SOL,
        maxAmount: 5 * LAMPORTS_PER_SOL,
        status: 'executed'
      });

      expect(auditSearch.length).toBeGreaterThanOrEqual(3);

      // Step 6: Test audit integrity verification
      const integrityCheck = await multisigService.verifyAuditIntegrity(vault.id);
      expect(integrityCheck.isValid).toBe(true);
      expect(integrityCheck.checksum).toBeDefined();
      expect(integrityCheck.lastVerified).toBeDefined();

      // Step 7: Test audit export functionality
      const auditExport = await multisigService.exportAuditData(vault.id, {
        format: 'json',
        includeSignatures: true,
        includeMetadata: true
      });

      expect(auditExport.data).toBeDefined();
      expect(auditExport.metadata.totalTransactions).toBeGreaterThanOrEqual(3);
      expect(auditExport.metadata.exportTimestamp).toBeDefined();

      // Step 8: Test audit retention and cleanup
      const retentionPolicy = await multisigService.getAuditRetentionPolicy(vault.id);
      expect(retentionPolicy.retentionPeriod).toBe(MULTISIG_TEST_CONFIG.security.auditRetention);
      expect(retentionPolicy.autoCleanup).toBeDefined();

      const latency = performance.now() - startTime;
      expect(latency).toBeLessThan(15000);

      logger.info(`✅ Transaction history and auditing validated in ${latency.toFixed(2)}ms`);

    } catch (error) {
      logger.error('❌ Transaction history and auditing failed:', error);
      throw error;
    }
  });

  test('Vault recovery mechanisms', async () => {
    const startTime = performance.now();

    try {
      logger.info('🔧 Testing vault recovery mechanisms...');

      // Step 1: Create vault for recovery testing
      const vault = await multisigService.createVault({
        requiredSignatures: 3,
        totalSigners: 5,
        signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
        type: 'operational',
        initialBalance: 20 * LAMPORTS_PER_SOL
      }, masterKeypair);
      testVaults.push(vault);

      await multisigService.fundVault(vault.id, 10 * LAMPORTS_PER_SOL, masterKeypair);

      // Step 2: Test signer loss scenario (2 signers lost out of 5)
      const lostSigners = operationalSigners.slice(3, 5); // Last 2 signers
      const remainingSigners = operationalSigners.slice(0, 3); // First 3 signers

      // Simulate signer loss by marking them as compromised
      for (const lostSigner of lostSigners) {
        await multisigService.markSignerCompromised(
          vault.id,
          lostSigner.publicKey,
          'Signer key compromised - immediate recovery required'
        );
      }

      // Step 3: Test recovery initiation
      const recoveryRequest = await multisigService.initiateRecovery(
        vault.id,
        {
          reason: 'Multiple signers compromised',
          lostSigners: lostSigners.map(s => s.publicKey),
          newSigners: [Keypair.generate().publicKey, Keypair.generate().publicKey],
          recoveryType: 'signer_replacement'
        },
        remainingSigners[0] // Recovery initiator
      );

      expect(recoveryRequest.id).toBeDefined();
      expect(recoveryRequest.status).toBe('pending');
      expect(recoveryRequest.requiredApprovals).toBe(2); // Remaining operational signers

      // Step 4: Test recovery approval process
      await multisigService.approveRecovery(recoveryRequest.id, remainingSigners[1]);
      await multisigService.approveRecovery(recoveryRequest.id, remainingSigners[2]);

      const approvedRecovery = await multisigService.getRecoveryRequest(recoveryRequest.id);
      expect(approvedRecovery.status).toBe('approved');
      expect(approvedRecovery.approvals).toHaveLength(3); // Initiator + 2 approvers

      // Step 5: Test recovery execution
      const newSigners = [Keypair.generate(), Keypair.generate()];
      for (const newSigner of newSigners) {
        await connection.requestAirdrop(newSigner.publicKey, 5 * LAMPORTS_PER_SOL);
      }

      const recoveryResult = await multisigService.executeRecovery(
        recoveryRequest.id,
        newSigners,
        remainingSigners[0]
      );

      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.newVaultConfig).toBeDefined();

      // Step 6: Verify vault configuration after recovery
      const recoveredVault = await multisigService.getVaultDetails(vault.id);
      expect(recoveredVault.totalSigners).toBe(5); // Same total

      // Verify old compromised signers are removed
      for (const lostSigner of lostSigners) {
        const hasAccess = await multisigService.checkSignerAccess(vault.id, lostSigner.publicKey);
        expect(hasAccess).toBe(false);
      }

      // Verify new signers have access
      for (const newSigner of newSigners) {
        const hasAccess = await multisigService.checkSignerAccess(vault.id, newSigner.publicKey);
        expect(hasAccess).toBe(true);
      }

      // Step 7: Test vault funds preservation
      const postRecoveryBalance = await multisigService.getVaultBalance(vault.id);
      expect(postRecoveryBalance).toBeGreaterThan(5 * LAMPORTS_PER_SOL); // Funds preserved

      // Step 8: Test recovery with insufficient remaining signers
      const criticalVault = await multisigService.createVault({
        requiredSignatures: 4,
        totalSigners: 5,
        signers: treasurySigners.slice(0, 5).map(k => k.publicKey),
        type: 'treasury',
        initialBalance: 30 * LAMPORTS_PER_SOL
      }, masterKeypair);
      testVaults.push(criticalVault);

      // Mark 3 signers as lost (leaving only 2, insufficient for 4-of-5)
      for (let i = 0; i < 3; i++) {
        await multisigService.markSignerCompromised(
          criticalVault.id,
          treasurySigners[i].publicKey,
          'Critical signer loss scenario'
        );
      }

      // Test master recovery procedure
      const masterRecoveryResult = await multisigService.initiateMasterRecovery(
        criticalVault.id,
        {
          reason: 'Critical signer loss - master recovery required',
          masterAuthority: masterKeypair.publicKey,
          newConfiguration: {
            requiredSignatures: 3,
            totalSigners: 5,
            signers: treasurySigners.slice(5, 10).map(k => k.publicKey) // New set of signers
          }
        },
        masterKeypair
      );

      expect(masterRecoveryResult.success).toBe(true);
      expect(masterRecoveryResult.requiresTimelock).toBe(true);

      const latency = performance.now() - startTime;
      expect(latency).toBeLessThan(20000); // Higher limit for complex recovery procedures

      logger.info(`✅ Vault recovery mechanisms validated in ${latency.toFixed(2)}ms`);

    } catch (error) {
      logger.error('❌ Vault recovery mechanisms failed:', error);
      throw error;
    }
  });
});
