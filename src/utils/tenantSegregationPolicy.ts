import { createLogger } from './logger';

const logger = createLogger('tenant-segregation-policy');

export type TenantSegregationMode = 'off' | 'audit' | 'enforce';

export interface DefaultTenantAccessContext {
  userId?: string;
  role?: string;
  tenantId?: string | null;
  tenantSlug?: string | null;
  path?: string;
  method?: string;
}

export interface DefaultTenantAccessDecision {
  mode: TenantSegregationMode;
  allowed: boolean;
  enforced: boolean;
  code?: 'DEFAULT_TENANT_RESTRICTED';
  reason?: string;
}

const normalize = (value: string | null | undefined): string => String(value || '').trim().toLowerCase();

const parseCsvEnv = (key: string, fallback: string[]): string[] => {
  const raw = String(process.env[key] || '').trim();
  if (!raw) return fallback.map(item => normalize(item)).filter(Boolean);
  return raw
    .split(',')
    .map(item => normalize(item))
    .filter(Boolean);
};

const getSegregationMode = (): TenantSegregationMode => {
  const mode = normalize(process.env['TENANT_SEGREGATION_MODE']);
  if (mode === 'off' || mode === 'audit' || mode === 'enforce') {
    return mode;
  }
  return 'audit';
};

export const getTenantSegregationConfig = (): {
  mode: TenantSegregationMode;
  defaultTenantIds: string[];
  defaultTenantSlugs: string[];
} => ({
  mode: getSegregationMode(),
  defaultTenantIds: parseCsvEnv('TENANT_DEFAULT_IDS', ['default_tenant', 'default-tenant']),
  defaultTenantSlugs: parseCsvEnv('TENANT_DEFAULT_SLUGS', ['default']),
});

export const isDefaultTenant = (
  tenantId: string | null | undefined,
  tenantSlug?: string | null
): boolean => {
  const { defaultTenantIds, defaultTenantSlugs } = getTenantSegregationConfig();
  const normalizedId = normalize(tenantId);
  const normalizedSlug = normalize(tenantSlug);

  return defaultTenantIds.includes(normalizedId) || defaultTenantSlugs.includes(normalizedSlug);
};

const isSuperAdminRole = (role: string | null | undefined): boolean =>
  normalize(role) === 'super_admin';

export const evaluateDefaultTenantAccess = (
  context: DefaultTenantAccessContext
): DefaultTenantAccessDecision => {
  const { mode } = getTenantSegregationConfig();

  if (mode === 'off') {
    return { mode, allowed: true, enforced: false };
  }

  if (isSuperAdminRole(context.role)) {
    return { mode, allowed: true, enforced: false };
  }

  if (!isDefaultTenant(context.tenantId, context.tenantSlug)) {
    return { mode, allowed: true, enforced: false };
  }

  const reason = 'Default tenant is reserved for SUPER_ADMIN operations only';

  if (mode === 'audit') {
    logger.warn('Tenant segregation audit event', {
      userId: context.userId,
      role: context.role,
      tenantId: context.tenantId,
      tenantSlug: context.tenantSlug,
      method: context.method,
      path: context.path,
      mode,
      reason,
    });
    return { mode, allowed: true, enforced: false, code: 'DEFAULT_TENANT_RESTRICTED', reason };
  }

  return { mode, allowed: false, enforced: true, code: 'DEFAULT_TENANT_RESTRICTED', reason };
};

