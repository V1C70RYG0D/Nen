import { PrismaClient } from '@prisma/client';
declare class Database {
    private static instance;
    private prisma;
    private constructor();
    static getInstance(): Database;
    getPrismaClient(): PrismaClient;
    createUser(userData: {
        id?: string;
        username: string;
        email: string;
        address?: string;
        publicKey?: string;
        password?: string;
    }): Promise<any>;
    updateUser(userId: string, userData: {
        username?: string;
        email?: string;
        address?: string;
        publicKey?: string;
        experience?: number;
        winRate?: number;
        totalGames?: number;
    }): Promise<any>;
    deleteUser(userId: string): Promise<any>;
    getUserByAddress(address: string): Promise<any>;
    getUserById(id: string): Promise<any>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<boolean>;
}
export declare const getDatabase: () => Database;
export { Database };
export default Database;
//# sourceMappingURL=database.d.ts.map