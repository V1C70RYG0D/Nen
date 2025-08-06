"use strict";
/**
 * User Controller

 *
 * Handles all user-related HTTP requests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const BaseController_1 = require("./BaseController");
const database_1 = __importDefault(require("../models/database"));
class UserController extends BaseController_1.BaseController {
    constructor() {
        super(...arguments);
        /**
         * Get user profile
         */
        this.getProfile = this.asyncHandler(async (req, res) => {
            const userId = req.user?.id;
            if (!userId) {
                return this.sendError(res, 'User not authenticated', 401);
            }
            // Real database operation
            const profile = await database_1.default.getUserById(userId);
            if (!profile) {
                return this.sendError(res, 'User not found', 404);
            }
            this.sendSuccess(res, profile, 'Profile retrieved successfully');
        });
        /**
         * Update user profile
         */
        this.updateProfile = this.asyncHandler(async (req, res) => {
            if (this.handleValidationErrors(req, res))
                return;
            const userId = req.user?.id;
            const { username, preferences } = req.body;
            if (!userId) {
                return this.sendError(res, 'User not authenticated', 401);
            }
            // Real database operation
            const updatedProfile = await database_1.default.updateUser(userId, {
                username,
                // preferences would be stored in a separate field/table
            });
            this.sendSuccess(res, updatedProfile, 'Profile updated successfully');
        });
        /**
         * Get user statistics
         */
        this.getStats = this.asyncHandler(async (req, res) => {
            const userId = req.user?.id;
            if (!userId) {
                return this.sendError(res, 'User not authenticated', 401);
            }
            // Implementation would aggregate from database
            const stats = {
                userId,
                gamesPlayed: 0,
                gamesWon: 0,
                winRate: 0,
                currentStreak: 0,
                bestStreak: 0,
                totalEarnings: 0,
                rank: 'Beginner',
                achievements: []
            };
            this.sendSuccess(res, stats, 'Statistics retrieved successfully');
        });
        /**
         * Get user's match history
         */
        this.getMatchHistory = this.asyncHandler(async (req, res) => {
            const userId = req.user?.id;
            const { page = 1, limit = 20 } = req.query;
            if (!userId) {
                return this.sendError(res, 'User not authenticated', 401);
            }
            // Implementation would paginate from database
            const history = {
                matches: [],
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: 0,
                    pages: 0
                }
            };
            this.sendSuccess(res, history, 'Match history retrieved successfully');
        });
        /**
         * Create a new user
         */
        this.createUser = this.asyncHandler(async (req, res) => {
            if (this.handleValidationErrors(req, res))
                return;
            const { username, email, password } = req.body;
            // Real database operation
            const newUser = await database_1.default.createUser({
                username,
                email,
                password,
            });
            this.sendSuccess(res, newUser, 'User created successfully');
        });
        /**
         * Delete user account
         */
        this.deleteUser = this.asyncHandler(async (req, res) => {
            const userId = req.user?.id;
            if (!userId) {
                return this.sendError(res, 'User not authenticated', 401);
            }
            // Real database operation
            await database_1.default.deleteUser(userId);
            this.sendSuccess(res, null, 'User deleted successfully');
        });
    }
}
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map