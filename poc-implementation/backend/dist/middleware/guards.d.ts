import { Request, Response, NextFunction } from 'express';
export declare const USER_ROLES: {
    readonly USER: "user";
    readonly MODERATOR: "moderator";
    readonly ADMIN: "admin";
    readonly DEVELOPER: "developer";
};
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        publicKey: string;
        address: string;
        username?: string;
        email?: string;
        wallet?: string;
        role?: string;
    };
}
/**
 * Role-based authorization guard
 * Checks if user has required role or higher in hierarchy
 */
export declare const requireRole: (requiredRole: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Specific role guards for common use cases
 */
export declare const requireModerator: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireDeveloper: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Check if user owns resource or has admin privileges
 */
export declare const requireOwnershipOrAdmin: (resourceUserIdField?: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Check multiple roles (OR logic)
 */
export declare const requireAnyRole: (roles: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Feature flag based authorization
 */
export declare const requireFeature: (featureName: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Rate limiting based on user role
 */
export declare const roleBasedRateLimit: () => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Validate request based on user permissions
 */
export declare const validatePermissions: (permissions: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=guards.d.ts.map