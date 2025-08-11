"use strict";
/**
 * API Routes Index - Centralized API route exports
 * Restructured from routes/ to api/ directory for better organization
 *
 * New API Structure:
 * - /api/auth       - Authentication endpoints
 * - /api/betting    - Betting and wagering endpoints
 * - /api/matches    - Match creation and management endpoints
 * - /api/users      - User profile and stats endpoints
 * - /api/analytics  - Analytics and metrics endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setGameService = exports.setBettingService = exports.devnetRoutes = exports.analyticsRoutes = exports.usersRoutes = exports.matchesRoutes = exports.bettingRoutes = exports.authRoutes = void 0;
var auth_1 = require("./auth");
Object.defineProperty(exports, "authRoutes", { enumerable: true, get: function () { return __importDefault(auth_1).default; } });
var betting_1 = require("./betting");
Object.defineProperty(exports, "bettingRoutes", { enumerable: true, get: function () { return __importDefault(betting_1).default; } });
var matches_1 = require("./matches");
Object.defineProperty(exports, "matchesRoutes", { enumerable: true, get: function () { return __importDefault(matches_1).default; } });
var users_1 = require("./users");
Object.defineProperty(exports, "usersRoutes", { enumerable: true, get: function () { return __importDefault(users_1).default; } });
var analytics_1 = require("./analytics");
Object.defineProperty(exports, "analyticsRoutes", { enumerable: true, get: function () { return __importDefault(analytics_1).default; } });
var devnet_1 = require("./devnet");
Object.defineProperty(exports, "devnetRoutes", { enumerable: true, get: function () { return __importDefault(devnet_1).default; } });
// Export service functions for dependency injection
var betting_2 = require("./betting");
Object.defineProperty(exports, "setBettingService", { enumerable: true, get: function () { return betting_2.setBettingService; } });
var matches_2 = require("./matches");
Object.defineProperty(exports, "setGameService", { enumerable: true, get: function () { return matches_2.setGameService; } });
//# sourceMappingURL=index.js.map