/**
 * Logger Middleware
 * Centralized logging for the Nen Platform backend
 */

import winston from 'winston';
import { config } from '../config';

interface LogData {
  [key: string]: any;
}

class Logger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}`;
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: config.logging.filePath,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ],
    });
  }

  private log(level: string, message: string, data?: LogData): void {
    this.logger.log(level, message, data);
  }

  info(message: string, data?: LogData): void {
    this.log('info', message, data);
  }

  error(message: string, data?: LogData): void {
    this.log('error', message, data);
  }

  warn(message: string, data?: LogData): void {
    this.log('warn', message, data);
  }

  debug(message: string, data?: LogData): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data);
    }
  }
}

export const logger = new Logger();
