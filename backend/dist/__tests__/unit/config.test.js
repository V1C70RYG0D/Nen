"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../config");
describe('ConfigManager', () => {
    let originalEnv;
    beforeEach(() => {
        originalEnv = { ...process.env };
    });
    afterEach(() => {
        process.env = originalEnv;
    });
    describe('Environment Configuration', () => {
        it('should use environment variables when provided', () => {
            process.env.PORT = '4000';
            process.env.NODE_ENV = 'test';
            process.env.FRONTEND_URL = 'https://app.example.com';
            const config = new config_1.ConfigManager();
            expect(config.server.port).toBe(4000);
            expect(config.server.environment).toBe('test');
            expect(config.externalServices.frontendUrl).toBe('https://app.example.com');
        });
        it('should handle missing optional environment variables gracefully', () => {
            process.env.NODE_ENV = 'development';
            delete process.env.REDIS_PASSWORD;
            const config = new config_1.ConfigManager();
            expect(config.redis.password).toBeUndefined();
        });
        it('should provide secure defaults for development', () => {
            process.env.NODE_ENV = 'development';
            delete process.env.JWT_SECRET;
            const config = new config_1.ConfigManager();
            expect(config.security.jwtSecret).toBeDefined();
            expect(config.security.jwtSecret).not.toBe('');
        });
        it('should require JWT_SECRET in production', () => {
            process.env.NODE_ENV = 'production';
            delete process.env.JWT_SECRET;
            expect(() => {
                new config_1.ConfigManager();
            }).toThrow('Missing required environment variables: JWT_SECRET');
        });
    });
    describe('Database Configuration', () => {
        it('should build database URL from components', () => {
            process.env.DB_HOST = 'db.example.com';
            process.env.DB_PORT = '5433';
            process.env.DB_NAME = 'testdb';
            process.env.DB_USERNAME = 'testuser';
            process.env.DB_PASSWORD = 'testpass';
            const config = new config_1.ConfigManager();
            expect(config.database.host).toBe('db.example.com');
            expect(config.database.port).toBe(5433);
            expect(config.database.database).toBe('testdb');
            expect(config.database.username).toBe('testuser');
            expect(config.database.password).toBe('testpass');
        });
    });
    describe('Security Configuration', () => {
        it('should configure CORS properly', () => {
            process.env.CORS_ORIGIN = 'https://trusted-domain.com';
            process.env.CORS_CREDENTIALS = 'true';
            const config = new config_1.ConfigManager();
            expect(config.security.corsOrigin).toBe('https://trusted-domain.com');
            expect(config.security.corsCredentials).toBe(true);
        });
        it('should set rate limiting defaults', () => {
            const config = new config_1.ConfigManager();
            expect(config.security.rateLimitWindowMs).toBeGreaterThan(0);
            expect(config.security.rateLimitMaxRequests).toBeGreaterThan(0);
        });
    });
    describe('Utility Methods', () => {
        it('should detect production environment', () => {
            process.env.NODE_ENV = 'production';
            const config = new config_1.ConfigManager();
            expect(config.isProduction()).toBe(true);
            expect(config.isDevelopment()).toBe(false);
        });
        it('should detect development environment', () => {
            process.env.NODE_ENV = 'development';
            const config = new config_1.ConfigManager();
            expect(config.isProduction()).toBe(false);
            expect(config.isDevelopment()).toBe(true);
        });
        it('should return complete configuration object', () => {
            const config = new config_1.ConfigManager();
            const fullConfig = config.getConfig();
            expect(fullConfig).toHaveProperty('database');
            expect(fullConfig).toHaveProperty('redis');
            expect(fullConfig).toHaveProperty('solana');
            expect(fullConfig).toHaveProperty('security');
            expect(fullConfig).toHaveProperty('server');
            expect(fullConfig).toHaveProperty('externalServices');
            expect(fullConfig).toHaveProperty('logging');
        });
    });
    describe('Error Handling', () => {
        it('should throw error for missing required environment variable in production', () => {
            process.env.NODE_ENV = 'production';
            delete process.env.FRONTEND_URL;
            delete process.env.AI_SERVICE_URL;
            expect(() => {
                new config_1.ConfigManager();
            }).toThrow();
        });
    });
});
//# sourceMappingURL=config.test.js.map