/**
 * BaseService Tests
 * Comprehensive test coverage for base service functionality
 */

import 'reflect-metadata';
import {
  BaseService,
  ServiceError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError
} from '../../../src/services/BaseService';
import { ErrorSeverity } from '../../../src/utils/errorTracking';

// Create concrete implementation for testing
class TestService extends BaseService {
  public testHandleError(error: any, context?: any): never {
    return this.handleError(error, context);
  }

  public testGetErrorSeverity(error: any): ErrorSeverity {
    return this.getErrorSeverity(error);
  }

  public testValidateRequired(data: any, fields: string[]): void {
    return this.validateRequired(data, fields);
  }

  public testAssertExists<T>(entity: T | null | undefined, resourceName: string, identifier?: string): asserts entity is T {
    return this.assertExists(entity, resourceName, identifier);
  }

  public testNotFoundError(resource: string, identifier?: string): NotFoundError {
    return this.notFoundError(resource, identifier);
  }

  public testCreateNotFoundError(message: string): NotFoundError {
    return this.createNotFoundError(message);
  }

  public testBadRequestError(message: string): ServiceError {
    return this.badRequestError(message);
  }

  public testValidationError(message: string, errors?: any[]): ValidationError {
    return this.validationError(message, errors);
  }

  public testForbiddenError(message?: string): ForbiddenError {
    return this.forbiddenError(message);
  }

  public testUnauthorizedError(message?: string): UnauthorizedError {
    return this.unauthorizedError(message);
  }

  public testConflictError(message: string): ConflictError {
    return this.conflictError(message);
  }

  public testAssert(condition: boolean, message: string, statusCode?: number): void {
    return this.assert(condition, message, statusCode);
  }

  public testSanitizeUser(user: any): any {
    return this.sanitizeUser(user);
  }

  public testPaginate<T>(data: T[], page: number, limit: number) {
    return this.paginate(data, page, limit);
  }

  public async testWithRetry<T>(operation: () => Promise<T>, maxRetries?: number, delay?: number): Promise<T> {
    return this.withRetry(operation, maxRetries, delay);
  }

