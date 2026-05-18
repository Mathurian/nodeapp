export interface PageAccessPolicy {
  id: string
  path: string
  baseRoles: string[]
  resource?: string
  requiredAction?: string
  allowCrudReadOverride?: boolean
  requireResourcePermission?: boolean
  hardProtected?: boolean
}

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'DELEGATE', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']

// Canonical page-access policy used by route guards, nav, and command palette.
export const PAGE_ACCESS_POLICIES: PageAccessPolicy[] = [
  { id: 'dashboard', path: '/dashboard', baseRoles: ALL_ROLES },
  { id: 'profile', path: '/profile', baseRoles: ALL_ROLES, resource: 'profile', allowCrudReadOverride: true },
  { id: 'notifications', path: '/notifications', baseRoles: ALL_ROLES },
  { id: 'bios', path: '/bios', baseRoles: ALL_ROLES, resource: 'contestants', allowCrudReadOverride: true },

  { id: 'events', path: '/events', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'events', allowCrudReadOverride: true },
  { id: 'contests', path: '/contests', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'contests', allowCrudReadOverride: true },
  { id: 'categories', path: '/categories', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'categories', allowCrudReadOverride: true },
  { id: 'templates', path: '/templates', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'templates', allowCrudReadOverride: true },
  { id: 'event-templates', path: '/event-templates', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'templates', allowCrudReadOverride: true },
  { id: 'archive', path: '/archive', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'events', allowCrudReadOverride: true },
  { id: 'category-types', path: '/category-types', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'categories', allowCrudReadOverride: true },

  { id: 'scoring', path: '/scoring', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'BOARD', 'JUDGE', 'DELEGATE'], resource: 'scores', requireResourcePermission: true },
  { id: 'tally-master', path: '/tally-master', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'TALLY_MASTER'], resource: 'scores', requireResourcePermission: true },
  { id: 'auditor', path: '/auditor', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'], resource: 'scores', requireResourcePermission: true },
  { id: 'certifications', path: '/certifications', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR'], resource: 'certifications', requireResourcePermission: true },
  { id: 'score-governance', path: '/score-governance', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE'], resource: 'score-governance', requireResourcePermission: true },
  { id: 'governance', path: '/governance', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE'], resource: 'score-governance', requireResourcePermission: true },
  { id: 'score-removal', path: '/score-removal', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE'], resource: 'score-removal', requireResourcePermission: true },
  { id: 'score-removal-requests', path: '/score-removal-requests', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE'], resource: 'score-removal', requireResourcePermission: true },
  { id: 'deductions', path: '/deductions', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE', 'TALLY_MASTER', 'AUDITOR'], resource: 'deductions', requireResourcePermission: true },
  { id: 'judge-schedules', path: '/judge-schedules', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE'], resource: 'assignments', allowCrudReadOverride: true },

  { id: 'results', path: '/results', baseRoles: ALL_ROLES, resource: 'results', allowCrudReadOverride: true },
  { id: 'winners', path: '/winners', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR'], resource: 'results', allowCrudReadOverride: true },
  { id: 'reports', path: '/reports', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'reports', requireResourcePermission: true },

  { id: 'users', path: '/users', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'users', requiredAction: 'users:write' },
  { id: 'assignments', path: '/assignments', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'assignments', requiredAction: 'assignments:write' },
  { id: 'bulk-operations', path: '/bulk-operations', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'users', requiredAction: 'users:write' },
  { id: 'send-email', path: '/send-email', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'users', requiredAction: 'users:write' },

  { id: 'admin', path: '/admin', baseRoles: ['SUPER_ADMIN', 'ADMIN'], hardProtected: true },
  { id: 'settings', path: '/settings', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'settings', allowCrudReadOverride: true },
  { id: 'permissions', path: '/permissions', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'], resource: 'permissions', allowCrudReadOverride: true },
  { id: 'permissions-audit-logs', path: '/permissions/audit-logs', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'], resource: 'permissions', allowCrudReadOverride: true },

  { id: 'database', path: '/database', baseRoles: ['SUPER_ADMIN'], hardProtected: true },
  { id: 'cache', path: '/cache', baseRoles: ['SUPER_ADMIN', 'ADMIN'], hardProtected: true },
  { id: 'logs', path: '/logs', baseRoles: ['SUPER_ADMIN', 'ADMIN'], hardProtected: true },
  { id: 'activity', path: '/activity', baseRoles: ['SUPER_ADMIN', 'ADMIN'], hardProtected: true },
  { id: 'login-locations', path: '/login-locations', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'], hardProtected: true },
  { id: 'performance', path: '/performance', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'], hardProtected: true },
  { id: 'backups', path: '/backups', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], hardProtected: true },
  { id: 'disaster-recovery', path: '/disaster-recovery', baseRoles: ['SUPER_ADMIN', 'ADMIN'], hardProtected: true },
  { id: 'data-wipe', path: '/data-wipe', baseRoles: ['SUPER_ADMIN', 'ADMIN'], hardProtected: true },

  { id: 'email-templates', path: '/email-templates', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'templates', allowCrudReadOverride: true },
  { id: 'emcee', path: '/emcee', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE'], resource: 'emcee', allowCrudReadOverride: true },

  { id: 'workflows', path: '/workflows', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'tracker', allowCrudReadOverride: true },
  { id: 'custom-fields', path: '/custom-fields', baseRoles: ['SUPER_ADMIN', 'ADMIN'], hardProtected: true },
  { id: 'files', path: '/files', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'], resource: 'files', requireResourcePermission: true },
  { id: 'mfa', path: '/mfa', baseRoles: ALL_ROLES, hardProtected: true },
  { id: 'tenants', path: '/tenants', baseRoles: ['SUPER_ADMIN', 'ADMIN'], hardProtected: true },

  { id: 'auditor-pending-audits', path: '/auditor/pending-audits', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'], resource: 'scores', requireResourcePermission: true },
  { id: 'auditor-score-verification', path: '/auditor/score-verification', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'], resource: 'scores', requireResourcePermission: true },
  { id: 'auditor-final-certification', path: '/auditor/final-certification', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'], resource: 'certifications', allowCrudReadOverride: true },
  { id: 'auditor-certification-status', path: '/auditor/certification-status', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'], resource: 'certifications', allowCrudReadOverride: true },
  { id: 'auditor-reports', path: '/auditor/reports', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'], resource: 'reports', requireResourcePermission: true },
  { id: 'auditor-audit-log', path: '/auditor/audit-log', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'], resource: 'audit-logs', allowCrudReadOverride: true },
  { id: 'board', path: '/board', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'BOARD'], resource: 'approvals', allowCrudReadOverride: true },
  { id: 'board-certifications', path: '/board/certifications', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'BOARD'], resource: 'certifications', requireResourcePermission: true },
  { id: 'board-score-removal', path: '/board/score-removal', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'BOARD'], resource: 'score-removal', requireResourcePermission: true },

  { id: 'field-visibility', path: '/field-visibility', baseRoles: ['SUPER_ADMIN', 'ADMIN'], hardProtected: true },
  { id: 'test-event-setup', path: '/test-event-setup', baseRoles: ['SUPER_ADMIN', 'ADMIN'], hardProtected: true },
  { id: 'rate-limit-configs', path: '/rate-limit-configs', baseRoles: ['SUPER_ADMIN', 'ADMIN'], hardProtected: true },
  { id: 'uat-ids', path: '/uat-ids', baseRoles: ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'], hardProtected: true },
  { id: 'test-runner', path: '/test-runner', baseRoles: ['SUPER_ADMIN'], hardProtected: true }
]

export const PAGE_ACCESS_BY_PATH = new Map(PAGE_ACCESS_POLICIES.map((policy) => [policy.path, policy]))
export const PAGE_ACCESS_BY_ID = new Map(PAGE_ACCESS_POLICIES.map((policy) => [policy.id, policy]))
