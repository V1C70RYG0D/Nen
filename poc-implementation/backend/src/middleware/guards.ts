import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler.js';

// Define user roles hierarchy
export const USER_ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',  
  ADMIN: 'admin',
  DEVELOPER: 'developer'
} as const;

// Role hierarchy for permissions (higher number = more permissions)
const ROLE_HIERARCHY = {
  [USER_ROLES.USER]: 1,
  [USER_ROLES.MODERATOR]: 2,
  [USER_ROLES.ADMIN]: 3,
  [USER_ROLES.DEVELOPER]: 4
};

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    publicKey: string;
    address: string;
    walletAddress: string;
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
export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw createError('Authentication required', 401);
      }

      const userRole = req.user.role || USER_ROLES.USER;
      const userRoleLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
      const requiredRoleLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0;

      // Check if user has sufficient role level
      if (userRoleLevel < requiredRoleLevel) {
        throw createError(`Access denied. Required role: ${requiredRole}`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Specific role guards for common use cases
 */
export const requireModerator = requireRole(USER_ROLES.MODERATOR);
export const requireAdmin = requireRole(USER_ROLES.ADMIN);
export const requireDeveloper = requireRole(USER_ROLES.DEVELOPER);

/**
 * Check if user owns resource or has admin privileges
 */
export const requireOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createError('Authentication required', 401);
      }

      const userRole = req.user.role || USER_ROLES.USER;
      const isAdmin = userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.DEVELOPER;
      
      // Get resource user ID from params, body, or query
      const resourceUserId = req.params[resourceUserIdField] || 
                            req.body[resourceUserIdField] || 
                            req.query[resourceUserIdField];

      // Check if user owns the resource or is admin
      if (!isAdmin && req.user.id !== resourceUserId) {
        throw createError('Access denied. You can only access your own resources.', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check multiple roles (OR logic)
 */
export const requireAnyRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createError('Authentication required', 401);
      }

      const userRole = req.user.role || USER_ROLES.USER;
      
      if (!roles.includes(userRole)) {
        throw createError(`Access denied. Required roles: ${roles.join(', ')}`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Feature flag based authorization
 */
export const requireFeature = (featureName: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // In production, this would check against a feature flag service
      const enabledFeatures = process.env.ENABLED_FEATURES?.split(',') || [];
      
      if (!enabledFeatures.includes(featureName)) {
        throw createError(`Feature '${featureName}' is not enabled`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Rate limiting based on user role
 */
export const roleBasedRateLimit = () => {
  const rateLimits = {
    [USER_ROLES.USER]: { requests: 100, window: 15 * 60 * 1000 }, // 100 requests per 15 minutes
    [USER_ROLES.MODERATOR]: { requests: 200, window: 15 * 60 * 1000 }, // 200 requests per 15 minutes  
    [USER_ROLES.ADMIN]: { requests: 500, window: 15 * 60 * 1000 }, // 500 requests per 15 minutes
    [USER_ROLES.DEVELOPER]: { requests: 1000, window: 15 * 60 * 1000 } // 1000 requests per 15 minutes
  };

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createError('Authentication required', 401);
      }

      const userRole = req.user.role || USER_ROLES.USER;
      const limit = rateLimits[userRole as keyof typeof rateLimits] || rateLimits[USER_ROLES.USER];

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': limit.requests.toString(),
        'X-RateLimit-Window': limit.window.toString()
      });

      // In production, implement actual rate limiting logic here
      // For now, just pass through
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate request based on user permissions
 */
export const validatePermissions = (permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createError('Authentication required', 401);
      }

      // Define role-based permissions
      const rolePermissions = {
        [USER_ROLES.USER]: [
          'read:profile',
          'update:profile', 
          'read:games',
          'create:games',
          'read:bets',
          'create:bets'
        ],
        [USER_ROLES.MODERATOR]: [
          'read:users',
          'moderate:games',
          'moderate:chat',
          'read:reports',
          'create:reports'
        ],
        [USER_ROLES.ADMIN]: [
          'read:all',
          'update:all',
          'delete:users',
          'manage:system',
          'read:analytics'
        ],
        [USER_ROLES.DEVELOPER]: [
          'read:all',
          'update:all', 
          'delete:all',
          'manage:all',
          'debug:all'
        ]
      };

      const userRole = req.user.role || USER_ROLES.USER;
      const userPermissions = rolePermissions[userRole as keyof typeof rolePermissions] || [];

      // Check if user has all required permissions
      const hasAllPermissions = permissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        throw createError(`Insufficient permissions. Required: ${permissions.join(', ')}`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
