/**
 * Application Constants
 * Common constants used throughout the application
 */

/**
 * Time constants in milliseconds
 */
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000
} as const;

/**
 * Query limits for database operations
 */
export const QUERY_LIMITS = {
  DEFAULT: 1000,
  MAX: 10000,
  SMALL: 100,
  MEDIUM: 500,
  LARGE: 5000
} as const;

/**
 * Cache TTL values in milliseconds
 */
export const CACHE_TTL = {
  SHORT: 5 * TIME.MINUTE,      // 5 minutes
  MEDIUM: 30 * TIME.MINUTE,    // 30 minutes
  LONG: TIME.HOUR,             // 1 hour
  VERY_LONG: TIME.DAY          // 1 day
} as const;

/**
 * File size limits in bytes
 */
export const FILE_SIZE = {
  MB: 1024 * 1024,
  MAX_CSV_UPLOAD: 10 * 1024 * 1024,      // 10MB
  MAX_IMAGE_UPLOAD: 5 * 1024 * 1024,     // 5MB
  MAX_DOCUMENT_UPLOAD: 20 * 1024 * 1024  // 20MB
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
} as const;
