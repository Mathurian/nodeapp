/**
 * Permission Middleware
 * Phase 4: Dynamic CRUD Permissions System
 *
 * Supports both hardcoded and dynamic (database-driven) permissions
 * Feature flag: ENABLE_DYNAMIC_PERMISSIONS controls which system is used
 */

import { container } from 'tsyringe';
import { DynamicPermissionService } from '../services/DynamicPermissionService';

// Hardcoded permission matrix for role-based access control (Fallback)
const PERMISSIONS = {
  SUPER_ADMIN: ["*"], // All permissions - SUPER_ADMIN has unrestricted access to EVERYTHING
  ADMIN: ["*"], // All permissions - ADMIN has access to EVERYTHING
  ORGANIZER: [
    "events:*", "contests:*", "categories:*", "users:*", "reports:*",
    "templates:*", "settings:*", "backup:*", "emcee:*", "category-types:*",
    "assignments:*", "results:*", "contestants:*", "criteria:*", "approvals:*",
    "tracker:*", "scores:read", "commentary:read", "profile:read"
  ],
  BOARD: [
    "events:*", "contests:*", "categories:*", "results:*", "reports:*", "approvals:*",
    "users:*", "settings:*", "emcee:*", "category-types:*",
    "assignments:*", "scores:read", "contestants:*", "criteria:*", "tracker:*",
    "commentary:read", "profile:read"
  ],
  JUDGE: [
    "scores:write", "scores:read", "results:read", "commentary:write",
    "events:read", "contests:read", "categories:read"
  ],
  CONTESTANT: [
    "events:read", "contests:read", "categories:read", "results:read",
    "scores:read", "commentary:read", "profile:read", "profile:write"
  ],
  EMCEE: [
    "events:read", "contests:read", "categories:read", "results:read",
    "scores:read", "announcements:write"
  ],
  TALLY_MASTER: [
    "scores:*", "results:*", "events:read", "contests:read", "categories:read",
    "reports:read", "tracker:*", "certifications:write"
  ],
  AUDITOR: [
    "events:read", "contests:read", "categories:read", "results:read",
    "scores:read", "reports:read", "activity-logs:read", "audit-logs:read", "tracker:*",
    "approvals:write", "certifications:write"
  ]
}

// Feature flag - set to true to enable dynamic permissions
const ENABLE_DYNAMIC_PERMISSIONS = process.env['ENABLE_DYNAMIC_PERMISSIONS'] === 'true';

/**
 * Get permissions from either dynamic system or hardcoded fallback
 */
const getRolePermissionsFromSource = async (
  userRole: string,
  tenantId?: string
): Promise<string[]> => {
  // If dynamic permissions disabled or no tenantId, use hardcoded
  if (!ENABLE_DYNAMIC_PERMISSIONS || !tenantId) {
    return PERMISSIONS[userRole as keyof typeof PERMISSIONS] || [];
  }

  // Try dynamic permissions
  try {
    const dynamicPermissionService = container.resolve(DynamicPermissionService);
    const permissions = await dynamicPermissionService.getPermissions(
      userRole as any,
      tenantId
    );

    // If no dynamic permissions found, fall back to hardcoded
    if (permissions.length === 0) {
      return PERMISSIONS[userRole as keyof typeof PERMISSIONS] || [];
    }

    return permissions;
  } catch (error) {
    // On error, fall back to hardcoded permissions
    console.error('Failed to load dynamic permissions, using hardcoded:', error);
    return PERMISSIONS[userRole as keyof typeof PERMISSIONS] || [];
  }
};

/**
 * Check if a permission list includes a specific action
 * Handles wildcards (*:* and resource:*)
 */
const checkPermission = (permissions: string[], action: string): boolean => {
  // Wildcard check (*:* means all permissions)
  if (permissions.includes("*") || permissions.includes("*:*")) {
    return true;
  }

  // Exact match
  if (permissions.includes(action)) {
    return true;
  }

  // Check for wildcard match (e.g., "events:*" matches "events:create")
  const [resource, operation] = action.split(":");
  if (operation && permissions.includes(`${resource}:*`)) {
    return true;
  }

  return false;
};

/**
 * Check if user has permission for a specific action (ASYNC)
 * Use this for new code that supports dynamic permissions
 */
const hasPermissionAsync = async (
  userRole: string,
  action: string,
  tenantId?: string
): Promise<boolean> => {
  const rolePermissions = await getRolePermissionsFromSource(userRole, tenantId);
  return checkPermission(rolePermissions, action);
};

/**
 * Check if user has permission for a specific action (SYNC - Legacy)
 * Only uses hardcoded permissions, kept for backward compatibility
 */
const hasPermission = (userRole: string, action: string): boolean => {
  const rolePermissions = PERMISSIONS[userRole as keyof typeof PERMISSIONS] || [];
  return checkPermission(rolePermissions, action);
};

/**
 * Check if user can access a specific resource (ASYNC)
 */
const canAccessResourceAsync = async (
  userRole: string,
  resource: string,
  operation: string = "read",
  tenantId?: string
): Promise<boolean> => {
  const action = `${resource}:${operation}`;
  return hasPermissionAsync(userRole, action, tenantId);
};

/**
 * Check if user can access a specific resource (SYNC - Legacy)
 */
const canAccessResource = (userRole: string, resource: string, operation = "read"): boolean => {
  const action = `${resource}:${operation}`;
  return hasPermission(userRole, action);
};

/**
 * Get all permissions for a role (ASYNC)
 */
const getRolePermissions = async (userRole: string, tenantId?: string): Promise<string[]> => {
  return getRolePermissionsFromSource(userRole, tenantId);
};

/**
 * Get all permissions for a role (SYNC - Legacy)
 */
const getRolePermissionsSync = (userRole: string): string[] => {
  return PERMISSIONS[userRole as keyof typeof PERMISSIONS] || [];
};

/**
 * Check if user is admin (has all permissions)
 */
const isAdmin = (userRole: string): boolean => {
  return userRole === "SUPER_ADMIN" || userRole === "ADMIN" ||
         PERMISSIONS[userRole as keyof typeof PERMISSIONS]?.includes("*") || false;
};

export {
  PERMISSIONS,
  ENABLE_DYNAMIC_PERMISSIONS,
  hasPermission,
  hasPermissionAsync,
  canAccessResource,
  canAccessResourceAsync,
  getRolePermissions,
  getRolePermissionsSync,
  isAdmin,
  checkPermission
}