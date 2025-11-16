/**
 * Standardized API Response Type Definitions
 */

/**
 * Base API Response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
  meta?: ResponseMeta;
  errors?: any;
  stack?: string; // Only in development
}

/**
 * Success Response
 */
export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * Error Response
 */
export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  errors?: ValidationError[] | any;
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
  [key: string]: any;
}

/**
 * Validation Error
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
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
