"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.getRolePermissions = exports.canAccessResource = exports.hasPermission = exports.PERMISSIONS = void 0;
const PERMISSIONS = {
    ADMIN: ["*"],
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
};
exports.PERMISSIONS = PERMISSIONS;
const hasPermission = (userRole, action) => {
    const rolePermissions = PERMISSIONS[userRole] || [];
    if (rolePermissions.includes("*")) {
        return true;
    }
    if (rolePermissions.includes(action)) {
        return true;
    }
    const [resource, operation] = action.split(":");
    if (operation && rolePermissions.includes(`${resource}:*`)) {
        return true;
    }
    return false;
};
exports.hasPermission = hasPermission;
const canAccessResource = (userRole, resource, operation = "read") => {
    const action = `${resource}:${operation}`;
    return hasPermission(userRole, action);
};
exports.canAccessResource = canAccessResource;
const getRolePermissions = (userRole) => {
    return PERMISSIONS[userRole] || [];
};
exports.getRolePermissions = getRolePermissions;
const isAdmin = (userRole) => {
    return userRole === "ADMIN" || PERMISSIONS[userRole]?.includes("*") || false;
};
exports.isAdmin = isAdmin;
//# sourceMappingURL=permissions.js.map