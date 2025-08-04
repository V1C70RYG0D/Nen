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
    createVault(config: MultisigVaultConfig, creator: Keypair): Promise<MultisigVault>;
    getVaultDetails(vaultId: string): Promise<VaultDetails>;
    getVaultBalance(vaultId: string): Promise<number>;
    fundVault(vaultId: string, amount: number, funder: Keypair): Promise<string>;
    checkSignerAccess(vaultId: string, signer: PublicKey): Promise<boolean>;
    getSignerPermissions(vaultId: string, signer: PublicKey): Promise<SignerPermissions>;
    getBalanceHistory(vaultId: string, options?: {
        limit?: number;
    }): Promise<BalanceHistoryEntry[]>;
    activateEmergencyMode(vaultId: string, reason: string, signers: Keypair[]): Promise<{
        success: boolean;
        emergencyId: string;
    }>;
    deactivateEmergencyMode(vaultId: string, signers: Keypair[], reason: string): Promise<{
        success: boolean;
    }>;
    getEmergencyHistory(vaultId: string): Promise<EmergencyHistoryEntry[]>;
    getAccessLogs(vaultId: string): Promise<AccessLogEntry[]>;
    getSignerLockoutStatus(vaultId: string, signer: PublicKey): Promise<LockoutStatus>;
    overrideLockout(vaultId: string, signer: PublicKey, admin: Keypair, reason: string): Promise<{
        success: boolean;
    }>;
    rotateSigner(vaultId: string, oldSigner: PublicKey, newSigner: PublicKey, approvers: Keypair[], reason: string): Promise<{
        success: boolean;
    }>;
    getTransactionHistory(vaultId: string): Promise<any[]>;
    getAuditTrail(proposalId: string): Promise<any>;
    searchAuditHistory(vaultId: string, filters: any): Promise<any[]>;
    verifyAuditIntegrity(vaultId: string): Promise<AuditIntegrityCheck>;
    exportAuditData(vaultId: string, options: any): Promise<AuditExportData>;
    getAuditRetentionPolicy(vaultId: string): Promise<AuditRetentionPolicy>;
    markSignerCompromised(vaultId: string, signer: PublicKey, reason: string): Promise<void>;
    initiateRecovery(vaultId: string, recoveryData: any, initiator: Keypair): Promise<RecoveryRequest>;
    approveRecovery(recoveryId: string, approver: Keypair): Promise<void>;
    getRecoveryRequest(recoveryId: string): Promise<RecoveryRequest>;
    executeRecovery(recoveryId: string, newSigners: Keypair[], executor: Keypair): Promise<{
        success: boolean;
        newVaultConfig?: any;
    }>;
    initiateMasterRecovery(vaultId: string, recoveryData: any, masterAuthority: Keypair): Promise<{
        success: boolean;
        requiresTimelock: boolean;
    }>;
    deactivateVault(vaultId: string, authority: Keypair): Promise<void>;
    getAuditConfiguration(vaultId: string): Promise<any>;
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