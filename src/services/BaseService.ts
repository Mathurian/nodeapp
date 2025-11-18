/**
 * Base Service Class
 * Provides common functionality for all services
 */

import { trackError, ErrorSeverity } from '../utils/errorTracking';
import {
  PaginationOptions,
  PaginationParams,
  PaginationMetadata,
  PaginatedResponse,
  getPaginationParams,
  createPaginationMetadata,
  createPaginatedResponse
} from '../utils/pagination';

// Type definitions
export interface ValidationErrorDetails {
  field: string;
  message: string;
  rule: string;
  value?: unknown;
}

export interface SanitizedUser {
  [key: string]: unknown;
}

/**
 * Service Error
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

/**
 * Validation Error
 */
export class ValidationError extends ServiceError {
  constructor(message: string, public validationErrors?: ValidationErrorDetails[]) {
    super(message, 422, 'VALIDATION_ERROR', validationErrors);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends ServiceError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Unauthorized Error
 */
export class UnauthorizedError extends ServiceError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Forbidden Error
 */
export class ForbiddenError extends ServiceError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Base Service
 */
export abstract class BaseService {
  /**
   * Handle service errors
   */
  protected handleError(error: unknown, context?: Record<string, unknown>): never {
    // Log the error
    const severity = this.getErrorSeverity(error);
    trackError(error, severity, context);

    // Re-throw service errors as-is
    if (error instanceof ServiceError) {
      throw error;
    }

    // Wrap other errors
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    throw new ServiceError(
      errorMessage,
      500,
      'INTERNAL_ERROR',
      error
    );
  }

  /**
   * Determine error severity
   */
  protected getErrorSeverity(error: unknown): ErrorSeverity {
    if (error instanceof ValidationError) {
      return ErrorSeverity.LOW;
    }
    if (error instanceof NotFoundError) {
      return ErrorSeverity.LOW;
    }
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return ErrorSeverity.MEDIUM;
    }
    if (error instanceof ConflictError) {
      return ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.HIGH;
  }

  /**
   * Validate required fields
   */
  protected validateRequired(data: Record<string, unknown>, fields: string[]): void {
    const missing: string[] = [];

    fields.forEach(field => {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missing.join(', ')}`,
        missing.map(field => ({
          field,
          message: 'This field is required',
          rule: 'required'
        }))
      );
    }
  }

  /**
   * Assert entity exists
   */
  protected assertExists<T>(entity: T | null | undefined, resourceName: string, identifier?: string): asserts entity is T {
    if (!entity) {
      throw new NotFoundError(resourceName, identifier);
    }
  }

  /**
   * Create Not Found Error
   */
  protected notFoundError(resource: string, identifier?: string): NotFoundError {
    return new NotFoundError(resource, identifier);
  }

  /**
   * Create Not Found Error (alias)
   */
  protected createNotFoundError(message: string): NotFoundError {
    return new NotFoundError(message);
  }

  /**
   * Create Bad Request Error
   */
  protected createBadRequestError(message: string): ServiceError {
    return new ServiceError(message, 400, 'BAD_REQUEST');
  }

  /**
   * Create Bad Request Error (alias)
   */
  protected badRequestError(message: string): ServiceError {
    return new ServiceError(message, 400, 'BAD_REQUEST');
  }

  /**
   * Create Validation Error
   */
  protected validationError(message: string, validationErrors?: ValidationErrorDetails[]): ValidationError {
    return new ValidationError(message, validationErrors);
  }

  /**
   * Create Forbidden Error
   */
  protected forbiddenError(message?: string): ForbiddenError {
    return new ForbiddenError(message);
  }

  /**
   * Create Unauthorized Error
   */
  protected unauthorizedError(message?: string): UnauthorizedError {
    return new UnauthorizedError(message);
  }

  /**
   * Create Conflict Error
   */
  protected conflictError(message: string): ConflictError {
    return new ConflictError(message);
  }

  /**
   * Assert condition
   */
  protected assert(condition: boolean, message: string, statusCode: number = 400): void {
    if (!condition) {
      throw new ServiceError(message, statusCode);
    }
  }

  /**
   * Sanitize data for response (remove sensitive fields)
   */
  protected sanitizeUser<T extends Record<string, unknown>>(user: T): Omit<T, 'password' | 'resetToken' | 'resetTokenExpiry'> {
    const { password, resetToken, resetTokenExpiry, ...sanitized } = user as T & {
      password?: unknown;
      resetToken?: unknown;
      resetTokenExpiry?: unknown;
    };
    return sanitized as Omit<T, 'password' | 'resetToken' | 'resetTokenExpiry'>;
  }

  /**
   * Paginate results
   */
  protected paginate<T>(data: T[], page: number, limit: number): {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  } {
    const total = data.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      data: data.slice(startIndex, endIndex),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Execute with retry logic
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on validation or client errors
        if (error instanceof ValidationError ||
            error instanceof NotFoundError ||
            error instanceof UnauthorizedError ||
            error instanceof ForbiddenError) {
          throw error;
        }

        if (attempt < maxRetries) {
          await this.sleep(delay * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep helper
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log info
   */
  protected logInfo(message: string, data?: Record<string, unknown>): void {
    console.log(`[${this.constructor.name}] ${message}`, data || '');
  }

  /**
   * Log warning
   */
  protected logWarn(message: string, data?: Record<string, unknown>): void {
    console.warn(`[${this.constructor.name}] ${message}`, data || '');
  }

  /**
   * Log debug
   */
  protected logDebug(message: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${this.constructor.name}] DEBUG: ${message}`, data || '');
    }
  }

  /**
   * Log error
   */
  protected logError(message: string, error?: unknown): void {
    console.error(`[${this.constructor.name}] ${message}`, error || '');
  }

  /**
   * Get pagination parameters for Prisma queries
   * @param options - Pagination options
   * @returns Prisma-compatible skip and take parameters
   */
  protected getPaginationParams(options?: PaginationOptions): PaginationParams {
    return getPaginationParams(options);
  }

  /**
   * Create pagination metadata
   * @param total - Total count of items
   * @param options - Pagination options
   * @returns Pagination metadata
   */
  protected createPaginationMetadata(total: number, options?: PaginationOptions): PaginationMetadata {
    return createPaginationMetadata(total, options);
  }

  /**
   * Create a paginated response
   * @param data - Array of items
   * @param total - Total count of items
   * @param options - Pagination options
   * @returns Paginated response with data and metadata
   */
  protected createPaginatedResponse<T>(
    data: T[],
    total: number,
    options?: PaginationOptions
  ): PaginatedResponse<T> {
    return createPaginatedResponse(data, total, options);
  }
}
