/**
 * Tenant Middleware
 *
 * This middleware handles multi-tenancy isolation and automatic tenant context injection.
 * It identifies the tenant from subdomain, custom domain, header, or JWT token.
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';

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
    const hostname = host.split(':')[0];

    // Check if it's a subdomain (must have at least 3 parts)
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const subdomain = parts[0];
      // Ignore common subdomains
      if (!['www', 'api', 'app', 'admin'].includes(subdomain)) {
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
    const hostname = host.split(':')[0];

    // Return hostname as potential custom domain
    // Will be validated against tenant domains in database
    return hostname;
  }

  /**
   * Identify tenant from X-Tenant-ID header
   */
  static fromHeader(req: Request): string | null {
    return req.get('X-Tenant-ID') || req.get('x-tenant-id') || null;
  }

  /**
   * Identify tenant from JWT token (if user is authenticated)
   */
  static fromToken(req: Request): string | null {
    // Check if user is authenticated and has tenantId
    if (req.user && 'tenantId' in req.user) {
      return (req.user as { tenantId: string }).tenantId;
    }
    return null;
  }

  /**
   * Identify tenant from query parameter (for development/testing)
   */
  static fromQuery(req: Request): string | null {
    if (process.env.NODE_ENV === 'development') {
      return req.query.tenantId as string || null;
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
      settings: tenant.settings,
      planType: tenant.planType,
    };

    // Check if user is super admin (can bypass tenant isolation)
    if (req.user && 'isSuperAdmin' in req.user && (req.user as { isSuperAdmin: boolean }).isSuperAdmin) {
      req.isSuperAdmin = true;
    }

    // Log tenant identification (debug level)
    logger.debug(`Tenant identified: ${tenant.slug} (${tenant.id}) via ${identificationMethod}`);

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
  res: Response,
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
          settings: tenant.settings,
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

  if (!('isSuperAdmin' in req.user && (req.user as { isSuperAdmin: boolean }).isSuperAdmin)) {
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
          // Check if model has tenantId field
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async findFirst({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async findUnique({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async findUniqueOrThrow({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async count({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async aggregate({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async groupBy({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async create({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.data = { ...(args.data as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async createMany({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields && Array.isArray(args.data)) {
            args.data = args.data.map((item: unknown) => ({ ...(item as Record<string, unknown>), tenantId }));
          }
          return query(args);
        },
        async update({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async updateMany({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async upsert({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
            args.create = { ...(args.create as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async delete({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
        async deleteMany({ model, args, query }: PrismaExtensionParams) {
          const modelFields = (prisma as Record<string, unknown>)[model] as { fields?: Record<string, unknown> } | undefined;
          if (modelFields?.fields && 'tenantId' in modelFields.fields) {
            args.where = { ...(args.where as Record<string, unknown>), tenantId };
          }
          return query(args);
        },
      },
    },
  }) as typeof prisma;
}

export default tenantMiddleware;
