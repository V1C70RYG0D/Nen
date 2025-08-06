/**
 * User Service Tests
 *
 * Tests for user management functionality including wallet authentication,
 * user creation, and profile management.
 */

import { createTestServices } from '../utils/testServiceFactory';
import { IUserService } from '../types/serviceTypes';
import { logger } from '../../utils/logger';

// Mock external dependencies
jest.mock('../../utils/logger');

describe('User Service', () => {
  let testServices: ReturnType<typeof createTestServices>;
  let userService: IUserService;

  const mockWalletAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
  const mockSignature = 'mock-signature-data';
  const mockMessage = 'Please sign this message to authenticate your wallet';

  beforeAll(() => {
    testServices = createTestServices();
    userService = testServices.userService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('User Creation', () => {
    test('should create a new user successfully', async () => {
      const userData = await userService.createUser(mockWalletAddress);

      expect(userData).toBeDefined();
      expect(userData.id).toBeDefined();
      expect(userData.address).toBe(mockWalletAddress);
      expect(userData.createdAt).toBeInstanceOf(Date);
    });

    test('should handle duplicate wallet address', async () => {
      // Create user first time
      await userService.createUser(mockWalletAddress);
      
      // Try to create again - should handle gracefully
      const userData = await userService.createUser(mockWalletAddress);
      expect(userData).toBeDefined();
      expect(userData.address).toBe(mockWalletAddress);
    });
  });

  describe('Wallet Authentication', () => {
    test('should authenticate wallet with valid signature', async () => {
      const authResult = await userService.authenticateWallet({
        walletAddress: mockWalletAddress,
        signature: mockSignature,
        message: mockMessage
      });

      expect(authResult).toBeDefined();
      expect(authResult.success).toBe(true);
      expect(authResult.token).toBeDefined();
      expect(authResult.user).toBeDefined();
    });

    test('should reject invalid wallet authentication', async () => {
      const authResult = await userService.authenticateWallet({
        walletAddress: '',
        signature: mockSignature,
        message: mockMessage
      });

      expect(authResult.success).toBe(false);
      expect(authResult.error).toBeDefined();
    });
  });

  describe('User Profile Management', () => {
    test('should get user by wallet address', async () => {
      // Create user first
      await userService.createUser(mockWalletAddress);
      
      const user = await userService.getUserByWallet(mockWalletAddress);
      
      expect(user).toBeDefined();
      expect(user?.address).toBe(mockWalletAddress);
    });

    test('should return null for non-existent user', async () => {
      const user = await userService.getUserByWallet('non-existent-wallet');
      expect(user).toBeNull();
    });

    test('should update user profile', async () => {
      // Create user first
      const userData = await userService.createUser(mockWalletAddress);
      
      const updatedUser = await userService.updateUserProfile(userData.id, {
        username: 'testuser',
        email: 'test@example.com'
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser.username).toBe('testuser');
      expect(updatedUser.email).toBe('test@example.com');
    });
  });

  describe('User Statistics', () => {
    test('should get user betting statistics', async () => {
      const userData = await userService.createUser(mockWalletAddress);
      
      const stats = await userService.getUserStats(userData.id);
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalBets');
      expect(stats).toHaveProperty('totalWinnings');
      expect(stats).toHaveProperty('winRate');
      expect(typeof stats.totalBets).toBe('number');
      expect(typeof stats.totalWinnings).toBe('number');
      expect(typeof stats.winRate).toBe('number');
    });

    test('should get user transaction history', async () => {
      const userData = await userService.createUser(mockWalletAddress);
      
      const history = await userService.getUserTransactionHistory(userData.id);
      
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid input gracefully', async () => {
      try {
        await userService.createUser('');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should handle authentication errors', async () => {
      const authResult = await userService.authenticateWallet({
        walletAddress: mockWalletAddress,
        signature: 'invalid-signature',
        message: mockMessage
      });

      expect(authResult.success).toBe(false);
      expect(authResult.error).toContain('Invalid');
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
});
