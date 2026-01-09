import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('InputSanitization');

/**
 * SECURITY FIX #16: Input Sanitization Middleware
 *
 * Sanitizes user input to prevent XSS, injection attacks, and other security issues.
 * Applies to req.body, req.query, and req.params
 *
 * Features:
 * - Trims whitespace from strings
 * - Removes null bytes
 * - Sanitizes HTML tags (configurable)
 * - Limits string lengths
 * - Detects and blocks suspicious patterns
 */

// Configurable options for sanitization
interface SanitizationOptions {
  allowHtml?: boolean;           // Allow HTML tags (default: false)
  maxStringLength?: number;      // Maximum string length (default: 10000)
  trimWhitespace?: boolean;      // Trim leading/trailing whitespace (default: true)
  removeNullBytes?: boolean;     // Remove null bytes (default: true)
  blockSuspiciousPatterns?: boolean; // Block SQL/script injection patterns (default: true)
}

const DEFAULT_OPTIONS: SanitizationOptions = {
  allowHtml: false,
  maxStringLength: 10000,
  trimWhitespace: true,
  removeNullBytes: true,
  blockSuspiciousPatterns: true
};

/**
 * Suspicious patterns that might indicate injection attempts
 * These are common SQL injection and script injection patterns
 */
const SUSPICIOUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,     // Script tags
  /javascript:/gi,                     // JavaScript protocol
  /on\w+\s*=/gi,                       // Event handlers (onclick, onerror, etc.)
  /data:text\/html/gi,                 // Data URLs with HTML
  /vbscript:/gi,                       // VBScript protocol
  /<!--.*?-->/g,                       // HTML comments (sometimes used in attacks)
];

/**
 * Sanitize a single string value
 */
function sanitizeString(value: string, options: SanitizationOptions): string {
  let sanitized = value;

  // Remove null bytes
  if (options.removeNullBytes) {
    sanitized = sanitized.replace(/\0/g, '');
  }

  // Trim whitespace
  if (options.trimWhitespace) {
    sanitized = sanitized.trim();
  }

  // Check string length
  if (options.maxStringLength && sanitized.length > options.maxStringLength) {
    throw new Error(`Input exceeds maximum length of ${options.maxStringLength} characters`);
  }

  // Remove HTML tags if not allowed
  if (!options.allowHtml) {
    // Basic HTML tag removal (for simple XSS prevention)
    // For more robust sanitization, consider using libraries like DOMPurify
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Check for suspicious patterns
  if (options.blockSuspiciousPatterns) {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        logger.warn('Suspicious pattern detected in input', {
          pattern: pattern.source,
          input: sanitized.substring(0, 100) // Log only first 100 chars
        });
        throw new Error('Input contains suspicious patterns');
      }
    }
  }

  return sanitized;
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any, options: SanitizationOptions, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    logger.warn('Maximum sanitization depth exceeded');
    return obj;
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options, depth + 1));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = typeof key === 'string' ? sanitizeString(key, { ...options, allowHtml: false }) : key;
      sanitized[sanitizedKey] = sanitizeObject(value, options, depth + 1);
    }
    return sanitized;
  }

  // Handle strings
  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }

  // Return other types as-is (numbers, booleans, etc.)
  return obj;
}

/**
 * Express middleware for input sanitization
 *
 * Usage:
 *   app.use(inputSanitization()); // Use defaults
 *   app.use(inputSanitization({ allowHtml: true })); // Allow HTML
 *   router.post('/api/endpoint', inputSanitization({ maxStringLength: 5000 }), handler);
 */
export const inputSanitization = (options: SanitizationOptions = {}) => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, mergedOptions);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query, mergedOptions);
      }

      // Sanitize route parameters
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params, mergedOptions);
      }

      next();
    } catch (error) {
      const errorObj = error as { message?: string };
      logger.error('Input sanitization failed', {
        error: errorObj.message,
        path: req.path,
        method: req.method
      });

      res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: errorObj.message || 'Input validation failed'
      });
    }
  };
};

/**
 * Middleware specifically for endpoints that allow HTML content
 * (e.g., rich text editors, descriptions)
 */
export const inputSanitizationWithHtml = inputSanitization({ allowHtml: true });

/**
 * Middleware for endpoints with shorter input requirements
 * (e.g., titles, names)
 */
export const inputSanitizationShortText = inputSanitization({ maxStringLength: 500 });

/**
 * Strict sanitization for security-sensitive endpoints
 * (e.g., authentication, password reset)
 */
export const inputSanitizationStrict = inputSanitization({
  allowHtml: false,
  maxStringLength: 1000,
  trimWhitespace: true,
  removeNullBytes: true,
  blockSuspiciousPatterns: true
});

/**
 * Utility function to manually sanitize a value
 * Useful for sanitizing data from external sources (not HTTP requests)
 */
export function sanitizeValue(value: any, options: SanitizationOptions = {}): any {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  return sanitizeObject(value, mergedOptions);
}

export default inputSanitization;
