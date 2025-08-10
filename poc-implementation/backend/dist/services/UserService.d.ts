import { PublicKey } from '@solana/web3.js';
export interface User {
    id: string;
    walletAddress: string;
    username?: string;
    email?: string;
    profileImageUrl?: string;
    solBalance: number;
    bettingBalance: number;
    totalWinnings: number;
    totalLosses: number;
    gamesPlayed: number;
    gamesWon: number;
    eloRating: number;
    isActive: boolean;
    preferences: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuthToken {
    token: string;
    userId: string;
    walletAddress: string;
    expiresAt: Date;
}
export interface WalletSignatureData {
    walletAddress: string;
    signature: string;
    message: string;
}
export interface PdaCheckResult {
    walletAddress: string;
    hasAccount: boolean;
    accountAddress: string | null;
    userAccountPda?: PublicKey;
}
export declare class UserService {
    private cache;
    private jwtSecret;
    private connection;
    private programId;
    constructor();
    checkExistingPDA(walletAddress: string): Promise<PdaCheckResult>;
    derivePdaAddress(walletAddress: string): Promise<string>;
    initializeUserAccountIfNeeded(walletAddress: string, options?: {
        kycLevel?: number;
        region?: number;
        username?: string;
    }): Promise<{
        initialized: boolean;
        transactionHash?: string;
        userAccountPda: string;
        isFirstTime: boolean;
    }>;
    checkAndInitializeAccount(walletAddress: string, options?: {
        autoInitialize?: boolean;
        kycLevel?: number;
        region?: number;
        username?: string;
    }): Promise<{
        accountExists: boolean;
        needsInitialization: boolean;
        initialized?: boolean;
        userAccountPda: string;
        transactionHash?: string;
    }>;
    authenticateWallet(signatureData: WalletSignatureData): Promise<AuthToken>;
    verifyToken(token: string): Promise<User | null>;
    getUserById(userId: string): Promise<User | null>;
    getUserByWallet(walletAddress: string): Promise<User | null>;
    createUser(walletAddress: string, userData?: Partial<User>): Promise<User>;
    updateUser(userId: string, updates: Partial<User>): Promise<User>;
    updateBalance(userId: string, balanceChanges: {
        solBalance?: number;
        bettingBalance?: number;
    }): Promise<User>;
    getUserStats(userId: string): Promise<{
        winRate: number;
        averageBet: number;
        totalProfit: number;
        rank: number;
        recentGames: number;
    }>;
    private verifySignature;
    private generateJWT;
    private isValidSolanaAddress;
    private mapRowToUser;
    signOut(token: string): Promise<void>;
    getLeaderboard(limit?: number): Promise<Array<{
        rank: number;
        user: Pick<User, 'id' | 'username' | 'walletAddress' | 'eloRating' | 'gamesPlayed' | 'gamesWon'>;
        winRate: number;
    }>>;
}
//# sourceMappingURL=UserService.d.ts.map