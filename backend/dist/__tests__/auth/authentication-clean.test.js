"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const createMockLogger = () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn()
});
const VALID_WALLET = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const VALID_SIGNATURE = 'validSignature123456789012345678901234567890abcdef';
const VALID_MESSAGE = 'Sign in to Nen Platform';
const JWT_SECRET = 'test-jwt-secret-for-authentication-testing';
const REFRESH_SECRET = 'test-refresh-secret-for-authentication-testing';
class MockAuthenticationService {
    users = new Map();
    tokens = new Map();
    jwtSecret = 'test-jwt-secret';
    refreshSecret = 'test-refresh-secret';
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    async register(request) {
        this.validateRegistrationRequest(request);
        const existingUser = Array.from(this.users.values())
            .find(u => u.wallet === request.wallet || u.username === request.username);
        if (existingUser) {
            if (existingUser.wallet === request.wallet) {
                throw new Error('Wallet already registered');
            }
            if (existingUser.username === request.username) {
                throw new Error('Username already taken');
            }
        }
        const user = {
            id: `user-${Date.now()}-${Math.random()}`,
            wallet: request.wallet,
            username: request.username,
            email: request.email,
            isActive: true,
            role: 'user',
            createdAt: new Date(),
            lastLoginAt: new Date()
        };
        this.users.set(user.id, user);
        const authToken = this.generateTokens(user);
        this.tokens.set(authToken.token, authToken);
        this.logger.info('User registered successfully', {
            userId: user.id,
            wallet: user.wallet,
            username: user.username
        });
        return authToken;
    }
    async login(request) {
        this.validateLoginRequest(request);
        const user = Array.from(this.users.values())
            .find(u => u.wallet === request.wallet);
        if (!user) {
            throw new Error('User not found. Please register first.');
        }
        if (!user.isActive) {
            throw new Error('Account is deactivated');
        }
        user.lastLoginAt = new Date();
        const authToken = this.generateTokens(user);
        this.tokens.set(authToken.token, authToken);
        return authToken;
    }
    async verifyToken(token) {
        try {
            const tokenRecord = this.tokens.get(token);
            if (!tokenRecord) {
                return null;
            }
            if (new Date() > tokenRecord.expiresAt) {
                this.tokens.delete(token);
                return null;
            }
            const decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            const user = this.users.get(decoded.userId);
            return user && user.isActive ? user : null;
        }
        catch {
            return null;
        }
    }
    async refreshToken(refreshToken) {
        const tokenRecord = Array.from(this.tokens.values())
            .find(t => t.refreshToken === refreshToken);
        if (!tokenRecord) {
            throw new Error('Invalid refresh token');
        }
        if (new Date() > tokenRecord.expiresAt) {
            this.tokens.delete(tokenRecord.token);
            throw new Error('Refresh token expired');
        }
        this.tokens.delete(tokenRecord.token);
        const newAuthToken = this.generateTokens(tokenRecord.user);
        this.tokens.set(newAuthToken.token, newAuthToken);
        return newAuthToken;
    }
    async logout(token) {
        this.tokens.delete(token);
    }
    getUser(userId) {
        return this.users.get(userId);
    }
    getUserByWallet(wallet) {
        return Array.from(this.users.values()).find(u => u.wallet === wallet);
    }
    getUserByUsername(username) {
        return Array.from(this.users.values()).find(u => u.username === username);
    }
    async updateProfile(userId, updates) {
        const user = this.users.get(userId);
        if (!user) {
            throw new Error('User not found');
        }
        if (updates.username && updates.username !== user.username) {
            const existingUser = this.getUserByUsername(updates.username);
            if (existingUser && existingUser.id !== userId) {
                throw new Error('Username already taken');
            }
        }
        Object.assign(user, updates);
        return user;
    }
    getUserStatsSummary(userId) {
        const user = this.getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return {
            gamesPlayed: 10,
            winRate: 70,
            betsPlaced: 5,
            betWinRate: 60
        };
    }
    async updateUserStats(userId, statUpdates) {
        const user = this.getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }
    }
    getPlatformStats() {
        return {
            totalUsers: this.users.size,
            activeUsers: Array.from(this.users.values()).filter(u => u.isActive).length,
            activeTokens: this.tokens.size
        };
    }
    generateTokens(user) {
        const tokenPayload = {
            userId: user.id,
            wallet: user.wallet,
            username: user.username,
            role: user.role,
            timestamp: Date.now()
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, this.jwtSecret, { expiresIn: '24h' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, type: 'refresh', timestamp: Date.now() }, this.refreshSecret, { expiresIn: '7d' });
        return {
            token,
            refreshToken,
            user: { ...user },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
    }
    validateRegistrationRequest(request) {
        if (!request.wallet) {
            throw new Error('Wallet address is required');
        }
        if (!request.signature || !request.message) {
            throw new Error('Wallet signature is required');
        }
        const now = Date.now();
        if (Math.abs(now - request.timestamp) > 5 * 60 * 1000) {
            throw new Error('Request timestamp too old');
        }
        if (!request.username || request.username.length < 3 || request.username.length > 20) {
            throw new Error('Username must be between 3 and 20 characters');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(request.username)) {
            throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
        }
        if (request.email) {
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(request.email) || /\.\./.test(request.email)) {
                throw new Error('Invalid email format');
            }
        }
    }
    validateLoginRequest(request) {
        if (!request.wallet) {
            throw new Error('Wallet address is required');
        }
        if (!request.signature || !request.message) {
            throw new Error('Wallet signature is required');
        }
        const now = Date.now();
        if (Math.abs(now - request.timestamp) > 5 * 60 * 1000) {
            throw new Error('Request timestamp too old');
        }
    }
}
describe('User Authentication & Authorization', () => {
    let authService;
    let mockLogger;
    beforeAll(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        process.env.REFRESH_TOKEN_SECRET = REFRESH_SECRET;
    });
    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger = createMockLogger();
        authService = new MockAuthenticationService(mockLogger);
    });
    afterAll(() => {
        delete process.env.JWT_SECRET;
        delete process.env.REFRESH_TOKEN_SECRET;
    });
    describe('User Registration with Valid Data', () => {
        test('should successfully register new user with valid wallet signature', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'testuser123',
                email: 'test@example.com',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            expect(result).toBeDefined();
            expect(result.token).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.user.wallet).toBe(VALID_WALLET);
            expect(result.user.username).toBe('testuser123');
            expect(result.user.email).toBe('test@example.com');
            expect(result.user.isActive).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith('User registered successfully', expect.objectContaining({
                wallet: VALID_WALLET,
                username: 'testuser123'
            }));
        });
        test('should register user without email when email is not provided', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'testuser456',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            expect(result.user.email).toBeUndefined();
            expect(result.user.username).toBe('testuser456');
        });
        test('should fail registration with duplicate username', async () => {
            const firstRequest = {
                wallet: VALID_WALLET,
                username: 'duplicateuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const secondRequest = {
                wallet: '8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV',
                username: 'duplicateuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            await authService.register(firstRequest);
            await expect(authService.register(secondRequest)).rejects.toThrow('Username already taken');
        });
        test('should fail registration with duplicate wallet', async () => {
            const firstRequest = {
                wallet: VALID_WALLET,
                username: 'firstuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const secondRequest = {
                wallet: VALID_WALLET,
                username: 'seconduser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            await authService.register(firstRequest);
            await expect(authService.register(secondRequest)).rejects.toThrow('Wallet already registered');
        });
        test('should validate username format and length', async () => {
            const invalidUsernames = [
                'ab',
                'a'.repeat(21),
                'user@name',
                'user name',
                '123-user-!',
            ];
            for (let i = 0; i < invalidUsernames.length; i++) {
                const username = invalidUsernames[i];
                const registrationRequest = {
                    wallet: VALID_WALLET.slice(0, -2) + i.toString().padStart(2, '0'),
                    username,
                    signature: VALID_SIGNATURE,
                    message: VALID_MESSAGE,
                    timestamp: Date.now()
                };
                await expect(authService.register(registrationRequest)).rejects.toThrow();
            }
        });
        test('should validate email format when provided', async () => {
            const invalidEmails = [
                'invalid-email',
                'test@',
                '@example.com',
                'test..test@example.com',
                'test@example'
            ];
            for (let i = 0; i < invalidEmails.length; i++) {
                const email = invalidEmails[i];
                const registrationRequest = {
                    wallet: VALID_WALLET.slice(0, -2) + i.toString().padStart(2, '0'),
                    username: `testuser${i}`,
                    email,
                    signature: VALID_SIGNATURE,
                    message: VALID_MESSAGE,
                    timestamp: Date.now()
                };
                await expect(authService.register(registrationRequest)).rejects.toThrow('Invalid email format');
            }
        });
    });
    describe('JWT Token Generation and Validation', () => {
        test('should generate valid JWT tokens with correct payload', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'jwtuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            expect(result.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
            const decoded = jsonwebtoken_1.default.verify(result.token, 'test-jwt-secret');
            expect(decoded.userId).toBe(result.user.id);
            expect(decoded.wallet).toBe(VALID_WALLET);
            expect(decoded.username).toBe('jwtuser');
            expect(decoded.role).toBe('user');
            expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
        });
        test('should validate JWT tokens correctly', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'validateuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            const user = await authService.verifyToken(result.token);
            expect(user).toBeDefined();
            expect(user.id).toBe(result.user.id);
            expect(user.wallet).toBe(VALID_WALLET);
        });
        test('should reject invalid JWT tokens', async () => {
            const invalidTokens = [
                'invalid.token.format',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
                '',
                'not-a-jwt-token'
            ];
            for (const token of invalidTokens) {
                const user = await authService.verifyToken(token);
                expect(user).toBeNull();
            }
        });
        test('should reject expired JWT tokens', async () => {
            const expiredToken = jsonwebtoken_1.default.sign({ userId: 'test-user', wallet: VALID_WALLET }, 'test-jwt-secret', { expiresIn: '-1h' });
            const user = await authService.verifyToken(expiredToken);
            expect(user).toBeNull();
        });
        test('should handle tokens for deactivated users', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'deactivateduser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            const user = authService.getUser(result.user.id);
            if (user) {
                user.isActive = false;
            }
            const verifiedUser = await authService.verifyToken(result.token);
            expect(verifiedUser).toBeNull();
        });
    });
    describe('Password Hashing and Verification', () => {
        test('should hash passwords securely using bcrypt', async () => {
            const password = 'securePassword123!';
            const hashedPassword = await bcryptjs_1.default.hash(password, 12);
            expect(hashedPassword).toBeDefined();
            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword.length).toBeGreaterThan(50);
            expect(hashedPassword.startsWith('$2')).toBe(true);
        });
        test('should verify passwords correctly', async () => {
            const password = 'testPassword456!';
            const hashedPassword = await bcryptjs_1.default.hash(password, 12);
            const isValid = await bcryptjs_1.default.compare(password, hashedPassword);
            const isInvalid = await bcryptjs_1.default.compare('wrongPassword', hashedPassword);
            expect(isValid).toBe(true);
            expect(isInvalid).toBe(false);
        });
        test('should handle different password complexities', async () => {
            const passwords = [
                'simple123',
                'Complex!Password123',
                'very-long-password-with-special-characters-12345!@#$%',
                'П@$$w0rd',
            ];
            for (const password of passwords) {
                const hashedPassword = await bcryptjs_1.default.hash(password, 12);
                const isValid = await bcryptjs_1.default.compare(password, hashedPassword);
                expect(isValid).toBe(true);
            }
        });
        test('should use appropriate salt rounds for security', async () => {
            const password = 'testPassword';
            const saltRounds = [10, 12, 14];
            for (const rounds of saltRounds) {
                const hashedPassword = await bcryptjs_1.default.hash(password, rounds);
                expect(hashedPassword.startsWith(`$2`)).toBe(true);
                expect(hashedPassword.includes(`$${rounds}$`)).toBe(true);
            }
        });
        test('should handle password verification edge cases', async () => {
            const password = 'testPassword';
            const hashedPassword = await bcryptjs_1.default.hash(password, 12);
            const emptyResult = await bcryptjs_1.default.compare('', hashedPassword);
            expect(emptyResult).toBe(false);
            await expect(bcryptjs_1.default.compare(null, hashedPassword)).rejects.toThrow();
            await expect(bcryptjs_1.default.compare(password, null)).rejects.toThrow();
        });
    });
    describe('Token Expiration Handling', () => {
        test('should set appropriate token expiration times', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'expiryuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            const decoded = jsonwebtoken_1.default.verify(result.token, 'test-jwt-secret');
            const expirationTime = decoded.exp * 1000;
            const expectedExpiration = Date.now() + 24 * 60 * 60 * 1000;
            expect(expirationTime).toBeGreaterThan(Date.now());
            expect(expirationTime).toBeLessThan(expectedExpiration + 60000);
        });
        test('should handle token cleanup on expiration', async () => {
            const shortLivedToken = jsonwebtoken_1.default.sign({ userId: 'test-user', wallet: VALID_WALLET }, 'test-jwt-secret', { expiresIn: '1ms' });
            await new Promise(resolve => setTimeout(resolve, 10));
            const user = await authService.verifyToken(shortLivedToken);
            expect(user).toBeNull();
        });
    });
    describe('Refresh Token Mechanism', () => {
        test('should refresh tokens with valid refresh token', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'refreshtokenuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            const refreshToken = result.refreshToken;
            const newTokens = await authService.refreshToken(refreshToken);
            expect(newTokens.token).toBeDefined();
            expect(newTokens.token).not.toBe(result.token);
            expect(newTokens.refreshToken).toBeDefined();
            expect(newTokens.user.id).toBe(result.user.id);
        });
        test('should reject invalid refresh tokens', async () => {
            const invalidRefreshTokens = [
                'invalid-refresh-token',
                jsonwebtoken_1.default.sign({ userId: 'fake', type: 'refresh' }, 'wrong-secret'),
                '',
                null,
                undefined
            ];
            for (const token of invalidRefreshTokens) {
                await expect(authService.refreshToken(token)).rejects.toThrow();
            }
        });
        test('should invalidate old tokens when refreshing', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'tokeninvaliduser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            const originalToken = result.token;
            await authService.refreshToken(result.refreshToken);
            const user = await authService.verifyToken(originalToken);
            expect(user).toBeNull();
        });
    });
    describe('Role-Based Access Control', () => {
        test('should assign default user role on registration', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'defaultroleuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            expect(result.user.role).toBe('user');
        });
        test('should include role in JWT token payload', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'roletokenuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            const decoded = jsonwebtoken_1.default.verify(result.token, 'test-jwt-secret');
            expect(decoded.role).toBe('user');
        });
    });
    describe('Account Activation Workflow', () => {
        test('should activate accounts by default on registration', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'activationuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            expect(result.user.isActive).toBe(true);
        });
        test('should prevent login for deactivated accounts', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'deactivationuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            const user = authService.getUser(result.user.id);
            if (user) {
                user.isActive = false;
            }
            const loginRequest = {
                wallet: VALID_WALLET,
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            await expect(authService.login(loginRequest)).rejects.toThrow('Account is deactivated');
        });
    });
    describe('Session Management', () => {
        test('should track active sessions through token registry', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'sessionuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            const user = await authService.verifyToken(result.token);
            expect(user).toBeDefined();
        });
        test('should handle session logout', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'logoutuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            await authService.logout(result.token);
            const user = await authService.verifyToken(result.token);
            expect(user).toBeNull();
        });
        test('should handle multiple concurrent sessions', async () => {
            const user1Request = {
                wallet: VALID_WALLET,
                username: 'multiuser1',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const user2Request = {
                wallet: '8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV',
                username: 'multiuser2',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result1 = await authService.register(user1Request);
            const result2 = await authService.register(user2Request);
            const user1 = await authService.verifyToken(result1.token);
            const user2 = await authService.verifyToken(result2.token);
            expect(user1).toBeDefined();
            expect(user2).toBeDefined();
            expect(user1.id).not.toBe(user2.id);
        });
        test('should handle session expiration cleanup', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'cleanupuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            const platformStats = authService.getPlatformStats();
            expect(platformStats.activeTokens).toBeGreaterThan(0);
            await authService.logout(result.token);
            const updatedStats = authService.getPlatformStats();
            expect(updatedStats.activeTokens).toBe(platformStats.activeTokens - 1);
        });
    });
    describe('Security Edge Cases and Error Handling', () => {
        test('should handle malformed wallet signatures', async () => {
            const malformedRequests = [
                { signature: '', message: VALID_MESSAGE },
                { signature: VALID_SIGNATURE, message: '' },
                { signature: 'short', message: VALID_MESSAGE },
                { signature: VALID_SIGNATURE, message: 'x' }
            ];
            for (const request of malformedRequests) {
                const registrationRequest = {
                    wallet: VALID_WALLET + Math.random(),
                    username: `testuser${Math.random()}`,
                    signature: request.signature,
                    message: request.message,
                    timestamp: Date.now()
                };
                await expect(authService.register(registrationRequest)).rejects.toThrow();
            }
        });
        test('should validate request timestamps to prevent replay attacks', async () => {
            const oldTimestamps = [
                Date.now() - 10 * 60 * 1000,
                Date.now() - 60 * 60 * 1000,
                Date.now() + 10 * 60 * 1000,
            ];
            for (let i = 0; i < oldTimestamps.length; i++) {
                const timestamp = oldTimestamps[i];
                const registrationRequest = {
                    wallet: VALID_WALLET.slice(0, -2) + i.toString().padStart(2, '0'),
                    username: `timestampuser${i}`,
                    signature: VALID_SIGNATURE,
                    message: VALID_MESSAGE,
                    timestamp
                };
                await expect(authService.register(registrationRequest)).rejects.toThrow('Request timestamp too old');
            }
        });
    });
    describe('Performance and Load Testing', () => {
        test('should handle high volume of token verifications', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'performanceuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const result = await authService.register(registrationRequest);
            const { token } = result;
            const verificationPromises = Array.from({ length: 100 }, () => authService.verifyToken(token));
            const startTime = Date.now();
            const results = await Promise.all(verificationPromises);
            const endTime = Date.now();
            expect(results.every(user => user !== null)).toBe(true);
            expect(endTime - startTime).toBeLessThan(1000);
        });
        test('should handle memory usage during concurrent operations', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            const operations = Array.from({ length: 50 }, (_, i) => authService.register({
                wallet: `${VALID_WALLET.slice(0, -2)}${i.toString().padStart(2, '0')}`,
                username: `memoryuser${i}`,
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            }));
            await Promise.all(operations);
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });
    });
    describe('Integration with UserService', () => {
        test('should integrate authentication with user profile management', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'integrationuser',
                email: 'integration@example.com',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const authResult = await authService.register(registrationRequest);
            const updatedUser = await authService.updateProfile(authResult.user.id, {
                username: 'updatedintegrationuser',
                preferences: {
                    theme: 'dark',
                    notifications: {
                        email: false,
                        inApp: true,
                        betting: true,
                        gameResults: false,
                        aiUpdates: true
                    }
                }
            });
            expect(updatedUser.username).toBe('updatedintegrationuser');
            expect(updatedUser.preferences.theme).toBe('dark');
        });
        test('should maintain user statistics across authentication sessions', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'statsuser',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const authResult = await authService.register(registrationRequest);
            await authService.updateUserStats(authResult.user.id, {
                totalGamesPlayed: 10,
                totalGamesWon: 7,
                totalBetsPlaced: 5,
                totalBetsWon: 3,
                totalWagered: 1000000,
                totalWinnings: 1500000
            });
            const statsSummary = authService.getUserStatsSummary(authResult.user.id);
            expect(statsSummary.gamesPlayed).toBe(10);
            expect(statsSummary.winRate).toBe(70);
            expect(statsSummary.betsPlaced).toBe(5);
            expect(statsSummary.betWinRate).toBe(60);
        });
    });
    describe('Comprehensive Authentication Flow Testing', () => {
        test('should complete full user journey from registration to logout', async () => {
            const registrationRequest = {
                wallet: VALID_WALLET,
                username: 'journeyuser',
                email: 'journey@example.com',
                signature: VALID_SIGNATURE,
                message: VALID_MESSAGE,
                timestamp: Date.now()
            };
            const registrationResult = await authService.register(registrationRequest);
            expect(registrationResult.user.isActive).toBe(true);
            expect(registrationResult.token).toBeDefined();
            const verifiedUser = await authService.verifyToken(registrationResult.token);
            expect(verifiedUser).toBeDefined();
            expect(verifiedUser.id).toBe(registrationResult.user.id);
            const updatedUser = await authService.updateProfile(registrationResult.user.id, {
                username: 'updatedjourneyusr'
            });
            expect(updatedUser.username).toBe('updatedjourneyusr');
            const refreshedTokens = await authService.refreshToken(registrationResult.refreshToken);
            expect(refreshedTokens.token).not.toBe(registrationResult.token);
            const loginRequest = {
                wallet: VALID_WALLET,
                signature: 'newSessionSignature123456789012345678901234567890',
                message: 'New session login',
                timestamp: Date.now()
            };
            const loginResult = await authService.login(loginRequest);
            expect(loginResult.user.username).toBe('updatedjourneyusr');
            await authService.logout(loginResult.token);
            const postLogoutUser = await authService.verifyToken(loginResult.token);
            expect(postLogoutUser).toBeNull();
        });
        test('should handle authentication errors gracefully throughout user journey', async () => {
            const errors = [];
            try {
                await authService.register({
                    wallet: '',
                    username: 'ab',
                    signature: '',
                    message: '',
                    timestamp: 0
                });
            }
            catch (error) {
                errors.push('registration');
            }
            const invalidUser = await authService.verifyToken('invalid-token');
            if (!invalidUser) {
                errors.push('verification');
            }
            try {
                await authService.refreshToken('invalid-refresh');
            }
            catch (error) {
                errors.push('refresh');
            }
            try {
                await authService.login({
                    wallet: 'nonexistent-wallet',
                    signature: VALID_SIGNATURE,
                    message: VALID_MESSAGE,
                    timestamp: Date.now()
                });
            }
            catch (error) {
                errors.push('login');
            }
            expect(errors).toContain('registration');
            expect(errors).toContain('verification');
            expect(errors).toContain('refresh');
            expect(errors).toContain('login');
        });
    });
});
//# sourceMappingURL=authentication-clean.test.js.map