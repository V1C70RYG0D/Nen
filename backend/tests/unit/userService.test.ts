import { UserService, WalletSignatureData } from '../../src/services/UserService';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../src/utils/logger');
jest.mock('../../src/utils/database');
jest.mock('../../src/utils/redis');
jest.mock('jsonwebtoken');
jest.mock('tweetnacl');
jest.mock('bs58');

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  test('should create a new user', async () => {
    const user = await userService.createUser('walletAddress1');
    expect(user).toHaveProperty('id');
    expect(user.walletAddress).toBe('walletAddress1');
  });

  test('should authenticate wallet', async () => {
    const authToken = await userService.authenticateWallet({
      walletAddress: 'walletAddress1',
      signature: 'signature',
      message: 'message',
    });
    expect(authToken).toHaveProperty('token');
  });
});
