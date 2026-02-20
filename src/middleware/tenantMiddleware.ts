/**
 * Tenant Middleware
 *
 * This middleware handles multi-tenancy isolation and automatic tenant context injection.
 * It identifies the tenant from subdomain, custom domain, header, or JWT token.
 */

import { Request, Response, NextFunction } from 'express';
import prisma, { rawPrisma } from '../config/database';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { getTenantSegregationConfig } from '../utils/tenantSegregationPolicy';
import { recordTenantSegregationViolation } from '../utils/tenantSegregationMetrics';
import { resolveTenantDbRlsMode, withTenantDbRlsContext } from '../utils/prismaRlsContext';

// Extend Express Request type to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: {
        id: string;
        name: string;
        slug: string;
        domain: string | null;
        isActive: boolean;
        settings: Record<string, unknown>;
        planType: string;
      };
      isSuperAdmin?: boolean;
    }
  }
}

/**
 * Static list of Prisma model delegates with tenantId field and required tenant filtering.
 * IMPORTANT: values are normalized to lowercase because Prisma extension model names are
 * normalized before lookup.
 */
const TENANT_SCOPED_MODELS = new Set([
  'user', 'event', 'contest', 'category', 'score', 'assignment',
  'judge', 'contestant', 'notification', 'auditLog',
  'roleAssignment', 'tallyMasterAssignment', 'auditorAssignment',
  'categoryCertification', 'contestCertification', 'judgeCertification',
  'judgeContestantCertification', 'reviewContestantCertification',
  'reviewJudgeScoreCertification', 'categoryContestant', 'categoryJudge',
  'contestContestant', 'contestJudge', 'emceeScript', 'archivedEvent',
  'categoryTemplate', 'templateCriterion', 'judgeScoreRemovalRequest',
  'judgeUncertificationRequest', 'judgeComment', 'overallDeduction',
  'deductionRequest', 'deductionApproval', 'scoreFile', 'scoreRemovalRequest',
  'scoreComment', 'file', 'systemSetting', 'rateLimitConfig', 'themeSetting',
  'notificationDigest', 'notificationPreference', 'notificationTemplate',
  'emailTemplate', 'eventTemplate', 'reportTemplate', 'reportInstance',
  'customField', 'customFieldValue', 'savedSearch', 'searchHistory',
  'backupLog', 'backupSchedule', 'backupTarget', 'drConfig', 'drMetric',
  'drTestLog', 'emailLog', 'webhookConfig', 'webhookDelivery',
  'workflowTemplate', 'workflowInstance', 'workflowStep',
  'workflowStepExecution', 'workflowTransition', 'winnerSignature',
  'criterion', 'report',
  // Missing tenant-scoped models discovered in schema parity review
  'activityLog', 'certification', 'errorLog', 'eventLog',
  'rolePermission', 'permissionAuditLog',
  'scoreGovernanceRequest', 'scoreGovernanceApproval'
].map(model => model.toLowerCase()));

/**
 * Helper function to check if a model requires tenant filtering
 */
function isTenantScopedModel(model: string): boolean {
  const modelLower = model.toLowerCase();
  return TENANT_SCOPED_MODELS.has(modelLower);
}

type TokenTenantPayload = {
  userId: string;
  tenantId: string;
  role?: string;
};

/**
 * Tenant identification strategies
 */
export class TenantIdentifier {
  private static getReservedSubdomains(): Set<string> {
    const defaults = ['www', 'api', 'app', 'admin', 'dev', 'staging', 'stage', 'test', 'preview'];
    const configured = (process.env['TENANT_RESERVED_SUBDOMAINS'] || '')
      .split(',')
      .map(value => value.trim().toLowerCase())
      .filter(Boolean);

    return new Set([...defaults, ...configured]);
  }

