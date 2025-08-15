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
export { default as authRoutes } from './auth';
export { default as bettingRoutes } from './betting';
export { default as matchesRoutes } from './matches';
export { default as usersRoutes } from './users';
export { default as analyticsRoutes } from './analytics';
export { default as devnetRoutes } from './devnet';
export { setBettingService } from './betting';
export { setGameService } from './matches';
//# sourceMappingURL=index.d.ts.map