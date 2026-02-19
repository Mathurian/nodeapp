import {
  evaluateDefaultTenantAccess,
  getTenantSegregationConfig,
  isDefaultTenant,
} from '../../../src/utils/tenantSegregationPolicy';

describe('tenantSegregationPolicy', () => {
  const originalMode = process.env['TENANT_SEGREGATION_MODE'];
  const originalIds = process.env['TENANT_DEFAULT_IDS'];
  const originalSlugs = process.env['TENANT_DEFAULT_SLUGS'];

  afterEach(() => {
    if (typeof originalMode === 'undefined') delete process.env['TENANT_SEGREGATION_MODE'];
    else process.env['TENANT_SEGREGATION_MODE'] = originalMode;

    if (typeof originalIds === 'undefined') delete process.env['TENANT_DEFAULT_IDS'];
    else process.env['TENANT_DEFAULT_IDS'] = originalIds;

    if (typeof originalSlugs === 'undefined') delete process.env['TENANT_DEFAULT_SLUGS'];
    else process.env['TENANT_DEFAULT_SLUGS'] = originalSlugs;
  });

  it('uses audit mode by default when mode is missing', () => {
    delete process.env['TENANT_SEGREGATION_MODE'];
    const config = getTenantSegregationConfig();
    expect(config.mode).toBe('audit');
  });

  it('recognizes default tenant identifiers and slugs', () => {
    process.env['TENANT_DEFAULT_IDS'] = 'default_tenant,system_tenant';
    process.env['TENANT_DEFAULT_SLUGS'] = 'default,platform';

    expect(isDefaultTenant('default_tenant', 'n/a')).toBe(true);
    expect(isDefaultTenant('tenant-x', 'platform')).toBe(true);
    expect(isDefaultTenant('tenant-x', 'tenant-x')).toBe(false);
  });

  it('allows all access when mode is off', () => {
    process.env['TENANT_SEGREGATION_MODE'] = 'off';
    const decision = evaluateDefaultTenantAccess({
      role: 'ADMIN',
      tenantId: 'default_tenant',
      tenantSlug: 'default',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.enforced).toBe(false);
    expect(decision.mode).toBe('off');
  });

  it('audits but does not block default-tenant access for non-super-admin in audit mode', () => {
    process.env['TENANT_SEGREGATION_MODE'] = 'audit';
    const decision = evaluateDefaultTenantAccess({
      role: 'ADMIN',
      tenantId: 'default_tenant',
      tenantSlug: 'default',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.enforced).toBe(false);
    expect(decision.code).toBe('DEFAULT_TENANT_RESTRICTED');
  });

  it('blocks default-tenant access for non-super-admin in enforce mode', () => {
    process.env['TENANT_SEGREGATION_MODE'] = 'enforce';
    const decision = evaluateDefaultTenantAccess({
      role: 'ADMIN',
      tenantId: 'default_tenant',
      tenantSlug: 'default',
    });

    expect(decision.allowed).toBe(false);
    expect(decision.enforced).toBe(true);
    expect(decision.code).toBe('DEFAULT_TENANT_RESTRICTED');
  });

  it('allows super-admin access in enforce mode', () => {
    process.env['TENANT_SEGREGATION_MODE'] = 'enforce';
    const decision = evaluateDefaultTenantAccess({
      role: 'SUPER_ADMIN',
      tenantId: 'default_tenant',
      tenantSlug: 'default',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.enforced).toBe(false);
  });
});
