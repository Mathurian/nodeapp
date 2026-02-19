import { Request } from 'express';

type AnyObject = Record<string, unknown>;

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getRole = (req: Request): string => String(req.user?.role || '').trim().toUpperCase();

const getTenantQueryOverride = (
  req: Request,
  queryParamKey: string = 'tenantId'
): string | null => {
  const queryValue = req.query?.[queryParamKey];
  if (typeof queryValue === 'string') {
    return asTrimmedString(queryValue);
  }
  if (Array.isArray(queryValue) && queryValue.length > 0) {
    return asTrimmedString(queryValue[0]);
  }
  return null;
};

export interface RequestTenantResolutionOptions {
  allowSuperAdminQueryOverride?: boolean;
  queryParamKey?: string;
}

export const resolveRequestTenantId = (
  req: Request,
  options: RequestTenantResolutionOptions = {}
): string | null => {
  const queryParamKey = options.queryParamKey || 'tenantId';
  const allowSuperAdminQueryOverride = options.allowSuperAdminQueryOverride === true;

  if (allowSuperAdminQueryOverride && getRole(req) === 'SUPER_ADMIN') {
    const queryTenantId = getTenantQueryOverride(req, queryParamKey);
    if (queryTenantId) {
      return queryTenantId;
    }
  }

  return asTrimmedString(req.tenantId) || asTrimmedString(req.user?.tenantId) || null;
};

export const requireRequestTenantId = (
  req: Request,
  options: RequestTenantResolutionOptions = {}
): string => {
  const tenantId = resolveRequestTenantId(req, options);
  if (!tenantId) {
    throw new Error('Tenant context is required');
  }
  return tenantId;
};

export const resolveEventTenantId = (
  event: { metadata?: AnyObject; payload?: AnyObject },
  ...fallbackCandidates: unknown[]
): string | null => {
  const fromMetadata = asTrimmedString(event.metadata?.['tenantId']);
  if (fromMetadata) {
    return fromMetadata;
  }

  const fromPayload = asTrimmedString(event.payload?.['tenantId']);
  if (fromPayload) {
    return fromPayload;
  }

  for (const candidate of fallbackCandidates) {
    const resolved = asTrimmedString(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};
