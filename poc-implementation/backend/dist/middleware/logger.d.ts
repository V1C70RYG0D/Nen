/**
 * Logger Middleware
 * Centralized logging for the Nen Platform backend
 */
interface LogData {
    [key: string]: any;
}
declare class Logger {
    private logger;
    constructor();
    private log;
    info(message: string, data?: LogData): void;
    error(message: string, data?: LogData): void;
    warn(message: string, data?: LogData): void;
    debug(message: string, data?: LogData): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map