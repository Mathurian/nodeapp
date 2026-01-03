import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isKnownRoute } from '../components/TenantRouter'

const DEFAULT_TENANT_SLUG = 'default'

interface TenantInfo {
  id: string
  name: string
  slug: string
  logoPath?: string | null
  isActive: boolean
}

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
  const [slug, setSlugState] = useState<string>(DEFAULT_TENANT_SLUG)
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()

  // Extract slug from URL path (first segment after /)
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    const urlSlug = pathParts[0]

    // Check if first segment looks like a tenant slug (not a known route)
    // Uses isKnownRoute from TenantRouter to ensure consistency
    if (urlSlug && !isKnownRoute(urlSlug)) {
      setSlugState(urlSlug)
    } else if (!urlSlug || isKnownRoute(urlSlug)) {
      // No slug in URL or it's a known route - use default
      setSlugState(DEFAULT_TENANT_SLUG)
    }
  }, [location.pathname])

  // Fetch tenant info when slug changes
  useEffect(() => {
    const fetchTenant = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/tenants/slug/${slug}`)

        if (response.ok) {
          const data = await response.json()
          setTenant(data.tenant || data.data || data)
        } else if (response.status === 404) {
          // Tenant not found - fall back to default
          if (slug !== DEFAULT_TENANT_SLUG) {
            console.warn(`Tenant "${slug}" not found, falling back to default`)
            setSlugState(DEFAULT_TENANT_SLUG)
          } else {
            setError('Default tenant not configured')
          }
        } else {
          setError('Failed to load tenant information')
        }
      } catch (err) {
        console.error('Error fetching tenant:', err)
        setError('Failed to connect to server')
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
    if (slug === DEFAULT_TENANT_SLUG) {
      // Default tenant doesn't need slug in URL
      return cleanPath
    }
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