  public async testSleep(ms: number): Promise<void> {
    return this.sleep(ms);
  }
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService();
    jest.clearAllMocks();
  });

  describe('Error Classes', () => {
    describe('ServiceError', () => {
      it('should create ServiceError with message', () => {
        const error = new ServiceError('Test error');

        expect(error).toBeInstanceOf(ServiceError);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(500);
        expect(error.name).toBe('ServiceError');
      });

      it('should create ServiceError with custom status code', () => {
        const error = new ServiceError('Test error', 400);

        expect(error.statusCode).toBe(400);
      });

      it('should create ServiceError with code and details', () => {
        const details = { field: 'value' };
        const error = new ServiceError('Test error', 500, 'TEST_CODE', details);

        expect(error.code).toBe('TEST_CODE');
        expect(error.details).toEqual(details);
      });
    });

    describe('ValidationError', () => {
      it('should create ValidationError', () => {
        const error = new ValidationError('Validation failed');

        expect(error).toBeInstanceOf(ValidationError);
        expect(error).toBeInstanceOf(ServiceError);
        expect(error.message).toBe('Validation failed');
        expect(error.statusCode).toBe(422);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.name).toBe('ValidationError');
      });

      it('should create ValidationError with validation errors', () => {
        const validationErrors = [
          { field: 'email', message: 'Invalid email' }
        ];
        const error = new ValidationError('Validation failed', validationErrors);

        expect(error.validationErrors).toEqual(validationErrors);
        expect(error.details).toEqual(validationErrors);
      });
    });

    describe('NotFoundError', () => {
      it('should create NotFoundError with resource only', () => {
        const error = new NotFoundError('User');

        expect(error).toBeInstanceOf(NotFoundError);
        expect(error).toBeInstanceOf(ServiceError);
        expect(error.message).toBe('User not found');
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
        expect(error.name).toBe('NotFoundError');
      });

      it('should create NotFoundError with resource and identifier', () => {
        const error = new NotFoundError('User', 'user-123');

        expect(error.message).toBe("User with identifier 'user-123' not found");
      });
    });

    describe('UnauthorizedError', () => {
      it('should create UnauthorizedError with default message', () => {
        const error = new UnauthorizedError();

        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error.message).toBe('Unauthorized');
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('UNAUTHORIZED');
        expect(error.name).toBe('UnauthorizedError');
      });

      it('should create UnauthorizedError with custom message', () => {
        const error = new UnauthorizedError('Invalid credentials');

        expect(error.message).toBe('Invalid credentials');
      });
    });

    describe('ForbiddenError', () => {
      it('should create ForbiddenError with default message', () => {
        const error = new ForbiddenError();

        expect(error).toBeInstanceOf(ForbiddenError);
        expect(error.message).toBe('Forbidden');
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe('FORBIDDEN');
        expect(error.name).toBe('ForbiddenError');
      });

      it('should create ForbiddenError with custom message', () => {
        const error = new ForbiddenError('Access denied');

        expect(error.message).toBe('Access denied');
      });
    });

    describe('ConflictError', () => {
      it('should create ConflictError', () => {
        const error = new ConflictError('Resource already exists');

        expect(error).toBeInstanceOf(ConflictError);
        expect(error.message).toBe('Resource already exists');
        expect(error.statusCode).toBe(409);
        expect(error.code).toBe('CONFLICT');
        expect(error.name).toBe('ConflictError');
      });
    });
  });

  describe('handleError', () => {
    it('should re-throw ServiceError as-is', () => {
      const error = new ServiceError('Test error', 400);

      expect(() => service.testHandleError(error)).toThrow(ServiceError);
      expect(() => service.testHandleError(error)).toThrow('Test error');
    });

    it('should wrap generic errors', () => {
      const error = new Error('Generic error');

      expect(() => service.testHandleError(error)).toThrow(ServiceError);
      expect(() => service.testHandleError(error)).toThrow('Generic error');
    });

    it('should handle error without message', () => {
      const error = {};

      expect(() => service.testHandleError(error)).toThrow('An unexpected error occurred');
    });
  });

  describe('getErrorSeverity', () => {
    it('should return LOW for ValidationError', () => {
      const error = new ValidationError('Validation failed');
      expect(service.testGetErrorSeverity(error)).toBe(ErrorSeverity.LOW);
    });

    it('should return LOW for NotFoundError', () => {
      const error = new NotFoundError('User');
      expect(service.testGetErrorSeverity(error)).toBe(ErrorSeverity.LOW);
    });

    it('should return MEDIUM for UnauthorizedError', () => {
      const error = new UnauthorizedError();
      expect(service.testGetErrorSeverity(error)).toBe(ErrorSeverity.MEDIUM);
    });

    it('should return MEDIUM for ForbiddenError', () => {
      const error = new ForbiddenError();
      expect(service.testGetErrorSeverity(error)).toBe(ErrorSeverity.MEDIUM);
    });

    it('should return MEDIUM for ConflictError', () => {
      const error = new ConflictError('Conflict');
      expect(service.testGetErrorSeverity(error)).toBe(ErrorSeverity.MEDIUM);
    });

    it('should return HIGH for generic errors', () => {
      const error = new Error('Generic error');
      expect(service.testGetErrorSeverity(error)).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('validateRequired', () => {
    it('should pass with all required fields present', () => {
      const data = { name: 'Test', email: 'test@example.com' };

      expect(() => service.testValidateRequired(data, ['name', 'email'])).not.toThrow();
    });

    it('should throw ValidationError for missing fields', () => {
      const data = { name: 'Test' };

      expect(() => service.testValidateRequired(data, ['name', 'email'])).toThrow(ValidationError);
      expect(() => service.testValidateRequired(data, ['name', 'email'])).toThrow('Missing required fields: email');
    });

    it('should throw ValidationError for null fields', () => {
      const data = { name: null };

      expect(() => service.testValidateRequired(data, ['name'])).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty string fields', () => {
      const data = { name: '' };

      expect(() => service.testValidateRequired(data, ['name'])).toThrow(ValidationError);
    });

    it('should throw ValidationError for undefined fields', () => {
      const data = {};

      expect(() => service.testValidateRequired(data, ['name'])).toThrow(ValidationError);
    });

    it('should include validation errors in thrown error', () => {
      const data = { name: 'Test' };

      try {
        service.testValidateRequired(data, ['name', 'email', 'password']);
      } catch (error: any) {
        expect(error.validationErrors).toHaveLength(2);
        expect(error.validationErrors[0].field).toBe('email');
        expect(error.validationErrors[0].rule).toBe('required');
      }
    });
  });

  describe('assertExists', () => {
    it('should not throw if entity exists', () => {
      const entity = { id: '1', name: 'Test' };

      expect(() => service.testAssertExists(entity, 'User')).not.toThrow();
    });

    it('should throw NotFoundError if entity is null', () => {
      expect(() => service.testAssertExists(null, 'User')).toThrow(NotFoundError);
      expect(() => service.testAssertExists(null, 'User')).toThrow('User not found');
    });

    it('should throw NotFoundError if entity is undefined', () => {
      expect(() => service.testAssertExists(undefined, 'User')).toThrow(NotFoundError);
    });

    it('should include identifier in error message', () => {
      expect(() => service.testAssertExists(null, 'User', 'user-123')).toThrow("User with identifier 'user-123' not found");
    });
  });

  describe('Error Factory Methods', () => {
    it('should create NotFoundError via notFoundError', () => {
      const error = service.testNotFoundError('User', 'user-123');

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe("User with identifier 'user-123' not found");
    });

    it('should create NotFoundError via createNotFoundError', () => {
      const error = service.testCreateNotFoundError('Custom message');

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Custom message not found');
    });

    it('should create BadRequestError via badRequestError', () => {
      const error = service.testBadRequestError('Invalid request');

      expect(error).toBeInstanceOf(ServiceError);
      expect(error.message).toBe('Invalid request');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('should create ValidationError via validationError', () => {
      const validationErrors = [{ field: 'email', message: 'Invalid' }];
      const error = service.testValidationError('Validation failed', validationErrors);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.validationErrors).toEqual(validationErrors);
    });

    it('should create ForbiddenError via forbiddenError', () => {
      const error = service.testForbiddenError('Access denied');

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe('Access denied');
    });

    it('should create UnauthorizedError via unauthorizedError', () => {
      const error = service.testUnauthorizedError('Invalid token');

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Invalid token');
    });

    it('should create ConflictError via conflictError', () => {
      const error = service.testConflictError('Resource exists');

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('Resource exists');
    });
  });

  describe('assert', () => {
    it('should not throw when condition is true', () => {
      expect(() => service.testAssert(true, 'Should not throw')).not.toThrow();
    });

    it('should throw when condition is false', () => {
      expect(() => service.testAssert(false, 'Test error')).toThrow(ServiceError);
      expect(() => service.testAssert(false, 'Test error')).toThrow('Test error');
    });

    it('should throw with default status code 400', () => {
      try {
        service.testAssert(false, 'Test error');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
      }
    });

    it('should throw with custom status code', () => {
      try {
        service.testAssert(false, 'Test error', 422);
      } catch (error: any) {
        expect(error.statusCode).toBe(422);
      }
    });
  });

  describe('sanitizeUser', () => {
    it('should remove sensitive fields', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password: 'secret123',
        resetToken: 'token123',
        resetTokenExpiry: new Date(),
        name: 'Test User'
      };

      const sanitized = service.testSanitizeUser(user);

      expect(sanitized).toHaveProperty('id');
      expect(sanitized).toHaveProperty('email');
      expect(sanitized).toHaveProperty('name');
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('resetToken');
      expect(sanitized).not.toHaveProperty('resetTokenExpiry');
    });

    it('should handle user without sensitive fields', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      };

      const sanitized = service.testSanitizeUser(user);

      expect(sanitized).toEqual(user);
    });
  });

  describe('paginate', () => {
    const testData = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));

    it('should paginate data correctly', () => {
      const result = service.testPaginate(testData, 1, 10);

      expect(result.data).toHaveLength(10);
      expect(result.data[0].id).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(false);
    });

    it('should handle second page correctly', () => {
      const result = service.testPaginate(testData, 2, 10);

      expect(result.data).toHaveLength(10);
      expect(result.data[0].id).toBe(11);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('should handle last page correctly', () => {
      const result = service.testPaginate(testData, 5, 10);

      expect(result.data).toHaveLength(10);
      expect(result.data[0].id).toBe(41);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('should handle partial last page', () => {
      const result = service.testPaginate(testData, 3, 20);

      expect(result.data).toHaveLength(10);
      expect(result.pagination.totalPages).toBe(3);
    });

    it('should handle empty data', () => {
      const result = service.testPaginate([], 1, 10);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPrevPage).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.testWithRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue('success');

      const result = await service.testWithRetry(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Permanent error'));

      await expect(service.testWithRetry(operation, 3, 10)).rejects.toThrow('Permanent error');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry ValidationError', async () => {
      const operation = jest.fn().mockRejectedValue(new ValidationError('Invalid'));

      await expect(service.testWithRetry(operation, 3, 10)).rejects.toThrow(ValidationError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry NotFoundError', async () => {
      const operation = jest.fn().mockRejectedValue(new NotFoundError('User'));

      await expect(service.testWithRetry(operation, 3, 10)).rejects.toThrow(NotFoundError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry UnauthorizedError', async () => {
      const operation = jest.fn().mockRejectedValue(new UnauthorizedError());

      await expect(service.testWithRetry(operation, 3, 10)).rejects.toThrow(UnauthorizedError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry ForbiddenError', async () => {
      const operation = jest.fn().mockRejectedValue(new ForbiddenError());

      await expect(service.testWithRetry(operation, 3, 10)).rejects.toThrow(ForbiddenError);
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('sleep', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await service.testSleep(50);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(45);
      expect(duration).toBeLessThan(100);
    });
  });
});