  private static isIpOrLocalHost(hostname: string): boolean {
    if (!hostname) return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
    // Basic IPv4 detector
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
      return true;
    }
    return false;
  }

  /**
   * Identify tenant from subdomain
   * Example: tenant-slug.example.com -> tenant-slug
   */
  static fromSubdomain(req: Request): string | null {
    const host = req.get('host');
    if (!host) return null;

    // Remove port if present
    const hostname = host.split(':')[0] || '';
    if (!hostname) return null;
    if (TenantIdentifier.isIpOrLocalHost(hostname)) return null;

    // Check if it's a subdomain (must have at least 3 parts)
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = (parts[0] || '').trim().toLowerCase();
      const reservedSubdomains = TenantIdentifier.getReservedSubdomains();
      if (subdomain && !reservedSubdomains.has(subdomain)) {
        return subdomain;
      }
    }
    return null;
  }

  /**
   * Identify tenant from custom domain
   */
  static fromCustomDomain(req: Request): string | null {
    const host = req.get('host');
    if (!host) return null;

    // Remove port
    const hostname = host.split(':')[0] || '';
    if (!hostname) return null;
    if (TenantIdentifier.isIpOrLocalHost(hostname)) return null;

    // Return hostname as potential custom domain
    // Will be validated against tenant domains in database
    return hostname;
  }

  /**
   * Identify tenant from X-Tenant-ID or X-Tenant-Slug header
   */
  static fromHeader(req: Request): string | null {
    return req.get('X-Tenant-ID') || req.get('x-tenant-id') ||
           req.get('X-Tenant-Slug') || req.get('x-tenant-slug') || null;
  }

  /**
   * Identify tenant from JWT token (if user is authenticated)
   * This decodes the JWT directly from the cookie, without requiring req.user to be set
   */
  static fromTokenPayload(req: Request): TokenTenantPayload | null {
    // First check if user is already authenticated (req.user exists)
    if (req.user && 'tenantId' in req.user) {
      return {
        userId: String((req.user as { id?: string }).id || ''),
        tenantId: String((req.user as { tenantId: string }).tenantId),
        role: String((req.user as { role?: string }).role || '')
      };
    }

    // If req.user doesn't exist yet, try to decode JWT token directly
    // This allows tenant identification before auth middleware runs
    try {
      const token = req.cookies?.['access_token'];
      if (!token) return null;

      // Import jwt here to avoid circular dependencies
      const jwt = require('jsonwebtoken');
      const { jwtSecret } = require('../utils/config');

      const decoded = jwt.verify(token, jwtSecret) as TokenTenantPayload;
      if (!decoded?.tenantId) return null;
      return decoded;
    } catch (_error) {
      // Token invalid or expired - not an error, just means no tenant from token
      return null;
    }
  }

  /**
   * Identify tenant from JWT token (if user is authenticated)
   */
  static fromToken(req: Request): string | null {
    const payload = TenantIdentifier.fromTokenPayload(req);
    return payload?.tenantId || null;
  }

  /**
   * Identify tenant from query parameter (for development/testing)
   */
  static fromQuery(req: Request): string | null {
    if (env.isDevelopment()) {
      return req.query['tenantId'] as string || null;
    }
    return null;
  }
}

