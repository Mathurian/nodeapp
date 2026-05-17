import { UserRole } from '@prisma/client';

/**
 * Default role permission matrix used as the fallback/baseline for dynamic permissions.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    '*',
    'delegated-scores:read',
    'delegated-scores:write',
    'delegated-scores:certify',
    'score-delegations:read',
    'score-delegations:write',
    'score-delegations:revoke',
  ],
  ORGANIZER: [
    'events:*', 'contests:*', 'categories:*', 'users:*', 'reports:*',
    'templates:*', 'settings:*', 'backup:*', 'emcee:*', 'category-types:*',
    'assignments:*', 'results:*', 'contestants:*', 'criteria:*', 'approvals:*',
    'tracker:*', 'scores:read', 'deductions:*', 'certifications:read', 'certifications:write',
    'files:*', 'score-governance:read', 'score-governance:request', 'score-governance:approve',
    'score-governance:reject', 'score-governance:configure', 'score-removal:read',
    'score-removal:request', 'score-removal:sign', 'score-removal:approve', 'score-removal:reject',
    'score-removal:execute', 'score-files:read', 'score-files:upload', 'score-files:update',
    'score-files:delete', 'scores:uncertify', 'scores:unsign', 'permissions:read', 'permissions:write',
    'commentary:read', 'profile:read',
  ],
  BOARD: [
    'events:*', 'contests:*', 'categories:*', 'results:*', 'reports:*', 'approvals:*',
    'users:*', 'settings:*', 'emcee:*', 'category-types:*',
    'assignments:*', 'scores:read', 'deductions:read', 'deductions:create', 'deductions:approve',
    'deductions:reject', 'certifications:read', 'certifications:write', 'files:read',
    'score-governance:read', 'score-governance:request', 'score-governance:approve',
    'score-governance:reject', 'score-removal:read', 'score-removal:request', 'score-removal:sign',
    'score-removal:approve', 'score-removal:reject', 'score-removal:execute', 'score-files:read',
    'score-files:upload', 'score-files:update', 'scores:unsign', 'contestants:*', 'criteria:*', 'tracker:*',
    'commentary:read', 'profile:read',
  ],
  JUDGE: [
    'scores:write', 'scores:read', 'scores:delete', 'scores:certify', 'deductions:read', 'deductions:create',
    'results:read', 'commentary:write', 'events:read', 'contests:read', 'categories:read',
    'contestants:read', 'certifications:read', 'certifications:write', 'score-governance:read', 'score-governance:request', 'score-files:read',
    'score-files:upload', 'score-files:delete',
  ],
  CONTESTANT: [
    'events:read', 'contests:read', 'categories:read', 'results:read',
    'scores:read', 'score-files:read', 'commentary:read', 'profile:read', 'profile:write',
  ],
  EMCEE: [
    'events:read', 'contests:read', 'categories:read', 'results:read',
    'scores:read', 'score-files:read', 'announcements:write',
  ],
  TALLY_MASTER: [
    'scores:*', 'results:*', 'events:read', 'contests:read', 'categories:read',
    'tracker:*', 'certifications:read', 'certifications:write',
    'deductions:read', 'deductions:create', 'score-governance:read', 'score-governance:request',
    'score-governance:approve', 'score-governance:reject', 'score-removal:read',
    'score-removal:request', 'score-files:read', 'score-files:upload',
  ],
  AUDITOR: [
    'events:read', 'contests:read', 'categories:read', 'results:read',
    'scores:read', 'reports:read', 'activity-logs:read', 'audit-logs:read', 'tracker:*',
    'approvals:write', 'certifications:read', 'certifications:write', 'deductions:read', 'deductions:create',
    'deductions:approve', 'deductions:reject', 'score-governance:read', 'score-governance:request',
    'score-governance:approve', 'score-governance:reject', 'score-removal:read',
    'score-removal:request', 'score-files:read', 'score-files:upload',
  ],
};
