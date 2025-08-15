"use strict";
/**
 * Comprehensive Service Interfaces for Nen Platform
 *
 * This file defines TypeScript interfaces for all platform services
 * following the rules for production-ready implementation with proper error handling,
 * security, and scalability considerations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceError = exports.NotificationStatus = exports.NotificationChannel = exports.NotificationPriority = exports.NotificationType = exports.ApplicationStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["MODERATOR"] = "moderator";
    UserRole["ADMIN"] = "admin";
    UserRole["DEVELOPER"] = "developer";
    UserRole["SUPPORT"] = "support";
})(UserRole || (exports.UserRole = UserRole = {}));
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["ACTIVE"] = "active";
    ApplicationStatus["INACTIVE"] = "inactive";
    ApplicationStatus["SUSPENDED"] = "suspended";
    ApplicationStatus["PENDING_APPROVAL"] = "pending_approval";
    ApplicationStatus["REJECTED"] = "rejected";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["SYSTEM"] = "system";
    NotificationType["GAME_RESULT"] = "game_result";
    NotificationType["BET_RESULT"] = "bet_result";
    NotificationType["ACCOUNT_SECURITY"] = "account_security";
    NotificationType["ACHIEVEMENT"] = "achievement";
    NotificationType["SOCIAL"] = "social";
    NotificationType["PROMOTION"] = "promotion";
    NotificationType["UPDATE"] = "update";
    NotificationType["WARNING"] = "warning";
    NotificationType["ERROR"] = "error";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "low";
    NotificationPriority["MEDIUM"] = "medium";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["CRITICAL"] = "critical";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["IN_APP"] = "in_app";
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["PUSH"] = "push";
    NotificationChannel["WEBHOOK"] = "webhook";
    NotificationChannel["DISCORD"] = "discord";
    NotificationChannel["TELEGRAM"] = "telegram";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var NotificationStatus;
(function (NotificationStatus) {
    NotificationStatus["PENDING"] = "pending";
    NotificationStatus["SCHEDULED"] = "scheduled";
    NotificationStatus["SENT"] = "sent";
    NotificationStatus["DELIVERED"] = "delivered";
    NotificationStatus["READ"] = "read";
    NotificationStatus["FAILED"] = "failed";
    NotificationStatus["CANCELLED"] = "cancelled";
    NotificationStatus["EXPIRED"] = "expired";
})(NotificationStatus || (exports.NotificationStatus = NotificationStatus = {}));
class ServiceError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = 'ServiceError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date();
    }
}
exports.ServiceError = ServiceError;
//# sourceMappingURL=ServiceInterfaces.js.map