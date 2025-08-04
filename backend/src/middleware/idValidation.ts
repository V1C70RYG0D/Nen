/**
 * ID Validation Middleware
 *
 * Provides robust validation for IDs with security enhancements:
 * - UUID format validation
 * - SQL injection prevention
 * - XSS attack prevention
 * - Rate limiting for invalid requests
 * - Suspicious activity logging
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4, validate as validateUUID } from 'uuid';

interface ValidationResult {
  isValid: boolean;
  error?: string;
  suspiciousActivity?: boolean;
  activityType?: string;
}

interface SuspiciousRequestTracker {
  [ip: string]: {
    count: number;
    lastRequest: Date;
    patterns: string[];
  };
}

class IDValidationService {
  private suspiciousRequests: SuspiciousRequestTracker = {};
  private readonly MAX_INVALID_REQUESTS = 10;
  private readonly WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Validate ID format and detect potential security threats
   */
  validateID(id: string): ValidationResult {
    if (!id) {
      return {
        isValid: false,
        error: 'ID is required'
      };
    }

    // Remove URL encoding safely
    let decodedId: string;
    try {
      decodedId = decodeURIComponent(id);
    } catch (error) {
      // If decoding fails, use original ID (potential attack)
      decodedId = id;
    }

    // Check for basic format issues
    if (decodedId.trim() !== decodedId) {
      return {
        isValid: false,
        error: 'Invalid ID format: contains leading/trailing whitespace',
        suspiciousActivity: true,
        activityType: 'whitespace_manipulation'
      };
    }

    // Check for overly long IDs (potential buffer overflow attempt)
    if (decodedId.length > 100) {
      return {
        isValid: false,
        error: 'Invalid ID format: too long',
        suspiciousActivity: true,
        activityType: 'buffer_overflow_attempt'
      };
    }

    // Check for SQL injection patterns (more specific patterns first)
    const sqlPatterns = [
      /(union\s+select)/i,
      /(drop\s+table)/i,
      /(delete\s+from)/i,
      /(insert\s+into)/i,
      /(update\s+.*set)/i,
      /(\s+or\s+.*=)/i,
      /('|(\\')|(;|\\;))/i,
      /(--|\#|\*\/)/i
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(decodedId)) {
        return {
          isValid: false,
          error: 'Invalid ID format: contains unsafe characters',
          suspiciousActivity: true,
          activityType: 'potential_sql_injection'
        };
      }
    }

    // Check for XSS patterns (check for XSS before SQL patterns for certain cases)
    const xssPatterns = [
      /<script[^>]*>/i,
      /<\/script>/i,
      /javascript:/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i,
      /on\w+\s*=/i
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(decodedId)) {
        return {
          isValid: false,
          error: 'Invalid ID format: contains unsafe characters',
          suspiciousActivity: true,
          activityType: 'potential_xss_attempt'
        };
      }
    }

    // Check for null bytes and control characters
    if (/[\x00-\x1f\x7f-\x9f]/.test(decodedId)) {
      return {
        isValid: false,
        error: 'Invalid ID format: contains control characters',
        suspiciousActivity: true,
        activityType: 'control_character_injection'
      };
    }

    // Check for Unicode exploits
    if (/[\u0000-\u001f\u007f-\u009f\ufeff\ufff0-\uffff]/.test(decodedId)) {
      return {
        isValid: false,
        error: 'Invalid ID format: contains invalid Unicode characters',
        suspiciousActivity: true,
        activityType: 'unicode_exploit'
      };
    }

    // Validate UUID format
    if (!validateUUID(decodedId)) {
      // Check if it looks like an attempted UUID but is malformed
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(decodedId.replace(/[^0-9a-f-]/gi, ''))) {
        return {
          isValid: false,
          error: 'Invalid ID format: malformed UUID',
          suspiciousActivity: true,
          activityType: 'malformed_uuid_attempt'
        };
      }

      return {
        isValid: false,
        error: 'Invalid ID format: must be a valid UUID'
      };
    }

    return { isValid: true };
  }

  /**
   * Track suspicious requests from IP addresses
   */
  trackSuspiciousRequest(ip: string, pattern: string): boolean {
    const now = new Date();

    if (!this.suspiciousRequests[ip]) {
      this.suspiciousRequests[ip] = {
        count: 0,
        lastRequest: now,
        patterns: []
      };
    }

    const tracker = this.suspiciousRequests[ip];

    // Reset counter if window has passed
    if (now.getTime() - tracker.lastRequest.getTime() > this.WINDOW_MS) {
      tracker.count = 0;
      tracker.patterns = [];
    }

    tracker.count++;
    tracker.lastRequest = now;
    tracker.patterns.push(pattern);

    return tracker.count > this.MAX_INVALID_REQUESTS;
  }

  /**
   * Clean up old tracking data
   */
  cleanupTracker(): void {
    const now = new Date();
    Object.keys(this.suspiciousRequests).forEach(ip => {
      const tracker = this.suspiciousRequests[ip];
      if (now.getTime() - tracker.lastRequest.getTime() > this.WINDOW_MS * 2) {
        delete this.suspiciousRequests[ip];
      }
    });
  }
}

