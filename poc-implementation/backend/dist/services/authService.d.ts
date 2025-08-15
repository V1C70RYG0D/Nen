export interface User {
    id: string;
    publicKey: string;
    address: string;
    wallet: string;
    username?: string;
    email?: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    lastLoginAt: Date;
    preferences?: any;
}
export interface AuthToken {
    token: string;
    refreshToken: string;
    user: User;
    expiresAt: Date;
}
export interface TokenPayload {
    userId: string;
    id: string;
    publicKey: string;
    address: string;
    wallet: string;
    username?: string;
    email?: string;
    role: string;
    iat: number;
    exp: number;
}
export declare class AuthenticationService {
    private jwtSecret;
    private refreshSecret;
    constructor();
    /**
     * Verify Solana wallet signature
     */
    verifyWalletSignature(publicKey: string, signature: string, message: string, timestamp?: number): Promise<boolean>;
    /**
     * Generate JWT tokens for authenticated user
     */
    generateTokens(user: Partial<User>): {
        token: string;
        refreshToken: string;
    };
    /**
     * Verify JWT token
     */
    verifyToken(token: string): Promise<TokenPayload | null>;
    /**
     * Verify refresh token
     */
    verifyRefreshToken(refreshToken: string): Promise<any>;
    /**
     * Authenticate user with Solana wallet
     */
    authenticateWallet(publicKey: string, signature: string, message: string, timestamp?: number): Promise<{
        token: string;
        refreshToken: string;
        user: User;
    }>;
    /**
     * Refresh access token using refresh token
     */
    refreshAccessToken(refreshToken: string): Promise<{
        token: string;
        refreshToken: string;
    }>;
    /**
     * Validate user permissions for a resource
     */
    validatePermissions(user: TokenPayload, requiredPermissions: string[]): Promise<boolean>;
    /**
     * Check if user has required role
     */
    hasRole(user: TokenPayload, requiredRole: string): boolean;
    /**
     * Check if user owns a resource
     */
    isResourceOwner(user: TokenPayload, resourceUserId: string): boolean;
    /**
     * Get user context from token
     */
    getUserContext(token: string): Promise<TokenPayload>;
    /**
     * Validate token and extract user information for middleware
     */
    validateAuthToken(authorizationHeader?: string): Promise<TokenPayload>;
}
export declare const authService: AuthenticationService;
//# sourceMappingURL=authService.d.ts.map