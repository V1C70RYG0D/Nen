import { Logger } from '../../src/utils/logger';

describe('Logger Utility', () => {
  let logger: Logger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    logger = new Logger();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Log Level Management', () => {
    test('should default to INFO level', () => {
      const logger = new Logger();
      logger.debug('debug message');
      expect(consoleSpy).not.toHaveBeenCalled();

      logger.info('info message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    test('should respect LOG_LEVEL environment variable', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      const debugLogger = new Logger();

      debugLogger.debug('debug message');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('debug message')
      );

      delete process.env.LOG_LEVEL;
    });
  });

  describe('Message Formatting', () => {
    test('should format debug messages correctly', () => {
      process.env.LOG_LEVEL = 'DEBUG';
      const debugLogger = new Logger();

      debugLogger.debug('test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('test message'),
        { key: 'value' }
      );

      delete process.env.LOG_LEVEL;
    });

    test('should format info messages correctly', () => {
      logger.info('test info', 'extra data');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('test info'),
        'extra data'
      );
    });

    test('should include timestamp in log messages', () => {
      logger.info('timestamped message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[INFO\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z - timestamped message/)
      );
    });
  });

  describe('Log Level Filtering', () => {
    test('should filter messages below current log level', () => {
      // Default is INFO level
      logger.debug('should not show');
      expect(consoleSpy).not.toHaveBeenCalled();

      logger.info('should show');
      expect(consoleSpy).toHaveBeenCalled();
    });

    test('should show error messages at all log levels', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      logger.error('error message');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('error message')
      );

      errorSpy.mockRestore();
    });

    test('should show warning messages at WARN level and above', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      logger.warn('warning message');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        expect.stringContaining('warning message')
      );

      warnSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid log level gracefully', () => {
      process.env.LOG_LEVEL = 'INVALID';
      const fallbackLogger = new Logger();

      // Should fall back to INFO level
      fallbackLogger.debug('debug test');
      expect(consoleSpy).not.toHaveBeenCalled();

      fallbackLogger.info('info test');
      expect(consoleSpy).toHaveBeenCalled();

      delete process.env.LOG_LEVEL;
    });

    test('should handle multiple arguments correctly', () => {
      logger.info('message', { data: 'test' }, 123, true);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('message'),
        { data: 'test' },
        123,
        true
      );
    });
  });
});
