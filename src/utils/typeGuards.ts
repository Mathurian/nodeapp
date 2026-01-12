/**
 * Type Guard Utilities
 * Runtime type checking functions to replace unsafe type assertions
 */

import { Request } from 'express';
import { User, Judge, Contestant } from '@prisma/client';

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
 * Returns true if req.user is defined and contains required fields
 */
export function isAuthenticatedRequest(req: Request): req is Request & { user: NonNullable<Request['user']> } {
  return (
    req.user !== undefined &&
    typeof req.user === 'object' &&
    req.user !== null &&
    'id' in req.user &&
    'role' in req.user &&
    'tenantId' in req.user
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
export function assertAuthenticated(req: Request): asserts req is Request & { user: NonNullable<Request['user']> } {
  if (!req.user) {
    throw new Error('Request is not authenticated');
  }
}

/**
 * Get authenticated user from request or throw error
 * @throws Error with statusCode 401 if user is not authenticated
 */
export function getAuthenticatedUser(req: Request): NonNullable<Request['user']> {
  if (!req.user) {
    const error: any = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }
  return req.user;
}
