/**
 * Backend Input Sanitization and Validation Utilities
 * Prevents XSS, SQL injection, and other injection attacks
 */

// @ts-ignore - validator types not available
import validator from 'validator'

/**
 * Sanitize string input by removing dangerous characters
 * @param input - The input string to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export const sanitizeString = (
  input: string,
  options: {
    allowHtml?: boolean
    maxLength?: number
    trim?: boolean
  } = {}
): string => {
  if (!input || typeof input !== 'string') {
    return ''
  }

  let sanitized = input

  // Trim whitespace if requested
  if (options.trim !== false) {
    sanitized = sanitized.trim()
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // If HTML is not allowed, escape it
  if (!options.allowHtml) {
    sanitized = validator.escape(sanitized)
  }

  // Apply max length if specified
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength)
  }

  return sanitized
}

/**
 * Sanitize email address
 * @param email - The email to sanitize and validate
 * @returns Sanitized email or empty string if invalid
 */
export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') {
    return ''
  }

  const sanitized = validator.normalizeEmail(email.trim().toLowerCase()) || ''

  // Additional validation
  if (!validator.isEmail(sanitized)) {
    return ''
  }

  return sanitized
}

/**
 * Sanitize URL
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return ''
  }

  const trimmed = url.trim()

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  const lowerUrl = trimmed.toLowerCase()

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      console.warn(`Blocked dangerous URL protocol: ${protocol}`)
      return ''
    }
  }

  // Validate URL format
  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: false
  })) {
    return ''
  }

  return trimmed
}

/**
 * Sanitize filename to prevent path traversal attacks
 * @param filename - The filename to sanitize
 * @returns Safe filename
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename || typeof filename !== 'string') {
    return ''
  }

  // Remove path separators and dangerous characters
  let sanitized = filename
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*\x00-\x1f]/g, '') // Remove illegal characters
    .trim()

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || ''
    const nameWithoutExt = sanitized.substring(0, sanitized.length - ext.length - 1)
    sanitized = nameWithoutExt.substring(0, 250 - ext.length) + '.' + ext
  }

  return sanitized
}

/**
 * Sanitize phone number
 * @param phone - The phone number to sanitize
 * @returns Sanitized phone number
 */
export const sanitizePhoneNumber = (phone: string): string => {
  if (!phone || typeof phone !== 'string') {
    return ''
  }

  // Remove all non-numeric characters except + at the start
  const sanitized = phone.trim().replace(/[^\d+]/g, '')

  return sanitized
}

/**
 * Sanitize integer input
 * @param input - The input to convert to integer
 * @param options - Validation options
 * @returns Sanitized integer or null if invalid
 */
export const sanitizeInteger = (
  input: unknown,
  options: {
    min?: number
    max?: number
  } = {}
): number | null => {
  const num = parseInt(String(input), 10)

  if (isNaN(num)) {
    return null
  }

  if (options.min !== undefined && num < options.min) {
    return null
  }

  if (options.max !== undefined && num > options.max) {
    return null
  }

  return num
}

/**
 * Sanitize float input
 * @param input - The input to convert to float
 * @param options - Validation options
 * @returns Sanitized float or null if invalid
 */
export const sanitizeFloat = (
  input: unknown,
  options: {
    min?: number
    max?: number
    decimals?: number
  } = {}
): number | null => {
  const num = parseFloat(String(input))

  if (isNaN(num)) {
    return null
  }

  if (options.min !== undefined && num < options.min) {
    return null
  }

  if (options.max !== undefined && num > options.max) {
    return null
  }

  // Round to specified decimal places
  if (options.decimals !== undefined) {
    return Math.round(num * Math.pow(10, options.decimals)) / Math.pow(10, options.decimals)
  }

  return num
}

/**
 * Sanitize boolean input
 * @param input - The input to convert to boolean
 * @returns Boolean value
 */
export const sanitizeBoolean = (input: unknown): boolean => {
  if (typeof input === 'boolean') {
    return input
  }

  if (typeof input === 'string') {
    const lower = input.toLowerCase().trim()
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on'
  }

  if (typeof input === 'number') {
    return input !== 0
  }

  return false
}

/**
 * Sanitize object by sanitizing all string values
 * @param obj - The object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized object
 */
export const sanitizeObject = <T extends Record<string, unknown>>(
  obj: T,
  options: {
    allowHtml?: boolean
    maxLength?: number
  } = {}
): T => {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const sanitized: Record<string, unknown> = Array.isArray(obj) ? [] : {}

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key]

      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value, options)
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, options)
      } else {
        sanitized[key] = value
      }
    }
  }

  return sanitized as T
}

/**
 * Validate and sanitize SQL table/column names to prevent SQL injection
 * @param name - The table or column name
 * @returns Safe name or null if invalid
 */
export const sanitizeSqlIdentifier = (name: string): string | null => {
  if (!name || typeof name !== 'string') {
    return null
  }

  // Only allow alphanumeric characters and underscores
  const sanitized = name.trim()

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(sanitized)) {
    console.warn(`Invalid SQL identifier blocked: ${name}`)
    return null
  }

  // Prevent SQL reserved keywords (basic list)
  const sqlKeywords = [
    'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER',
    'TABLE', 'FROM', 'WHERE', 'JOIN', 'UNION', 'EXEC', 'EXECUTE'
  ]

  if (sqlKeywords.includes(sanitized.toUpperCase())) {
    console.warn(`SQL keyword blocked as identifier: ${name}`)
    return null
  }

  return sanitized
}

/**
 * Strip all HTML tags from string
 * @param html - The HTML string
 * @returns Plain text
 */
export const stripHtmlTags = (html: string): string => {
  if (!html || typeof html !== 'string') {
    return ''
  }

  return validator.stripLow(html.replace(/<[^>]*>/g, ''))
}

export default {
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeFilename,
  sanitizePhoneNumber,
  sanitizeInteger,
  sanitizeFloat,
  sanitizeBoolean,
  sanitizeObject,
  sanitizeSqlIdentifier,
  stripHtmlTags
}