/**
 * Main tenant middleware
 */
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let tenantIdOrSlug: string | null = null;
    let identificationMethod: string = 'unknown';

    const tokenPayload = TenantIdentifier.fromTokenPayload(req);
    const tokenTenant = tokenPayload?.tenantId || null;
    const tokenRole = String(tokenPayload?.role || '').trim().toUpperCase();
    const headerTenant = TenantIdentifier.fromHeader(req);

    // 1) Authenticated requests: tenant is derived from token.
    // Only SUPER_ADMIN may intentionally override via tenant header.
    if (tokenTenant) {
      tenantIdOrSlug = tokenTenant;
      identificationMethod = 'token';
      if (headerTenant && tokenRole === 'SUPER_ADMIN') {
        tenantIdOrSlug = headerTenant;
        identificationMethod = 'header_superadmin_override';
      }
      logger.info(`Tenant identified from JWT token: ${tokenTenant}`, {
        path: req.path,
        method: req.method,
        hasCookie: !!req.cookies?.['access_token'],
        hasHeaderTenant: !!headerTenant,
        superAdminOverride: identificationMethod === 'header_superadmin_override'
      });
    } else if (headerTenant) {
      // 2) Header (only when unauthenticated)
      tenantIdOrSlug = headerTenant;
      identificationMethod = 'header';
      logger.debug(`Tenant identified from header: ${tenantIdOrSlug}`, { path: req.path });
    } else if (req.cookies?.['access_token']) {
      // Log when token extraction fails
      logger.warn(`Failed to extract tenant from JWT token`, {
        path: req.path,
        method: req.method,
        hasToken: true
      });
    }

    // 3. Subdomain (for web access)
    if (!tenantIdOrSlug) {
      tenantIdOrSlug = TenantIdentifier.fromSubdomain(req);
      if (tenantIdOrSlug) {
        identificationMethod = 'subdomain';
      }
    }

    // 4. Custom domain (for branded access)
    if (!tenantIdOrSlug) {
      const customDomain = TenantIdentifier.fromCustomDomain(req);
      if (customDomain) {
        // Check if this domain belongs to a tenant
        const tenant = await prisma.tenant.findFirst({
          where: { domain: customDomain, isActive: true },
        });
        if (tenant) {
          tenantIdOrSlug = tenant.id;
          identificationMethod = 'custom_domain';
        }
      }
    }

    // 5. Query parameter (development only)
    if (!tenantIdOrSlug) {
      tenantIdOrSlug = TenantIdentifier.fromQuery(req);
      if (tenantIdOrSlug) {
        identificationMethod = 'query';
      }
    }

    // 6. Default tenant fallback
    // If no tenant could be identified, fall back to the default tenant
    // This enables login from neutral URLs (no subdomain/header) while still
    // supporting cross-tenant user lookup in AuthService
    if (!tenantIdOrSlug) {
      const segregationConfig = getTenantSegregationConfig();
      const defaultTenantIdFilters = segregationConfig.defaultTenantIds.map((id) => ({ id }));
      const defaultTenantSlugFilters = segregationConfig.defaultTenantSlugs.map((slug) => ({ slug }));
      const defaultTenant = await prisma.tenant.findFirst({
        where: {
          OR: [...defaultTenantIdFilters, ...defaultTenantSlugFilters],
          isActive: true
        }
      });

      if (defaultTenant) {
        tenantIdOrSlug = defaultTenant.id;
        identificationMethod = 'default_fallback';
        logger.info(`Falling back to default tenant: ${defaultTenant.slug}`, {
          path: req.path,
          method: req.method,
          host: req.get('host')
        });
      }
    }

    // 7. Public endpoints that don't require tenant identification
    if (!tenantIdOrSlug) {
      // Define explicitly public endpoints
      const publicEndpoints = [
        '/api/csrf-token',
        '/api/v1/csrf-token',
        '/api/tenants/slug/',
        '/api/tenants/check/',
        '/health',
        '/metrics',
        '/api-docs'
      ];

      const isPublicEndpoint = publicEndpoints.some(endpoint =>
        req.path.startsWith(endpoint)
      );

      if (isPublicEndpoint) {
        logger.debug('Public endpoint accessed without tenant', {
          path: req.path,
          method: req.method
        });
        return next();
      }

      // Reject all other requests without tenant identification
      logger.error('Tenant identification required', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        host: req.get('host'),
        userAgent: req.get('user-agent'),
        hasAccessToken: !!req.cookies?.['access_token'],
        headerTenantId: req.get('X-Tenant-ID') || req.get('x-tenant-id'),
        headerTenantSlug: req.get('X-Tenant-Slug') || req.get('x-tenant-slug')
      });

      res.status(400).json({
        error: 'Tenant identification required',
        message: 'Please provide tenant identification via subdomain, header, or authenticated session',
        hint: 'Ensure you are logged in or provide X-Tenant-ID/X-Tenant-Slug header',
        debug: env.isDevelopment() ? {
          hasAccessToken: !!req.cookies?.['access_token'],
          path: req.path,
          host: req.get('host')
        } : undefined
      });
      return;
    }

    // Fetch tenant from database
    let tenant;

    // Try finding by ID first
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantIdOrSlug },
    });

    // If not found, try finding by slug
    if (!tenant) {
      tenant = await prisma.tenant.findUnique({
        where: { slug: tenantIdOrSlug },
      });
    }

    // If tenant not found, return 404
    if (!tenant) {
      logger.warn(`Tenant not found: ${tenantIdOrSlug}`);
      res.status(404).json({
        error: 'Tenant not found',
        message: 'The requested tenant does not exist',
        tenantIdentifier: tenantIdOrSlug,
      });
      return;
    }

    // Trust boundary enforcement:
    // Non-superadmin authenticated requests must always resolve to their token tenant.
    if (tokenTenant && tokenRole !== 'SUPER_ADMIN') {
      const matchesTokenTenant = tenant.id === tokenTenant || tenant.slug === tokenTenant;
      if (!matchesTokenTenant) {
        recordTenantSegregationViolation(
          'TENANT_CONTEXT_MISMATCH',
          'tenant_middleware',
          'enforce',
          'blocked',
          {
            tenantId: tenant.id,
            requestTenantId: tenantIdOrSlug || undefined,
            tokenTenantId: tokenTenant,
            tenantSlug: tenant.slug,
            path: req.path,
            method: req.method,
          }
        );

        logger.warn('Tenant context mismatch blocked', {
          path: req.path,
          method: req.method,
          tokenTenant,
          resolvedTenantId: tenant.id,
          resolvedTenantSlug: tenant.slug
        });
        res.status(403).json({
          error: 'Tenant context mismatch',
          message: 'Authenticated tenant context does not match request tenant'
        });
        return;
      }
    }

    // Check if tenant is active
    if (!tenant.isActive) {
      logger.warn(`Tenant is inactive: ${tenant.id}`);
      res.status(403).json({
        error: 'Tenant inactive',
        message: 'This tenant account has been deactivated',
      });
      return;
    }

    // Subscription check removed - using planType and isActive instead

    // Inject tenant context into request
    req.tenantId = tenant.id;
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      isActive: tenant.isActive,
      settings: (tenant.settings as Record<string, unknown>) || {},
      planType: tenant.planType,
    };

    // Check if user is super admin (can bypass tenant isolation)
    // Only SUPER_ADMIN role can bypass tenant filtering, not regular ADMIN
    if (req.user && 'role' in req.user) {
      const userRole = String((req.user as { role: string }).role).trim().toUpperCase();
      req.isSuperAdmin = (userRole === 'SUPER_ADMIN');
    } else {
      req.isSuperAdmin = false;
    }

    // Create tenant-aware Prisma client.
    // SUPER_ADMIN runs globally by default, but a tenant header override forces tenant scope.
    const forceSuperAdminTenantScope = req.isSuperAdmin && identificationMethod === 'header_superadmin_override';
    req.prisma = createTenantPrismaClient(tenant.id, req.isSuperAdmin, {
      forceTenantScope: forceSuperAdminTenantScope
    });

    // Log tenant identification (info level for debugging)
    logger.info(`Tenant identified: ${tenant.slug} (${tenant.id}) via ${identificationMethod}`, {
      path: req.path,
      method: req.method,
      user: req.user ? (req.user as any).email : 'not authenticated yet',
      isSuperAdmin: req.isSuperAdmin,
      superAdminTenantScoped: forceSuperAdminTenantScope
    });

    next();
  } catch (error) {
    logger.error('Tenant middleware error:', error);
    res.status(500).json({
      error: 'Tenant identification failed',
      message: 'An error occurred while identifying the tenant',
    });
  }
}

