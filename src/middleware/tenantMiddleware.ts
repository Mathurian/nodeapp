/**
 * Tenant Middleware
 *
 * This middleware handles multi-tenancy isolation and automatic tenant context injection.
 * It identifies the tenant from subdomain, custom domain, header, or JWT token.
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { env } from '../config/env';

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
 * Static list of models that have tenantId field and require tenant filtering.
 * This replaces runtime field detection which doesn't work with Prisma Client.
 * Based on database schema analysis - 71 of 83 tables have tenantId.
 */
const TENANT_SCOPED_MODELS = [
  'user', 'event', 'contest', 'category', 'score', 'assignment',
  'judge', 'contestant', 'notification', 'auditLog', 'backup',
  'tenant', 'roleAssignment', 'tallyMasterAssignment', 'auditorAssignment',
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
  'criterion', 'report'
];

/**
 * Helper function to check if a model requires tenant filtering
 */
function isTenantScopedModel(model: string): boolean {
  const modelLower = model.toLowerCase();
  return TENANT_SCOPED_MODELS.includes(modelLower);
}

/**
 * Tenant identification strategies
 */
export class TenantIdentifier {
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

    // Check if it's a subdomain (must have at least 3 parts)
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      // Ignore common subdomains
      if (subdomain && !['www', 'api', 'app', 'admin'].includes(subdomain)) {
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
  static fromToken(req: Request): string | null {
    // First check if user is already authenticated (req.user exists)
    if (req.user && 'tenantId' in req.user) {
      return (req.user as { tenantId: string }).tenantId;
    }

    // If req.user doesn't exist yet, try to decode JWT token directly
    // This allows tenant identification before auth middleware runs
    try {
      const token = req.cookies?.['access_token'];
      if (!token) return null;

      // Import jwt here to avoid circular dependencies
      const jwt = require('jsonwebtoken');
      const { jwtSecret } = require('../utils/config');

      const decoded = jwt.verify(token, jwtSecret) as { userId: string; tenantId: string };
      return decoded.tenantId || null;
    } catch (error) {
      // Token invalid or expired - not an error, just means no tenant from token
      return null;
    }
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

    // Try different identification strategies in order of precedence
    // 1. Header (highest priority - for API clients)
    tenantIdOrSlug = TenantIdentifier.fromHeader(req);
    if (tenantIdOrSlug) {
      identificationMethod = 'header';
    }

    // 2. JWT Token (for authenticated users)
    if (!tenantIdOrSlug) {
      tenantIdOrSlug = TenantIdentifier.fromToken(req);
      if (tenantIdOrSlug) {
        identificationMethod = 'token';
        logger.debug(`Tenant identified from JWT token: ${tenantIdOrSlug}`, { path: req.path });
      }
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

    // 6. Default tenant (fallback)
    if (!tenantIdOrSlug) {
      tenantIdOrSlug = 'default_tenant';
      identificationMethod = 'default';
      logger.warn(`No tenant identified, falling back to default_tenant`, {
        path: req.path,
        hasCookie: !!req.cookies?.['access_token'],
        hasUser: !!req.user,
        host: req.get('host')
      });
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

    // Log tenant identification (info level for debugging)
    logger.info(`Tenant identified: ${tenant.slug} (${tenant.id}) via ${identificationMethod}`, {
      path: req.path,
      method: req.method,
      user: req.user ? (req.user as any).email : 'not authenticated yet'
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

    tenantIdOrSlug = TenantIdentifier.fromHeader(req) ||
                     TenantIdentifier.fromToken(req) ||
                     TenantIdentifier.fromSubdomain(req) ||
                     TenantIdentifier.fromQuery(req);

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
export function createTenantPrismaClient(tenantId: string, isSuperAdmin: boolean = false) {
  // If super admin, return regular client without tenant filtering
  if (isSuperAdmin) {
    return prisma;
  }

  // Define types for Prisma extension parameters
  type PrismaExtensionParams = {
    model: string;
    args: Record<string, unknown>;
    query: (args: Record<string, unknown>) => Promise<unknown>;
  };

  // Return Prisma client with tenant filtering middleware
  return prisma.$extends({
    query: {
      // Add tenant filter to all models that have tenantId
      $allModels: {
        async findMany({ model, args, query }: PrismaExtensionParams) {
          // Use static list to check if model has tenantId field
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async findUnique({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async count({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async aggregate({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async groupBy({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async create({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['data'] = { ...(args['data'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async createMany({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model) && Array.isArray(args['data'])) {
            args['data'] = args['data'].map((item: unknown) => ({ ...(item as Record<string, unknown>), tenantId }));
          }
          return query(args);
        },
        async update({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async updateMany({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async upsert({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
            args['create'] = { ...(args['create'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async delete({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async deleteMany({ model, args, query }: PrismaExtensionParams) {
          if (isTenantScopedModel(model)) {
            args['where'] = { ...(args['where'] as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
      },
    },
  }) as typeof prisma;
}

export default tenantMiddleware;
