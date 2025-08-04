"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const BaseController_1 = require("./BaseController");
const database_1 = __importDefault(require("../models/database"));
class UserController extends BaseController_1.BaseController {
    getProfile = this.asyncHandler(async (req, res) => {
        const userId = req.user?.id;
        if (!userId) {
            return this.sendError(res, 'User not authenticated', 401);
        }
        const profile = await database_1.default.getUserById(userId);
        if (!profile) {
            return this.sendError(res, 'User not found', 404);
        }
        this.sendSuccess(res, profile, 'Profile retrieved successfully');
    });
    updateProfile = this.asyncHandler(async (req, res) => {
        if (this.handleValidationErrors(req, res))
            return;
        const userId = req.user?.id;
        const { username, preferences } = req.body;
        if (!userId) {
            return this.sendError(res, 'User not authenticated', 401);
        }
        const updatedProfile = await database_1.default.updateUser(userId, {
            username,
        });
        this.sendSuccess(res, updatedProfile, 'Profile updated successfully');
    });
    getStats = this.asyncHandler(async (req, res) => {
        const userId = req.user?.id;
        if (!userId) {
            return this.sendError(res, 'User not authenticated', 401);
        }
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
    getMatchHistory = this.asyncHandler(async (req, res) => {
        const userId = req.user?.id;
        const { page = 1, limit = 20 } = req.query;
        if (!userId) {
            return this.sendError(res, 'User not authenticated', 401);
        }
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
    createUser = this.asyncHandler(async (req, res) => {
        if (this.handleValidationErrors(req, res))
            return;
        const { username, email, password } = req.body;
        const newUser = await database_1.default.createUser({
            username,
            email,
            password,
        });
        this.sendSuccess(res, newUser, 'User created successfully');
    });
    deleteUser = this.asyncHandler(async (req, res) => {
        const userId = req.user?.id;
        if (!userId) {
            return this.sendError(res, 'User not authenticated', 401);
        }
        await database_1.default.deleteUser(userId);
        this.sendSuccess(res, null, 'User deleted successfully');
    });
}
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map