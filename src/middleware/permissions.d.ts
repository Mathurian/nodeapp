/**
 * Type declarations for permissions middleware
 */

export const PERMISSIONS: {
  [key: string]: string[];
};

export function getRolePermissions(role: string): string[];
export function isAdmin(role: string): boolean;
export function hasPermission(role: string, permission: string): boolean;
