"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
class ErrorHandler {
    static handleError(err) {
        const statusCode = err.status || 500;
        console.error(`[ERROR] ${statusCode} - ${err.message}`);
        // Here you could integrate with a monitoring service as well.
    }
}
exports.ErrorHandler = ErrorHandler;
exports.default = ErrorHandler;
//# sourceMappingURL=ErrorHandler.js.map