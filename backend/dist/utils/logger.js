"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};
class Logger {
    currentLevel = LOG_LEVELS.INFO;
    constructor() {
        const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
        this.currentLevel = LOG_LEVELS[envLevel] || LOG_LEVELS.INFO;
    }
    debug(message, ...args) {
        if (this.currentLevel <= LOG_LEVELS.DEBUG) {
            console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
        }
    }
    info(message, ...args) {
        if (this.currentLevel <= LOG_LEVELS.INFO) {
            console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
        }
    }
    warn(message, ...args) {
        if (this.currentLevel <= LOG_LEVELS.WARN) {
            console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
        }
    }
    error(message, ...args) {
        if (this.currentLevel <= LOG_LEVELS.ERROR) {
            console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
        }
    }
}
exports.Logger = Logger;
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map