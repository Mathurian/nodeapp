import { extractTenantSlugFromPath } from './routeSegments'

const DEFAULT_TENANT_SLUG = 'default'

const normalizeTenantSlug = (slug?: string | null): string | null => {
  const trimmed = (slug || '').trim()
  if (!trimmed || trimmed === DEFAULT_TENANT_SLUG) return null
  return trimmed
}

export const buildTenantAwareLoginPath = (pathname?: string, preferredSlug?: string | null): string => {
  const preferred = normalizeTenantSlug(preferredSlug)
  if (preferred) {
    return `/${preferred}/login`
  }

  const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '')
  const pathSlug = normalizeTenantSlug(extractTenantSlugFromPath(path))
  if (pathSlug) {
    return `/${pathSlug}/login`
  }

  return '/login'
}
