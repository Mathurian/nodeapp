/**
 * Request Validation Utilities
 *
 * Provides type-safe guards for validating request context
 * Addresses Critical Issue 1.1 from ClaudeReview9Jan26.md
 *
 * Created: January 9, 2026
 */

import { Request, Response } from 'express';
import { User } from '@prisma/client';

/**
 * Type guard that validates req.user exists and returns typed user
 *
 * @param req Express request object
 * @param res Express response object
 * @returns True if user exists (with type narrowing), false otherwise
 *
 * @example
 * async myController(req: Request, res: Response) {
 *   if (!requireAuthenticatedUser(req, res)) return;
 *   // Now TypeScript knows req.user exists
 *   const userId = req.user.id;
 * }
 */
export function requireAuthenticatedUser(
  req: Request,
  res: Response
): req is Request & { user: User } {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'User must be authenticated to access this resource',
      code: 'AUTH_REQUIRED'
    });
    return false;
  }
  return true;
}

/**
 * Type guard that validates req.tenantId exists
 *
 * @param req Express request object
 * @param res Express response object
 * @returns True if tenantId exists (with type narrowing), false otherwise
 */
export function requireTenantContext(
  req: Request,
  res: Response
): req is Request & { tenantId: string } {
  if (!req.tenantId) {
    res.status(400).json({
      success: false,
      error: 'Tenant context required',
      message: 'Tenant identification is required for this operation',
      code: 'TENANT_REQUIRED'
    });
    return false;
  }
  return true;
}

/**
 * Combined validation for both user authentication and tenant context
 *
 * @param req Express request object
 * @param res Express response object
 * @returns True if both user and tenantId exist (with type narrowing), false otherwise
 *
 * @example
 * async myController(req: Request, res: Response) {
 *   if (!requireAuthAndTenant(req, res)) return;
 *   // Now TypeScript knows both req.user and req.tenantId exist
 *   const userId = req.user.id;
 *   const tenantId = req.tenantId;
 * }
 */
export function requireAuthAndTenant(
  req: Request,
  res: Response
): req is Request & { user: User; tenantId: string } {
  if (!requireAuthenticatedUser(req, res)) {
    return false;
  }
  if (!requireTenantContext(req, res)) {
    return false;
  }
  return true;
}

/**
 * Validates that user has a specific role-related ID (judgeId, contestantId, etc.)
 *
 * @param req Express request object
 * @param res Express response object
 * @param roleIdField The field name to check (e.g., 'judgeId', 'contestantId')
 * @param roleName Human-readable role name for error message
 * @returns True if the role ID exists, false otherwise
 *
 * @example
 * if (!requireRoleId(req, res, 'judgeId', 'Judge')) return;
 * const judgeId = req.user.judgeId;  // Now guaranteed to exist
 */
export function requireRoleId(
  req: Request,
  res: Response,
  roleIdField: keyof User,
  roleName: string
): boolean {
  if (!requireAuthenticatedUser(req, res)) {
    return false;
  }

  const roleId = req.user[roleIdField];
  if (!roleId) {
    res.status(403).json({
      success: false,
      error: 'Role assignment required',
      message: `User must be assigned as a ${roleName} to perform this action`,
      code: 'ROLE_NOT_ASSIGNED'
    });
    return false;
  }

  return true;
}

/**
 * Validates request body contains required fields
 *
 * @param req Express request object
 * @param res Express response object
 * @param requiredFields Array of field names that must exist in req.body
 * @returns True if all required fields exist, false otherwise
 *
 * @example
 * if (!requireBodyFields(req, res, ['email', 'name', 'role'])) return;
 * // Now we know these fields exist in req.body
 */
export function requireBodyFields(
  req: Request,
  res: Response,
  requiredFields: string[]
): boolean {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: `The following fields are required: ${missingFields.join(', ')}`,
      missingFields,
      code: 'MISSING_FIELDS'
    });
    return false;
  }

  return true;
}

/**
 * Validates request params contains required parameters
 *
 * @param req Express request object
 * @param res Express response object
 * @param requiredParams Array of parameter names that must exist in req.params
 * @returns True if all required params exist, false otherwise
 */
export function requireParams(
  req: Request,
  res: Response,
  requiredParams: string[]
): boolean {
  const missingParams: string[] = [];

  for (const param of requiredParams) {
    if (!req.params[param]) {
      missingParams.push(param);
    }
  }

  if (missingParams.length > 0) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters',
      message: `The following URL parameters are required: ${missingParams.join(', ')}`,
      missingParams,
      code: 'MISSING_PARAMS'
    });
    return false;
  }

  return true;
}
