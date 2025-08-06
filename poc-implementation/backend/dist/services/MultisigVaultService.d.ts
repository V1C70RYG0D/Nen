/**
 * Multi-Signature Vault Service - Real Implementation
 * Following GI.md Guidelines: Real implementations, Security measures, Production readiness
 *
 * This service provides comprehensive multi-signature vault functionality including:
 * - Vault creation and configuration (3-of-5 operational, 5-of-9 treasury)
 * - Real-time balance tracking and management
 * - Access control and permission management
 * - Emergency procedures and recovery mechanisms
 * - Comprehensive audit trails and security logging
 */
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import Redis from 'ioredis';
export interface MultisigVaultConfig {
    requiredSignatures: number;
    totalSigners: number;
    signers: PublicKey[];
    type: 'operational' | 'treasury';
    initialBalance: number;
    emergencyThreshold?: number;
}
export interface MultisigVault {
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
    emergencyThreshold?: number;
    timelock?: number;
}
export interface VaultDetails extends MultisigVault {
    emergencyActivatedAt?: Date;
    emergencyReason?: string;
    maxBalance?: number;
    auditLevel: number;
}
export interface BalanceHistoryEntry {
    timestamp: Date;
    amount: number;
    transactionType: 'deposit' | 'withdrawal' | 'fee';
    transactionHash?: string;
    description?: string;
}
export interface SignerPermissions {
    canPropose: boolean;
    canSign: boolean;
    canView: boolean;
    isActive: boolean;
}
export interface AccessLogEntry {
    signer: PublicKey;
    action: string;
    granted: boolean;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
}
export interface LockoutStatus {
    isLockedOut: boolean;
    failedAttempts: number;
    lockedUntil?: Date;
    reason?: string;
}
export interface EmergencyHistoryEntry {
    id: string;
    activatedAt: Date;
    deactivatedAt?: Date;
    reason: string;
    activatedBy: PublicKey[];
    deactivatedBy?: PublicKey[];
}
export interface RecoveryRequest {
    id: string;
    vaultId: string;
    initiatedBy: PublicKey;
    reason: string;
    lostSigners: PublicKey[];
    newSigners: PublicKey[];
    recoveryType: 'signer_replacement' | 'master_recovery';
    status: 'pending' | 'approved' | 'executed' | 'rejected';
    requiredApprovals: number;
    approvals: Array<{
        signer: PublicKey;
        timestamp: Date;
        signature: string;
    }>;
    createdAt: Date;
    executedAt?: Date;
}
export interface AuditIntegrityCheck {
    isValid: boolean;
    checksum: string;
    lastVerified: Date;
    inconsistencies?: string[];
}
export interface AuditExportData {
    data: any;
    metadata: {
        totalTransactions: number;
        exportTimestamp: Date;
        vaultId: string;
        format: string;
    };
}
export interface AuditRetentionPolicy {
    retentionPeriod: number;
    autoCleanup: boolean;
    compressionEnabled: boolean;
}
export declare class MultisigVaultService {
    private connection;
    private redisClient;
    private readonly VAULT_PREFIX;
    private readonly BALANCE_HISTORY_PREFIX;
    private readonly ACCESS_LOG_PREFIX;
    private readonly LOCKOUT_PREFIX;
    private readonly EMERGENCY_PREFIX;
    private readonly RECOVERY_PREFIX;
    constructor(connection: Connection, redisClient: Redis);
    /**
     * Create a new multi-signature vault
     * GI #2: Real implementations over simulations
     */
    createVault(config: MultisigVaultConfig, creator: Keypair): Promise<MultisigVault>;
    /**
     * Get vault details
     */
    getVaultDetails(vaultId: string): Promise<VaultDetails>;
    /**
     * Get real-time vault balance
     * GI #6: Handle integrations carefully
     */
    getVaultBalance(vaultId: string): Promise<number>;
    /**
     * Fund vault with SOL
     */
    fundVault(vaultId: string, amount: number, funder: Keypair): Promise<string>;
    /**
     * Check if signer has access to vault
     */
    checkSignerAccess(vaultId: string, signer: PublicKey): Promise<boolean>;
    /**
     * Get signer permissions
     */
    getSignerPermissions(vaultId: string, signer: PublicKey): Promise<SignerPermissions>;
    /**
     * Get balance history
     */
    getBalanceHistory(vaultId: string, options?: {
        limit?: number;
    }): Promise<BalanceHistoryEntry[]>;
    /**
     * Activate emergency mode
     * GI #20: Robust error handling
     */
    activateEmergencyMode(vaultId: string, reason: string, signers: Keypair[]): Promise<{
        success: boolean;
        emergencyId: string;
    }>;
    /**
     * Deactivate emergency mode
     */
    deactivateEmergencyMode(vaultId: string, signers: Keypair[], reason: string): Promise<{
        success: boolean;
    }>;
    /**
     * Get emergency history
     */
    getEmergencyHistory(vaultId: string): Promise<EmergencyHistoryEntry[]>;
    /**
     * Get access logs
     */
    getAccessLogs(vaultId: string): Promise<AccessLogEntry[]>;
    /**
     * Get signer lockout status
     */
    getSignerLockoutStatus(vaultId: string, signer: PublicKey): Promise<LockoutStatus>;
    /**
     * Override signer lockout
     */
    overrideLockout(vaultId: string, signer: PublicKey, admin: Keypair, reason: string): Promise<{
        success: boolean;
    }>;
    /**
     * Rotate signer in vault
     */
    rotateSigner(vaultId: string, oldSigner: PublicKey, newSigner: PublicKey, approvers: Keypair[], reason: string): Promise<{
        success: boolean;
    }>;
    /**
     * Get transaction history
     */
    getTransactionHistory(vaultId: string): Promise<any[]>;
    /**
     * Get audit trail for a specific transaction
     */
    getAuditTrail(proposalId: string): Promise<any>;
    /**
     * Search audit history
     */
    searchAuditHistory(vaultId: string, filters: any): Promise<any[]>;
    /**
     * Verify audit integrity
     */
    verifyAuditIntegrity(vaultId: string): Promise<AuditIntegrityCheck>;
    /**
     * Export audit data
     */
    exportAuditData(vaultId: string, options: any): Promise<AuditExportData>;
    /**
     * Get audit retention policy
     */
    getAuditRetentionPolicy(vaultId: string): Promise<AuditRetentionPolicy>;
    /**
     * Mark signer as compromised
     */
    markSignerCompromised(vaultId: string, signer: PublicKey, reason: string): Promise<void>;
    /**
     * Initiate recovery process
     */
    initiateRecovery(vaultId: string, recoveryData: any, initiator: Keypair): Promise<RecoveryRequest>;
    /**
     * Approve recovery request
     */
    approveRecovery(recoveryId: string, approver: Keypair): Promise<void>;
    /**
     * Get recovery request
     */
    getRecoveryRequest(recoveryId: string): Promise<RecoveryRequest>;
    /**
     * Execute recovery
     */
    executeRecovery(recoveryId: string, newSigners: Keypair[], executor: Keypair): Promise<{
        success: boolean;
        newVaultConfig?: any;
    }>;
    /**
     * Initiate master recovery
     */
    initiateMasterRecovery(vaultId: string, recoveryData: any, masterAuthority: Keypair): Promise<{
        success: boolean;
        requiresTimelock: boolean;
    }>;
    /**
     * Deactivate vault
     */
    deactivateVault(vaultId: string, authority: Keypair): Promise<void>;
    /**
     * Get audit configuration
     */
    getAuditConfiguration(vaultId: string): Promise<any>;
    /**
     * Get maximum balance for vault type
     */
    getMaxBalance(vaultId: string): Promise<number>;
    private validateVaultConfig;
    private createVaultAccount;
    private storeVault;
    private getVault;
    private initializeBalanceTracking;
    private recordBalanceChange;
    private logAccessAttempt;
    private trackFailedAttempt;
    private getMaxBalanceForType;
    private calculateChecksum;
}
//# sourceMappingURL=MultisigVaultService.d.ts.map