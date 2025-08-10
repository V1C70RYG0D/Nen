import { verifyWalletSignature } from '../../src/services/AuthenticationService';
import { jest } from '@jest/globals';

describe('Service Unavailability', () => {
  it('should handle third-party service downtime gracefully', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.reject(new Error('Service Unavailable'))
    );

    const result = await verifyWalletSignature('wallet', 'message', 'signature');
    expect(result).toBe(false); // Assuming false is returned on failure

    // Assertions to verify retries if implemented
  });
});
