/**
 * Custom error types for the application
 * Provides structured error handling with proper error codes and messages
 */

export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Authentication errors (401)
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SESSION_VERSION_MISMATCH = 'SESSION_VERSION_MISMATCH',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Authorization errors (403)
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  RESOURCE_EXISTS = 'RESOURCE_EXISTS',

  // Internal errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Bad request (400)
  BAD_REQUEST = 'BAD_REQUEST',

  // Service unavailable (503)
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface AppError extends Error {
  code: ErrorCode
  statusCode: number
  details?: unknown
  isOperational: boolean
}

/**
 * Base application error class
 */
export class BaseAppError extends Error implements AppError {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: unknown
  public readonly isOperational: boolean = true

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.details = details

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends BaseAppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details)
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends BaseAppError {
  constructor(
    message: string = 'Authentication failed',
    code: ErrorCode = ErrorCode.AUTHENTICATION_ERROR,
    details?: unknown
  ) {
    super(message, code, 401, details)
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends BaseAppError {
  constructor(
    message: string = 'Insufficient permissions',
    code: ErrorCode = ErrorCode.AUTHORIZATION_ERROR,
    details?: unknown
  ) {
    super(message, code, 403, details)
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends BaseAppError {
  constructor(
    message: string = 'Resource not found',
    code: ErrorCode = ErrorCode.NOT_FOUND,
    details?: unknown
  ) {
    super(message, code, 404, details)
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends BaseAppError {
  constructor(
    message: string = 'Resource conflict',
    code: ErrorCode = ErrorCode.CONFLICT,
    details?: unknown
  ) {
    super(message, code, 409, details)
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends BaseAppError {
  constructor(
    message: string = 'Internal server error',
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: unknown
  ) {
    super(message, code, 500, details)
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends BaseAppError {
  constructor(
    message: string = 'Rate limit exceeded',
    details?: unknown
  ) {
    super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, details)
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends BaseAppError {
  constructor(
    message: string = 'Bad request',
    code: ErrorCode = ErrorCode.BAD_REQUEST,
    details?: unknown
  ) {
    super(message, code, 400, details)
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends BaseAppError {
  constructor(
    message: string = 'Service temporarily unavailable',
    details?: unknown
  ) {
    super(message, ErrorCode.SERVICE_UNAVAILABLE, 503, details)
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof BaseAppError
}

/**
 * Type guard to check if error is operational (safe to show to user)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational
  }
  return false
}
