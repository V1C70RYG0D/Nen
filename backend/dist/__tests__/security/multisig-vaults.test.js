"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const web3_js_1 = require("@solana/web3.js");
const setup_1 = require("../setup");
const MultisigVaultService_1 = require("../../services/MultisigVaultService");
const TransactionProposalService_1 = require("../../services/TransactionProposalService");
const logger_1 = require("../../utils/logger");
const MULTISIG_TEST_CONFIG = {
    operational: {
        requiredSignatures: 3,
        totalSigners: 5,
        minBalance: 1 * web3_js_1.LAMPORTS_PER_SOL,
        maxBalance: 100 * web3_js_1.LAMPORTS_PER_SOL,
    },
    treasury: {
        requiredSignatures: 5,
        totalSigners: 9,
        minBalance: 10 * web3_js_1.LAMPORTS_PER_SOL,
        maxBalance: 10000 * web3_js_1.LAMPORTS_PER_SOL,
    },
    transaction: {
        maxProposalAge: 24 * 60 * 60 * 1000,
        signatureTimeout: 2 * 60 * 60 * 1000,
        maxAmount: 1000 * web3_js_1.LAMPORTS_PER_SOL,
    },
    emergency: {
        timelock: 24 * 60 * 60 * 1000,
        requiredEmergencySignatures: 7,
        maxEmergencyAmount: 50 * web3_js_1.LAMPORTS_PER_SOL,
    },
    security: {
        maxFailedAttempts: 3,
        lockoutPeriod: 30 * 60 * 1000,
        auditRetention: 365 * 24 * 60 * 60 * 1000,
    }
};
(0, globals_1.describe)('Multi-Signature Vault Security', () => {
    let connection;
    let redisClient;
    let multisigService;
    let proposalService;
    let masterKeypair;
    let operationalSigners;
    let treasurySigners;
    let testVaults;
    let unauthorizedUser;
    (0, globals_1.beforeAll)(async () => {
        connection = (0, setup_1.getTestSolanaConnection)();
        redisClient = await (0, setup_1.getTestRedisClient)();
        multisigService = new MultisigVaultService_1.MultisigVaultService(connection, redisClient);
        proposalService = new TransactionProposalService_1.TransactionProposalService(connection, redisClient, multisigService);
        masterKeypair = web3_js_1.Keypair.generate();
        unauthorizedUser = web3_js_1.Keypair.generate();
        operationalSigners = Array.from({ length: 5 }, () => web3_js_1.Keypair.generate());
        treasurySigners = Array.from({ length: 9 }, () => web3_js_1.Keypair.generate());
        testVaults = [];
        const criticalKeypairs = [masterKeypair, operationalSigners[0], treasurySigners[0]];
        for (const keypair of criticalKeypairs) {
            try {
                const signature = await connection.requestAirdrop(keypair.publicKey, 2 * web3_js_1.LAMPORTS_PER_SOL);
                await connection.confirmTransaction(signature);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (error) {
                logger_1.logger.warn(`Failed to fund account ${keypair.publicKey.toBase58()}: ${error}`);
            }
        }
        logger_1.logger.info('Multi-signature vault test environment initialized');
    }, 30000);
    (0, globals_1.afterAll)(async () => {
        await (0, setup_1.cleanupTestEnvironment)();
        logger_1.logger.info('Multi-signature vault test environment cleaned up');
    });
    (0, globals_1.beforeEach)(async () => {
        await redisClient.flushdb();
    });
    (0, globals_1.afterEach)(async () => {
        if (testVaults && Array.isArray(testVaults)) {
            for (const vault of testVaults) {
                try {
                    await multisigService.deactivateVault(vault.id, masterKeypair);
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to deactivate vault ${vault.id}:`, error);
                }
            }
        }
        testVaults = [];
    });
    (0, globals_1.test)('3-of-5 operational vault creation', async () => {
        const startTime = performance.now();
        try {
            logger_1.logger.info('🏗️ Testing 3-of-5 operational vault creation...');
            const vaultConfig = {
                requiredSignatures: MULTISIG_TEST_CONFIG.operational.requiredSignatures,
                totalSigners: MULTISIG_TEST_CONFIG.operational.totalSigners,
                signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
                type: 'operational',
                initialBalance: MULTISIG_TEST_CONFIG.operational.minBalance
            };
            const vault = await multisigService.createVault(vaultConfig, masterKeypair);
            testVaults.push(vault);
            (0, globals_1.expect)(vault.requiredSignatures).toBe(3);
            (0, globals_1.expect)(vault.totalSigners).toBe(5);
            (0, globals_1.expect)(vault.type).toBe('operational');
            (0, globals_1.expect)(vault.signers).toHaveLength(5);
            (0, globals_1.expect)(vault.isActive).toBe(true);
            (0, globals_1.expect)(vault.emergencyMode).toBe(false);
            const expectedSigners = operationalSigners.slice(0, 5).map(k => k.publicKey.toBase58());
            const actualSigners = vault.signers.map((s) => s.toBase58());
            (0, globals_1.expect)(actualSigners.sort()).toEqual(expectedSigners.sort());
            const storedVault = await redisClient.hgetall(`vault:${vault.id}`);
            (0, globals_1.expect)(storedVault.id).toBe(vault.id);
            (0, globals_1.expect)(parseInt(storedVault.requiredSignatures)).toBe(3);
            (0, globals_1.expect)(parseInt(storedVault.totalSigners)).toBe(5);
            const balance = await multisigService.getVaultBalance(vault.id);
            (0, globals_1.expect)(balance).toBeGreaterThanOrEqual(0);
            const signerAccess = await multisigService.checkSignerAccess(vault.id, operationalSigners[0].publicKey);
            (0, globals_1.expect)(signerAccess).toBe(true);
            const unauthorizedAccess = await multisigService.checkSignerAccess(vault.id, unauthorizedUser.publicKey);
            (0, globals_1.expect)(unauthorizedAccess).toBe(false);
            const latency = performance.now() - startTime;
            (0, globals_1.expect)(latency).toBeLessThan(5000);
            logger_1.logger.info(`✅ 3-of-5 operational vault created successfully in ${latency.toFixed(2)}ms`);
        }
        catch (error) {
            logger_1.logger.error('❌ 3-of-5 operational vault creation failed:', error);
            throw error;
        }
    });
    (0, globals_1.test)('5-of-9 treasury vault configuration', async () => {
        const startTime = performance.now();
        try {
            logger_1.logger.info('🏛️ Testing 5-of-9 treasury vault configuration...');
            const vaultConfig = {
                requiredSignatures: MULTISIG_TEST_CONFIG.treasury.requiredSignatures,
                totalSigners: MULTISIG_TEST_CONFIG.treasury.totalSigners,
                signers: treasurySigners.map(k => k.publicKey),
                type: 'treasury',
                initialBalance: MULTISIG_TEST_CONFIG.treasury.minBalance,
                emergencyThreshold: MULTISIG_TEST_CONFIG.emergency.requiredEmergencySignatures
            };
            const vault = await multisigService.createVault(vaultConfig, masterKeypair);
            testVaults.push(vault);
            (0, globals_1.expect)(vault.requiredSignatures).toBe(5);
            (0, globals_1.expect)(vault.totalSigners).toBe(9);
            (0, globals_1.expect)(vault.type).toBe('treasury');
            (0, globals_1.expect)(vault.signers).toHaveLength(9);
            const vaultDetails = await multisigService.getVaultDetails(vault.id);
            (0, globals_1.expect)(vaultDetails.emergencyThreshold).toBe(7);
            (0, globals_1.expect)(vaultDetails.timelock).toBeGreaterThan(0);
            const maxBalance = await multisigService.getMaxBalance(vault.id);
            (0, globals_1.expect)(maxBalance).toBe(MULTISIG_TEST_CONFIG.treasury.maxBalance);
            for (const signer of treasurySigners) {
                const hasAccess = await multisigService.checkSignerAccess(vault.id, signer.publicKey);
                (0, globals_1.expect)(hasAccess).toBe(true);
            }
            const auditConfig = await multisigService.getAuditConfiguration(vault.id);
            (0, globals_1.expect)(auditConfig.retentionPeriod).toBe(MULTISIG_TEST_CONFIG.security.auditRetention);
            (0, globals_1.expect)(auditConfig.detailedLogging).toBe(true);
            const latency = performance.now() - startTime;
            (0, globals_1.expect)(latency).toBeLessThan(7000);
            logger_1.logger.info(`✅ 5-of-9 treasury vault configured successfully in ${latency.toFixed(2)}ms`);
        }
        catch (error) {
            logger_1.logger.error('❌ 5-of-9 treasury vault configuration failed:', error);
            throw error;
        }
    });
    (0, globals_1.test)('Transaction proposal mechanism', async () => {
        const startTime = performance.now();
        try {
            logger_1.logger.info('📝 Testing transaction proposal mechanism...');
            const vault = await multisigService.createVault({
                requiredSignatures: 3,
                totalSigners: 5,
                signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
                type: 'operational',
                initialBalance: 10 * web3_js_1.LAMPORTS_PER_SOL
            }, masterKeypair);
            testVaults.push(vault);
            const proposalData = {
                vaultId: vault.id,
                recipient: web3_js_1.Keypair.generate().publicKey,
                amount: 2 * web3_js_1.LAMPORTS_PER_SOL,
                description: 'Test operational transfer',
                metadata: {
                    purpose: 'testing',
                    urgency: 'normal'
                }
            };
            const proposal = await proposalService.createProposal(proposalData, operationalSigners[0]);
            (0, globals_1.expect)(proposal.vaultId).toBe(vault.id);
            (0, globals_1.expect)(proposal.amount).toBe(proposalData.amount);
            (0, globals_1.expect)(proposal.requiredSignatures).toBe(3);
            (0, globals_1.expect)(proposal.status).toBe('pending');
            (0, globals_1.expect)(proposal.signatures.size).toBe(1);
            (0, globals_1.expect)(proposal.amount).toBeLessThanOrEqual(MULTISIG_TEST_CONFIG.transaction.maxAmount);
            (0, globals_1.expect)(proposal.expiresAt.getTime() - proposal.createdAt.getTime())
                .toBe(MULTISIG_TEST_CONFIG.transaction.maxProposalAge);
            const retrievedProposal = await proposalService.getProposal(proposal.id);
            (0, globals_1.expect)(retrievedProposal.id).toBe(proposal.id);
            (0, globals_1.expect)(retrievedProposal.description).toBe(proposalData.description);
            const storedProposal = await redisClient.hgetall(`proposal:${proposal.id}`);
            (0, globals_1.expect)(storedProposal.vaultId).toBe(vault.id);
            (0, globals_1.expect)(parseInt(storedProposal.amount)).toBe(proposalData.amount);
            const canView = await proposalService.canViewProposal(proposal.id, operationalSigners[1].publicKey);
            (0, globals_1.expect)(canView).toBe(true);
            const unauthorizedView = await proposalService.canViewProposal(proposal.id, unauthorizedUser.publicKey);
            (0, globals_1.expect)(unauthorizedView).toBe(false);
            const latency = performance.now() - startTime;
            (0, globals_1.expect)(latency).toBeLessThan(3000);
            logger_1.logger.info(`✅ Transaction proposal mechanism validated in ${latency.toFixed(2)}ms`);
        }
        catch (error) {
            logger_1.logger.error('❌ Transaction proposal mechanism failed:', error);
            throw error;
        }
    });
    (0, globals_1.test)('Signature collection workflow', async () => {
        const startTime = performance.now();
        try {
            logger_1.logger.info('✍️ Testing signature collection workflow...');
            const vault = await multisigService.createVault({
                requiredSignatures: 3,
                totalSigners: 5,
                signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
                type: 'operational',
                initialBalance: 10 * web3_js_1.LAMPORTS_PER_SOL
            }, masterKeypair);
            testVaults.push(vault);
            const proposal = await proposalService.createProposal({
                vaultId: vault.id,
                recipient: web3_js_1.Keypair.generate().publicKey,
                amount: 1 * web3_js_1.LAMPORTS_PER_SOL,
                description: 'Signature collection test'
            }, operationalSigners[0]);
            const signatureResults = [];
            (0, globals_1.expect)(proposal.signatures.size).toBe(1);
            const signature2 = await proposalService.addSignature(proposal.id, operationalSigners[1]);
            signatureResults.push(signature2);
            (0, globals_1.expect)(signature2.verified).toBe(true);
            const signature3 = await proposalService.addSignature(proposal.id, operationalSigners[2]);
            signatureResults.push(signature3);
            (0, globals_1.expect)(signature3.verified).toBe(true);
            const updatedProposal = await proposalService.getProposal(proposal.id);
            (0, globals_1.expect)(updatedProposal.signatures.size).toBe(3);
            (0, globals_1.expect)(updatedProposal.status).toBe('approved');
            try {
                await proposalService.addSignature(proposal.id, operationalSigners[1]);
                throw new Error('Should not allow duplicate signatures');
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toContain('already signed');
            }
            try {
                await proposalService.addSignature(proposal.id, unauthorizedUser);
                throw new Error('Should not allow unauthorized signatures');
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toContain('not authorized');
            }
            for (const sigResult of signatureResults) {
                const isValid = await proposalService.verifySignature(proposal.id, sigResult.signer, sigResult.signature);
                (0, globals_1.expect)(isValid).toBe(true);
            }
            const expiredProposal = await proposalService.createProposal({
                vaultId: vault.id,
                recipient: web3_js_1.Keypair.generate().publicKey,
                amount: 0.5 * web3_js_1.LAMPORTS_PER_SOL,
                description: 'Timeout test'
            }, operationalSigners[3]);
            await proposalService.expireProposal(expiredProposal.id);
            try {
                await proposalService.addSignature(expiredProposal.id, operationalSigners[4]);
                throw new Error('Should not allow signatures on expired proposals');
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toContain('expired');
            }
            const latency = performance.now() - startTime;
            (0, globals_1.expect)(latency).toBeLessThan(5000);
            logger_1.logger.info(`✅ Signature collection workflow validated in ${latency.toFixed(2)}ms`);
        }
        catch (error) {
            logger_1.logger.error('❌ Signature collection workflow failed:', error);
            throw error;
        }
    });
    (0, globals_1.test)('Transaction execution with required signatures', async () => {
        const startTime = performance.now();
        try {
            logger_1.logger.info('⚡ Testing transaction execution with required signatures...');
            const vault = await multisigService.createVault({
                requiredSignatures: 3,
                totalSigners: 5,
                signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
                type: 'operational',
                initialBalance: 20 * web3_js_1.LAMPORTS_PER_SOL
            }, masterKeypair);
            testVaults.push(vault);
            await multisigService.fundVault(vault.id, 10 * web3_js_1.LAMPORTS_PER_SOL, masterKeypair);
            const recipient = web3_js_1.Keypair.generate().publicKey;
            const transferAmount = 3 * web3_js_1.LAMPORTS_PER_SOL;
            const proposal = await proposalService.createProposal({
                vaultId: vault.id,
                recipient,
                amount: transferAmount,
                description: 'Execution test transfer'
            }, operationalSigners[0]);
            await proposalService.addSignature(proposal.id, operationalSigners[1]);
            await proposalService.addSignature(proposal.id, operationalSigners[2]);
            const preVaultBalance = await multisigService.getVaultBalance(vault.id);
            const preRecipientBalance = await connection.getBalance(recipient);
            const executionResult = await proposalService.executeTransaction(proposal.id, operationalSigners[0]);
            (0, globals_1.expect)(executionResult.success).toBe(true);
            (0, globals_1.expect)(executionResult.transactionHash).toBeDefined();
            (0, globals_1.expect)(executionResult.transactionHash).toMatch(/^[a-zA-Z0-9]{64,}$/);
            const executedProposal = await proposalService.getProposal(proposal.id);
            (0, globals_1.expect)(executedProposal.status).toBe('executed');
            (0, globals_1.expect)(executedProposal.executedAt).toBeDefined();
            (0, globals_1.expect)(executedProposal.transactionHash).toBe(executionResult.transactionHash);
            const postVaultBalance = await multisigService.getVaultBalance(vault.id);
            const postRecipientBalance = await connection.getBalance(recipient);
            (0, globals_1.expect)(postVaultBalance).toBeLessThan(preVaultBalance);
            (0, globals_1.expect)(postRecipientBalance).toBeGreaterThan(preRecipientBalance);
            const balanceChange = preVaultBalance - postVaultBalance;
            (0, globals_1.expect)(balanceChange).toBeGreaterThanOrEqual(transferAmount);
            (0, globals_1.expect)(balanceChange).toBeLessThan(transferAmount + (0.01 * web3_js_1.LAMPORTS_PER_SOL));
            const insufficientProposal = await proposalService.createProposal({
                vaultId: vault.id,
                recipient: web3_js_1.Keypair.generate().publicKey,
                amount: 1 * web3_js_1.LAMPORTS_PER_SOL,
                description: 'Insufficient signatures test'
            }, operationalSigners[3]);
            try {
                await proposalService.executeTransaction(insufficientProposal.id, operationalSigners[3]);
                throw new Error('Should not execute with insufficient signatures');
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toContain('insufficient signatures');
            }
            try {
                await proposalService.executeTransaction(proposal.id, operationalSigners[0]);
                throw new Error('Should not allow double execution');
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toContain('already executed');
            }
            const latency = performance.now() - startTime;
            (0, globals_1.expect)(latency).toBeLessThan(10000);
            logger_1.logger.info(`✅ Transaction execution validated in ${latency.toFixed(2)}ms`);
        }
        catch (error) {
            logger_1.logger.error('❌ Transaction execution failed:', error);
            throw error;
        }
    });
    (0, globals_1.test)('Vault balance tracking', async () => {
        const startTime = performance.now();
        try {
            logger_1.logger.info('💰 Testing vault balance tracking...');
            const initialBalance = 15 * web3_js_1.LAMPORTS_PER_SOL;
            const vault = await multisigService.createVault({
                requiredSignatures: 3,
                totalSigners: 5,
                signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
                type: 'operational',
                initialBalance
            }, masterKeypair);
            testVaults.push(vault);
            const balance1 = await multisigService.getVaultBalance(vault.id);
            (0, globals_1.expect)(balance1).toBeGreaterThanOrEqual(0);
            const fundingAmount = 10 * web3_js_1.LAMPORTS_PER_SOL;
            await multisigService.fundVault(vault.id, fundingAmount, masterKeypair);
            const balance2 = await multisigService.getVaultBalance(vault.id);
            (0, globals_1.expect)(balance2).toBeGreaterThan(balance1);
            const balanceHistory = await multisigService.getBalanceHistory(vault.id);
            (0, globals_1.expect)(balanceHistory).toHaveLength(2);
            (0, globals_1.expect)(balanceHistory[1].amount).toBeGreaterThan(balanceHistory[0].amount);
            const proposal = await proposalService.createProposal({
                vaultId: vault.id,
                recipient: web3_js_1.Keypair.generate().publicKey,
                amount: 2 * web3_js_1.LAMPORTS_PER_SOL,
                description: 'Balance tracking test'
            }, operationalSigners[0]);
            await proposalService.addSignature(proposal.id, operationalSigners[1]);
            await proposalService.addSignature(proposal.id, operationalSigners[2]);
            await proposalService.executeTransaction(proposal.id, operationalSigners[0]);
            const balance3 = await multisigService.getVaultBalance(vault.id);
            (0, globals_1.expect)(balance3).toBeLessThan(balance2);
            const onChainBalance = await connection.getBalance(vault.publicKey);
            const trackedBalance = await multisigService.getVaultBalance(vault.id);
            const discrepancy = Math.abs(onChainBalance - trackedBalance);
            (0, globals_1.expect)(discrepancy).toBeLessThan(0.01 * web3_js_1.LAMPORTS_PER_SOL);
            try {
                await multisigService.fundVault(vault.id, 1000000 * web3_js_1.LAMPORTS_PER_SOL, masterKeypair);
                throw new Error('Should enforce maximum balance limits');
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toContain('exceeds maximum balance');
            }
            const fullHistory = await multisigService.getBalanceHistory(vault.id, { limit: 100 });
            (0, globals_1.expect)(fullHistory.length).toBeGreaterThan(2);
            for (let i = 1; i < fullHistory.length; i++) {
                (0, globals_1.expect)(fullHistory[i].timestamp.getTime()).toBeGreaterThanOrEqual(fullHistory[i - 1].timestamp.getTime());
            }
            const latency = performance.now() - startTime;
            (0, globals_1.expect)(latency).toBeLessThan(8000);
            logger_1.logger.info(`✅ Vault balance tracking validated in ${latency.toFixed(2)}ms`);
        }
        catch (error) {
            logger_1.logger.error('❌ Vault balance tracking failed:', error);
            throw error;
        }
    });
    (0, globals_1.test)('Emergency procedures', async () => {
        const startTime = performance.now();
        try {
            logger_1.logger.info('🚨 Testing emergency procedures...');
            const vault = await multisigService.createVault({
                requiredSignatures: 5,
                totalSigners: 9,
                signers: treasurySigners.map(k => k.publicKey),
                type: 'treasury',
                initialBalance: 50 * web3_js_1.LAMPORTS_PER_SOL,
                emergencyThreshold: 7
            }, masterKeypair);
            testVaults.push(vault);
            await multisigService.fundVault(vault.id, 30 * web3_js_1.LAMPORTS_PER_SOL, masterKeypair);
            const emergencyReason = 'Security breach detected - immediate action required';
            const emergencyResult = await multisigService.activateEmergencyMode(vault.id, emergencyReason, treasurySigners.slice(0, 7));
            (0, globals_1.expect)(emergencyResult.success).toBe(true);
            (0, globals_1.expect)(emergencyResult.emergencyId).toBeDefined();
            const vaultStatus = await multisigService.getVaultDetails(vault.id);
            (0, globals_1.expect)(vaultStatus.emergencyMode).toBe(true);
            (0, globals_1.expect)(vaultStatus.emergencyActivatedAt).toBeDefined();
            try {
                const emergencyProposal = await proposalService.createProposal({
                    vaultId: vault.id,
                    recipient: web3_js_1.Keypair.generate().publicKey,
                    amount: 100 * web3_js_1.LAMPORTS_PER_SOL,
                    description: 'Emergency transfer - large amount'
                }, treasurySigners[0]);
                throw new Error('Should enforce emergency transaction limits');
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toContain('exceeds emergency limit');
            }
            const emergencyProposal = await proposalService.createProposal({
                vaultId: vault.id,
                recipient: web3_js_1.Keypair.generate().publicKey,
                amount: MULTISIG_TEST_CONFIG.emergency.maxEmergencyAmount,
                description: 'Emergency transfer - within limits',
                isEmergency: true
            }, treasurySigners[0]);
            for (let i = 1; i < 7; i++) {
                await proposalService.addSignature(emergencyProposal.id, treasurySigners[i]);
            }
            const executionResult = await proposalService.executeTransaction(emergencyProposal.id, treasurySigners[0], { bypassTimelock: true });
            (0, globals_1.expect)(executionResult.success).toBe(true);
            (0, globals_1.expect)(executionResult.emergencyExecution).toBe(true);
            const deactivationResult = await multisigService.deactivateEmergencyMode(vault.id, treasurySigners.slice(0, 7), 'Security issue resolved');
            (0, globals_1.expect)(deactivationResult.success).toBe(true);
            const deactivatedVault = await multisigService.getVaultDetails(vault.id);
            (0, globals_1.expect)(deactivatedVault.emergencyMode).toBe(false);
            const emergencyHistory = await multisigService.getEmergencyHistory(vault.id);
            (0, globals_1.expect)(emergencyHistory).toHaveLength(1);
            (0, globals_1.expect)(emergencyHistory[0].reason).toBe(emergencyReason);
            (0, globals_1.expect)(emergencyHistory[0].deactivatedAt).toBeDefined();
            const latency = performance.now() - startTime;
            (0, globals_1.expect)(latency).toBeLessThan(15000);
            logger_1.logger.info(`✅ Emergency procedures validated in ${latency.toFixed(2)}ms`);
        }
        catch (error) {
            logger_1.logger.error('❌ Emergency procedures failed:', error);
            throw error;
        }
    });
    (0, globals_1.test)('Vault access control', async () => {
        const startTime = performance.now();
        try {
            logger_1.logger.info('🔐 Testing vault access control...');
            const vault = await multisigService.createVault({
                requiredSignatures: 3,
                totalSigners: 5,
                signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
                type: 'operational',
                initialBalance: 10 * web3_js_1.LAMPORTS_PER_SOL
            }, masterKeypair);
            testVaults.push(vault);
            for (let i = 0; i < 5; i++) {
                const hasAccess = await multisigService.checkSignerAccess(vault.id, operationalSigners[i].publicKey);
                (0, globals_1.expect)(hasAccess).toBe(true);
            }
            const unauthorizedAccess = await multisigService.checkSignerAccess(vault.id, unauthorizedUser.publicKey);
            (0, globals_1.expect)(unauthorizedAccess).toBe(false);
            const permissions = await multisigService.getSignerPermissions(vault.id, operationalSigners[0].publicKey);
            (0, globals_1.expect)(permissions.canPropose).toBe(true);
            (0, globals_1.expect)(permissions.canSign).toBe(true);
            (0, globals_1.expect)(permissions.canView).toBe(true);
            const noPermissions = await multisigService.getSignerPermissions(vault.id, unauthorizedUser.publicKey);
            (0, globals_1.expect)(noPermissions.canPropose).toBe(false);
            (0, globals_1.expect)(noPermissions.canSign).toBe(false);
            (0, globals_1.expect)(noPermissions.canView).toBe(false);
            await multisigService.checkSignerAccess(vault.id, unauthorizedUser.publicKey);
            const accessLogs = await multisigService.getAccessLogs(vault.id);
            const unauthorizedAttempts = accessLogs.filter((log) => log.signer.equals(unauthorizedUser.publicKey) && !log.granted);
            (0, globals_1.expect)(unauthorizedAttempts.length).toBeGreaterThan(0);
            for (let i = 0; i < MULTISIG_TEST_CONFIG.security.maxFailedAttempts + 1; i++) {
                try {
                    await proposalService.createProposal({
                        vaultId: vault.id,
                        recipient: web3_js_1.Keypair.generate().publicKey,
                        amount: 1 * web3_js_1.LAMPORTS_PER_SOL,
                        description: 'Unauthorized proposal attempt'
                    }, unauthorizedUser);
                }
                catch (error) {
                }
            }
            const lockoutStatus = await multisigService.getSignerLockoutStatus(vault.id, unauthorizedUser.publicKey);
            (0, globals_1.expect)(lockoutStatus.isLockedOut).toBe(true);
            (0, globals_1.expect)(lockoutStatus.lockedUntil.getTime()).toBeGreaterThan(new Date().getTime());
            const adminOverride = await multisigService.overrideLockout(vault.id, unauthorizedUser.publicKey, masterKeypair, 'Administrative override for testing');
            (0, globals_1.expect)(adminOverride.success).toBe(true);
            const newSigner = web3_js_1.Keypair.generate();
            await connection.requestAirdrop(newSigner.publicKey, 5 * web3_js_1.LAMPORTS_PER_SOL);
            const rotationResult = await multisigService.rotateSigner(vault.id, operationalSigners[4].publicKey, newSigner.publicKey, operationalSigners.slice(0, 3), 'Signer rotation test');
            (0, globals_1.expect)(rotationResult.success).toBe(true);
            const newSignerAccess = await multisigService.checkSignerAccess(vault.id, newSigner.publicKey);
            (0, globals_1.expect)(newSignerAccess).toBe(true);
            const oldSignerAccess = await multisigService.checkSignerAccess(vault.id, operationalSigners[4].publicKey);
            (0, globals_1.expect)(oldSignerAccess).toBe(false);
            const latency = performance.now() - startTime;
            (0, globals_1.expect)(latency).toBeLessThan(12000);
            logger_1.logger.info(`✅ Vault access control validated in ${latency.toFixed(2)}ms`);
        }
        catch (error) {
            logger_1.logger.error('❌ Vault access control failed:', error);
            throw error;
        }
    });
    (0, globals_1.test)('Transaction history and auditing', async () => {
        const startTime = performance.now();
        try {
            logger_1.logger.info('📊 Testing transaction history and auditing...');
            const vault = await multisigService.createVault({
                requiredSignatures: 3,
                totalSigners: 5,
                signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
                type: 'operational',
                initialBalance: 25 * web3_js_1.LAMPORTS_PER_SOL
            }, masterKeypair);
            testVaults.push(vault);
            await multisigService.fundVault(vault.id, 15 * web3_js_1.LAMPORTS_PER_SOL, masterKeypair);
            const transactions = [];
            for (let i = 0; i < 3; i++) {
                const proposal = await proposalService.createProposal({
                    vaultId: vault.id,
                    recipient: web3_js_1.Keypair.generate().publicKey,
                    amount: (i + 1) * web3_js_1.LAMPORTS_PER_SOL,
                    description: `Audit test transaction ${i + 1}`
                }, operationalSigners[0]);
                await proposalService.addSignature(proposal.id, operationalSigners[1]);
                await proposalService.addSignature(proposal.id, operationalSigners[2]);
                const result = await proposalService.executeTransaction(proposal.id, operationalSigners[0]);
                transactions.push({ proposal, result });
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            const history = await multisigService.getTransactionHistory(vault.id);
            (0, globals_1.expect)(history.length).toBeGreaterThanOrEqual(3);
            for (const { proposal, result } of transactions) {
                const historyEntry = history.find((h) => h.proposalId === proposal.id);
                (0, globals_1.expect)(historyEntry).toBeDefined();
                (0, globals_1.expect)(historyEntry.transactionHash).toBe(result.transactionHash);
                (0, globals_1.expect)(historyEntry.amount).toBe(proposal.amount);
            }
            for (const { proposal } of transactions) {
                const auditTrail = await multisigService.getAuditTrail(proposal.id);
                (0, globals_1.expect)(auditTrail.proposalCreated).toBeDefined();
                (0, globals_1.expect)(auditTrail.signaturesCollected).toHaveLength(3);
                (0, globals_1.expect)(auditTrail.transactionExecuted).toBeDefined();
                for (const sigEntry of auditTrail.signaturesCollected) {
                    (0, globals_1.expect)(sigEntry.signer).toBeDefined();
                    (0, globals_1.expect)(sigEntry.timestamp).toBeDefined();
                    (0, globals_1.expect)(sigEntry.verified).toBe(true);
                }
            }
            const auditSearch = await multisigService.searchAuditHistory(vault.id, {
                fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
                toDate: new Date(),
                minAmount: 1 * web3_js_1.LAMPORTS_PER_SOL,
                maxAmount: 5 * web3_js_1.LAMPORTS_PER_SOL,
                status: 'executed'
            });
            (0, globals_1.expect)(auditSearch.length).toBeGreaterThanOrEqual(3);
            const integrityCheck = await multisigService.verifyAuditIntegrity(vault.id);
            (0, globals_1.expect)(integrityCheck.isValid).toBe(true);
            (0, globals_1.expect)(integrityCheck.checksum).toBeDefined();
            (0, globals_1.expect)(integrityCheck.lastVerified).toBeDefined();
            const auditExport = await multisigService.exportAuditData(vault.id, {
                format: 'json',
                includeSignatures: true,
                includeMetadata: true
            });
            (0, globals_1.expect)(auditExport.data).toBeDefined();
            (0, globals_1.expect)(auditExport.metadata.totalTransactions).toBeGreaterThanOrEqual(3);
            (0, globals_1.expect)(auditExport.metadata.exportTimestamp).toBeDefined();
            const retentionPolicy = await multisigService.getAuditRetentionPolicy(vault.id);
            (0, globals_1.expect)(retentionPolicy.retentionPeriod).toBe(MULTISIG_TEST_CONFIG.security.auditRetention);
            (0, globals_1.expect)(retentionPolicy.autoCleanup).toBeDefined();
            const latency = performance.now() - startTime;
            (0, globals_1.expect)(latency).toBeLessThan(15000);
            logger_1.logger.info(`✅ Transaction history and auditing validated in ${latency.toFixed(2)}ms`);
        }
        catch (error) {
            logger_1.logger.error('❌ Transaction history and auditing failed:', error);
            throw error;
        }
    });
    (0, globals_1.test)('Vault recovery mechanisms', async () => {
        const startTime = performance.now();
        try {
            logger_1.logger.info('🔧 Testing vault recovery mechanisms...');
            const vault = await multisigService.createVault({
                requiredSignatures: 3,
                totalSigners: 5,
                signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
                type: 'operational',
                initialBalance: 20 * web3_js_1.LAMPORTS_PER_SOL
            }, masterKeypair);
            testVaults.push(vault);
            await multisigService.fundVault(vault.id, 10 * web3_js_1.LAMPORTS_PER_SOL, masterKeypair);
            const lostSigners = operationalSigners.slice(3, 5);
            const remainingSigners = operationalSigners.slice(0, 3);
            for (const lostSigner of lostSigners) {
                await multisigService.markSignerCompromised(vault.id, lostSigner.publicKey, 'Signer key compromised - immediate recovery required');
            }
            const recoveryRequest = await multisigService.initiateRecovery(vault.id, {
                reason: 'Multiple signers compromised',
                lostSigners: lostSigners.map(s => s.publicKey),
                newSigners: [web3_js_1.Keypair.generate().publicKey, web3_js_1.Keypair.generate().publicKey],
                recoveryType: 'signer_replacement'
            }, remainingSigners[0]);
            (0, globals_1.expect)(recoveryRequest.id).toBeDefined();
            (0, globals_1.expect)(recoveryRequest.status).toBe('pending');
            (0, globals_1.expect)(recoveryRequest.requiredApprovals).toBe(2);
            await multisigService.approveRecovery(recoveryRequest.id, remainingSigners[1]);
            await multisigService.approveRecovery(recoveryRequest.id, remainingSigners[2]);
            const approvedRecovery = await multisigService.getRecoveryRequest(recoveryRequest.id);
            (0, globals_1.expect)(approvedRecovery.status).toBe('approved');
            (0, globals_1.expect)(approvedRecovery.approvals).toHaveLength(3);
            const newSigners = [web3_js_1.Keypair.generate(), web3_js_1.Keypair.generate()];
            for (const newSigner of newSigners) {
                await connection.requestAirdrop(newSigner.publicKey, 5 * web3_js_1.LAMPORTS_PER_SOL);
            }
            const recoveryResult = await multisigService.executeRecovery(recoveryRequest.id, newSigners, remainingSigners[0]);
            (0, globals_1.expect)(recoveryResult.success).toBe(true);
            (0, globals_1.expect)(recoveryResult.newVaultConfig).toBeDefined();
            const recoveredVault = await multisigService.getVaultDetails(vault.id);
            (0, globals_1.expect)(recoveredVault.totalSigners).toBe(5);
            for (const lostSigner of lostSigners) {
                const hasAccess = await multisigService.checkSignerAccess(vault.id, lostSigner.publicKey);
                (0, globals_1.expect)(hasAccess).toBe(false);
            }
            for (const newSigner of newSigners) {
                const hasAccess = await multisigService.checkSignerAccess(vault.id, newSigner.publicKey);
                (0, globals_1.expect)(hasAccess).toBe(true);
            }
            const postRecoveryBalance = await multisigService.getVaultBalance(vault.id);
            (0, globals_1.expect)(postRecoveryBalance).toBeGreaterThan(5 * web3_js_1.LAMPORTS_PER_SOL);
            const criticalVault = await multisigService.createVault({
                requiredSignatures: 4,
                totalSigners: 5,
                signers: treasurySigners.slice(0, 5).map(k => k.publicKey),
                type: 'treasury',
                initialBalance: 30 * web3_js_1.LAMPORTS_PER_SOL
            }, masterKeypair);
            testVaults.push(criticalVault);
            for (let i = 0; i < 3; i++) {
                await multisigService.markSignerCompromised(criticalVault.id, treasurySigners[i].publicKey, 'Critical signer loss scenario');
            }
            const masterRecoveryResult = await multisigService.initiateMasterRecovery(criticalVault.id, {
                reason: 'Critical signer loss - master recovery required',
                masterAuthority: masterKeypair.publicKey,
                newConfiguration: {
                    requiredSignatures: 3,
                    totalSigners: 5,
                    signers: treasurySigners.slice(5, 10).map(k => k.publicKey)
                }
            }, masterKeypair);
            (0, globals_1.expect)(masterRecoveryResult.success).toBe(true);
            (0, globals_1.expect)(masterRecoveryResult.requiresTimelock).toBe(true);
            const latency = performance.now() - startTime;
            (0, globals_1.expect)(latency).toBeLessThan(20000);
            logger_1.logger.info(`✅ Vault recovery mechanisms validated in ${latency.toFixed(2)}ms`);
        }
        catch (error) {
            logger_1.logger.error('❌ Vault recovery mechanisms failed:', error);
            throw error;
        }
    });
});
//# sourceMappingURL=multisig-vaults.test.js.map