/**
 * Error Handler Utilities
 * Centralized error handling for API errors
 */

import type { ApiErrorResponse, ErrorCode, isErrorResponse } from '../../../shared/types/api';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: ErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Create ApiError from an API error response
   */
  static fromResponse(response: ApiErrorResponse, statusCode?: number): ApiError {
    return new ApiError(
      response.error || response.message || 'An error occurred',
      statusCode || response.statusCode,
      response.code,
      response.details
    );
  }
}

/**
 * Handle API errors and return user-friendly messages
 */
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Check if it's an axios error with response
    const axiosError = error as { response?: { data?: ApiErrorResponse; status?: number } };
    if (axiosError.response?.data) {
      // Handle standardized error format
      const data = axiosError.response.data;
      if ('error' in data && data.error) {
        return data.error;
      }
      if ('message' in data && data.message) {
        return data.message;
      }
    }
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Extract error code from API error response
 */
export function extractErrorCode(error: unknown): ErrorCode | undefined {
  const axiosError = error as { response?: { data?: ApiErrorResponse } };
  if (axiosError.response?.data?.code) {
    return axiosError.response.data.code;
  }

  if (error instanceof ApiError) {
    return error.code;
  }

  return undefined;
}

/**
 * Extract error details from API error response
 */
export function extractErrorDetails(error: unknown): ApiErrorResponse | null {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: error.message,
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      details: error.details,
    };
  }

  const axiosError = error as { response?: { data?: ApiErrorResponse } };
  if (axiosError.response?.data) {
    return axiosError.response.data;
  }

  return null;
}

/**
 * Check if error is a specific error code
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return extractErrorCode(error) === code;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  const code = extractErrorCode(error);
  return code === 'VALIDATION_ERROR' || code === 'INVALID_INPUT' || code === 'MISSING_REQUIRED_FIELD';
}

/**
 * Check if error is an authentication error
 */
export function isAuthenticationError(error: unknown): boolean {
  const code = extractErrorCode(error);
  return code === 'AUTHENTICATION_ERROR' || code === 'INVALID_TOKEN' || code === 'TOKEN_EXPIRED' || code === 'INVALID_CREDENTIALS';
}

/**
 * Check if error is an authorization error
 */
export function isAuthorizationError(error: unknown): boolean {
  const code = extractErrorCode(error);
  return code === 'AUTHORIZATION_ERROR' || code === 'INSUFFICIENT_PERMISSIONS' || code === 'ACCESS_DENIED';
}

/**
 * Check if error is a not found error
 */
export function isNotFoundError(error: unknown): boolean {
  const code = extractErrorCode(error);
  return code === 'NOT_FOUND' || code === 'RESOURCE_NOT_FOUND';
}

/**
 * Check if error is a conflict error
 */
export function isConflictError(error: unknown): boolean {
  const code = extractErrorCode(error);
  return code === 'CONFLICT' || code === 'DUPLICATE_ENTRY';
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  return extractErrorCode(error) === 'RATE_LIMIT_EXCEEDED';
}

