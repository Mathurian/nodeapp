import {
  isTenantDbRlsEnforced,
  resolveTenantDbRlsMode,
  withTenantDbRlsContext
} from '../../../src/utils/prismaRlsContext';

describe('prismaRlsContext', () => {
  const originalMode = process.env['TENANT_DB_RLS_MODE'];

  afterEach(() => {
    if (typeof originalMode === 'undefined') {
      delete process.env['TENANT_DB_RLS_MODE'];
    } else {
      process.env['TENANT_DB_RLS_MODE'] = originalMode;
    }
  });

  it('defaults to off mode when env is missing', () => {
    delete process.env['TENANT_DB_RLS_MODE'];
    expect(resolveTenantDbRlsMode()).toBe('off');
    expect(isTenantDbRlsEnforced()).toBe(false);
  });

  it('uses enforce mode when configured', () => {
    process.env['TENANT_DB_RLS_MODE'] = 'enforce';
    expect(resolveTenantDbRlsMode()).toBe('enforce');
    expect(isTenantDbRlsEnforced()).toBe(true);
  });

  it('runs operation directly when mode is off', async () => {
    process.env['TENANT_DB_RLS_MODE'] = 'off';

    const prismaMock = {
      $transaction: jest.fn()
    } as any;

    const op = jest.fn().mockResolvedValue('ok');
    const result = await withTenantDbRlsContext(
      prismaMock,
      { tenantId: 'tenant-1', isSuperAdmin: false },
      op
    );

    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledWith(prismaMock);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('wraps operation in transaction and sets RLS GUCs when mode is enforce', async () => {
    const txMock = {
      $executeRaw: jest.fn().mockResolvedValue(1)
    } as any;

    const prismaMock = {
      $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => callback(txMock))
    } as any;

    const op = jest.fn().mockResolvedValue('done');
    const result = await withTenantDbRlsContext(
      prismaMock,
      { tenantId: 'tenant-abc', isSuperAdmin: true, mode: 'enforce' },
      op
    );

    expect(result).toBe('done');
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.$executeRaw).toHaveBeenCalledTimes(1);
    expect(op).toHaveBeenCalledWith(txMock);
  });
});
