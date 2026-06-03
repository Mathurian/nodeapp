const ACTIVE_TENANT_SLUG_STORAGE_KEY = 'event-manager.active-tenant-slug'

const canUseStorage = (): boolean => typeof window !== 'undefined' && Boolean(window.localStorage)

export const getStoredTenantSlug = (): string | null => {
  if (!canUseStorage()) {
    return null
  }

  const value = window.localStorage.getItem(ACTIVE_TENANT_SLUG_STORAGE_KEY)
  return value ? value.trim() || null : null
}

export const setStoredTenantSlug = (tenantSlug?: string | null): void => {
  if (!canUseStorage()) {
    return
  }

  const normalizedSlug = String(tenantSlug || '').trim()
  if (!normalizedSlug) {
    window.localStorage.removeItem(ACTIVE_TENANT_SLUG_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(ACTIVE_TENANT_SLUG_STORAGE_KEY, normalizedSlug)
}

export const clearStoredTenantSlug = (): void => {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(ACTIVE_TENANT_SLUG_STORAGE_KEY)
}
