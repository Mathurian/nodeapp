import { UserRole } from '@prisma/client';
export declare const ROLES: {
    readonly ADMIN: UserRole;
    readonly ORGANIZER: UserRole;
    readonly BOARD: UserRole;
    readonly JUDGE: UserRole;
    readonly CONTESTANT: UserRole;
    readonly EMCEE: UserRole;
    readonly TALLY_MASTER: UserRole;
    readonly AUDITOR: UserRole;
};
export declare const VALID_ROLES: UserRole[];
export declare const isValidRole: (role: string) => role is UserRole;
export declare const getAllRolesExceptAdmin: () => UserRole[];
export default ROLES;
//# sourceMappingURL=roles.d.ts.map