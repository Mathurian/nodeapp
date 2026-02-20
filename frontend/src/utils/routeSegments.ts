const KNOWN_ROUTE_SEGMENTS = new Set([
  'login', 'register', 'forgot-password', 'dashboard', 'events', 'contests', 'categories',
  'scoring', 'results', 'users', 'admin', 'settings', 'profile', 'emcee',
  'templates', 'reports', 'notifications', 'backups', 'disaster-recovery',
  'workflows', 'files', 'email-templates', 'send-email', 'custom-fields',
  'tenants', 'mfa', 'database', 'cache', 'archive', 'deductions',
  'certifications', 'logs', 'performance', 'data-wipe', 'event-templates',
  'bulk-operations', 'category-types', 'field-visibility',
  'test-event-setup', 'help', 'bios', 'assignments', 'rate-limit-configs',
  'activity', 'auditor', 'board', 'permissions', 'test-runner', 'tally-master',
  'winners', 'score-governance', 'login-locations',
])

const RESERVED_NON_TENANT_PREFIXES = new Set([
  'api', 'assets', 'uploads', 'socket.io', 'cdn-cgi', 'favicon.ico', 'robots.txt',
  'manifest.webmanifest', 'sw.js', 'service-worker.js', 'registerSW.js', 'offline.html',
])

export const isKnownRoute = (segment: string): boolean => KNOWN_ROUTE_SEGMENTS.has(segment)

export const isReservedNonTenantPrefix = (segment: string): boolean =>
  RESERVED_NON_TENANT_PREFIXES.has(segment) || isKnownRoute(segment)

export const extractTenantSlugFromPath = (pathname: string): string | null => {
  const firstSegment = pathname.split('/').filter(Boolean)[0]
  if (!firstSegment || isReservedNonTenantPrefix(firstSegment)) {
    return null
  }
  return firstSegment
}
