import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { extractTenantSlugFromPath } from '../utils/routeSegments'

const DEFAULT_TENANT_SLUG = 'default'
const TENANT_INFO_CACHE_TTL_MS = 5 * 60 * 1000

interface TenantInfo {
  id: string
  name: string
  slug: string
  logoPath?: string | null
  isActive: boolean
}

interface TenantInfoCacheEntry {
  tenant: TenantInfo
  expiresAt: number
}

const tenantInfoCache = new Map<string, TenantInfoCacheEntry>()
const tenantInfoInFlight = new Map<string, Promise<TenantInfo>>()

interface TenantContextType {
  slug: string
  tenant: TenantInfo | null
  isLoading: boolean
  error: string | null
  setSlug: (slug: string) => void
  buildPath: (path: string) => string
  isDefaultTenant: boolean
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

interface TenantProviderProps {
  children: ReactNode
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const location = useLocation()
  const [slug, setSlugState] = useState<string>(
    () => extractTenantSlugFromPath(location.pathname) || DEFAULT_TENANT_SLUG
  )
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract slug from URL path (first segment after /)
  useEffect(() => {
    const urlSlug = extractTenantSlugFromPath(location.pathname)
    if (urlSlug) {
      setSlugState(urlSlug)
    } else {
      setSlugState(DEFAULT_TENANT_SLUG)
    }
  }, [location.pathname])

  // Fetch tenant info when slug changes
  useEffect(() => {
    const fetchTenant = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const cached = tenantInfoCache.get(slug)
        if (cached && cached.expiresAt > Date.now()) {
          setTenant(cached.tenant)
          return
        }

        let tenantRequest = tenantInfoInFlight.get(slug)
        if (!tenantRequest) {
          tenantRequest = fetch(`/api/tenants/slug/${slug}`).then(async (response) => {
            if (response.ok) {
              const data = await response.json()
              return data.tenant || data.data || data
            }
            const error = new Error(`Failed to load tenant info: ${response.status}`)
            ;(error as Error & { status?: number }).status = response.status
            throw error
          }).finally(() => {
            tenantInfoInFlight.delete(slug)
          })

          tenantInfoInFlight.set(slug, tenantRequest)
        }

        const resolvedTenant = await tenantRequest
        tenantInfoCache.set(slug, {
          tenant: resolvedTenant,
          expiresAt: Date.now() + TENANT_INFO_CACHE_TTL_MS,
        })
        setTenant(resolvedTenant)
      } catch (err) {
        const status = (err as Error & { status?: number }).status
        if (status === 404) {
          // Tenant not found - fall back to default
          if (slug !== DEFAULT_TENANT_SLUG) {
            console.warn(`Tenant "${slug}" not found, falling back to default`)
            setSlugState(DEFAULT_TENANT_SLUG)
          } else {
            setError('Default tenant not configured')
          }
        } else {
          console.error('Error fetching tenant:', err)
          setError('Failed to connect to server')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchTenant()
  }, [slug])

  const setSlug = (newSlug: string) => {
    setSlugState(newSlug || DEFAULT_TENANT_SLUG)
  }

  // Helper to build paths with tenant slug prefix
  const buildPath = (path: string): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `/${slug}${cleanPath}`
  }

  const value: TenantContextType = {
    slug,
    tenant,
    isLoading,
    error,
    setSlug,
    buildPath,
    isDefaultTenant: slug === DEFAULT_TENANT_SLUG
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export default TenantContext
