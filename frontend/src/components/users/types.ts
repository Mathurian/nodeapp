/**
 * Shared types for User management components
 */

export interface User {
  id: string
  name: string
  preferredName: string | null
  email: string
  role: string
  gender: string | null
  pronouns?: string | null
  phone: string | null
  bio?: string | null
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  judgeId: string | null
  contestantId: string | null
  contestant?: {
    id: string
    contestantNumber: number | null
  } | null
  tenant?: {
    id: string
    name: string
    slug: string
  }
}

export interface UserFormData {
  name: string
  preferredName: string
  email: string
  password: string
  role: string
  gender: string
  pronouns: string
  phone: string
  bio: string
  imagePath: string
  isActive: boolean
  contestantNumber?: string
  customFields?: Record<string, unknown>
}

export interface CustomField {
  id: string
  name: string
  label: string
  key: string
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN' | 'TEXT_AREA' | 'EMAIL' | 'PHONE' | 'URL'
  entityType: string
  required: boolean
  options?: string[]
  defaultValue?: string
  validation?: unknown
  order: number
}

export interface Tenant {
  id: string
  name: string
}

export interface RoleInfo {
  value: string
  label: string
  color: string
}

export const ROLES: RoleInfo[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: 'bg-violet-100 text-violet-800' },
  { value: 'ADMIN', label: 'Admin', color: 'bg-red-100 text-red-800' },
  { value: 'ORGANIZER', label: 'Organizer', color: 'bg-purple-100 text-purple-800' },
  { value: 'JUDGE', label: 'Judge', color: 'bg-blue-100 text-blue-800' },
  { value: 'CONTESTANT', label: 'Contestant', color: 'bg-green-100 text-green-800' },
  { value: 'EMCEE', label: 'Emcee', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'TALLY_MASTER', label: 'Tally Master', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'AUDITOR', label: 'Auditor', color: 'bg-pink-100 text-pink-800' },
  { value: 'BOARD', label: 'Board', color: 'bg-orange-100 text-orange-800' },
]

/**
 * Get role badge styling for a given role
 */
export const getRoleInfo = (role: string): RoleInfo | undefined => {
  return ROLES.find(r => r.value === role)
}
