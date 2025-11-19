/**
 * Route Parameter Helpers
 * Utilities for safely accessing route parameters with TypeScript type safety
 */

import { Request } from 'express';

/**
 * Get a required route parameter
 * @param req - Express request object
 * @param key - Parameter name
 * @returns The parameter value
 * @throws Error if parameter is missing
 */
export function getRequiredParam(req: Request, key: string): string {
  const value = req.params[key];
  if (!value) {
    throw new Error(`Required route parameter '${key}' is missing`);
  }
  return value;
}

/**
 * Get an optional route parameter
 * @param req - Express request object
 * @param key - Parameter name
 * @returns The parameter value or undefined
 */
export function getOptionalParam(req: Request, key: string): string | undefined {
  return req.params[key];
}

/**
 * Get multiple required route parameters
 * @param req - Express request object
 * @param keys - Array of parameter names
 * @returns Object with parameter values
 * @throws Error if any parameter is missing
 */
export function getRequiredParams(req: Request, keys: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (const key of keys) {
    const value = req.params[key];
    if (!value) {
      throw new Error(`Required route parameter '${key}' is missing`);
    }
    result[key] = value;
  }

  return result;
}

/**
 * Get a required query parameter
 * @param req - Express request object
 * @param key - Query parameter name
 * @returns The query parameter value
 * @throws Error if parameter is missing
 */
export function getRequiredQuery(req: Request, key: string): string {
  const value = req.query[key];
  if (!value || typeof value !== 'string') {
    throw new Error(`Required query parameter '${key}' is missing or invalid`);
  }
  return value;
}

/**
 * Get an optional query parameter
 * @param req - Express request object
 * @param key - Query parameter name
 * @returns The query parameter value or undefined
 */
export function getOptionalQuery(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Get the tenant ID from request (added by tenant middleware)
 * @param req - Express request object
 * @returns The tenant ID
 * @throws Error if tenant ID is not set
 */
export function getTenantId(req: Request): string {
  const tenantId = req.tenantId;
  if (!tenantId) {
    throw new Error('Tenant ID not found in request');
  }
  return tenantId;
}

/**
 * Get the authenticated user ID from request
 * @param req - Express request object
 * @returns The user ID
 * @throws Error if user is not authenticated
 */
export function getUserId(req: Request): string {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
}

/**
 * Validate UUID format
 * @param value - String to validate
 * @param paramName - Parameter name for error message
 * @returns The validated UUID
 * @throws Error if UUID format is invalid
 */
export function validateUUID(value: string, paramName: string = 'id'): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(value)) {
    throw new Error(`Invalid UUID format for parameter '${paramName}'`);
  }

  return value;
}

/**
 * Get and validate a required UUID parameter
 * @param req - Express request object
 * @param key - Parameter name
 * @returns The validated UUID
 * @throws Error if parameter is missing or invalid
 */
export function getRequiredUUID(req: Request, key: string): string {
  const value = getRequiredParam(req, key);
  return validateUUID(value, key);
}
