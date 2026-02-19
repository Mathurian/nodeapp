import { resolveEventTenantId, resolveRequestTenantId } from '../../../src/utils/tenantContext';

describe('tenantContext', () => {
  it('resolves tenant from request tenantId first', () => {
    const req = {
      tenantId: 'tenant-a',
      user: { tenantId: 'tenant-b', role: 'ADMIN' },
      query: {}
    } as any;

    expect(resolveRequestTenantId(req)).toBe('tenant-a');
  });

  it('resolves tenant from user tenantId when request tenantId is missing', () => {
    const req = {
      user: { tenantId: 'tenant-b', role: 'ADMIN' },
      query: {}
    } as any;

    expect(resolveRequestTenantId(req)).toBe('tenant-b');
  });

  it('allows super-admin query override when enabled', () => {
    const req = {
      tenantId: 'tenant-a',
      user: { tenantId: 'tenant-a', role: 'SUPER_ADMIN' },
      query: { tenantId: 'tenant-override' }
    } as any;

    expect(resolveRequestTenantId(req, { allowSuperAdminQueryOverride: true })).toBe('tenant-override');
  });

  it('does not allow query override for non-super-admin', () => {
    const req = {
      tenantId: 'tenant-a',
      user: { tenantId: 'tenant-a', role: 'ADMIN' },
      query: { tenantId: 'tenant-override' }
    } as any;

    expect(resolveRequestTenantId(req, { allowSuperAdminQueryOverride: true })).toBe('tenant-a');
  });

  it('resolves event tenant from metadata then payload then fallback candidates', () => {
    const fromMetadata = resolveEventTenantId({
      metadata: { tenantId: 'tenant-meta' },
      payload: { tenantId: 'tenant-payload' }
    });
    expect(fromMetadata).toBe('tenant-meta');

    const fromPayload = resolveEventTenantId({
      metadata: {},
      payload: { tenantId: 'tenant-payload' }
    });
    expect(fromPayload).toBe('tenant-payload');

    const fromFallback = resolveEventTenantId({ metadata: {}, payload: {} }, 'tenant-fallback');
    expect(fromFallback).toBe('tenant-fallback');
  });
});
