"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = exports.getDatabase = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
class Database {
    constructor() {
        this.prisma = new client_1.PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
            errorFormat: 'pretty',
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
        });
        // Add query logging middleware
        this.prisma.$use(async (params, next) => {
            const start = Date.now();
            const result = await next(params);
            const duration = Date.now() - start;
            logger_1.logger.debug('Database query executed', {
                model: params.model,
                action: params.action,
                duration: `${duration}ms`,
            });
            return result;
        });
    }
    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    getPrismaClient() {
        return this.prisma;
    }
    // User management methods
    async createUser(userData) {
        try {
            return await this.prisma.user.create({
                data: {
                    id: userData.id,
                    username: userData.username,
                    email: userData.email,
                    address: userData.address,
                    publicKey: userData.publicKey,
                    password: userData.password,
                },
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating user:', error);
            throw error;
        }
    }
    async updateUser(userId, userData) {
        try {
            return await this.prisma.user.update({
                where: { id: userId },
                data: userData,
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating user:', error);
            throw error;
        }
    }
    async deleteUser(userId) {
        try {
            return await this.prisma.user.delete({
                where: { id: userId },
            });
        }
        catch (error) {
            logger_1.logger.error('Error deleting user:', error);
            throw error;
        }
    }
    async getUserByAddress(address) {
        try {
            return await this.prisma.user.findUnique({
                where: { address },
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting user by address:', error);
            throw error;
        }
    }
    async getUserById(id) {
        try {
            return await this.prisma.user.findUnique({
                where: { id },
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting user by ID:', error);
            throw error;
        }
    }
    // Connection management
    async connect() {
        try {
            await this.prisma.$connect();
            logger_1.logger.info('Database connected successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to database:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await this.prisma.$disconnect();
            logger_1.logger.info('Database disconnected successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to disconnect from database:', error);
            throw error;
        }
    }
    // Health check
    async healthCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            logger_1.logger.error('Database health check failed:', error);
            return false;
        }
    }
}
exports.Database = Database;
// Export singleton instance
const getDatabase = () => Database.getInstance();
exports.getDatabase = getDatabase;
exports.default = Database;
//# sourceMappingURL=database.js.map