/**
 * Optional tenant middleware (doesn't fail if tenant not found)
 */
export async function optionalTenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to identify tenant but don't fail if not found
    let tenantIdOrSlug: string | null = null;

    const tokenPayload = TenantIdentifier.fromTokenPayload(req);
    const tokenTenant = tokenPayload?.tenantId || null;
    const tokenRole = String(tokenPayload?.role || '').trim().toUpperCase();
    const headerTenant = TenantIdentifier.fromHeader(req);

    if (tokenTenant) {
      tenantIdOrSlug = tokenTenant;
      if (headerTenant && tokenRole === 'SUPER_ADMIN') {
        tenantIdOrSlug = headerTenant;
      }
    } else {
      tenantIdOrSlug = headerTenant ||
                       TenantIdentifier.fromSubdomain(req) ||
                       TenantIdentifier.fromQuery(req);
    }

    if (tenantIdOrSlug) {
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { id: tenantIdOrSlug },
            { slug: tenantIdOrSlug },
          ],
          isActive: true,
        },
      });

      if (tenant) {
        req.tenantId = tenant.id;
        req.tenant = {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain,
          isActive: tenant.isActive,
          settings: (tenant.settings as Record<string, unknown>) || {},
          planType: tenant.planType,
        };
      }
    }

    next();
  } catch (error) {
    logger.error('Optional tenant middleware error:', error);
    next(); // Continue even if there's an error
  }
}

/**
 * Super admin only middleware
 * Ensures only super admins can access certain routes
 */
