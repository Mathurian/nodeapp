import { PrismaClient } from '@prisma/client';
import { createLogger } from './logger';
import { getTenantSegregationConfig } from './tenantSegregationPolicy';

const logger = createLogger('default-tenant-resolver');

interface TenantRecord {
  id: string;
  slug: string;
}

const uniqueNormalizedValues = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );

const findByPreferredIds = async (db: PrismaClient, ids: string[]): Promise<TenantRecord | null> => {
  for (const id of ids) {
    const tenant = await db.tenant.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (tenant) {
      return tenant;
    }
  }
  return null;
};

const findByPreferredSlugs = async (db: PrismaClient, slugs: string[]): Promise<TenantRecord | null> => {
  for (const slug of slugs) {
    const tenant = await db.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });
    if (tenant) {
      return tenant;
    }
  }
  return null;
};

export const resolveDefaultTenantId = async (db: PrismaClient): Promise<string> => {
  const segregationConfig = getTenantSegregationConfig();
  const candidateIds = uniqueNormalizedValues(segregationConfig.defaultTenantIds);
  const candidateSlugs = uniqueNormalizedValues(segregationConfig.defaultTenantSlugs);

  const byConfiguredId = await findByPreferredIds(db, candidateIds);
  if (byConfiguredId) {
    return byConfiguredId.id;
  }

  const byConfiguredSlug = await findByPreferredSlugs(db, candidateSlugs);
  if (byConfiguredSlug) {
    return byConfiguredSlug.id;
  }

  const fallbackDefaultSlug = await db.tenant.findUnique({
    where: { slug: 'default' },
    select: { id: true, slug: true },
  });
  if (fallbackDefaultSlug) {
    logger.warn('Resolved default tenant via hard fallback slug', {
      tenantId: fallbackDefaultSlug.id,
      tenantSlug: fallbackDefaultSlug.slug,
      configuredIds: candidateIds,
      configuredSlugs: candidateSlugs,
    });
    return fallbackDefaultSlug.id;
  }

  const oldestTenant = await db.tenant.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true, slug: true },
  });

  if (oldestTenant) {
    logger.error('Resolved default tenant via oldest-tenant fallback', {
      tenantId: oldestTenant.id,
      tenantSlug: oldestTenant.slug,
      configuredIds: candidateIds,
      configuredSlugs: candidateSlugs,
    });
    return oldestTenant.id;
  }

  throw new Error('Unable to resolve default tenant: no tenant records exist');
};
