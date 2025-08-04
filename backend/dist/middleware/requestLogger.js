"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
exports.errorLogger = errorLogger;
const uuid_1 = require("uuid");
const config_1 = __importDefault(require("../config"));
function requestLogger(req, res, next) {
    req.correlationId = (0, uuid_1.v4)();
    req.startTime = Date.now();
    if (req.path === '/health' && config_1.default.isProduction()) {
        return next();
    }
    const requestInfo = {
        correlationId: req.correlationId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString()
    };
    console.log('Request started:', requestInfo);
    const originalSend = res.send;
    res.send = function (data) {
        const responseTime = Date.now() - (req.startTime || Date.now());
        const responseInfo = {
            correlationId: req.correlationId,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            contentLength: res.get('Content-Length') || Buffer.byteLength(data || ''),
            timestamp: new Date().toISOString()
        };
        console.log('Request completed:', responseInfo);
        return originalSend.call(this, data);
    };
    next();
}
function errorLogger(error, req, res, next) {
    const errorInfo = {
        correlationId: req.correlationId,
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body
        },
        timestamp: new Date().toISOString()
    };
    console.error('Request error:', errorInfo);
    next(error);
}
//# sourceMappingURL=requestLogger.js.map