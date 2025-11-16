import { ErrorHandlingService } from '../../../src/services/ErrorHandlingService';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new ErrorHandlingService();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ErrorHandlingService);
    });

    it('should not require dependencies', () => {
      const newService = new ErrorHandlingService();
      expect(newService).toBeDefined();
    });
  });

  describe('logError', () => {
    it('should log error to console', () => {
      const error = new Error('Test error');
      service.logError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error logged:', error, undefined);
    });

    it('should log error with context', () => {
      const error = new Error('Test error');
      const context = { userId: 'user-123', action: 'create-event' };

      service.logError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error logged:', error, context);
    });

    it('should return logged status', () => {
      const error = new Error('Test error');
      const result = service.logError(error);

      expect(result).toMatchObject({
        logged: true,
        timestamp: expect.any(Date),
        error: 'Test error',
      });
    });

    it('should handle Error objects', () => {
      const error = new Error('Database connection failed');
      const result = service.logError(error);

      expect(result.error).toBe('Database connection failed');
    });

    it('should handle string errors', () => {
      const result = service.logError('Something went wrong');

      expect(result.error).toBe('Something went wrong');
    });

    it('should handle non-Error objects', () => {
      const error = { code: 500, message: 'Internal error' };
      const result = service.logError(error);

      expect(result.error).toBe('[object Object]');
    });

    it('should include timestamp', () => {
      const beforeTime = new Date();
      const result = service.logError(new Error('Test'));
      const afterTime = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should handle null error', () => {
      const result = service.logError(null);

      expect(result.logged).toBe(true);
      expect(result.error).toBe('null');
    });

    it('should handle undefined error', () => {
      const result = service.logError(undefined);

      expect(result.logged).toBe(true);
      expect(result.error).toBe('undefined');
    });

    it('should handle error with multiple context fields', () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user-123',
        eventId: 'event-456',
        action: 'score-submission',
        ip: '192.168.1.1',
      };

      service.logError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error logged:', error, context);
    });

    it('should handle nested error objects', () => {
      const error = new Error('Parent error');
      (error as any).cause = new Error('Child error');

      const result = service.logError(error);

      expect(result.error).toBe('Parent error');
    });

    it('should always return logged: true', () => {
      const result1 = service.logError(new Error('Test 1'));
      const result2 = service.logError('Test 2');
      const result3 = service.logError({ message: 'Test 3' });

      expect(result1.logged).toBe(true);
      expect(result2.logged).toBe(true);
      expect(result3.logged).toBe(true);
    });
  });

  describe('getErrorStats', () => {
    it('should return error statistics', () => {
      const stats = service.getErrorStats();

      expect(stats).toMatchObject({
        total: 0,
        last24Hours: 0,
        byType: {},
      });
    });

    it('should return zero counts when no errors logged', () => {
      const stats = service.getErrorStats();

      expect(stats.total).toBe(0);
      expect(stats.last24Hours).toBe(0);
    });

    it('should return empty byType object', () => {
      const stats = service.getErrorStats();

      expect(stats.byType).toEqual({});
    });

    it('should be callable multiple times', () => {
      const stats1 = service.getErrorStats();
      const stats2 = service.getErrorStats();

      expect(stats1).toEqual(stats2);
    });

    it('should return consistent structure', () => {
      const stats = service.getErrorStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('last24Hours');
      expect(stats).toHaveProperty('byType');
    });

    it('should return number types for counts', () => {
      const stats = service.getErrorStats();

      expect(typeof stats.total).toBe('number');
      expect(typeof stats.last24Hours).toBe('number');
    });

    it('should return object type for byType', () => {
      const stats = service.getErrorStats();

      expect(typeof stats.byType).toBe('object');
    });
  });

  describe('integration scenarios', () => {
    it('should log error and then retrieve stats', () => {
      service.logError(new Error('Test error'));

      const stats = service.getErrorStats();

      expect(stats).toBeDefined();
    });

    it('should handle multiple error logs', () => {
      service.logError(new Error('Error 1'));
      service.logError(new Error('Error 2'));
      service.logError(new Error('Error 3'));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle errors with different types', () => {
      service.logError(new Error('Standard error'));
      service.logError(new TypeError('Type error'));
      service.logError(new RangeError('Range error'));

      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
    });

    it('should track errors across service instance lifetime', async () => {
      const result1 = service.logError(new Error('Error 1'));
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const result2 = service.logError(new Error('Error 2'));

      expect(result1.timestamp.getTime()).not.toEqual(result2.timestamp.getTime());
    });
  });

  describe('error message extraction', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Test message');
      const result = service.logError(error);

      expect(result.error).toBe('Test message');
    });

    it('should handle empty error message', () => {
      const error = new Error('');
      const result = service.logError(error);

      expect(result.error).toBe('');
    });

    it('should handle Error without message', () => {
      const error = new Error();
      const result = service.logError(error);

      expect(result.error).toBe('');
    });

    it('should handle custom Error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error message');
      const result = service.logError(error);

      expect(result.error).toBe('Custom error message');
    });
  });

  describe('context handling', () => {
    it('should handle empty context object', () => {
      const error = new Error('Test error');
      service.logError(error, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error logged:', error, {});
    });

    it('should handle null context', () => {
      const error = new Error('Test error');
      service.logError(error, null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error logged:', error, null);
    });

    it('should handle undefined context', () => {
      const error = new Error('Test error');
      service.logError(error, undefined);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error logged:', error, undefined);
    });

    it('should preserve context data types', () => {
      const error = new Error('Test error');
      const context = {
        string: 'value',
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'data' },
      };

      service.logError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error logged:', error, context);
    });
  });

  describe('TODO implementation notes', () => {
    it('should indicate database logging is not yet implemented', () => {
      // This test documents that database logging is marked as TODO
      const result = service.logError(new Error('Test'));

      // Currently logs to console only
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should indicate error statistics are placeholder', () => {
      const stats = service.getErrorStats();

      // Currently returns hardcoded zeros
      expect(stats.total).toBe(0);
      expect(stats.last24Hours).toBe(0);
    });
  });
});
