/**
 * Pagination Utilities
 * Helper functions for consistent pagination across the application
 */

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginationParams {
  skip: number;
  take: number;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

/**
 * Default pagination configuration
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

/**
 * Get pagination parameters for Prisma queries
 * @param options - Pagination options from request
 * @returns Prisma-compatible skip and take parameters
 */
export function getPaginationParams(options?: PaginationOptions): PaginationParams {
  const page = Math.max(1, options?.page || DEFAULT_PAGE);
  const limit = Math.min(
    Math.max(1, options?.limit || DEFAULT_LIMIT),
    MAX_LIMIT
  );

  return {
    skip: (page - 1) * limit,
    take: limit
  };
}

/**
 * Create pagination metadata from query results
 * @param total - Total number of items
 * @param options - Pagination options used in query
 * @returns Pagination metadata
 */
export function createPaginationMetadata(
  total: number,
  options?: PaginationOptions
): PaginationMetadata {
  const page = Math.max(1, options?.page || DEFAULT_PAGE);
  const limit = Math.min(
    Math.max(1, options?.limit || DEFAULT_LIMIT),
    MAX_LIMIT
  );
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
    hasPrevious: page > 1
  };
}

/**
 * Create a paginated response
 * @param data - Array of items
 * @param total - Total number of items
 * @param options - Pagination options
 * @returns Paginated response with data and metadata
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  options?: PaginationOptions
): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMetadata(total, options)
  };
}

/**
 * Parse pagination parameters from query string
 * @param query - Request query parameters
 * @returns Parsed pagination options
 */
export function parsePaginationQuery(query: Record<string, unknown>): PaginationOptions {
  return {
    page: query['page'] ? parseInt(String(query['page']), 10) : undefined,
    limit: query['limit'] ? parseInt(String(query['limit']), 10) : undefined
  };
}

/**
 * Validate pagination parameters
 * @param options - Pagination options to validate
 * @returns Validated pagination options or throws error
 */
export function validatePaginationOptions(options?: PaginationOptions): PaginationOptions {
  const page = options?.page;
  const limit = options?.limit;

  if (page !== undefined && (page < 1 || !Number.isInteger(page))) {
    throw new Error('Page must be a positive integer');
  }

  if (limit !== undefined && (limit < 1 || !Number.isInteger(limit))) {
    throw new Error('Limit must be a positive integer');
  }

  if (limit !== undefined && limit > MAX_LIMIT) {
    throw new Error(`Limit cannot exceed ${MAX_LIMIT}`);
  }

  return options || {};
}

/**
 * Calculate offset from page number and limit
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Offset for database query
 */
export function calculateOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}

/**
 * Get page range for pagination UI
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param maxPages - Maximum number of page links to show
 * @returns Array of page numbers to display
 */
export function getPageRange(
  currentPage: number,
  totalPages: number,
  maxPages: number = 5
): number[] {
  if (totalPages <= maxPages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfMax = Math.floor(maxPages / 2);
  let start = Math.max(1, currentPage - halfMax);
  let end = Math.min(totalPages, start + maxPages - 1);

  // Adjust start if we're near the end
  if (end === totalPages) {
    start = Math.max(1, end - maxPages + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
