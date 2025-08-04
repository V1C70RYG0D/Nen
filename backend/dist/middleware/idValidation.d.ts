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
    validateID(id: string): ValidationResult;
    trackSuspiciousRequest(ip: string, pattern: string): boolean;
    cleanupTracker(): void;
}
declare const validationService: IDValidationService;
export declare const validateMatchID: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const validateAnyID: (paramName: string) => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export { validationService };
//# sourceMappingURL=idValidation.d.ts.map