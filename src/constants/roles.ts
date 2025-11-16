import { UserRole } from '@prisma/client';

/**
 * User Role Constants
 * 
 * Centralized role definitions matching Prisma UserRole enum.
 * Use these constants instead of hardcoded strings to ensure consistency.
 */

// Role values matching Prisma schema
export const ROLES = {
  ADMIN: 'ADMIN' as UserRole,
  ORGANIZER: 'ORGANIZER' as UserRole,
  BOARD: 'BOARD' as UserRole,
  JUDGE: 'JUDGE' as UserRole,
  CONTESTANT: 'CONTESTANT' as UserRole,
  EMCEE: 'EMCEE' as UserRole,
  TALLY_MASTER: 'TALLY_MASTER' as UserRole,
  AUDITOR: 'AUDITOR' as UserRole
} as const;

// All valid roles as array
export const VALID_ROLES: UserRole[] = Object.values(ROLES) as UserRole[];

// Helper function to check if a role is valid
export const isValidRole = (role: string): role is UserRole => {
  return VALID_ROLES.includes(role as UserRole);
};

// Helper function to get all roles except admin (useful for certain validations)
export const getAllRolesExceptAdmin = (): UserRole[] => {
  return VALID_ROLES.filter(role => role !== ROLES.ADMIN);
};

export default ROLES;

