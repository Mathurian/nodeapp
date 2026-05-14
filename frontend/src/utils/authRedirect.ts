import { extractTenantSlugFromPath } from './routeSegments'

const DEFAULT_TENANT_SLUG = 'default'

const normalizeTenantSlug = (slug?: string | null): string | null => {
  const trimmed = (slug || '').trim()
  if (!trimmed || trimmed === DEFAULT_TENANT_SLUG) return null
  return trimmed
}

export const buildTenantAwareAppPath = (
  path: string,
  preferredSlug?: string | null,
  pathname?: string
): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const preferred = normalizeTenantSlug(preferredSlug)
  if (preferred) {
    return `/${preferred}${cleanPath}`
  }

  const sourcePath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '')
  const pathSlug = normalizeTenantSlug(extractTenantSlugFromPath(sourcePath))
  if (pathSlug) {
    return `/${pathSlug}${cleanPath}`
  }

  return cleanPath
}

export const buildTenantAwareLoginPath = (pathname?: string, preferredSlug?: string | null): string => {
  return buildTenantAwareAppPath('/login', preferredSlug, pathname)
}
