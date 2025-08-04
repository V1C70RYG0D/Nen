"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UserController_1 = require("../../controllers/UserController");
const database_1 = __importDefault(require("../../models/database"));
jest.mock('../../models/database');
const mockDb = database_1.default;
describe('UserController', () => {
    let userController;
    let mockRequest;
    let mockResponse;
    let mockNext;
    beforeEach(() => {
        userController = new UserController_1.UserController();
        mockRequest = {
            user: { id: 'test-user-id' },
            body: {},
            query: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });
    describe('getProfile', () => {
        it('should return user profile successfully', async () => {
            const mockProfile = {
                id: 'test-user-id',
                username: 'testuser',
                email: 'test@example.com',
                level: 1,
                experience: 0,
                winRate: 0,
                totalGames: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockDb.getUserById.mockResolvedValue(mockProfile);
            await userController.getProfile(mockRequest, mockResponse);
            expect(mockDb.getUserById).toHaveBeenCalledWith('test-user-id');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockProfile,
                message: 'Profile retrieved successfully',
            });
        });
        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = undefined;
            await userController.getProfile(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'User not authenticated',
            });
        });
        it('should return 404 when user is not found', async () => {
            mockDb.getUserById.mockResolvedValue(null);
            await userController.getProfile(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'User not found',
            });
        });
        it('should handle database errors', async () => {
            mockDb.getUserById.mockRejectedValue(new Error('Database error'));
            await expect(userController.getProfile(mockRequest, mockResponse)).rejects.toThrow('Database error');
        });
    });
    describe('updateProfile', () => {
        it('should update user profile successfully', async () => {
            const updateData = { username: 'newusername' };
            mockRequest.body = updateData;
            const updatedProfile = {
                id: 'test-user-id',
                username: 'newusername',
                email: 'test@example.com',
                updatedAt: new Date(),
            };
            mockDb.updateUser.mockResolvedValue(updatedProfile);
            await userController.updateProfile(mockRequest, mockResponse);
            expect(mockDb.updateUser).toHaveBeenCalledWith('test-user-id', {
                username: 'newusername',
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = undefined;
            await userController.updateProfile(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });
    });
    describe('createUser', () => {
        it('should create a new user successfully', async () => {
            const userData = {
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'password123',
            };
            mockRequest.body = userData;
            const createdUser = {
                id: 'new-user-id',
                ...userData,
                level: 1,
                experience: 0,
                winRate: 0,
                totalGames: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockDb.createUser.mockResolvedValue(createdUser);
            await userController.createUser(mockRequest, mockResponse);
            expect(mockDb.createUser).toHaveBeenCalledWith({
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'password123',
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });
    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            mockDb.deleteUser.mockResolvedValue();
            await userController.deleteUser(mockRequest, mockResponse);
            expect(mockDb.deleteUser).toHaveBeenCalledWith('test-user-id');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: 'User deleted successfully',
            });
        });
        it('should return 401 when user is not authenticated', async () => {
            mockRequest.user = undefined;
            await userController.deleteUser(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });
    });
    describe('getStats', () => {
        it('should return user statistics', async () => {
            await userController.getStats(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    userId: 'test-user-id',
                    gamesPlayed: 0,
                    gamesWon: 0,
                    winRate: 0,
                    currentStreak: 0,
                    bestStreak: 0,
                    totalEarnings: 0,
                    rank: 'Beginner',
                    achievements: [],
                },
                message: 'Statistics retrieved successfully',
            });
        });
    });
    describe('getMatchHistory', () => {
        it('should return match history with pagination', async () => {
            mockRequest.query = { page: '2', limit: '10' };
            await userController.getMatchHistory(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    matches: [],
                    pagination: {
                        page: 2,
                        limit: 10,
                        total: 0,
                        pages: 0,
                    },
                },
                message: 'Match history retrieved successfully',
            });
        });
        it('should use default pagination values', async () => {
            await userController.getMatchHistory(mockRequest, mockResponse);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    matches: [],
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 0,
                        pages: 0,
                    },
                },
                message: 'Match history retrieved successfully',
            });
        });
    });
});
//# sourceMappingURL=UserController.test.js.map