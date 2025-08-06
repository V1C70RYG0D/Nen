/**
 * Enhanced Winston Logger with Error Rate Monitoring
 * Structured logging with Prometheus metrics integration
 */
import { Counter, Histogram } from 'prom-client';
export declare const errorMetrics: {
    totalErrors: Counter<"level" | "service" | "endpoint" | "error_type">;
    errorRate: Histogram<"service" | "time_window">;
    logVolume: Counter<"level" | "service">;
};
export declare class EnhancedLogger {
    private winston;
    private service;
    constructor(service?: string);
    private updateMetrics;
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, error?: Error | any, meta?: any): void;
    apiError(endpoint: string, error: Error, meta?: any): void;
    databaseError(operation: string, error: Error, meta?: any): void;
    authError(action: string, error: Error, meta?: any): void;
    validationError(field: string, value: any, reason: string, meta?: any): void;
    recordErrorRate(timeWindow: string, rate: number): void;
}
export declare const logger: EnhancedLogger;
export declare const createLogger: (service: string) => EnhancedLogger;
//# sourceMappingURL=logger.d.ts.map