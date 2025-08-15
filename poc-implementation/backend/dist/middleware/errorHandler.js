"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('Error Stack:', err.stack);
    // Handle JSON syntax errors
    if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({
            success: false,
            message: 'Invalid JSON format',
            error: 'Malformed JSON in request body'
        });
        return;
    }
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal Server Error';
    res.status(statusCode).json({
        success: false,
        message,
        error: {
            status: statusCode,
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method
        }
    });
};
exports.errorHandler = errorHandler;
const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
exports.createError = createError;
//# sourceMappingURL=errorHandler.js.map