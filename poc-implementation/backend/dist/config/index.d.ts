/**
 * Configuration Management for Nen Platform

 */
interface DatabaseConfig {
    url: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
}
interface RedisConfig {
    url: string;
    host: string;
    port: number;
    password?: string;
}
interface SolanaConfig {
    network: string;
    rpcUrl: string;
    programId: string;
    commitment: string;
}
interface SecurityConfig {
    jwtSecret: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    corsOrigin: string;
    corsCredentials: boolean;
}
interface ServerConfig {
    port: number;
    wsPort: number;
    environment: string;
    host: string;
    apiTimeout: number;
    websocketTimeout: number;
    metricsEnabled: boolean;
    metricsPath: string;
}
interface ExternalServicesConfig {
    aiServiceUrl: string;
    magicBlockApiKey: string;
    magicBlockEndpoint: string;
    frontendUrl: string;
}
interface AIConfig {
    defaultDifficulty: string;
    serviceTimeout: number;
    maxConcurrentRequests: number;
}
interface APIConfig {
    defaultPageSize: number;
    maxPageSize: number;
    requestTimeout: number;
}
export declare class ConfigManager {
    private static instance;
    readonly database: DatabaseConfig;
    readonly redis: RedisConfig;
    readonly solana: SolanaConfig;
    readonly security: SecurityConfig;
    readonly server: ServerConfig;
    readonly externalServices: ExternalServicesConfig;
    readonly ai: AIConfig;
    readonly api: APIConfig;
    readonly logging: {
        level: string;
        filePath: string;
        format: string;
    };
    private constructor();
    static getInstance(): ConfigManager;
    private validateRequiredEnvVars;
    private getRequiredEnv;
    private buildDatabaseUrl;
    private buildRedisUrl;
    private generateSecureDefault;
    isProduction(): boolean;
    isDevelopment(): boolean;
    getConfig(): {
        database: DatabaseConfig;
        redis: RedisConfig;
        solana: SolanaConfig;
        security: SecurityConfig;
        server: ServerConfig;
        externalServices: ExternalServicesConfig;
        logging: {
            level: string;
            filePath: string;
            format: string;
        };
    };
}
export declare const config: ConfigManager;
export default config;
//# sourceMappingURL=index.d.ts.map