"use strict";
/**
 * Logger Middleware
 * Centralized logging for the Nen Platform backend
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config");
class Logger {
    constructor() {
        this.logger = winston_1.default.createLogger({
            level: config_1.config.logging.level,
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}`;
            })),
            transports: [
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
                }),
                new winston_1.default.transports.File({
                    filename: config_1.config.logging.filePath,
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                })
            ],
        });
    }
    log(level, message, data) {
        this.logger.log(level, message, data);
    }
    info(message, data) {
        this.log('info', message, data);
    }
    error(message, data) {
        this.log('error', message, data);
    }
    warn(message, data) {
        this.log('warn', message, data);
    }
    debug(message, data) {
        if (process.env.NODE_ENV === 'development') {
            this.log('debug', message, data);
        }
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map