import { Logger } from 'winston';
interface User {
    id: string;
    wallet: string;
    username: string;
    email?: string | undefined;
    avatar?: string;
    preferences: UserPreferences;
    stats: UserStats;
    createdAt: Date;
    lastLoginAt: Date;
    isActive: boolean;
    role: UserRole;
}
interface UserPreferences {
    theme: 'light' | 'dark';
    notifications: {
        email: boolean;
        inApp: boolean;
        betting: boolean;
        gameResults: boolean;
        aiUpdates: boolean;
    };
    privacy: {
        showStats: boolean;
        showWallet: boolean;
        allowDirectMessages: boolean;
    };
    gameSettings: {
        autoPlay: boolean;
        soundEnabled: boolean;
        animationsEnabled: boolean;
        boardTheme: string;
    };
}
interface UserStats {
    totalGamesPlayed: number;
    totalGamesWon: number;
    totalBetsPlaced: number;
    totalBetsWon: number;
    totalWagered: number;
    totalWinnings: number;
    favoriteAIAgent?: string;
    winStreak: number;
    bestWinStreak: number;
    aiAgentsOwned: number;
    aiAgentsCreated: number;
}
declare enum UserRole {
    USER = "user",
    MODERATOR = "moderator",
    ADMIN = "admin",
    DEVELOPER = "developer"
}
interface AuthToken {
    token: string;
    refreshToken: string;
    expiresAt: Date;
    user: User;
}
interface LoginRequest {
    wallet: string;
    signature: string;
    message: string;
    timestamp: number;
}
interface RegistrationRequest {
    wallet: string;
    username: string;
    email?: string;
    signature: string;
    message: string;
    timestamp: number;
}
export declare class AuthenticationService {
    private logger;
    private userRegistry;
    private activeTokens;
    private tokenBlacklist;
    private failedAttempts;
    private jwtSecret;
    private refreshTokenSecret;
    private tokenExpiration;
    private maxFailedAttempts;
    private lockoutDuration;
    constructor(logger: Logger);
    register(request: RegistrationRequest): Promise<AuthToken>;
    login(request: LoginRequest): Promise<AuthToken>;
    refreshToken(refreshToken: string): Promise<AuthToken>;
    verifyToken(token: string): Promise<User | null>;
    logout(token: string): Promise<void>;
    updateProfile(userId: string, updates: Partial<Pick<User, 'username' | 'email' | 'avatar' | 'preferences'>>): Promise<User>;
    updateUserStats(userId: string, statUpdates: Partial<UserStats>): Promise<void>;
    getUser(userId: string): User | undefined;
    getUserByWallet(wallet: string): User | undefined;
    getUserByUsername(username: string): User | undefined;
    getUserStatsSummary(userId: string): any;
    private validateRegistrationRequest;
    private validateLoginRequest;
    private verifyWalletSignature;
    private generateAuthTokens;
    private getDefaultPreferences;
    private getDefaultStats;
    private isWalletLocked;
    private recordFailedAttempt;
    private clearFailedAttempts;
    blacklistToken(token: string): Promise<void>;
    private isTokenBlacklisted;
    invalidateAllUserSessions(userId: string): Promise<void>;
    cleanupExpiredData(): Promise<void>;
    getSecurityStats(): any;
    getPlatformStats(): any;
}
export {};
//# sourceMappingURL=AuthenticationService.d.ts.map