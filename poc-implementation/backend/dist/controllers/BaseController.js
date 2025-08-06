"use strict";
/**
 * Base Controller Class

 *
 * Provides common functionality for all controllers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseController = void 0;
const express_validator_1 = require("express-validator");
class BaseController {
    /**
     * Handle validation errors from express-validator
     */
    handleValidationErrors(req, res) {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
            return true;
        }
        return false;
    }
    /**
     * Send success response
     */
    sendSuccess(res, data, message) {
        res.json({
            success: true,
            message: message || 'Operation successful',
            data
        });
    }
    /**
     * Send error response
     */
    sendError(res, message, statusCode = 500, details) {
        res.status(statusCode).json({
            success: false,
            message,
            details
        });
    }
    /**
     * Async error handler wrapper
     */
    asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}
exports.BaseController = BaseController;
//# sourceMappingURL=BaseController.js.map