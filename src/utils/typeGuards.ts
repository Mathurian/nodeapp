/**
 * Type Guard Utilities
 * Runtime type checking functions to replace unsafe type assertions
 */

import { Request } from 'express';
import { User, Judge, Contestant } from '@prisma/client';

/**
 * Authenticated request with user information
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
    tenantId: string;
    judgeId?: string;
    contestantId?: string;
  };
  tenantId?: string;
  file?: Express.Multer.File;
}

/**
 * User with relations included
 */
export interface UserWithRelations extends User {
  judge?: Judge | null;
  contestant?: Contestant | null;
  email: string;
}

/**
 * Type guard to check if request has authenticated user
 */
export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return (
    req.user !== undefined &&
    typeof req.user === 'object' &&
    req.user !== null &&
    'id' in req.user &&
    'role' in req.user &&
    'tenantId' in req.user &&
    typeof req.user.id === 'string' &&
    typeof req.user.role === 'string' &&
    typeof req.user.tenantId === 'string'
  );
}

/**
 * Type guard to check if user has judge/contestant relations
 */
export function isUserWithRelations(user: any): user is UserWithRelations {
  return (
    user !== null &&
    typeof user === 'object' &&
    'id' in user &&
    'email' in user &&
    typeof user.email === 'string'
  );
}

/**
 * Assert that request is authenticated, throw error if not
 * Use this for better error messages than type assertions
 */
export function assertAuthenticated(req: Request): asserts req is AuthenticatedRequest {
  if (!isAuthenticatedRequest(req)) {
    throw new Error('Request is not authenticated');
  }
}

/**
 * Get authenticated user from request or throw error
 */
export function getAuthenticatedUser(req: Request): NonNullable<AuthenticatedRequest['user']> {
  if (!req.user) {
    const error: any = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }
  return req.user;
}
