/**
 * Shared API Types
 * Types shared between frontend and backend for type safety
 */

/**
 * Machine-readable error codes
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
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Authorization errors (403)
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Internal errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

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
  // Legacy fields for backward compatibility
  message?: string;
  statusCode?: number;
}

/**
 * Generic API Response (union of success and error)
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Type guard to check if response is a success response
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return 'success' in response && response.success === true;
}

/**
 * Type guard to check if response is an error response
 */
export function isErrorResponse(response: ApiResponse<unknown>): response is ApiErrorResponse {
  return 'success' in response && response.success === false;
}

/**
 * Generic API client interface
 */
export interface ApiClient {
  get<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>>;
  post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>>;
  put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>>;
  patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>>;
  delete<T>(endpoint: string): Promise<ApiResponse<T>>;
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

