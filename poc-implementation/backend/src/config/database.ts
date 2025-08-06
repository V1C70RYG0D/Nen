import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

class Database {
  private static instance: Database;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
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
      
      logger.debug('Database query executed', {
        model: params.model,
        action: params.action,
        duration: `${duration}ms`,
      });
      
      return result;
    });
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  // User management methods
  async createUser(userData: {
    id?: string;
    username: string;
    email: string;
    address?: string;
    publicKey?: string;
    password?: string;
  }) {
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
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(userId: string, userData: {
    username?: string;
    email?: string;
    address?: string;
    publicKey?: string;
    experience?: number;
    winRate?: number;
    totalGames?: number;
  }) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: userData,
      });
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string) {
    try {
      return await this.prisma.user.delete({
        where: { id: userId },
      });
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async getUserByAddress(address: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { address },
      });
    } catch (error) {
      logger.error('Error getting user by address:', error);
      throw error;
    }
  }

  async getUserById(id: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  // Connection management
  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const getDatabase = (): Database => Database.getInstance();

// Export for backward compatibility
export { Database };
export default Database;
