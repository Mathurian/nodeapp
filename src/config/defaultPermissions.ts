import { UserRole } from '@prisma/client';

/**
 * Default role permission matrix used as the fallback/baseline for dynamic permissions.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'],
  ORGANIZER: [
    'events:*', 'contests:*', 'categories:*', 'users:*', 'reports:*',
    'templates:*', 'settings:*', 'backup:*', 'emcee:*', 'category-types:*',
    'assignments:*', 'results:*', 'contestants:*', 'criteria:*', 'approvals:*',
    'tracker:*', 'scores:read', 'deductions:*', 'certifications:read', 'certifications:write',
    'files:*', 'permissions:read', 'permissions:write', 'commentary:read', 'profile:read',
  ],
  BOARD: [
    'events:*', 'contests:*', 'categories:*', 'results:*', 'reports:*', 'approvals:*',
    'users:*', 'settings:*', 'emcee:*', 'category-types:*',
    'assignments:*', 'scores:read', 'deductions:read', 'deductions:create', 'deductions:approve',
    'deductions:reject', 'certifications:read', 'certifications:write', 'files:read',
    'contestants:*', 'criteria:*', 'tracker:*',
    'commentary:read', 'profile:read',
  ],
  JUDGE: [
    'scores:write', 'scores:read', 'deductions:read', 'deductions:create', 'results:read', 'commentary:write',
    'events:read', 'contests:read', 'categories:read', 'certifications:write',
  ],
  CONTESTANT: [
    'events:read', 'contests:read', 'categories:read', 'results:read',
    'scores:read', 'commentary:read', 'profile:read', 'profile:write',
  ],
  EMCEE: [
    'events:read', 'contests:read', 'categories:read', 'results:read',
    'scores:read', 'announcements:write',
  ],
  TALLY_MASTER: [
    'scores:*', 'results:*', 'events:read', 'contests:read', 'categories:read',
    'reports:read', 'reports:write', 'tracker:*', 'certifications:read', 'certifications:write',
    'deductions:read', 'deductions:create',
  ],
  AUDITOR: [
    'events:read', 'contests:read', 'categories:read', 'results:read',
    'scores:read', 'reports:read', 'activity-logs:read', 'audit-logs:read', 'tracker:*',
    'approvals:write', 'certifications:read', 'certifications:write', 'deductions:read', 'deductions:create',
    'deductions:approve', 'deductions:reject',
  ],
};
