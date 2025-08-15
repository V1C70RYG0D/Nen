import { Pool, PoolClient } from 'pg';
export interface DatabaseConfig {
    connectionString: string;
    ssl?: boolean;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}
export declare function initializeDatabase(config?: DatabaseConfig): Promise<Pool>;
export declare function getDatabase(): Pool;
export declare function closeDatabase(): Promise<void>;
export declare function query<T = any>(text: string, params?: any[]): Promise<T[]>;
export declare function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
export declare function checkDatabaseHealth(): Promise<boolean>;
//# sourceMappingURL=database.d.ts.map