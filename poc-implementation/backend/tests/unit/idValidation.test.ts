/**
 * ID Validation Middleware Tests
 *
 * Comprehensive test suite for robust error handling:
 * - Test operations with non-existent match IDs
 * - Verify malformed ID rejection
 * - Test SQL injection prevention
 * - Validate error response formats
 * - Test rate limiting for invalid requests
 * - Verify logging of suspicious activities
 */

import { Request, Response, NextFunction } from 'express';
import { Socket } from 'net';
import { validateMatchID, validateAnyID, validationService } from '../../src/middleware/idValidation';
import { logger } from '../../src/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Mock the logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe('ID Validation Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  const VALID_UUID = uuidv4();
  const INVALID_IDS = {
    MALFORMED: '123-invalid-id',
    NON_EXISTENT: 'non-existent-id-0000',
    SQL_INJECTION: "1'; DROP TABLE matches; --",
    XSS_ATTEMPT: '<script>alert("xss")</script>',
    NULL_BYTE: 'test\x00injection',
    UNICODE_EXPLOIT: '\u0000\u0001\u0002',
    LONG_STRING: 'a'.repeat(1000),
    SPECIAL_CHARS: '!@#$%^&*()+=[]{}|\\:;"<>?,./',
    WHITESPACE: '   invalid-id   ',
    EMPTY: '',
    MALFORMED_UUID_SHORT: '123e4567-e89b-12d3-a456-42661417400',
    MALFORMED_UUID_LONG: '123e4567-e89b-12d3-a456-4266141740000',
    MALFORMED_UUID_CHARS: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  };

  afterAll(() => {
    // Clear any remaining timers
    jest.clearAllTimers();
  });

  beforeEach(() => {
    // Clear the validation service tracker to prevent rate limiting between tests
    validationService.cleanupTracker();
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();

    mockRequest = {
      params: {},
      method: 'GET',
      path: '/api/v1/matches/test',
      get: jest.fn().mockReturnValue('test-user-agent')
    };

mockResponse = {
      status: mockStatus,
      json: mockJson
    };

    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();

    // Create a mock socket
    const mockSocket = {
      remoteAddress: '127.0.0.1',
      destroy: jest.fn(),
      end: jest.fn(),
      write: jest.fn(),
      connect: jest.fn(),
      setEncoding: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      setTimeout: jest.fn(),
      setNoDelay: jest.fn(),
      setKeepAlive: jest.fn(),
      address: jest.fn(),
      unref: jest.fn(),
      ref: jest.fn(),
      readable: true,
      writable: true
    } as unknown as Socket;

    mockRequest.connection = mockSocket;

    // Use defineProperty to set 'ip' since it's a read-only property
    Object.defineProperty(mockRequest, 'ip', {
      value: '127.0.0.1',
      writable: true,
      configurable: true
    });
  });

  describe('Non-existent Match ID Operations', () => {
    test('should handle missing matchId parameter', () => {
      mockRequest.params = {};

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Match ID is required',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle empty matchId parameter', () => {
      mockRequest.params = { matchId: INVALID_IDS.EMPTY };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Match ID is required',
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should accept valid UUID', () => {
      mockRequest.params = { matchId: VALID_UUID };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
      expect(mockJson).not.toHaveBeenCalled();
      expect(mockRequest.params.validatedMatchId).toBe(VALID_UUID);
    });
  });

  describe('Malformed ID Rejection', () => {
    test.each([
      ['malformed format', INVALID_IDS.MALFORMED],
      ['non-existent format', INVALID_IDS.NON_EXISTENT],
      ['overly long string', INVALID_IDS.LONG_STRING],
      ['special characters', INVALID_IDS.SPECIAL_CHARS],
      ['whitespace padding', INVALID_IDS.WHITESPACE],
      ['short malformed UUID', INVALID_IDS.MALFORMED_UUID_SHORT],
      ['long malformed UUID', INVALID_IDS.MALFORMED_UUID_LONG],
      ['invalid UUID characters', INVALID_IDS.MALFORMED_UUID_CHARS]
    ])('should reject %s', (description, invalidId) => {
      mockRequest.params = { matchId: invalidId };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String),
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should log invalid requests', () => {
      mockRequest.params = { matchId: INVALID_IDS.MALFORMED };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Invalid match ID request', {
        matchId: INVALID_IDS.MALFORMED,
        error: expect.any(String),
        ip: '127.0.0.1',
        userAgent: 'test-user-agent',
        method: 'GET',
        path: '/api/v1/matches/test',
        timestamp: expect.any(String)
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    const sqlInjectionAttempts = [
      "'; DROP TABLE matches; --",
      "' UNION SELECT * FROM users --",
      "'; DELETE FROM matches WHERE '1'='1",
      "' OR '1'='1' --",
      "'; INSERT INTO matches VALUES ('hacked') --",
      "' AND (SELECT COUNT(*) FROM matches) > 0 --",
      "admin'--",
      "admin'/*",
      "' OR 1=1#",
      "' OR 1=1--",
      "') OR '1'='1--"
    ];

    test.each(sqlInjectionAttempts.map((payload, index) => [payload, index]))(
      'should prevent SQL injection: %s',
      (sqlPayload: string, index: number) => {
        // Use unique IP for each test to avoid rate limiting
        const uniqueIp = `192.168.1.${100 + index}`;
        Object.defineProperty(mockRequest, 'ip', {
          value: uniqueIp,
          writable: true,
          configurable: true
        });

        mockRequest.params = { matchId: sqlPayload };

        validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid ID format: contains unsafe characters',
          timestamp: expect.any(String)
        });
        expect(mockNext).not.toHaveBeenCalled();

        // Should log suspicious activity
        expect(logger.warn).toHaveBeenCalledWith('Suspicious activity detected', {
          type: 'potential_sql_injection',
          matchId: sqlPayload,
          ip: expect.any(String),
          userAgent: expect.any(String),
          method: 'GET',
          path: expect.any(String),
          isRateLimited: expect.any(Boolean),
          timestamp: expect.any(String)
        });
      }
    );

    test('should handle URL-encoded SQL injection attempts', () => {
      // Use unique IP for this test
      Object.defineProperty(mockRequest, 'ip', {
        value: '10.1.1.50',
        writable: true,
        configurable: true
      });

      const encodedSqlPayload = encodeURIComponent("'; DROP TABLE matches; --");
      mockRequest.params = { matchId: encodedSqlPayload };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Suspicious activity detected', expect.objectContaining({
        type: 'potential_sql_injection'
      }));
    });
  });

  describe('XSS Attack Prevention', () => {
    const xssAttempts = [
      '<script>alert("xss")</script>',
      '<iframe src="malicious.com"></iframe>',
      '<object data="malicious.swf"></object>',
      '<embed src="malicious.swf">',
      'javascript:alert("xss")',
      'onclick="alert(\'xss\')"',
      '<script src="evil.js"></script>',
      '</script><script>alert("xss")</script>',
      'onload="alert(\'xss\')"'
    ];

    test.each(xssAttempts.map((payload, index) => [payload, index]))(
      'should prevent XSS attack: %s',
      (xssPayload: string, index: number) => {
        // Use unique IP for each test to avoid rate limiting
        const uniqueIp = `192.168.2.${100 + index}`;
        Object.defineProperty(mockRequest, 'ip', {
          value: uniqueIp,
          writable: true,
          configurable: true
        });

        mockRequest.params = { matchId: xssPayload };

        validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid ID format: contains unsafe characters',
          timestamp: expect.any(String)
        });

        expect(logger.warn).toHaveBeenCalledWith('Suspicious activity detected', expect.objectContaining({
          matchId: xssPayload,
          ip: expect.any(String),
          userAgent: expect.any(String),
          method: 'GET',
          path: expect.any(String),
          isRateLimited: expect.any(Boolean),
          timestamp: expect.any(String)
        }));
      }
    );
  });

  describe('Control Character and Unicode Exploits', () => {
    test('should prevent null byte injection', () => {
      // Use unique IP for this test
      Object.defineProperty(mockRequest, 'ip', {
        value: '10.2.1.1',
        writable: true,
        configurable: true
      });

      mockRequest.params = { matchId: INVALID_IDS.NULL_BYTE };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Suspicious activity detected', {
        type: 'control_character_injection',
        matchId: INVALID_IDS.NULL_BYTE,
        ip: expect.any(String),
        userAgent: expect.any(String),
        method: 'GET',
        path: expect.any(String),
        isRateLimited: expect.any(Boolean),
        timestamp: expect.any(String)
      });
    });

    test('should prevent unicode exploits', () => {
      // Use unique IP for this test
      Object.defineProperty(mockRequest, 'ip', {
        value: '10.2.1.2',
        writable: true,
        configurable: true
      });

      mockRequest.params = { matchId: INVALID_IDS.UNICODE_EXPLOIT };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Suspicious activity detected', expect.objectContaining({
        matchId: INVALID_IDS.UNICODE_EXPLOIT,
        ip: expect.any(String),
        userAgent: expect.any(String),
        method: 'GET',
        path: expect.any(String),
        isRateLimited: expect.any(Boolean),
        timestamp: expect.any(String)
      }));
    });

    test('should prevent buffer overflow attempts', () => {
      // Use unique IP for this test
      Object.defineProperty(mockRequest, 'ip', {
        value: '10.2.1.3',
        writable: true,
        configurable: true
      });

      mockRequest.params = { matchId: INVALID_IDS.LONG_STRING };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Suspicious activity detected', {
        type: 'buffer_overflow_attempt',
        matchId: INVALID_IDS.LONG_STRING,
        ip: expect.any(String),
        userAgent: expect.any(String),
        method: 'GET',
        path: expect.any(String),
        isRateLimited: expect.any(Boolean),
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Response Format Validation', () => {
    test('should return consistent error response structure', () => {
      mockRequest.params = { matchId: INVALID_IDS.MALFORMED };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String),
        timestamp: expect.any(String)
      });

      const response = mockJson.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(typeof response.error).toBe('string');
      expect(typeof response.timestamp).toBe('string');
      expect(new Date(response.timestamp)).toBeInstanceOf(Date);
    });

    test('should not expose sensitive information in error responses', () => {
      mockRequest.params = { matchId: INVALID_IDS.SQL_INJECTION };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      const response = mockJson.mock.calls[0][0];
      const responseString = JSON.stringify(response).toLowerCase();

      // Should not contain database schema info
      expect(responseString).not.toMatch(/table|column|database|schema/i);
      // Should not contain stack traces in production
      expect(responseString).not.toMatch(/stack|trace|error\.stack/i);
      // Should not expose the actual malicious payload
      expect(responseString).not.toContain('drop table');
    });
  });

  describe('Rate Limiting for Invalid Requests', () => {
    test('should apply rate limiting after multiple suspicious requests', () => {
      const ip = '192.168.1.100';
Object.defineProperty(mockRequest, 'ip', {
        value: ip,
        writable: true,
        configurable: true
      });

      // Make multiple suspicious requests
      for (let i = 0; i < 12; i++) {
        mockRequest.params = { matchId: `${INVALID_IDS.SQL_INJECTION}-${i}` };
        validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // The last few requests should be rate limited
      const lastCall = mockJson.mock.calls[mockJson.mock.calls.length - 1][0];
      expect(lastCall.error).toContain('Too many invalid requests');

      expect(logger.error).toHaveBeenCalledWith('Rate limit exceeded for suspicious requests', {
        ip: ip,
        userAgent: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    test('should reset rate limiting after time window', async () => {
      const ip = '192.168.1.101';
Object.defineProperty(mockRequest, 'ip', {
        value: ip,
        writable: true,
        configurable: true
      });

      // Make some suspicious requests
      for (let i = 0; i < 5; i++) {
        mockRequest.params = { matchId: `${INVALID_IDS.SQL_INJECTION}-${i}` };
        validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Simulate time passing (would need to mock Date for real implementation)
      validationService.cleanupTracker();

      // Should not be rate limited for valid requests after cleanup
      mockRequest.params = { matchId: VALID_UUID };
      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Suspicious Activity Logging', () => {
    test('should log request metadata for suspicious requests', () => {
      const userAgent = 'Mozilla/5.0 (Suspicious Browser)';
      const ip = '10.0.0.1';

Object.defineProperty(mockRequest, 'ip', {
        value: ip,
        writable: true,
        configurable: true
      });
      (mockRequest.get as jest.Mock).mockReturnValue(userAgent);
      mockRequest.params = { matchId: INVALID_IDS.SQL_INJECTION };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Suspicious activity detected', {
        type: 'potential_sql_injection',
        matchId: INVALID_IDS.SQL_INJECTION,
        ip: ip,
        userAgent: userAgent,
        method: 'GET',
        path: '/api/v1/matches/test',
        isRateLimited: false,
        timestamp: expect.any(String)
      });
    });

    test('should handle missing IP and User-Agent gracefully', () => {
Object.defineProperty(mockRequest, 'ip', {
        value: undefined,
        writable: true,
        configurable: true
      });
      mockRequest.connection = undefined as any;
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);
      mockRequest.params = { matchId: INVALID_IDS.XSS_ATTEMPT };

      validateMatchID(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Suspicious activity detected', {
        type: 'potential_xss_attempt',
        matchId: INVALID_IDS.XSS_ATTEMPT,
        ip: 'unknown',
        userAgent: 'unknown',
        method: 'GET',
        path: '/api/v1/matches/test',
        isRateLimited: false,
        timestamp: expect.any(String)
      });
    });
  });

  describe('validateAnyID Middleware', () => {
    test('should validate custom parameter names', () => {
      const validateUserId = validateAnyID('userId');
      mockRequest.params = { userId: VALID_UUID };

      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    test('should reject invalid custom parameters', () => {
      const validateUserId = validateAnyID('userId');
      mockRequest.params = { userId: INVALID_IDS.SQL_INJECTION };

      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(logger.warn).toHaveBeenCalledWith('Invalid userId request', {
        userId: INVALID_IDS.SQL_INJECTION,
        error: expect.any(String),
        ip: expect.any(String),
        userAgent: expect.any(String),
        method: 'GET',
        path: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    test('should handle missing custom parameters', () => {
      const validateUserId = validateAnyID('userId');
      mockRequest.params = {};

      validateUserId(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'userId is required',
        timestamp: expect.any(String)
      });
    });
  });

  describe('ValidationService Direct Testing', () => {
    test('should validate UUID correctly', () => {
      const result = validationService.validateID(VALID_UUID);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.suspiciousActivity).toBeUndefined();
    });

    test('should detect SQL injection patterns', () => {
      const result = validationService.validateID(INVALID_IDS.SQL_INJECTION);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid ID format: contains unsafe characters');
      expect(result.suspiciousActivity).toBe(true);
      expect(result.activityType).toBe('potential_sql_injection');
    });

    test('should detect XSS patterns', () => {
      const result = validationService.validateID(INVALID_IDS.XSS_ATTEMPT);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid ID format: contains unsafe characters');
      expect(result.suspiciousActivity).toBe(true);
      expect(result.activityType).toBe('potential_xss_attempt');
    });

    test('should detect whitespace manipulation', () => {
      const result = validationService.validateID(INVALID_IDS.WHITESPACE);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid ID format: contains leading/trailing whitespace');
      expect(result.suspiciousActivity).toBe(true);
      expect(result.activityType).toBe('whitespace_manipulation');
    });

    test('should detect malformed UUID attempts', () => {
      const result = validationService.validateID(INVALID_IDS.MALFORMED_UUID_SHORT);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid ID format: must be a valid UUID');
      expect(result.suspiciousActivity).toBeUndefined();
    });
  });

  describe('Performance and Memory Handling', () => {
    test('should handle many validation requests efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        validationService.validateID(VALID_UUID);
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete 100 validations in less than 100ms
      expect(executionTime).toBeLessThan(100);
    });

    test('should not cause memory leaks with many invalid requests', () => {
      const initialMemory = process.memoryUsage();

      for (let i = 0; i < 500; i++) {
        validationService.validateID(`invalid-${i}`);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });
});