const validationService = new IDValidationService();

// Clean up tracker every 10 minutes
setInterval(() => {
  validationService.cleanupTracker();
}, 10 * 60 * 1000);

/**
 * Express middleware for validating match IDs
 */
export const validateMatchID = (req: Request, res: Response, next: NextFunction) => {
  const matchId = req.params.matchId || req.params.id;

  if (!matchId) {
    return res.status(400).json({
      success: false,
      error: 'Match ID is required',
      timestamp: new Date().toISOString()
    });
  }

  const validation = validationService.validateID(matchId);
  const clientIP = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  if (!validation.isValid) {
    // Log the invalid request
    logger.warn('Invalid match ID request', {
      matchId,
      error: validation.error,
      ip: clientIP,
      userAgent,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    });

    // Handle suspicious activity
    if (validation.suspiciousActivity) {
      const isRateLimited = validationService.trackSuspiciousRequest(
        clientIP,
        validation.activityType || 'unknown'
      );

      logger.warn('Suspicious activity detected', {
        type: validation.activityType,
        matchId,
        ip: clientIP,
        userAgent,
        method: req.method,
        path: req.path,
        isRateLimited,
        timestamp: new Date().toISOString()
      });

      if (isRateLimited) {
        logger.error('Rate limit exceeded for suspicious requests', {
          ip: clientIP,
          userAgent,
          timestamp: new Date().toISOString()
        });

        return res.status(429).json({
          success: false,
          error: 'Too many invalid requests. Please try again later.',
          timestamp: new Date().toISOString()
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: validation.error,
      timestamp: new Date().toISOString()
    });
  }

  // Add validated ID to request for downstream use
  req.params.validatedMatchId = matchId;

  return next();
};

/**
 * Middleware specifically for any ID parameter validation
 */
export const validateAnyID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];

    if (!id) {
      return res.status(400).json({
        success: false,
        error: `${paramName} is required`,
        timestamp: new Date().toISOString()
      });
    }

    const validation = validationService.validateID(id);
    const clientIP = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    if (!validation.isValid) {
      logger.warn(`Invalid ${paramName} request`, {
        [paramName]: id,
        error: validation.error,
        ip: clientIP,
        userAgent,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString()
      });

      if (validation.suspiciousActivity) {
        logger.warn('Suspicious activity detected', {
          type: validation.activityType,
          [paramName]: id,
          ip: clientIP,
          userAgent,
          method: req.method,
          path: req.path,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(400).json({
        success: false,
        error: validation.error,
        timestamp: new Date().toISOString()
      });
    }

    return next();
  };
};

export { validationService };
