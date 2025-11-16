declare const PERMISSIONS: {
    ADMIN: string[];
    ORGANIZER: string[];
    BOARD: string[];
    JUDGE: string[];
    CONTESTANT: string[];
    EMCEE: string[];
    TALLY_MASTER: string[];
    AUDITOR: string[];
};
declare const hasPermission: (userRole: string, action: string) => boolean;
declare const canAccessResource: (userRole: string, resource: string, operation?: string) => boolean;
declare const getRolePermissions: (userRole: string) => string[];
declare const isAdmin: (userRole: string) => boolean;
export { PERMISSIONS, hasPermission, canAccessResource, getRolePermissions, isAdmin };
//# sourceMappingURL=permissions.d.ts.map