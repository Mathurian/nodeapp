import { PrismaClient } from '@prisma/client';
import { createLogger } from './logger';

const logger = createLogger('prisma-rls-context');

export type TenantDbRlsMode = 'off' | 'enforce';

export interface TenantDbRlsContext {
  tenantId?: string | null;
  isSuperAdmin: boolean;
  mode?: TenantDbRlsMode;
}

const normalize = (value: string | null | undefined): string => String(value || '').trim().toLowerCase();

export const resolveTenantDbRlsMode = (): TenantDbRlsMode => {
  const mode = normalize(process.env['TENANT_DB_RLS_MODE']);
  if (mode === 'enforce') {
    return 'enforce';
  }
  if (mode !== '' && mode !== 'off') {
    logger.warn('Invalid TENANT_DB_RLS_MODE detected; defaulting to off', {
      providedMode: process.env['TENANT_DB_RLS_MODE'],
    });
  }
  return 'off';
};

export const isTenantDbRlsEnforced = (): boolean => resolveTenantDbRlsMode() === 'enforce';

export const withTenantDbRlsContext = async <T>(
  prisma: PrismaClient,
  context: TenantDbRlsContext,
  operation: (tx: PrismaClient) => Promise<T>
): Promise<T> => {
  const mode = context.mode || resolveTenantDbRlsMode();
  if (mode !== 'enforce') {
    return operation(prisma);
  }

  const tenantId = String(context.tenantId || '');
  const isSuperAdmin = context.isSuperAdmin ? 'true' : 'false';

  return prisma.$transaction(async tx => {
    await tx.$executeRaw`
      SELECT
        set_config('app.tenant_rls_mode', ${mode}, true),
        set_config('app.is_super_admin', ${isSuperAdmin}, true),
        set_config('app.tenant_id', ${tenantId}, true)
    `;

    return operation(tx as PrismaClient);
  });
};
