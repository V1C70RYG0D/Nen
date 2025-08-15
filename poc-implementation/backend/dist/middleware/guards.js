"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePermissions = exports.roleBasedRateLimit = exports.requireFeature = exports.requireAnyRole = exports.requireOwnershipOrAdmin = exports.requireDeveloper = exports.requireAdmin = exports.requireModerator = exports.requireRole = exports.USER_ROLES = void 0;
const errorHandler_js_1 = require("./errorHandler.js");
// Define user roles hierarchy
exports.USER_ROLES = {
    USER: 'user',
    MODERATOR: 'moderator',
    ADMIN: 'admin',
    DEVELOPER: 'developer'
};
// Role hierarchy for permissions (higher number = more permissions)
const ROLE_HIERARCHY = {
    [exports.USER_ROLES.USER]: 1,
    [exports.USER_ROLES.MODERATOR]: 2,
    [exports.USER_ROLES.ADMIN]: 3,
    [exports.USER_ROLES.DEVELOPER]: 4
};
/**
 * Role-based authorization guard
 * Checks if user has required role or higher in hierarchy
 */
const requireRole = (requiredRole) => {
    return (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                throw (0, errorHandler_js_1.createError)('Authentication required', 401);
            }
            const userRole = req.user.role || exports.USER_ROLES.USER;
            const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;
            const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 0;
            // Check if user has sufficient role level
            if (userRoleLevel < requiredRoleLevel) {
                throw (0, errorHandler_js_1.createError)(`Access denied. Required role: ${requiredRole}`, 403);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireRole = requireRole;
/**
 * Specific role guards for common use cases
 */
exports.requireModerator = (0, exports.requireRole)(exports.USER_ROLES.MODERATOR);
exports.requireAdmin = (0, exports.requireRole)(exports.USER_ROLES.ADMIN);
exports.requireDeveloper = (0, exports.requireRole)(exports.USER_ROLES.DEVELOPER);
/**
 * Check if user owns resource or has admin privileges
 */
const requireOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw (0, errorHandler_js_1.createError)('Authentication required', 401);
            }
            const userRole = req.user.role || exports.USER_ROLES.USER;
            const isAdmin = userRole === exports.USER_ROLES.ADMIN || userRole === exports.USER_ROLES.DEVELOPER;
            // Get resource user ID from params, body, or query
            const resourceUserId = req.params[resourceUserIdField] ||
                req.body[resourceUserIdField] ||
                req.query[resourceUserIdField];
            // Check if user owns the resource or is admin
            if (!isAdmin && req.user.id !== resourceUserId) {
                throw (0, errorHandler_js_1.createError)('Access denied. You can only access your own resources.', 403);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireOwnershipOrAdmin = requireOwnershipOrAdmin;
/**
 * Check multiple roles (OR logic)
 */
const requireAnyRole = (roles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw (0, errorHandler_js_1.createError)('Authentication required', 401);
            }
            const userRole = req.user.role || exports.USER_ROLES.USER;
            if (!roles.includes(userRole)) {
                throw (0, errorHandler_js_1.createError)(`Access denied. Required roles: ${roles.join(', ')}`, 403);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireAnyRole = requireAnyRole;
/**
 * Feature flag based authorization
 */
const requireFeature = (featureName) => {
    return (req, res, next) => {
        try {
            // In production, this would check against a feature flag service
            const enabledFeatures = process.env.ENABLED_FEATURES?.split(',') || [];
            if (!enabledFeatures.includes(featureName)) {
                throw (0, errorHandler_js_1.createError)(`Feature '${featureName}' is not enabled`, 403);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireFeature = requireFeature;
/**
 * Rate limiting based on user role
 */
const roleBasedRateLimit = () => {
    const rateLimits = {
        [exports.USER_ROLES.USER]: { requests: 100, window: 15 * 60 * 1000 }, // 100 requests per 15 minutes
        [exports.USER_ROLES.MODERATOR]: { requests: 200, window: 15 * 60 * 1000 }, // 200 requests per 15 minutes  
        [exports.USER_ROLES.ADMIN]: { requests: 500, window: 15 * 60 * 1000 }, // 500 requests per 15 minutes
        [exports.USER_ROLES.DEVELOPER]: { requests: 1000, window: 15 * 60 * 1000 } // 1000 requests per 15 minutes
    };
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw (0, errorHandler_js_1.createError)('Authentication required', 401);
            }
            const userRole = req.user.role || exports.USER_ROLES.USER;
            const limit = rateLimits[userRole] || rateLimits[exports.USER_ROLES.USER];
            // Set rate limit headers
            res.set({
                'X-RateLimit-Limit': limit.requests.toString(),
                'X-RateLimit-Window': limit.window.toString()
            });
            // In production, implement actual rate limiting logic here
            // For now, just pass through
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.roleBasedRateLimit = roleBasedRateLimit;
/**
 * Validate request based on user permissions
 */
const validatePermissions = (permissions) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw (0, errorHandler_js_1.createError)('Authentication required', 401);
            }
            // Define role-based permissions
            const rolePermissions = {
                [exports.USER_ROLES.USER]: [
                    'read:profile',
                    'update:profile',
                    'read:games',
                    'create:games',
                    'read:bets',
                    'create:bets'
                ],
                [exports.USER_ROLES.MODERATOR]: [
                    'read:users',
                    'moderate:games',
                    'moderate:chat',
                    'read:reports',
                    'create:reports'
                ],
                [exports.USER_ROLES.ADMIN]: [
                    'read:all',
                    'update:all',
                    'delete:users',
                    'manage:system',
                    'read:analytics'
                ],
                [exports.USER_ROLES.DEVELOPER]: [
                    'read:all',
                    'update:all',
                    'delete:all',
                    'manage:all',
                    'debug:all'
                ]
            };
            const userRole = req.user.role || exports.USER_ROLES.USER;
            const userPermissions = rolePermissions[userRole] || [];
            // Check if user has all required permissions
            const hasAllPermissions = permissions.every(permission => userPermissions.includes(permission));
            if (!hasAllPermissions) {
                throw (0, errorHandler_js_1.createError)(`Insufficient permissions. Required: ${permissions.join(', ')}`, 403);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validatePermissions = validatePermissions;
//# sourceMappingURL=guards.js.map