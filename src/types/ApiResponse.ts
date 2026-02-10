/**
 * Standardized API Response Types
 * Provides consistent response structures across all API endpoints
 */

import { ErrorCode } from './errors';

/**
 * Standard success response format
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp?: string;
  requestId?: string;
}

/**
 * Standard error response format
 */
export interface ApiErrorResponse {
  success: false;
  error: string;           // Human-readable error message
  code?: ErrorCode;        // Machine-readable error code
  details?: unknown;       // Additional error details (validation errors, etc.)
  requestId?: string;      // For tracking in logs
  correlationId?: string;  // For distributed tracing
  timestamp?: string;
}

/**
 * Generic API response type (union of success and error)
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paginated success response format
 */
export interface PaginatedApiResponse<T = unknown> extends ApiSuccessResponse<T[]> {
  meta: {
    pagination: PaginationMeta;
  };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
  rule?: string;
}

/**
 * Type guard to check if response is a success response
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is an error response
 */
export function isErrorResponse(response: ApiResponse<unknown>): response is ApiErrorResponse {
  return response.success === false;
}

// Re-export ErrorCode for convenience
export { ErrorCode };
