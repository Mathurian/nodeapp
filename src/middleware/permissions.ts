// Permission matrix for role-based access control
const PERMISSIONS = {
  ADMIN: ["*"], // All permissions - ADMIN has access to EVERYTHING
  ORGANIZER: [
    "events:*", "contests:*", "categories:*", "users:*", "reports:*",
    "templates:*", "settings:*", "backup:*", "emcee:*", "category-types:*",
    "assignments:*", "results:*"
  ],
  BOARD: [
    "events:read", "contests:read", "results:*", "reports:*", "approvals:*",
    "users:read", "settings:read", "emcee:read", "category-types:read",
    "assignments:*"
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
    "reports:read", "tracker:*"
  ],
  AUDITOR: [
    "events:read", "contests:read", "categories:read", "results:read",
    "scores:read", "reports:read", "activity-logs:read", "audit-logs:read", "tracker:*"
  ]
}

// Check if user has permission for a specific action
const hasPermission = (userRole: string, action: string): boolean => {
  const rolePermissions = PERMISSIONS[userRole as keyof typeof PERMISSIONS] || [];
  
  // ADMIN has all permissions
  if (rolePermissions.includes("*")) {
    return true
  }
  
  // Check for exact match
  if (rolePermissions.includes(action)) {
    return true
  }
  
  // Check for wildcard match (e.g., "events:*" matches "events:create")
  const [resource, operation] = action.split(":")
  if (operation && rolePermissions.includes(`${resource}:*`)) {
    return true
  }
  
  return false
}

// Check if user can access a specific resource
const canAccessResource = (userRole: string, resource: string, operation = "read"): boolean => {
  const action = `${resource}:${operation}`
  return hasPermission(userRole, action)
}

// Get all permissions for a role
const getRolePermissions = (userRole: string): string[] => {
  return PERMISSIONS[userRole as keyof typeof PERMISSIONS] || [];
};

// Check if user is admin (has all permissions)
const isAdmin = (userRole: string): boolean => {
  return userRole === "ADMIN" || PERMISSIONS[userRole as keyof typeof PERMISSIONS]?.includes("*") || false;
};

export { 
  PERMISSIONS,
  hasPermission,
  canAccessResource,
  getRolePermissions,
  isAdmin
 }