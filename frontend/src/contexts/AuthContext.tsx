import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

interface TenantInfo {
  id: string
  name: string
  slug: string
}

interface User {
  id: string
  name: string
  preferredName?: string
  email: string
  role: string
  phone?: string
  gender?: string
  pronouns?: string
  bio?: string
  imagePath?: string
  judge?: any
  contestant?: any
  tenantId?: string
  tenant?: TenantInfo | null
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, tenantSlug?: string) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const isAuthenticated = !!user

  useEffect(() => {
    const initAuth = async () => {
      // No need to check localStorage - httpOnly cookies are automatically sent
      // Just try to fetch profile, cookie will be sent automatically
      try {
        // Step 1: Fetch CSRF token (ensures we have a fresh token for any POST/PUT/DELETE requests)
        await api.get('/csrf-token')

        // Step 2: Fetch user profile
        const response = await api.get('/auth/profile')
        // Backend wraps response in { success, message, data, timestamp }
        const profileData = response.data.data || response.data
        setUser(profileData)
      } catch (error) {
        // Cookie might be expired or invalid, user is not authenticated
        setUser(null)
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string, tenantSlug?: string) => {
    try {
      // Step 1: Get CSRF token
      const csrfResponse = await api.get('/csrf-token')
      const csrfToken = csrfResponse.data.csrfToken || csrfResponse.data.token

      // Step 2: Login with CSRF token (token will be set as httpOnly cookie by backend)
      // Include tenant slug header if provided (for multi-tenant login)
      const headers: Record<string, string> = {
        'X-CSRF-Token': csrfToken
      }
      if (tenantSlug) {
        headers['X-Tenant-Slug'] = tenantSlug
      }

      const response = await api.post('/auth/login',
        { email, password },
        { headers }
      )

      // Backend wraps response in { success, message, data, timestamp }
      const loginData = response.data.data || response.data
      const { user: userData } = loginData

      // No need to store token - it's in httpOnly cookie
      // Cookie is automatically sent with subsequent requests
      setUser(userData)

      // Return user data so caller can handle navigation based on tenant
      return userData
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed')
    }
  }

  const logout = async () => {
    try {
      // Call logout endpoint to clear httpOnly cookie on server
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    }
    // Cookie is cleared by server, just update local state
    setUser(null)
    navigate('/login')
  }

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/profile')
      const profileData = response.data.data || response.data
      setUser(profileData)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      // If refresh fails, user might be logged out
      setUser(null)
    }
  }

  const value = {
    user,
    login,
    logout,
    refreshUser,
    isLoading,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
