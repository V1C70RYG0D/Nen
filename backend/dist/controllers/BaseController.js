"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseController = void 0;
const express_validator_1 = require("express-validator");
class BaseController {
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
    sendSuccess(res, data, message) {
        res.json({
            success: true,
            message: message || 'Operation successful',
            data
        });
    }
    sendError(res, message, statusCode = 500, details) {
        res.status(statusCode).json({
            success: false,
            message,
            details
        });
    }
    asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}
exports.BaseController = BaseController;
//# sourceMappingURL=BaseController.js.map