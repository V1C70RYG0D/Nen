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
interface ValidationResult {
    isValid: boolean;
    error?: string;
    suspiciousActivity?: boolean;
    activityType?: string;
}
declare class IDValidationService {
    private suspiciousRequests;
    private readonly MAX_INVALID_REQUESTS;
    private readonly WINDOW_MS;
    /**
     * Validate ID format and detect potential security threats
     */
    validateID(id: string): ValidationResult;
    /**
     * Track suspicious requests from IP addresses
     */
    trackSuspiciousRequest(ip: string, pattern: string): boolean;
    /**
     * Clean up old tracking data
     */
    cleanupTracker(): void;
}
declare const validationService: IDValidationService;
/**
 * Express middleware for validating match IDs
 */
export declare const validateMatchID: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Middleware specifically for any ID parameter validation
 */
export declare const validateAnyID: (paramName: string) => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export { validationService };
//# sourceMappingURL=idValidation.d.ts.map