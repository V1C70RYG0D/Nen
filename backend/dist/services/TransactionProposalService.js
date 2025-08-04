"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionProposalService = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
class TransactionProposalService {
    connection;
    redisClient;
    vaultService;
    PROPOSAL_PREFIX = 'proposal:';
    SIGNATURE_PREFIX = 'signature:';
    AUDIT_TRAIL_PREFIX = 'audit_trail:';
    constructor(connection, redisClient, vaultService) {
        this.connection = connection;
        this.redisClient = redisClient;
        this.vaultService = vaultService;
    }
    async createProposal(proposalData, proposer) {
        try {
            const hasAccess = await this.vaultService.checkSignerAccess(proposalData.vaultId, proposer.publicKey);
            if (!hasAccess) {
                throw new Error('Proposer does not have access to this vault');
            }
            const vault = await this.vaultService.getVaultDetails(proposalData.vaultId);
            await this.validateProposal(proposalData, vault);
            const proposalId = (0, uuid_1.v4)();
            const expirationTime = proposalData.isEmergency ?
                2 * 60 * 60 * 1000 :
                24 * 60 * 60 * 1000;
            const proposal = {
                id: proposalId,
                vaultId: proposalData.vaultId,
                proposer: proposer.publicKey,
                recipient: proposalData.recipient,
                amount: proposalData.amount,
                description: proposalData.description,
                signatures: new Map(),
                requiredSignatures: vault.emergencyMode && proposalData.isEmergency ?
                    (vault.emergencyThreshold || vault.requiredSignatures) :
                    vault.requiredSignatures,
                status: 'pending',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + expirationTime),
                isEmergency: proposalData.isEmergency || false,
                metadata: proposalData.metadata
            };
            const proposerSignature = await this.createSignature(proposalId, proposer);
            proposal.signatures.set(proposer.publicKey.toBase58(), proposerSignature);
            await this.storeProposal(proposal);
            await this.initializeAuditTrail(proposalId, proposal);
            await this.recordSignature(proposalId, proposer.publicKey, proposerSignature);
            if (proposal.signatures.size >= proposal.requiredSignatures) {
                proposal.status = 'approved';
                await this.updateProposalStatus(proposalId, 'approved');
            }
            logger_1.logger.info(`Transaction proposal created: ${proposalId}, vault: ${proposalData.vaultId}, amount: ${proposalData.amount / web3_js_1.LAMPORTS_PER_SOL} SOL`);
            return proposal;
        }
        catch (error) {
            logger_1.logger.error('Failed to create transaction proposal:', error);
            throw error;
        }
    }
    async addSignature(proposalId, signer) {
        try {
            const proposal = await this.getProposal(proposalId);
            if (proposal.status !== 'pending') {
                throw new Error(`Cannot sign proposal with status: ${proposal.status}`);
            }
            if (proposal.expiresAt < new Date()) {
                await this.updateProposalStatus(proposalId, 'expired');
                throw new Error('Proposal has expired');
            }
            const hasAccess = await this.vaultService.checkSignerAccess(proposal.vaultId, signer.publicKey);
            if (!hasAccess) {
                throw new Error('Signer is not authorized for this vault');
            }
            if (proposal.signatures.has(signer.publicKey.toBase58())) {
                throw new Error('Signer has already signed this proposal');
            }
            const signature = await this.createSignature(proposalId, signer);
            const isValid = await this.verifySignature(proposalId, signer.publicKey, signature);
            if (!isValid) {
                throw new Error('Invalid signature');
            }
            proposal.signatures.set(signer.publicKey.toBase58(), signature);
            await this.updateProposalSignatures(proposalId, proposal.signatures);
            await this.recordSignature(proposalId, signer.publicKey, signature);
            if (proposal.signatures.size >= proposal.requiredSignatures) {
                await this.updateProposalStatus(proposalId, 'approved');
            }
            const vaultSignature = {
                signer: signer.publicKey,
                signature,
                timestamp: new Date(),
                verified: true
            };
            logger_1.logger.info(`Signature added to proposal: ${proposalId}, signer: ${signer.publicKey.toBase58()}`);
            return vaultSignature;
        }
        catch (error) {
            logger_1.logger.error(`Failed to add signature to proposal: ${proposalId}`, error);
            throw error;
        }
    }
    async executeTransaction(proposalId, executor, options = {}) {
        try {
            const proposal = await this.getProposal(proposalId);
            if (proposal.status === 'executed') {
                throw new Error('Proposal has already been executed');
            }
            if (proposal.status !== 'approved') {
                throw new Error('Proposal is not approved for execution');
            }
            if (proposal.signatures.size < proposal.requiredSignatures) {
                throw new Error(`Insufficient signatures. Required: ${proposal.requiredSignatures}, got: ${proposal.signatures.size}`);
            }
            const hasAccess = await this.vaultService.checkSignerAccess(proposal.vaultId, executor.publicKey);
            if (!hasAccess) {
                throw new Error('Executor is not authorized for this vault');
            }
            const vault = await this.vaultService.getVaultDetails(proposal.vaultId);
            if (!proposal.isEmergency && !options.bypassTimelock && vault.timelock) {
                const proposalAge = Date.now() - proposal.createdAt.getTime();
                if (proposalAge < vault.timelock) {
                    throw new Error(`Transaction is still in timelock period. Remaining: ${(vault.timelock - proposalAge) / 1000}s`);
                }
            }
            const vaultBalance = await this.vaultService.getVaultBalance(proposal.vaultId);
            if (vaultBalance < proposal.amount) {
                throw new Error(`Insufficient vault balance. Available: ${vaultBalance / web3_js_1.LAMPORTS_PER_SOL} SOL, required: ${proposal.amount / web3_js_1.LAMPORTS_PER_SOL} SOL`);
            }
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                fromPubkey: vault.publicKey,
                toPubkey: proposal.recipient,
                lamports: proposal.amount
            }));
            const vaultKeypair = await this.getVaultKeypair(proposal.vaultId);
            const startTime = performance.now();
            const signature = await this.connection.sendTransaction(transaction, [vaultKeypair]);
            const confirmation = await this.connection.confirmTransaction(signature);
            const executionTime = performance.now() - startTime;
            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }
            await this.updateProposalExecution(proposalId, signature);
            await this.recordTransactionInHistory(proposal, signature);
            await this.recordExecution(proposalId, signature, executionTime);
            const result = {
                success: true,
                transactionHash: signature,
                emergencyExecution: proposal.isEmergency,
                computeUnitsUsed: undefined
            };
            logger_1.logger.info(`Transaction executed: ${proposalId}, signature: ${signature}, amount: ${proposal.amount / web3_js_1.LAMPORTS_PER_SOL} SOL`);
            return result;
        }
        catch (error) {
            logger_1.logger.error(`Failed to execute transaction: ${proposalId}`, error);
            await this.recordFailedExecution(proposalId, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async getProposal(proposalId) {
        try {
            const proposalData = await this.redisClient.hgetall(`${this.PROPOSAL_PREFIX}${proposalId}`);
            if (!proposalData.id) {
                throw new Error(`Proposal not found: ${proposalId}`);
            }
            const signatures = new Map();
            const signaturesData = await this.redisClient.hgetall(`${this.SIGNATURE_PREFIX}${proposalId}`);
            for (const [signer, signature] of Object.entries(signaturesData)) {
                signatures.set(signer, signature);
            }
            return {
                id: proposalData.id,
                vaultId: proposalData.vaultId,
                proposer: new web3_js_1.PublicKey(proposalData.proposer),
                recipient: new web3_js_1.PublicKey(proposalData.recipient),
                amount: parseInt(proposalData.amount),
                description: proposalData.description,
                signatures,
                requiredSignatures: parseInt(proposalData.requiredSignatures),
                status: proposalData.status,
                createdAt: new Date(proposalData.createdAt),
                expiresAt: new Date(proposalData.expiresAt),
                executedAt: proposalData.executedAt ? new Date(proposalData.executedAt) : undefined,
                transactionHash: proposalData.transactionHash,
                isEmergency: proposalData.isEmergency === 'true',
                metadata: proposalData.metadata ? JSON.parse(proposalData.metadata) : undefined
            };
        }
        catch (error) {
            logger_1.logger.error(`Failed to get proposal: ${proposalId}`, error);
            throw error;
        }
    }
    async canViewProposal(proposalId, user) {
        try {
            const proposal = await this.getProposal(proposalId);
            return await this.vaultService.checkSignerAccess(proposal.vaultId, user);
        }
        catch (error) {
            return false;
        }
    }
    async verifySignature(proposalId, signer, signature) {
        try {
            if (!signature || signature.length === 0) {
                return false;
            }
            const expectedComponents = [
                proposalId.slice(0, 8),
                signer.toBase58().slice(0, 8)
            ];
            return expectedComponents.some(component => signature.includes(component));
        }
        catch (error) {
            logger_1.logger.error(`Failed to verify signature: ${proposalId}`, error);
            return false;
        }
    }
    async expireProposal(proposalId) {
        try {
            await this.updateProposalStatus(proposalId, 'expired');
            await this.recordExpiration(proposalId);
            logger_1.logger.info(`Proposal expired: ${proposalId}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to expire proposal: ${proposalId}`, error);
            throw error;
        }
    }
    async searchProposals(vaultId, filters = {}) {
        try {
            const proposalKeys = await this.redisClient.keys(`${this.PROPOSAL_PREFIX}*`);
            const proposals = [];
            for (const key of proposalKeys) {
                try {
                    const proposalId = key.replace(this.PROPOSAL_PREFIX, '');
                    const proposal = await this.getProposal(proposalId);
                    if (proposal.vaultId !== vaultId)
                        continue;
                    if (filters.status && proposal.status !== filters.status)
                        continue;
                    if (filters.fromDate && proposal.createdAt < filters.fromDate)
                        continue;
                    if (filters.toDate && proposal.createdAt > filters.toDate)
                        continue;
                    if (filters.minAmount && proposal.amount < filters.minAmount)
                        continue;
                    if (filters.maxAmount && proposal.amount > filters.maxAmount)
                        continue;
                    if (filters.proposer && !proposal.proposer.equals(filters.proposer))
                        continue;
                    if (filters.isEmergency !== undefined && proposal.isEmergency !== filters.isEmergency)
                        continue;
                    proposals.push(proposal);
                }
                catch (error) {
                    continue;
                }
            }
            return proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        catch (error) {
            logger_1.logger.error(`Failed to search proposals: ${vaultId}`, error);
            return [];
        }
    }
    async getProposalsByStatus(vaultId, status) {
        return this.searchProposals(vaultId, { status });
    }
    async getPendingProposalsForSigner(vaultId, signer) {
        try {
            const pendingProposals = await this.getProposalsByStatus(vaultId, 'pending');
            return pendingProposals.filter(proposal => !proposal.signatures.has(signer.toBase58()) &&
                proposal.expiresAt > new Date());
        }
        catch (error) {
            logger_1.logger.error(`Failed to get pending proposals for signer: ${vaultId}`, error);
            return [];
        }
    }
    async validateProposal(proposalData, vault) {
        if (proposalData.amount <= 0) {
            throw new Error('Transaction amount must be positive');
        }
        if (proposalData.isEmergency && proposalData.amount > 50 * web3_js_1.LAMPORTS_PER_SOL) {
            throw new Error(`Emergency transaction exceeds maximum limit: ${50} SOL`);
        }
        if (!proposalData.isEmergency && proposalData.amount > 1000 * web3_js_1.LAMPORTS_PER_SOL) {
            throw new Error(`Transaction exceeds maximum limit: ${1000} SOL`);
        }
        if (!proposalData.recipient) {
            throw new Error('Recipient address is required');
        }
        if (!proposalData.description || proposalData.description.trim().length === 0) {
            throw new Error('Transaction description is required');
        }
        const vaultBalance = await this.vaultService.getVaultBalance(proposalData.vaultId);
        if (vaultBalance < proposalData.amount) {
            throw new Error('Insufficient vault balance for proposed transaction');
        }
    }
    async createSignature(proposalId, signer) {
        const proposalComponent = proposalId.slice(0, 8);
        const signerComponent = signer.publicKey.toBase58().slice(0, 8);
        const timestamp = Date.now().toString().slice(-6);
        return `sig_${proposalComponent}_${signerComponent}_${timestamp}`;
    }
    async storeProposal(proposal) {
        const proposalData = {
            id: proposal.id,
            vaultId: proposal.vaultId,
            proposer: proposal.proposer.toBase58(),
            recipient: proposal.recipient.toBase58(),
            amount: proposal.amount.toString(),
            description: proposal.description,
            requiredSignatures: proposal.requiredSignatures.toString(),
            status: proposal.status,
            createdAt: proposal.createdAt.toISOString(),
            expiresAt: proposal.expiresAt.toISOString(),
            isEmergency: proposal.isEmergency.toString(),
            metadata: proposal.metadata ? JSON.stringify(proposal.metadata) : undefined
        };
        await this.redisClient.hset(`${this.PROPOSAL_PREFIX}${proposal.id}`, proposalData);
        if (proposal.signatures.size > 0) {
            const signaturesData = {};
            proposal.signatures.forEach((signature, signer) => {
                signaturesData[signer] = signature;
            });
            await this.redisClient.hset(`${this.SIGNATURE_PREFIX}${proposal.id}`, signaturesData);
        }
    }
    async updateProposalStatus(proposalId, status) {
        await this.redisClient.hset(`${this.PROPOSAL_PREFIX}${proposalId}`, 'status', status);
    }
    async updateProposalSignatures(proposalId, signatures) {
        const signaturesData = {};
        signatures.forEach((signature, signer) => {
            signaturesData[signer] = signature;
        });
        await this.redisClient.hset(`${this.SIGNATURE_PREFIX}${proposalId}`, signaturesData);
    }
    async updateProposalExecution(proposalId, transactionHash) {
        await this.redisClient.hset(`${this.PROPOSAL_PREFIX}${proposalId}`, {
            status: 'executed',
            executedAt: new Date().toISOString(),
            transactionHash
        });
    }
    async getVaultKeypair(vaultId) {
        const vaultData = await this.redisClient.hgetall(`vault:${vaultId}`);
        if (!vaultData.secretKey) {
            throw new Error('Vault private key not found');
        }
        const secretKey = Buffer.from(vaultData.secretKey, 'base64');
        return web3_js_1.Keypair.fromSecretKey(secretKey);
    }
    async recordTransactionInHistory(proposal, signature) {
        const historyEntry = {
            proposalId: proposal.id,
            timestamp: new Date().toISOString(),
            amount: proposal.amount,
            recipient: proposal.recipient.toBase58(),
            transactionHash: signature,
            description: proposal.description,
            status: 'executed',
            isEmergency: proposal.isEmergency
        };
        await this.redisClient.lpush(`transaction_history:${proposal.vaultId}`, JSON.stringify(historyEntry));
    }
    async initializeAuditTrail(proposalId, proposal) {
        const auditData = {
            proposalCreated: JSON.stringify({
                timestamp: proposal.createdAt.toISOString(),
                proposer: proposal.proposer.toBase58(),
                amount: proposal.amount,
                recipient: proposal.recipient.toBase58(),
                description: proposal.description,
                isEmergency: proposal.isEmergency
            }),
            signaturesCollected: JSON.stringify([])
        };
        await this.redisClient.hset(`${this.AUDIT_TRAIL_PREFIX}${proposalId}`, auditData);
    }
    async recordSignature(proposalId, signer, signature) {
        const auditKey = `${this.AUDIT_TRAIL_PREFIX}${proposalId}`;
        const currentSignatures = await this.redisClient.hget(auditKey, 'signaturesCollected');
        const signatures = currentSignatures ? JSON.parse(currentSignatures) : [];
        signatures.push({
            signer: signer.toBase58(),
            signature,
            timestamp: new Date().toISOString(),
            verified: true
        });
        await this.redisClient.hset(auditKey, 'signaturesCollected', JSON.stringify(signatures));
    }
    async recordExecution(proposalId, transactionHash, executionTime) {
        const executionData = {
            timestamp: new Date().toISOString(),
            transactionHash,
            executionTime,
            success: true
        };
        await this.redisClient.hset(`${this.AUDIT_TRAIL_PREFIX}${proposalId}`, 'transactionExecuted', JSON.stringify(executionData));
    }
    async recordFailedExecution(proposalId, error) {
        const executionData = {
            timestamp: new Date().toISOString(),
            error,
            success: false
        };
        await this.redisClient.hset(`${this.AUDIT_TRAIL_PREFIX}${proposalId}`, 'transactionExecuted', JSON.stringify(executionData));
    }
    async recordExpiration(proposalId) {
        const expirationData = {
            timestamp: new Date().toISOString(),
            reason: 'Proposal expired due to timeout'
        };
        await this.redisClient.hset(`${this.AUDIT_TRAIL_PREFIX}${proposalId}`, 'proposalExpired', JSON.stringify(expirationData));
    }
}
exports.TransactionProposalService = TransactionProposalService;
//# sourceMappingURL=TransactionProposalService.js.map