/**
 * Error Handler Utilities
 * Centralized error handling for API errors
 */

import type { ApiErrorResponse } from '../../../shared/types/api';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
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
    const axiosError = error as { response?: { data?: ApiErrorResponse } };
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Extract error details from API error response
 */
export function extractErrorDetails(error: unknown): ApiErrorResponse | null {
  if (error instanceof ApiError) {
    return {
      error: error.message,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  const axiosError = error as { response?: { data?: ApiErrorResponse } };
  if (axiosError.response?.data) {
    return axiosError.response.data;
  }

  return null;
}