export function superAdminOnly(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Check if user has SUPER_ADMIN role
  const userRole = String(req.user.role).trim().toUpperCase();
  if (userRole !== 'SUPER_ADMIN') {
    res.status(403).json({
      error: 'Access denied',
      message: 'This action requires super admin privileges',
    });
    return;
  }

  next();
}

/**
 * Prisma Client Extension for Automatic Tenant Filtering
 *
 * This extension automatically adds tenantId filters to all Prisma queries
 */
export function createTenantPrismaClient(
  tenantId: string,
  isSuperAdmin: boolean = false,
  options: { forceTenantScope?: boolean } = {}
) {
  const basePrisma = rawPrisma;
  const tenantDbRlsMode = resolveTenantDbRlsMode();
  const tenantRlsEnabled = tenantDbRlsMode === 'enforce';
  const forceTenantScope = options.forceTenantScope === true;
  const superAdminBypass = isSuperAdmin && !forceTenantScope;

  // Fast path for SUPER_ADMIN when DB-level RLS runtime context is disabled.
  if (superAdminBypass && !tenantRlsEnabled) {
    return basePrisma;
  }

  // Define types for Prisma extension parameters
  type PrismaExtensionParams = {
    model: string;
    args: Record<string, unknown>;
    query: (args: Record<string, unknown>) => Promise<unknown>;
  };

  const runWithDbContext = async <T>(operation: (client: any) => Promise<T>): Promise<T> =>
    withTenantDbRlsContext(
      basePrisma,
      {
        tenantId,
        isSuperAdmin: superAdminBypass,
        mode: tenantDbRlsMode,
      },
      async tx => operation(tx as any)
    );

  const getModelDelegate = (model: string, client: any = basePrisma): any => {
    const normalizedModelName = model ? model[0]?.toLowerCase() + model.slice(1) : model;
    return client[normalizedModelName]
      || client[model]
      || client[String(model || '').toLowerCase()];
  };

  const executeModelOperation = async (
    model: string,
    operation: string,
    args: Record<string, unknown>,
    query: (args: Record<string, unknown>) => Promise<unknown>
  ): Promise<unknown> =>
    runWithDbContext(async client => {
      const delegate = getModelDelegate(model, client);
      const modelOperation = delegate?.[operation];
      if (typeof modelOperation === 'function') {
        return modelOperation.call(delegate, args);
      }
      return query(args);
    });

  const requiresTenantFilter = (model: string): boolean =>
    !superAdminBypass && isTenantScopedModel(model);

  const recordSegregationViolationMode = tenantRlsEnabled ? 'enforce' : 'audit';

  const buildViolationReason = (where: unknown): string =>
    `where_keys=${safeWhereKeys(where)};rls_mode=${tenantDbRlsMode}`;

  const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

  /**
   * findUnique supports composite-unique aliases like `fieldA_fieldB`.
   * When we rewrite to findFirst for tenant scoping, those aliases are invalid.
   * Expand them into plain field predicates so findFirst remains valid.
   */
  const normalizeWhereForFindFirst = (where: unknown): unknown => {
    if (Array.isArray(where)) {
      return where.map(normalizeWhereForFindFirst);
    }

    if (!isPlainObject(where)) {
      return where;
    }

    const normalized: Record<string, unknown> = {};
    for (const [key, rawValue] of Object.entries(where)) {
      if (key === 'AND' || key === 'OR' || key === 'NOT') {
        normalized[key] = normalizeWhereForFindFirst(rawValue);
        continue;
      }

      if (
        key.includes('_') &&
        isPlainObject(rawValue)
      ) {
        const nestedEntries = Object.entries(rawValue);
        const looksLikeCompositeUniqueAlias =
          nestedEntries.length > 0 &&
          nestedEntries.every(([nestedKey, nestedValue]) =>
            !nestedKey.startsWith('$') &&
            !nestedKey.includes('.') &&
            (
              nestedValue === null ||
              typeof nestedValue === 'string' ||
              typeof nestedValue === 'number' ||
              typeof nestedValue === 'boolean' ||
              nestedValue instanceof Date
            )
          );

        if (looksLikeCompositeUniqueAlias) {
          for (const [nestedKey, nestedValue] of nestedEntries) {
            if (!(nestedKey in normalized)) {
              normalized[nestedKey] = nestedValue;
            }
          }
          continue;
        }
      }

      normalized[key] = normalizeWhereForFindFirst(rawValue);
    }

    return normalized;
  };

  const setTenantWhere = (where: unknown): Record<string, unknown> => ({
    ...(normalizeWhereForFindFirst(where) as Record<string, unknown> || {}),
    tenantId,
  });

  const createNotFoundError = (): Error => {
    const err = new Error('Record not found');
    (err as any).code = 'P2025';
    return err;
  };

  const extractTenantConstraints = (where: unknown): string[] => {
    if (!where || typeof where !== 'object') {
      return [];
    }

    const whereObj = where as Record<string, unknown>;
    const tenantConstraints: string[] = [];

    const directTenantId = whereObj['tenantId'];
    if (typeof directTenantId === 'string' && directTenantId.trim().length > 0) {
      tenantConstraints.push(directTenantId);
    }

    for (const [key, value] of Object.entries(whereObj)) {
      if (!key.startsWith('tenantId_') || !value || typeof value !== 'object') {
        continue;
      }
      const nestedTenantId = (value as Record<string, unknown>)['tenantId'];
      if (typeof nestedTenantId === 'string' && nestedTenantId.trim().length > 0) {
        tenantConstraints.push(nestedTenantId);
      }
    }

    return tenantConstraints;
  };

  const hasTenantConstraintInWhere = (where: unknown): boolean =>
    extractTenantConstraints(where).length > 0;

  const safeWhereKeys = (where: unknown): string => {
    if (!where || typeof where !== 'object') {
      return 'none';
    }
    return Object.keys(where as Record<string, unknown>).sort().join(',');
  };

  const assertTenantConstraintMatches = (model: string, operation: string, where: unknown): void => {
    const constraints = extractTenantConstraints(where);
    if (constraints.length === 0) {
      return;
    }
    const mismatch = constraints.find(constraintTenantId => constraintTenantId !== tenantId);
    if (mismatch) {
      recordTenantSegregationViolation(
        'TENANT_CONTEXT_MISMATCH',
        'service',
        recordSegregationViolationMode,
        'blocked',
        {
          tenantId,
          requestTenantId: mismatch,
          model,
          operation,
          reason: buildViolationReason(where),
        }
      );
      const err = new Error('Tenant context mismatch');
      (err as any).code = 'TENANT_CONTEXT_MISMATCH';
      throw err;
    }
  };

  const ensureRecordBelongsToTenant = async (
    client: any,
    model: string,
    operation: string,
    where: unknown
  ): Promise<void> => {
    const delegate = getModelDelegate(model, client);
    if (!delegate?.findFirst) {
      return;
    }

    const existing = await delegate.findFirst({
      where: setTenantWhere(where),
      select: { id: true }
    });

    if (!existing) {
      recordTenantSegregationViolation(
        'TENANT_SCOPE_VIOLATION',
        'service',
        recordSegregationViolationMode,
        'blocked',
        {
          tenantId,
          model,
          operation,
          reason: buildViolationReason(where),
        }
      );
      throw createNotFoundError();
    }
  };

  // Return Prisma client with tenant filtering middleware
  return basePrisma.$extends({
    query: {
      // Add tenant filter to all models that have tenantId
      $allModels: {
        async findMany({ model, args, query }: PrismaExtensionParams) {
          if (requiresTenantFilter(model)) {
            args['where'] = setTenantWhere(args['where']);
          }
          return executeModelOperation(model, 'findMany', args, query);
        },
        async findFirst({ model, args, query }: PrismaExtensionParams) {
          if (requiresTenantFilter(model)) {
            args['where'] = setTenantWhere(args['where']);
          }
          return executeModelOperation(model, 'findFirst', args, query);
        },
        async findUnique({ model, args, query }: PrismaExtensionParams) {
          if (requiresTenantFilter(model)) {
            assertTenantConstraintMatches(model, 'findUnique', args['where']);
            if (!hasTenantConstraintInWhere(args['where'])) {
              const findFirstArgs = {
                ...(args as Record<string, unknown>),
                where: setTenantWhere(args['where'])
              };
              return executeModelOperation(model, 'findFirst', findFirstArgs, query);
            }
          }
          return executeModelOperation(model, 'findUnique', args, query);
        },
        async findUniqueOrThrow({ model, args, query }: PrismaExtensionParams) {
          if (requiresTenantFilter(model)) {
            assertTenantConstraintMatches(model, 'findUniqueOrThrow', args['where']);
            if (!hasTenantConstraintInWhere(args['where'])) {
              const findFirstArgs = {
                ...(args as Record<string, unknown>),
                where: setTenantWhere(args['where'])
              };
              const record = await executeModelOperation(model, 'findFirst', findFirstArgs, query);
              if (!record) {
                throw createNotFoundError();
              }
              return record;
            }
          }
          return executeModelOperation(model, 'findUniqueOrThrow', args, query);
        },
        async count({ model, args, query }: PrismaExtensionParams) {
          if (requiresTenantFilter(model)) {
            args['where'] = setTenantWhere(args['where']);
          }
          return executeModelOperation(model, 'count', args, query);
        },
        async aggregate({ model, args, query }: PrismaExtensionParams) {
          if (requiresTenantFilter(model)) {
            args['where'] = setTenantWhere(args['where']);
          }
          return executeModelOperation(model, 'aggregate', args, query);
        },
        async groupBy({ model, args, query }: PrismaExtensionParams) {
          if (requiresTenantFilter(model)) {
            args['where'] = setTenantWhere(args['where']);
          }
          return executeModelOperation(model, 'groupBy', args, query);
        },
        async create({ model, args, query }: PrismaExtensionParams) {
          if (requiresTenantFilter(model)) {
            args['data'] = { ...(args['data'] as Record<string, unknown>), tenantId };
          }
          return executeModelOperation(model, 'create', args, query);
        },
        async createMany({ model, args, query }: PrismaExtensionParams) {
          if (requiresTenantFilter(model) && Array.isArray(args['data'])) {
            args['data'] = args['data'].map((item: unknown) => ({ ...(item as Record<string, unknown>), tenantId }));
          }
          return executeModelOperation(model, 'createMany', args, query);
        },
        async update({ model, args, query }: PrismaExtensionParams) {
          return runWithDbContext(async client => {
            if (requiresTenantFilter(model)) {
              assertTenantConstraintMatches(model, 'update', args['where']);
              if (!hasTenantConstraintInWhere(args['where'])) {
                await ensureRecordBelongsToTenant(client, model, 'update', args['where']);
              }
            }

            const delegate = getModelDelegate(model, client);
            if (typeof delegate?.update !== 'function') {
              return query(args);
            }
            return delegate.update(args);
          });
        },
        async updateMany({ model, args, query }: PrismaExtensionParams) {
          if (requiresTenantFilter(model)) {
            args['where'] = setTenantWhere(args['where']);
          }
          return executeModelOperation(model, 'updateMany', args, query);
        },
        async upsert({ model, args, query }: PrismaExtensionParams) {
          return runWithDbContext(async client => {
            if (requiresTenantFilter(model)) {
              args['create'] = { ...(args['create'] as Record<string, unknown>), tenantId };
              assertTenantConstraintMatches(model, 'upsert', args['where']);

              if (!hasTenantConstraintInWhere(args['where'])) {
                const delegate = getModelDelegate(model, client);
                if (delegate?.findFirst && delegate?.update && delegate?.create) {
                  const existing = await delegate.findFirst({
                    where: setTenantWhere(args['where']),
                    select: { id: true }
                  });

                  if (existing) {
                    return delegate.update({
                      where: args['where'],
                      data: args['update']
                    });
                  }

                  return delegate.create({
                    data: args['create']
                  });
                }
              }
            }

            const delegate = getModelDelegate(model, client);
            if (typeof delegate?.upsert !== 'function') {
              return query(args);
            }
            return delegate.upsert(args);
          });
        },
        async delete({ model, args, query }: PrismaExtensionParams) {
          return runWithDbContext(async client => {
            if (requiresTenantFilter(model)) {
              assertTenantConstraintMatches(model, 'delete', args['where']);
              if (!hasTenantConstraintInWhere(args['where'])) {
                await ensureRecordBelongsToTenant(client, model, 'delete', args['where']);
              }
            }

            const delegate = getModelDelegate(model, client);
            if (typeof delegate?.delete !== 'function') {
              return query(args);
            }
            return delegate.delete(args);
          });
        },
        async deleteMany({ model, args, query }: PrismaExtensionParams) {
          if (requiresTenantFilter(model)) {
            args['where'] = setTenantWhere(args['where']);
          }
          return executeModelOperation(model, 'deleteMany', args, query);
        },
      },
    },
  }) as typeof basePrisma;
}

export default tenantMiddleware;
