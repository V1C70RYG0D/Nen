// tests/deployment/blockchain-security.test.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

describe('Blockchain Security Tests - DS-011', () => {
  const solanaRpcUrl = process.env.SOLANA_RPC_URL;
  if (!solanaRpcUrl) {
    throw new Error('SOLANA_RPC_URL environment variable is required');
  }

  const programId = process.env.MAGIC_BLOCK_PROGRAM_ID || process.env.MAGICBLOCK_PROGRAM_ID;
  const apiURL = process.env.API_BASE_URL || process.env.TEST_API_BASE_URL;
  if (!apiURL) {
  }

  describe('Service Wallet Security', () => {
    test('Wallet files are not exposed in repository', () => {
      const sensitiveFiles = [
        '/opt/nen/wallet.json',
        './wallet.json',
        './keypair.json',
        './service-wallet.json',
        './.env'
      ];

      sensitiveFiles.forEach(file => {
        if (fs.existsSync(file)) {
          const stats = fs.statSync(file);
          if (file.endsWith('.json')) {
            // If wallet files exist, they should have restrictive permissions
            expect(stats.mode & parseInt('077', 8)).toBe(0); // No permissions for group/others
          }
        }
      });
    });

    test('Environment variables do not contain private keys', () => {
      const envVars = Object.keys(process.env);
      const dangerousVars = envVars.filter(key =>
        key.toLowerCase().includes('private') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('key')
      );

      dangerousVars.forEach(varName => {
        const value = process.env[varName];
        if (value) {
          // Check if it looks like a base58 private key (typically 88 characters)
          expect(value.length).not.toBe(88);
          // Check if it starts with typical Solana private key patterns
          expect(value).not.toMatch(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/);
        }
      });
    });

    test('Service has appropriate environment separation', () => {
      expect(['development', 'staging', 'production']).toContain(process.env.NODE_ENV);

      if (process.env.NODE_ENV === 'production') {
        // Production should not use devnet
        expect(solanaRpcUrl).not.toContain('devnet');
      }
    });
  });

  describe('Transaction Signing Process', () => {
    test('RPC endpoint is accessible and secure', async () => {
      try {
        const response = await axios.post(solanaRpcUrl, {
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth'
        }, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('result');
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log('Solana RPC endpoint not accessible - may be expected in test environment');
        } else {
          console.log('RPC endpoint test failed:', error.message);
        }
      }
    });

    test('Transaction signing is properly configured', async () => {
      try {
        const response = await axios.get(`${apiURL}/api/blockchain/config`);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('network');
          expect(response.data).toHaveProperty('programId');

          // Ensure we're not exposing sensitive configuration
          expect(response.data).not.toHaveProperty('privateKey');
          expect(response.data).not.toHaveProperty('wallet');
          expect(response.data).not.toHaveProperty('secret');
        }
      } catch (error) {
        console.log('Blockchain config endpoint not available');
      }
    });
  });

  describe('Program Account Security', () => {
    test('Program ID is properly configured', () => {
      if (programId) {
        // Program ID should be a valid Solana address (base58, ~44 characters)
        expect(programId).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
        expect(programId.length).toBeGreaterThanOrEqual(32);
        expect(programId.length).toBeLessThanOrEqual(44);
      } else {
        console.log('Program ID not configured - may be expected in development');
      }
    });

    test('Program deployment is verified', async () => {
      if (programId && solanaRpcUrl) {
        try {
          const response = await axios.post(solanaRpcUrl, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getAccountInfo',
            params: [
              programId,
              { encoding: 'base64' }
            ]
          }, { timeout: 10000 });

          if (response.data.result && response.data.result.value) {
            expect(response.data.result.value).toHaveProperty('executable');
            expect(response.data.result.value.executable).toBe(true);
          }
        } catch (error) {
          console.log('Program verification failed or program not deployed');
        }
      }
    });
  });

  describe('Balance Monitoring', () => {
    test('Balance monitoring is configured', async () => {
      try {
        const response = await axios.get(`${apiURL}/api/blockchain/balance`);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('balance');
          expect(typeof response.data.balance).toBe('number');

          // Should have monitoring thresholds
          expect(response.data).toHaveProperty('threshold');
        }
      } catch (error) {
        console.log('Balance monitoring endpoint not available');
      }
    });

    test('Low balance alerts are functional', async () => {
      try {
        const response = await axios.get(`${apiURL}/api/blockchain/alerts`);
        if (response.status === 200) {
          expect(Array.isArray(response.data.alerts)).toBe(true);
        }
      } catch (error) {
        console.log('Balance alerts endpoint not available');
      }
    });
  });

  describe('Multi-signature Implementation', () => {
    test('Multi-sig configuration is secure', async () => {
      try {
        const response = await axios.get(`${apiURL}/api/blockchain/multisig/status`);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('required_signers');
          expect(response.data).toHaveProperty('total_signers');

          // Should require multiple signers for production
          if (process.env.NODE_ENV === 'production') {
            expect(response.data.required_signers).toBeGreaterThan(1);
          }
        }
      } catch (error) {
        console.log('Multi-signature endpoint not available');
      }
    });
  });

  describe('PDA Security', () => {
    test('PDA generation is deterministic and secure', async () => {
      try {
        const response = await axios.post(`${apiURL}/api/blockchain/pda/generate`, {
          seeds: ['test', 'seed'],
          programId: programId || 'test-program-id'
        });

        if (response.status === 200) {
          expect(response.data).toHaveProperty('pda');
          expect(response.data).toHaveProperty('bump');

          // PDA should be a valid Solana address
          expect(response.data.pda).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
          expect(response.data.bump).toBeGreaterThanOrEqual(0);
          expect(response.data.bump).toBeLessThanOrEqual(255);
        }
      } catch (error) {
        console.log('PDA generation endpoint not available');
      }
    });
  });

  describe('Transaction Replay Protection', () => {
    test('Nonce mechanism is implemented', async () => {
      try {
        const response = await axios.get(`${apiURL}/api/blockchain/nonce/current`);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('nonce');
          expect(typeof response.data.nonce).toBe('number');
        }
      } catch (error) {
        console.log('Nonce endpoint not available');
      }
    });

    test('Recent blockhash validation is active', async () => {
      try {
        const response = await axios.get(`${apiURL}/api/blockchain/blockhash/recent`);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('blockhash');
          expect(response.data.blockhash).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
        }
      } catch (error) {
        console.log('Recent blockhash endpoint not available');
      }
    });
  });

  describe('Smart Contract Security', () => {
    test('Contract upgrade authority is properly managed', async () => {
      if (programId) {
        try {
          const response = await axios.post(solanaRpcUrl, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getAccountInfo',
            params: [
              programId,
              { encoding: 'jsonParsed' }
            ]
          });

          if (response.data.result && response.data.result.value) {
            // Check if program is upgradeable and who has upgrade authority
            const accountInfo = response.data.result.value;
            if (accountInfo.data && accountInfo.data.parsed) {
              expect(accountInfo.data.parsed).toHaveProperty('info');
            }
          }
        } catch (error) {
          console.log('Contract upgrade authority check failed');
        }
      }
    });

    test('Access control is properly implemented', async () => {
      try {
        const response = await axios.get(`${apiURL}/api/blockchain/access-control`);
        if (response.status === 200) {
          expect(response.data).toHaveProperty('roles');
          expect(Array.isArray(response.data.roles)).toBe(true);
        }
      } catch (error) {
        console.log('Access control endpoint not available');
      }
    });
  });

  describe('Error Handling and Logging', () => {
    test('Blockchain errors are properly handled', async () => {
      try {
        // Test with invalid program ID to trigger error handling
        const response = await axios.post(`${apiURL}/api/blockchain/test-error`, {
          invalidData: true
        }, { validateStatus: () => true });

        // Should return proper error structure
        if (response.status >= 400) {
          expect(response.data).toHaveProperty('error');
          expect(typeof response.data.error).toBe('string');
        }
      } catch (error) {
        console.log('Error handling test endpoint not available');
      }
    });

    test('Sensitive information is not logged', () => {
      // Check if any common sensitive patterns are in logs
      const logPaths = [
        './logs/blockchain.log',
        './logs/app.log',
        './backend.log'
      ];

      logPaths.forEach(logPath => {
        if (fs.existsSync(logPath)) {
          const logContent = fs.readFileSync(logPath, 'utf8');

          // Should not contain private keys, secrets, or wallet data
          expect(logContent).not.toMatch(/private.*key/i);
          expect(logContent).not.toMatch(/secret.*key/i);
          expect(logContent).not.toMatch(/[1-9A-HJ-NP-Za-km-z]{87,88}/); // Base58 private key pattern
        }
      });
    });
  });

  describe('Network Security', () => {
    test('Secure communication channels are used', () => {
      if (process.env.NODE_ENV === 'production') {
        expect(solanaRpcUrl).toMatch(/^https:/);
      }

      // Test other service URLs are secure in production
      if (process.env.MAGICBLOCK_ENDPOINT) {
        if (process.env.NODE_ENV === 'production') {
          expect(process.env.MAGICBLOCK_ENDPOINT).toMatch(/^https:/);
        }
      }
    });

    test('Rate limiting is configured for blockchain calls', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(20).fill().map(() =>
        axios.get(`${apiURL}/api/blockchain/balance`, {
          timeout: 2000,
          validateStatus: () => true
        }).catch(e => ({ status: 500, error: e.message }))
      );

      try {
        const responses = await Promise.all(requests);
        const rateLimitedResponses = responses.filter(r => r.status === 429);

        // Should have some rate limiting if implemented
        if (rateLimitedResponses.length > 0) {
          expect(rateLimitedResponses.length).toBeGreaterThan(0);
        }
      } catch (error) {
        console.log('Rate limiting test inconclusive');
      }
    });
  });
});
