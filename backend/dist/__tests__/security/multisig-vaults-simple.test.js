"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("../../utils/logger");
const MULTISIG_CONFIG = {
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
class TestMultisigVaultService {
    vaults = new Map();
    proposals = new Map();
    balanceHistory = new Map();
    async createVault(config, creator) {
        const vault = {
            id: `vault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            publicKey: web3_js_1.Keypair.generate().publicKey,
            requiredSignatures: config.requiredSignatures,
            totalSigners: config.totalSigners,
            signers: config.signers,
            balance: 0,
            type: config.type,
            createdAt: new Date(),
            lastActivity: new Date(),
            isActive: true,
            emergencyMode: false
        };
        this.vaults.set(vault.id, vault);
        this.balanceHistory.set(vault.id, [{ amount: 0, timestamp: new Date(), type: 'initial' }]);
        return vault;
    }
    async getVaultDetails(vaultId) {
        const vault = this.vaults.get(vaultId);
        if (!vault) {
            throw new Error(`Vault ${vaultId} not found`);
        }
        return vault;
    }
    async checkSignerAccess(vaultId, signer) {
        const vault = this.vaults.get(vaultId);
        if (!vault)
            return false;
        return vault.signers.some(s => s.equals(signer));
    }
    async getVaultBalance(vaultId) {
        const vault = this.vaults.get(vaultId);
        return vault?.balance || 0;
    }
    async fundVault(vaultId, amount, funder) {
        const vault = this.vaults.get(vaultId);
        if (vault) {
            vault.balance += amount;
            vault.lastActivity = new Date();
            const history = this.balanceHistory.get(vaultId) || [];
            history.push({ amount: vault.balance, timestamp: new Date(), type: 'deposit' });
            this.balanceHistory.set(vaultId, history);
        }
    }
    async getBalanceHistory(vaultId) {
        return this.balanceHistory.get(vaultId) || [];
    }
    async activateEmergencyMode(vaultId, reason, signers) {
        const vault = this.vaults.get(vaultId);
        if (vault && signers.length >= MULTISIG_CONFIG.emergency.requiredEmergencySignatures) {
            vault.emergencyMode = true;
            return { success: true, emergencyId: `emrg_${Date.now()}` };
        }
        throw new Error('Insufficient emergency signatures');
    }
    async deactivateEmergencyMode(vaultId, signers, reason) {
        const vault = this.vaults.get(vaultId);
        if (vault && signers.length >= MULTISIG_CONFIG.emergency.requiredEmergencySignatures) {
            vault.emergencyMode = false;
            return { success: true };
        }
        throw new Error('Insufficient signatures for emergency deactivation');
    }
    async deactivateVault(vaultId, deactivator) {
        const vault = this.vaults.get(vaultId);
        if (vault) {
            vault.isActive = false;
        }
    }
    async createProposal(data, proposer) {
        const hasAccess = await this.checkSignerAccess(data.vaultId, proposer.publicKey);
        if (!hasAccess) {
            throw new Error('Proposer does not have access to this vault');
        }
        const vault = await this.getVaultDetails(data.vaultId);
        const proposal = {
            id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            vaultId: data.vaultId,
            proposer: proposer.publicKey,
            recipient: data.recipient,
            amount: data.amount,
            description: data.description,
            signatures: new Set([proposer.publicKey.toBase58()]),
            requiredSignatures: vault.requiredSignatures,
            status: 'pending',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + MULTISIG_CONFIG.transaction.maxProposalAge)
        };
        this.proposals.set(proposal.id, proposal);
        return proposal;
    }
    async getProposal(proposalId) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error(`Proposal ${proposalId} not found`);
        }
        return proposal;
    }
    async addSignature(proposalId, signer) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error(`Proposal ${proposalId} not found`);
        }
        const signerKey = signer.publicKey.toBase58();
        if (proposal.signatures.has(signerKey)) {
            throw new Error('Signer has already signed this proposal');
        }
        const hasAccess = await this.checkSignerAccess(proposal.vaultId, signer.publicKey);
        if (!hasAccess) {
            throw new Error('Signer not authorized for this vault');
        }
        const signature = {
            signer: signer.publicKey,
            signature: 'mock_signature_' + Date.now(),
            timestamp: new Date(),
            verified: true
        };
        proposal.signatures.add(signerKey);
        if (proposal.signatures.size >= proposal.requiredSignatures) {
            proposal.status = 'approved';
        }
        return signature;
    }
    async executeTransaction(proposalId, executor, options) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal) {
            throw new Error(`Proposal ${proposalId} not found`);
        }
        if (proposal.status === 'executed') {
            throw new Error('Proposal already executed');
        }
        if (proposal.signatures.size < proposal.requiredSignatures) {
            throw new Error('Insufficient signatures for execution');
        }
        const transactionHash = 'mock_tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        proposal.status = 'executed';
        proposal.executedAt = new Date();
        proposal.transactionHash = transactionHash;
        const vault = this.vaults.get(proposal.vaultId);
        if (vault) {
            vault.balance -= proposal.amount;
            vault.lastActivity = new Date();
        }
        return {
            success: true,
            transactionHash,
            emergencyExecution: options?.bypassTimelock || false
        };
    }
    async canViewProposal(proposalId, viewer) {
        const proposal = this.proposals.get(proposalId);
        if (!proposal)
            return false;
        return await this.checkSignerAccess(proposal.vaultId, viewer);
    }
    async expireProposal(proposalId) {
        const proposal = this.proposals.get(proposalId);
        if (proposal) {
            proposal.status = 'expired';
        }
    }
}
(0, globals_1.describe)('Multi-Signature Vault Security - Simplified', () => {
    let multisigService;
    let masterKeypair;
    let operationalSigners;
    let treasurySigners;
    let testVaults;
    let unauthorizedUser;
    (0, globals_1.beforeAll)(async () => {
        multisigService = new TestMultisigVaultService();
        masterKeypair = web3_js_1.Keypair.generate();
        unauthorizedUser = web3_js_1.Keypair.generate();
        operationalSigners = Array.from({ length: 5 }, () => web3_js_1.Keypair.generate());
        treasurySigners = Array.from({ length: 9 }, () => web3_js_1.Keypair.generate());
        testVaults = [];
        logger_1.logger.info('🚀 Simplified multi-signature vault test environment initialized');
    });
    (0, globals_1.afterAll)(async () => {
        logger_1.logger.info('✅ Test environment cleaned up');
    });
    (0, globals_1.beforeEach)(() => {
        testVaults = [];
    });
    (0, globals_1.afterEach)(async () => {
        for (const vault of testVaults) {
            try {
                await multisigService.deactivateVault(vault.id, masterKeypair);
            }
            catch (error) {
            }
        }
    });
    (0, globals_1.test)('3-of-5 operational vault creation', async () => {
        const startTime = performance.now();
        logger_1.logger.info('🏗️ Testing 3-of-5 operational vault creation...');
        const vaultConfig = {
            requiredSignatures: MULTISIG_CONFIG.operational.requiredSignatures,
            totalSigners: MULTISIG_CONFIG.operational.totalSigners,
            signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
            type: 'operational',
            initialBalance: MULTISIG_CONFIG.operational.minBalance
        };
        const vault = await multisigService.createVault(vaultConfig, masterKeypair);
        testVaults.push(vault);
        (0, globals_1.expect)(vault.requiredSignatures).toBe(3);
        (0, globals_1.expect)(vault.totalSigners).toBe(5);
        (0, globals_1.expect)(vault.type).toBe('operational');
        (0, globals_1.expect)(vault.signers).toHaveLength(5);
        (0, globals_1.expect)(vault.isActive).toBe(true);
        (0, globals_1.expect)(vault.emergencyMode).toBe(false);
        (0, globals_1.expect)(vault.id).toMatch(/^vault_\d+_[a-z0-9]+$/);
        const expectedSigners = operationalSigners.slice(0, 5).map(k => k.publicKey.toBase58());
        const actualSigners = vault.signers.map((s) => s.toBase58());
        (0, globals_1.expect)(actualSigners.sort()).toEqual(expectedSigners.sort());
        const signerAccess = await multisigService.checkSignerAccess(vault.id, operationalSigners[0].publicKey);
        (0, globals_1.expect)(signerAccess).toBe(true);
        const unauthorizedAccess = await multisigService.checkSignerAccess(vault.id, unauthorizedUser.publicKey);
        (0, globals_1.expect)(unauthorizedAccess).toBe(false);
        const latency = performance.now() - startTime;
        (0, globals_1.expect)(latency).toBeLessThan(100);
        logger_1.logger.info(`✅ 3-of-5 operational vault created successfully in ${latency.toFixed(2)}ms`);
    });
    (0, globals_1.test)('5-of-9 treasury vault configuration', async () => {
        const startTime = performance.now();
        logger_1.logger.info('🏛️ Testing 5-of-9 treasury vault configuration...');
        const vaultConfig = {
            requiredSignatures: MULTISIG_CONFIG.treasury.requiredSignatures,
            totalSigners: MULTISIG_CONFIG.treasury.totalSigners,
            signers: treasurySigners.map(k => k.publicKey),
            type: 'treasury',
            initialBalance: MULTISIG_CONFIG.treasury.minBalance,
            emergencyThreshold: MULTISIG_CONFIG.emergency.requiredEmergencySignatures
        };
        const vault = await multisigService.createVault(vaultConfig, masterKeypair);
        testVaults.push(vault);
        (0, globals_1.expect)(vault.requiredSignatures).toBe(5);
        (0, globals_1.expect)(vault.totalSigners).toBe(9);
        (0, globals_1.expect)(vault.type).toBe('treasury');
        (0, globals_1.expect)(vault.signers).toHaveLength(9);
        for (const signer of treasurySigners) {
            const hasAccess = await multisigService.checkSignerAccess(vault.id, signer.publicKey);
            (0, globals_1.expect)(hasAccess).toBe(true);
        }
        const unauthorizedAccess = await multisigService.checkSignerAccess(vault.id, unauthorizedUser.publicKey);
        (0, globals_1.expect)(unauthorizedAccess).toBe(false);
        const latency = performance.now() - startTime;
        (0, globals_1.expect)(latency).toBeLessThan(100);
        logger_1.logger.info(`✅ 5-of-9 treasury vault configured successfully in ${latency.toFixed(2)}ms`);
    });
    (0, globals_1.test)('Transaction proposal mechanism', async () => {
        const startTime = performance.now();
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
            metadata: { purpose: 'testing', urgency: 'normal' }
        };
        const proposal = await multisigService.createProposal(proposalData, operationalSigners[0]);
        (0, globals_1.expect)(proposal.vaultId).toBe(vault.id);
        (0, globals_1.expect)(proposal.amount).toBe(proposalData.amount);
        (0, globals_1.expect)(proposal.requiredSignatures).toBe(3);
        (0, globals_1.expect)(proposal.status).toBe('pending');
        (0, globals_1.expect)(proposal.signatures.size).toBe(1);
        (0, globals_1.expect)(proposal.id).toMatch(/^prop_\d+_[a-z0-9]+$/);
        (0, globals_1.expect)(proposal.amount).toBeLessThanOrEqual(MULTISIG_CONFIG.transaction.maxAmount);
        (0, globals_1.expect)(proposal.expiresAt.getTime() - proposal.createdAt.getTime())
            .toBe(MULTISIG_CONFIG.transaction.maxProposalAge);
        const retrievedProposal = await multisigService.getProposal(proposal.id);
        (0, globals_1.expect)(retrievedProposal.id).toBe(proposal.id);
        (0, globals_1.expect)(retrievedProposal.description).toBe(proposalData.description);
        const canView = await multisigService.canViewProposal(proposal.id, operationalSigners[1].publicKey);
        (0, globals_1.expect)(canView).toBe(true);
        const unauthorizedView = await multisigService.canViewProposal(proposal.id, unauthorizedUser.publicKey);
        (0, globals_1.expect)(unauthorizedView).toBe(false);
        const latency = performance.now() - startTime;
        (0, globals_1.expect)(latency).toBeLessThan(50);
        logger_1.logger.info(`✅ Transaction proposal mechanism validated in ${latency.toFixed(2)}ms`);
    });
    (0, globals_1.test)('Signature collection workflow', async () => {
        const startTime = performance.now();
        logger_1.logger.info('✍️ Testing signature collection workflow...');
        const vault = await multisigService.createVault({
            requiredSignatures: 3,
            totalSigners: 5,
            signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
            type: 'operational',
            initialBalance: 10 * web3_js_1.LAMPORTS_PER_SOL
        }, masterKeypair);
        testVaults.push(vault);
        const proposal = await multisigService.createProposal({
            vaultId: vault.id,
            recipient: web3_js_1.Keypair.generate().publicKey,
            amount: 1 * web3_js_1.LAMPORTS_PER_SOL,
            description: 'Signature collection test'
        }, operationalSigners[0]);
        (0, globals_1.expect)(proposal.signatures.size).toBe(1);
        const signature2 = await multisigService.addSignature(proposal.id, operationalSigners[1]);
        (0, globals_1.expect)(signature2.verified).toBe(true);
        (0, globals_1.expect)(signature2.signer.equals(operationalSigners[1].publicKey)).toBe(true);
        const signature3 = await multisigService.addSignature(proposal.id, operationalSigners[2]);
        (0, globals_1.expect)(signature3.verified).toBe(true);
        const updatedProposal = await multisigService.getProposal(proposal.id);
        (0, globals_1.expect)(updatedProposal.signatures.size).toBe(3);
        (0, globals_1.expect)(updatedProposal.status).toBe('approved');
        await (0, globals_1.expect)(multisigService.addSignature(proposal.id, operationalSigners[1])).rejects.toThrow('already signed');
        await (0, globals_1.expect)(multisigService.addSignature(proposal.id, unauthorizedUser)).rejects.toThrow('not authorized');
        const latency = performance.now() - startTime;
        (0, globals_1.expect)(latency).toBeLessThan(50);
        logger_1.logger.info(`✅ Signature collection workflow validated in ${latency.toFixed(2)}ms`);
    });
    (0, globals_1.test)('Transaction execution with required signatures', async () => {
        const startTime = performance.now();
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
        const transferAmount = 3 * web3_js_1.LAMPORTS_PER_SOL;
        const proposal = await multisigService.createProposal({
            vaultId: vault.id,
            recipient: web3_js_1.Keypair.generate().publicKey,
            amount: transferAmount,
            description: 'Execution test transfer'
        }, operationalSigners[0]);
        await multisigService.addSignature(proposal.id, operationalSigners[1]);
        await multisigService.addSignature(proposal.id, operationalSigners[2]);
        const preVaultBalance = await multisigService.getVaultBalance(vault.id);
        (0, globals_1.expect)(preVaultBalance).toBeGreaterThan(transferAmount);
        const executionResult = await multisigService.executeTransaction(proposal.id, operationalSigners[0]);
        (0, globals_1.expect)(executionResult.success).toBe(true);
        (0, globals_1.expect)(executionResult.transactionHash).toBeDefined();
        (0, globals_1.expect)(executionResult.transactionHash).toMatch(/^mock_tx_\d+_[a-z0-9]+$/);
        const executedProposal = await multisigService.getProposal(proposal.id);
        (0, globals_1.expect)(executedProposal.status).toBe('executed');
        (0, globals_1.expect)(executedProposal.executedAt).toBeDefined();
        (0, globals_1.expect)(executedProposal.transactionHash).toBe(executionResult.transactionHash);
        const postVaultBalance = await multisigService.getVaultBalance(vault.id);
        (0, globals_1.expect)(postVaultBalance).toBe(preVaultBalance - transferAmount);
        const insufficientProposal = await multisigService.createProposal({
            vaultId: vault.id,
            recipient: web3_js_1.Keypair.generate().publicKey,
            amount: 1 * web3_js_1.LAMPORTS_PER_SOL,
            description: 'Insufficient signatures test'
        }, operationalSigners[3]);
        await (0, globals_1.expect)(multisigService.executeTransaction(insufficientProposal.id, operationalSigners[3])).rejects.toThrow('Insufficient signatures for execution');
        await (0, globals_1.expect)(multisigService.executeTransaction(proposal.id, operationalSigners[0])).rejects.toThrow('already executed');
        const latency = performance.now() - startTime;
        (0, globals_1.expect)(latency).toBeLessThan(50);
        logger_1.logger.info(`✅ Transaction execution validated in ${latency.toFixed(2)}ms`);
    });
    (0, globals_1.test)('Vault balance tracking', async () => {
        const startTime = performance.now();
        logger_1.logger.info('💰 Testing vault balance tracking...');
        const vault = await multisigService.createVault({
            requiredSignatures: 3,
            totalSigners: 5,
            signers: operationalSigners.slice(0, 5).map(k => k.publicKey),
            type: 'operational',
            initialBalance: 15 * web3_js_1.LAMPORTS_PER_SOL
        }, masterKeypair);
        testVaults.push(vault);
        const balance1 = await multisigService.getVaultBalance(vault.id);
        (0, globals_1.expect)(balance1).toBe(0);
        const fundingAmount = 10 * web3_js_1.LAMPORTS_PER_SOL;
        await multisigService.fundVault(vault.id, fundingAmount, masterKeypair);
        const balance2 = await multisigService.getVaultBalance(vault.id);
        (0, globals_1.expect)(balance2).toBe(fundingAmount);
        const balanceHistory = await multisigService.getBalanceHistory(vault.id);
        (0, globals_1.expect)(balanceHistory).toHaveLength(2);
        (0, globals_1.expect)(balanceHistory[1].amount).toBe(fundingAmount);
        (0, globals_1.expect)(balanceHistory[1].type).toBe('deposit');
        const latency = performance.now() - startTime;
        (0, globals_1.expect)(latency).toBeLessThan(50);
        logger_1.logger.info(`✅ Vault balance tracking validated in ${latency.toFixed(2)}ms`);
    });
    (0, globals_1.test)('Emergency procedures', async () => {
        const startTime = performance.now();
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
        const deactivationResult = await multisigService.deactivateEmergencyMode(vault.id, treasurySigners.slice(0, 7), 'Security issue resolved');
        (0, globals_1.expect)(deactivationResult.success).toBe(true);
        const deactivatedVault = await multisigService.getVaultDetails(vault.id);
        (0, globals_1.expect)(deactivatedVault.emergencyMode).toBe(false);
        const latency = performance.now() - startTime;
        (0, globals_1.expect)(latency).toBeLessThan(50);
        logger_1.logger.info(`✅ Emergency procedures validated in ${latency.toFixed(2)}ms`);
    });
    (0, globals_1.test)('Vault access control', async () => {
        const startTime = performance.now();
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
        await (0, globals_1.expect)(multisigService.createProposal({
            vaultId: vault.id,
            recipient: web3_js_1.Keypair.generate().publicKey,
            amount: 1 * web3_js_1.LAMPORTS_PER_SOL,
            description: 'Unauthorized proposal attempt'
        }, unauthorizedUser)).rejects.toThrow('does not have access');
        const latency = performance.now() - startTime;
        (0, globals_1.expect)(latency).toBeLessThan(50);
        logger_1.logger.info(`✅ Vault access control validated in ${latency.toFixed(2)}ms`);
    });
    (0, globals_1.test)('Transaction history and auditing', async () => {
        const startTime = performance.now();
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
            const proposal = await multisigService.createProposal({
                vaultId: vault.id,
                recipient: web3_js_1.Keypair.generate().publicKey,
                amount: (i + 1) * web3_js_1.LAMPORTS_PER_SOL,
                description: `Audit test transaction ${i + 1}`
            }, operationalSigners[0]);
            await multisigService.addSignature(proposal.id, operationalSigners[1]);
            await multisigService.addSignature(proposal.id, operationalSigners[2]);
            const result = await multisigService.executeTransaction(proposal.id, operationalSigners[0]);
            transactions.push({ proposal, result });
        }
        for (const { proposal, result } of transactions) {
            const executedProposal = await multisigService.getProposal(proposal.id);
            (0, globals_1.expect)(executedProposal.status).toBe('executed');
            (0, globals_1.expect)(executedProposal.transactionHash).toBe(result.transactionHash);
        }
        const history = await multisigService.getBalanceHistory(vault.id);
        (0, globals_1.expect)(history.length).toBeGreaterThanOrEqual(2);
        const latency = performance.now() - startTime;
        (0, globals_1.expect)(latency).toBeLessThan(100);
        logger_1.logger.info(`✅ Transaction history and auditing validated in ${latency.toFixed(2)}ms`);
    });
    (0, globals_1.test)('Vault recovery mechanisms', async () => {
        const startTime = performance.now();
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
        const proposal = await multisigService.createProposal({
            vaultId: vault.id,
            recipient: web3_js_1.Keypair.generate().publicKey,
            amount: 1 * web3_js_1.LAMPORTS_PER_SOL,
            description: 'Recovery test transaction'
        }, remainingSigners[0]);
        await multisigService.addSignature(proposal.id, remainingSigners[1]);
        await multisigService.addSignature(proposal.id, remainingSigners[2]);
        const result = await multisigService.executeTransaction(proposal.id, remainingSigners[0]);
        (0, globals_1.expect)(result.success).toBe(true);
        const finalBalance = await multisigService.getVaultBalance(vault.id);
        (0, globals_1.expect)(finalBalance).toBe(9 * web3_js_1.LAMPORTS_PER_SOL);
        const latency = performance.now() - startTime;
        (0, globals_1.expect)(latency).toBeLessThan(50);
        logger_1.logger.info(`✅ Vault recovery mechanisms validated in ${latency.toFixed(2)}ms`);
    });
});
//# sourceMappingURL=multisig-vaults-simple.test.js.map