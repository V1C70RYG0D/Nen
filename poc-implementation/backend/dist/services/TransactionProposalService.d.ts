/**
 * Transaction Proposal Service - Real Implementation
 * Following GI.md Guidelines: Real implementations, Security measures, Production readiness
 *
 * This service manages multi-signature transaction proposals including:
 * - Proposal creation and validation
 * - Signature collection and verification
 * - Transaction execution with required thresholds
 * - Audit trail and compliance tracking
 * - Emergency transaction handling
 */
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import Redis from 'ioredis';
import { MultisigVaultService } from './MultisigVaultService';
export interface TransactionProposalData {
    vaultId: string;
    recipient: PublicKey;
    amount: number;
    description: string;
    metadata?: any;
    isEmergency?: boolean;
}
export interface TransactionProposal {
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
    isEmergency: boolean;
    metadata?: any;
}
export interface VaultSignature {
    signer: PublicKey;
    signature: string;
    timestamp: Date;
    verified: boolean;
}
export interface ExecutionResult {
    success: boolean;
    transactionHash?: string;
    error?: string;
    emergencyExecution?: boolean;
    computeUnitsUsed?: number;
}
export interface ProposalSearchFilters {
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    proposer?: PublicKey;
    isEmergency?: boolean;
}
export declare class TransactionProposalService {
    private connection;
    private redisClient;
    private vaultService;
    private readonly PROPOSAL_PREFIX;
    private readonly SIGNATURE_PREFIX;
    private readonly AUDIT_TRAIL_PREFIX;
    constructor(connection: Connection, redisClient: Redis, vaultService: MultisigVaultService);
    /**
     * Create a new transaction proposal
     * GI #2: Real implementations over simulations
     */
    createProposal(proposalData: TransactionProposalData, proposer: Keypair): Promise<TransactionProposal>;
    /**
     * Add signature to proposal
     * GI #13: Security measures and GI #20: Robust error handling
     */
    addSignature(proposalId: string, signer: Keypair): Promise<VaultSignature>;
    /**
     * Execute transaction with required signatures
     * GI #6: Handle integrations carefully
     */
    executeTransaction(proposalId: string, executor: Keypair, options?: {
        bypassTimelock?: boolean;
    }): Promise<ExecutionResult>;
    /**
     * Get proposal by ID
     */
    getProposal(proposalId: string): Promise<TransactionProposal>;
    /**
     * Check if user can view proposal
     */
    canViewProposal(proposalId: string, user: PublicKey): Promise<boolean>;
    /**
     * Verify signature
     */
    verifySignature(proposalId: string, signer: PublicKey, signature: string): Promise<boolean>;
    /**
     * Expire proposal
     */
    expireProposal(proposalId: string): Promise<void>;
    /**
     * Search proposals
     */
    searchProposals(vaultId: string, filters?: ProposalSearchFilters): Promise<TransactionProposal[]>;
    /**
     * Get proposals by status
     */
    getProposalsByStatus(vaultId: string, status: TransactionProposal['status']): Promise<TransactionProposal[]>;
    /**
     * Get pending proposals requiring signature
     */
    getPendingProposalsForSigner(vaultId: string, signer: PublicKey): Promise<TransactionProposal[]>;
    private validateProposal;
    private createSignature;
    private storeProposal;
    private updateProposalStatus;
    private updateProposalSignatures;
    private updateProposalExecution;
    private getVaultKeypair;
    private recordTransactionInHistory;
    private initializeAuditTrail;
    private recordSignature;
    private recordExecution;
    private recordFailedExecution;
    private recordExpiration;
}
//# sourceMappingURL=TransactionProposalService.d.ts.map