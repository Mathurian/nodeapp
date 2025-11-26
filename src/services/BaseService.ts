/**
 * Base Service Class
 * Provides common functionality for all services
 * P3-3: Error Handling Standardization - Uses BaseAppError hierarchy
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
import { env } from '../config/env';
import { createLogger } from '../utils/logger';

// P3-3: Import standardized error classes
import {
  ValidationError,
  NotFoundError,
  AuthenticationError as UnauthorizedError,
  AuthorizationError as ForbiddenError,
  ConflictError,
  InternalError,
  BadRequestError,
  ErrorCode,
  isAppError,
} from '../types/errors';

// Re-export error classes for backward compatibility
export {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
}

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
 * Base Service
 */
export abstract class BaseService {
  /**
   * Handle service errors
   * P3-3: Updated to use BaseAppError
   */
  protected handleError(error: unknown, context?: Record<string, unknown>): never {
    // Log the error
    const severity = this.getErrorSeverity(error);
    trackError(error, severity, context);

    // Re-throw app errors as-is
    if (isAppError(error)) {
      throw error;
    }

    // Wrap other errors
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    throw new InternalError(
      errorMessage,
      ErrorCode.INTERNAL_ERROR,
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
   * P3-3: Updated for BaseAppError NotFoundError signature
   */
  protected assertExists<T>(entity: T | null | undefined, resourceName: string, identifier?: string): asserts entity is T {
    if (!entity) {
      const message = identifier
        ? `${resourceName} with identifier '${identifier}' not found`
        : `${resourceName} not found`;
      throw new NotFoundError(message, ErrorCode.RESOURCE_NOT_FOUND);
    }
  }

  /**
   * Create Not Found Error
   * P3-3: Updated for BaseAppError NotFoundError signature
   */
  protected notFoundError(resource: string, identifier?: string): NotFoundError {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    return new NotFoundError(message, ErrorCode.RESOURCE_NOT_FOUND);
  }

  /**
   * Create Not Found Error (alias)
   * P3-3: Updated for BaseAppError NotFoundError signature
   */
  protected createNotFoundError(message: string): NotFoundError {
    return new NotFoundError(message, ErrorCode.RESOURCE_NOT_FOUND);
  }

  /**
   * Create Bad Request Error
   * P3-3: Updated to use BadRequestError
   */
  protected createBadRequestError(message: string): BadRequestError {
    return new BadRequestError(message, ErrorCode.BAD_REQUEST);
  }

  /**
   * Create Bad Request Error (alias)
   * P3-3: Updated to use BadRequestError
   */
  protected badRequestError(message: string): BadRequestError {
    return new BadRequestError(message, ErrorCode.BAD_REQUEST);
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
   * P3-3: Updated to use BadRequestError
   */
  protected assert(condition: boolean, message: string, statusCode: number = 400): void {
    if (!condition) {
      if (statusCode === 400) {
        throw new BadRequestError(message, ErrorCode.BAD_REQUEST);
      } else if (statusCode === 404) {
        throw new NotFoundError(message, ErrorCode.RESOURCE_NOT_FOUND);
      } else if (statusCode === 401) {
        throw new UnauthorizedError(message, ErrorCode.AUTHENTICATION_ERROR);
      } else if (statusCode === 403) {
        throw new ForbiddenError(message, ErrorCode.AUTHORIZATION_ERROR);
      } else if (statusCode === 409) {
        throw new ConflictError(message, ErrorCode.CONFLICT);
      } else {
        throw new InternalError(message, ErrorCode.INTERNAL_ERROR);
      }
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
    const logger = createLogger(this.constructor.name);
    logger.info(message, data);
  }

  /**
   * Log warning
   */
  protected logWarn(message: string, data?: Record<string, unknown>): void {
    const logger = createLogger(this.constructor.name);
    logger.warn(message, data);
  }

  /**
   * Log debug
   */
  protected logDebug(message: string, data?: Record<string, unknown>): void {
    if (!env.isProduction()) {
      const logger = createLogger(this.constructor.name);
      logger.debug(message, data);
    }
  }

  /**
   * Log error
   */
  protected logError(message: string, error?: unknown): void {
    const logger = createLogger(this.constructor.name);
    logger.error(message, { error });
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
