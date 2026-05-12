import { PermissionScopeLevel, UserRole } from '@prisma/client';

export const SCOPE_CAPABLE_RESOURCES = [
  'deductions',
  'certifications',
  'reports',
  'files',
] as const;

export type ScopeCapableResource = (typeof SCOPE_CAPABLE_RESOURCES)[number];

export const RESOURCE_SCOPE_OPTIONS: Record<ScopeCapableResource, PermissionScopeLevel[]> = {
  deductions: ['ASSIGNMENT', 'EVENT', 'TENANT'],
  certifications: ['ASSIGNMENT', 'EVENT', 'TENANT'],
  reports: ['TENANT'],
  files: ['EVENT', 'TENANT'],
};

export const DEFAULT_ROLE_RESOURCE_SCOPES: Record<UserRole, Partial<Record<ScopeCapableResource, PermissionScopeLevel>>> = {
  SUPER_ADMIN: {
    deductions: 'TENANT',
    certifications: 'TENANT',
    reports: 'TENANT',
    files: 'TENANT',
  },
  ADMIN: {
    deductions: 'TENANT',
    certifications: 'TENANT',
    reports: 'TENANT',
    files: 'TENANT',
  },
  ORGANIZER: {
    deductions: 'TENANT',
    certifications: 'TENANT',
    reports: 'TENANT',
    files: 'TENANT',
  },
  BOARD: {
    deductions: 'EVENT',
    certifications: 'EVENT',
    reports: 'TENANT',
    files: 'EVENT',
  },
  TALLY_MASTER: {
    deductions: 'ASSIGNMENT',
    certifications: 'ASSIGNMENT',
    reports: 'TENANT',
  },
  AUDITOR: {
    deductions: 'ASSIGNMENT',
    certifications: 'ASSIGNMENT',
    reports: 'TENANT',
  },
  JUDGE: {
    deductions: 'ASSIGNMENT',
    certifications: 'ASSIGNMENT',
    reports: 'TENANT',
  },
  EMCEE: {},
  CONTESTANT: {},
};

export const ADMIN_FIXED_SCOPE_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'];

export const getDefaultResourceScope = (
  role: UserRole,
  resource: string
): PermissionScopeLevel | null => {
  if (!SCOPE_CAPABLE_RESOURCES.includes(resource as ScopeCapableResource)) {
    return null;
  }

  return DEFAULT_ROLE_RESOURCE_SCOPES[role]?.[resource as ScopeCapableResource] || null;
};

export const getAllowedScopeOptions = (
  role: UserRole,
  resource: string
): PermissionScopeLevel[] => {
  if (!SCOPE_CAPABLE_RESOURCES.includes(resource as ScopeCapableResource)) {
    return [];
  }

  const normalizedResource = resource as ScopeCapableResource;
  const resourceOptions = RESOURCE_SCOPE_OPTIONS[normalizedResource] || [];
  if (ADMIN_FIXED_SCOPE_ROLES.includes(role)) {
    return resourceOptions.includes('TENANT') ? ['TENANT'] : [];
  }

  const defaultScope = getDefaultResourceScope(role, normalizedResource);
  if (defaultScope && resourceOptions.includes(defaultScope)) {
    return resourceOptions;
  }

  return resourceOptions;
};

export const isScopeEditable = (role: UserRole, resource: string): boolean => {
  return getAllowedScopeOptions(role, resource).length > 1;
};
