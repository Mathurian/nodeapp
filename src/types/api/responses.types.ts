/**
 * Standardized API Response Type Definitions
 */

/**
 * Base API Response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
  meta?: ResponseMeta;
  errors?: ValidationError[] | Record<string, unknown>;
  stack?: string; // Only in development
}

/**
 * Success Response
 */
export interface SuccessResponse<T = unknown> extends ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * Error Response
 */
export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  errors?: ValidationError[] | Record<string, unknown>;
}

/**
 * Pagination Metadata
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
 * Response Metadata
 */
export interface ResponseMeta {
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

/**
 * Validation Error
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  rule?: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  meta: {
    pagination: PaginationMeta;
  };
}
