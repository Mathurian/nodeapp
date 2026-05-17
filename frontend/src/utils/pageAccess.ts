import { PAGE_ACCESS_BY_ID, PAGE_ACCESS_BY_PATH, type PageAccessPolicy } from '../config/pageAccessPolicy'
import { isKnownRoute } from './routeSegments'

const normalizeRole = (role: string | undefined | null) => String(role || '').trim().toUpperCase()
const isPlatformAdminRole = (normalizedRole: string): boolean =>
  normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ADMIN'
const isAdminPlaneRole = (normalizedRole: string): boolean =>
  normalizedRole === 'SUPER_ADMIN' ||
  normalizedRole === 'ADMIN' ||
  normalizedRole === 'ORGANIZER' ||
  normalizedRole === 'BOARD'

const normalizePath = (path: string): string => {
  const [withoutQuery] = path.split('?')
  if (!withoutQuery) return '/'
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
}

export const normalizeAppPath = (pathname: string): string => {
  const [withoutQuery] = pathname.split('?')
  const parts = withoutQuery.split('/').filter(Boolean)
  if (parts.length === 0) return '/'

  if (isKnownRoute(parts[0] || '')) {
    return `/${parts.join('/')}`
  }
  return `/${parts.slice(1).join('/') || ''}`.replace(/\/+$/, '') || '/'
}

export const permissionSetFromList = (permissions?: string[]): Set<string> =>
  new Set((permissions || []).map((p) => String(p || '').trim().toLowerCase()).filter(Boolean))

export const hasPermissionAction = (
  permissionSet: Set<string> | null | undefined,
  action: string
): boolean => {
  if (!permissionSet) return false
  const normalized = String(action || '').trim().toLowerCase()
  if (!normalized) return false
  return (
    permissionSet.has('*') ||
    permissionSet.has('*:*') ||
    permissionSet.has(normalized) ||
    (() => {
      const [resource, operation] = normalized.split(':')
      return Boolean(resource && operation && permissionSet.has(`${resource}:*`))
    })()
  )
}

export const hasResourceReadPermission = (permissionSet: Set<string>, resource: string): boolean =>
  hasPermissionAction(permissionSet, `${String(resource || '').trim().toLowerCase()}:read`)

const candidateResources = (resource?: string): string[] => {
  if (!resource) return []
  const normalized = resource.trim().toLowerCase()
  if (!normalized) return []
  if (normalized.endsWith('s')) return [normalized, normalized.slice(0, -1)]
  return [normalized, `${normalized}s`]
}

export const getPagePolicyByPath = (pathname: string): PageAccessPolicy | null => {
  const normalized = normalizeAppPath(pathname)
  if (PAGE_ACCESS_BY_PATH.has(normalized)) {
    return PAGE_ACCESS_BY_PATH.get(normalized) || null
  }

  const candidates = Array.from(PAGE_ACCESS_BY_PATH.entries())
    .filter(([path]) => normalized === path || normalized.startsWith(`${path}/`))
    .sort((a, b) => b[0].length - a[0].length)
  return candidates.length > 0 ? candidates[0]?.[1] || null : null
}

export const canAccessPageByPolicy = (
  policy: PageAccessPolicy | null,
  role: string | undefined,
  permissionSet: Set<string> | null
): boolean => {
  if (!policy) return true
  const normalizedRole = normalizeRole(role)
  const hasBaseRole = policy.baseRoles.includes(normalizedRole)
  if (policy.hardProtected) return hasBaseRole

  if (policy.requiredAction) {
    if (!hasBaseRole || !permissionSet) return false
    return hasPermissionAction(permissionSet, policy.requiredAction)
  }

  if (policy.requireResourcePermission && policy.resource) {
    if (!hasBaseRole || !permissionSet) return false
    return candidateResources(policy.resource)
      .some((resource) => hasResourceReadPermission(permissionSet, resource))
  }

  const hasPermissionContext = Boolean(permissionSet && permissionSet.size > 0)
  if (policy.allowCrudReadOverride && policy.resource && hasPermissionContext && isAdminPlaneRole(normalizedRole)) {
    const hasResourceAccess = candidateResources(policy.resource)
      .some((resource) => hasResourceReadPermission(permissionSet!, resource))

    if (isPlatformAdminRole(normalizedRole)) {
      return hasBaseRole || hasResourceAccess
    }

    return hasResourceAccess
  }

  if (hasBaseRole) return true
  if (!policy.allowCrudReadOverride || !policy.resource || !permissionSet) return false
  return candidateResources(policy.resource).some((resource) => hasResourceReadPermission(permissionSet, resource))
}

export const canAccessPath = (
  pathname: string,
  role: string | undefined,
  permissions?: string[]
): boolean => {
  const policy = getPagePolicyByPath(normalizePath(pathname))
  const permissionSet = permissions ? permissionSetFromList(permissions) : null
  return canAccessPageByPolicy(policy, role, permissionSet)
}

export const canAccessNavItem = (
  id: string,
  href: string,
  role: string | undefined,
  permissions?: string[]
): boolean => {
  const policy = PAGE_ACCESS_BY_ID.get(id) || getPagePolicyByPath(href)
  const permissionSet = permissions ? permissionSetFromList(permissions) : null
  return canAccessPageByPolicy(policy || null, role, permissionSet)
}
