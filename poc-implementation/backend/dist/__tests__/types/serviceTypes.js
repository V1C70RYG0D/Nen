"use strict";
/**
 * Service Type Definitions for Testing
 * Ensures mock implementations match actual service interfaces
 * Following GI guidelines for real implementations and proper typing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceTestError = exports.AIServiceTestError = exports.DatabaseTestError = exports.ServiceTestError = void 0;
// Error types for consistent error handling
class ServiceTestError extends Error {
    constructor(message, serviceName, operation, originalError) {
        super(message);
        this.serviceName = serviceName;
        this.operation = operation;
        this.originalError = originalError;
        this.name = 'ServiceTestError';
    }
}
exports.ServiceTestError = ServiceTestError;
class DatabaseTestError extends ServiceTestError {
    constructor(message, operation, originalError) {
        super(message, 'Database', operation, originalError);
        this.name = 'DatabaseTestError';
    }
}
exports.DatabaseTestError = DatabaseTestError;
class AIServiceTestError extends ServiceTestError {
    constructor(message, operation, originalError) {
        super(message, 'AIService', operation, originalError);
        this.name = 'AIServiceTestError';
    }
}
exports.AIServiceTestError = AIServiceTestError;
class ComplianceTestError extends ServiceTestError {
    constructor(message, operation, originalError) {
        super(message, 'ComplianceService', operation, originalError);
        this.name = 'ComplianceTestError';
    }
}
exports.ComplianceTestError = ComplianceTestError;
//# sourceMappingURL=serviceTypes.js.map