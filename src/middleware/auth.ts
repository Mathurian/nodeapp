import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { isAdmin, hasPermission } from './permissions';
import { jwtSecret } from '../utils/config';
import prisma from '../config/database';
import { userCache } from '../utils/cache';
import { env } from '../config/env';
import { createLogger } from '../utils/logger';
import { createTenantPrismaClient } from './tenantMiddleware';
import { updateRequestContext } from './correlationId';
import { evaluateDefaultTenantAccess } from '../utils/tenantSegregationPolicy';

const logger = createLogger('auth');

/**
 * JWT Payload Interface
 * Defines the expected structure of JWT payload
 * SECURITY FIX (2026-01-13): Added to prevent authentication bypass via malformed tokens
 */
interface JWTPayload {
  userId: string;
  tenantId: string;
  sessionVersion?: number;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Type Guard for JWT Payload Validation
 * SECURITY FIX (2026-01-13): Validates JWT payload structure before use
 * Prevents authentication bypass through malformed or tampered tokens
 *
 * @param obj - Object to validate
 * @returns True if object is a valid JWTPayload
 */
function isValidJWTPayload(obj: unknown): obj is JWTPayload {
  if (typeof obj !== 'object' || obj === null) {
    logger.warn('JWT payload validation failed: not an object', { received: typeof obj });
    return false;
  }

  const payload = obj as Record<string, unknown>;

  // Validate userId (using bracket notation for TypeScript strict mode)
  if (typeof payload['userId'] !== 'string' || payload['userId'].length === 0) {
    logger.warn('JWT payload validation failed: invalid userId', {
      userId: payload['userId'],
      type: typeof payload['userId']
    });
    return false;
  }

  // Validate tenantId (using bracket notation for TypeScript strict mode)
  if (typeof payload['tenantId'] !== 'string' || payload['tenantId'].length === 0) {
    logger.warn('JWT payload validation failed: invalid tenantId', {
      tenantId: payload['tenantId'],
      type: typeof payload['tenantId']
    });
    return false;
  }

  // Validate optional sessionVersion (using bracket notation for TypeScript strict mode)
  if (payload['sessionVersion'] !== undefined && typeof payload['sessionVersion'] !== 'number') {
    logger.warn('JWT payload validation failed: invalid sessionVersion', {
      sessionVersion: payload['sessionVersion'],
      type: typeof payload['sessionVersion']
    });
    return false;
  }

  return true;
}

const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Prefer httpOnly cookie but support Authorization: Bearer for API clients
  const cookieToken = req.cookies?.['access_token'];
  const authHeader = req.headers['authorization'];
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  const token = cookieToken || bearerToken;

  if (!token) {
    // Enhanced logging for sensitive endpoints that frequently have issues
    const isSensitiveEndpoint = req.path && (
      req.path.includes('/cache/') ||
      req.path.includes('/log-files/') ||
      req.path.includes('/backup/settings')
    );

    if (isSensitiveEndpoint) {
      logger.warn('authenticateToken: Missing token for sensitive endpoint', {
        path: req.path,
        method: req.method,
        originalUrl: req.originalUrl,
        url: req.url,
        hasCookie: !!req.cookies?.['access_token']
      });
    }
    res.status(401).json({ success: false, error: 'Access token required' });
    return;
  }

  try {
    // SECURITY FIX (2026-01-13): Verify and validate JWT payload structure
    const decoded = jwt.verify(token, jwtSecret);

    // Validate JWT payload structure before use
    if (!isValidJWTPayload(decoded)) {
      logger.error('Invalid JWT payload structure detected', {
        path: req.path,
        method: req.method,
        receivedPayload: decoded
      });
      res.status(401).json({ success: false, error: 'Invalid authentication token' });
      return;
    }

    // Try to get user from cache first (50-70% reduction in DB queries)
    let user = userCache.getById(decoded.userId) as (User & { judge?: any; contestant?: any }) | null;
    let fromCache = false;

    if (!user) {
      // Cache miss - fetch from database
      // SECURITY FIX: Add tenantId filter to prevent cross-tenant authentication bypass
      user = await prisma.user.findFirst({
        where: {
          id: decoded.userId,
          tenantId: decoded.tenantId
        },
        include: {
          judge: true,
          contestant: true
        }
      });

      if (user) {
        // Cache the user for 1 hour (3600 seconds)
        userCache.setById(decoded.userId, user, 3600);
      }
    } else {
      fromCache = true;
      // SECURITY FIX: Validate tenantId for cached users to prevent cross-tenant access
      if (user.tenantId !== decoded.tenantId) {
        res.status(401).json({ success: false, error: 'Invalid token' });
        return;
      }
    }

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }

    const normalizedUserRole = String(user.role).trim().toUpperCase();
    const requestTenantId = (req as any).tenantId as string | undefined;

    // Authenticated non-superadmins are always bound to their token tenant context.
    // This prevents cross-tenant access if request tenant context is tampered.
    if (
      requestTenantId &&
      normalizedUserRole !== 'SUPER_ADMIN' &&
      requestTenantId !== decoded.tenantId &&
      requestTenantId !== user.tenantId
    ) {
      logger.warn('Authentication blocked due to tenant context mismatch', {
        userId: user.id,
        role: user.role,
        requestTenantId,
        tokenTenantId: decoded.tenantId,
        userTenantId: user.tenantId,
        path: req.path,
      });
      res.status(403).json({
        success: false,
        error: 'Tenant context mismatch',
        code: 'TENANT_CONTEXT_MISMATCH',
      });
      return;
    }

    // SECURITY FIX #17: Improve session version tracking to prevent race conditions
    // Always fetch fresh session version from database when user is from cache
    // to prevent stale cached data from bypassing security checks
    const tokenSessionVersion = decoded.sessionVersion || 1;
    let dbSessionVersion = user.sessionVersion || 1;

    if (fromCache) {
      // Fetch fresh session version from database for cached users
      // This prevents race condition where session is invalidated but cache is stale
      const freshSessionData = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { sessionVersion: true }
      });

      if (freshSessionData) {
        dbSessionVersion = freshSessionData.sessionVersion || 1;

        // Update cache if session version changed
        if (dbSessionVersion !== (user.sessionVersion || 1)) {
          logger.info('Session version changed, updating cache', {
            userId: decoded.userId,
            oldVersion: user.sessionVersion,
            newVersion: dbSessionVersion
          });
          // Invalidate cache to force fresh fetch next time
          userCache.invalidate(decoded.userId);
        }
      }
    }

    if (tokenSessionVersion !== dbSessionVersion) {
      // Invalidate cache on session version mismatch
      userCache.invalidate(decoded.userId);

      logger.warn('Session version mismatch detected', {
        userId: user.id,
        email: user.email,
        tokenVersion: tokenSessionVersion,
        dbVersion: dbSessionVersion,
        fromCache
      });

      // Clear the invalid cookie
      res.clearCookie('access_token', {
        httpOnly: true,
        secure: env.isProduction(),
        sameSite: 'lax', // Must match cookie creation setting
        path: '/',
      });

      res.status(401).json({
        success: false,
        error: 'Session expired',
        message: 'Your session has been invalidated. Please log in again.',
        code: 'SESSION_VERSION_MISMATCH'
      });
      return;
    }

    req.user = user;

    // Set isSuperAdmin flag for tenant filtering bypass
    // SUPER_ADMIN role can see data across all tenants
    const userRole = normalizedUserRole;
    (req as any).isSuperAdmin = (userRole === 'SUPER_ADMIN');

    const defaultTenantAccess = evaluateDefaultTenantAccess({
      userId: user.id,
      role: userRole,
      tenantId: req.tenantId || user.tenantId,
      tenantSlug: (req as any).tenant?.slug,
      method: req.method,
      path: req.originalUrl || req.path,
    });

    if (!defaultTenantAccess.allowed && defaultTenantAccess.enforced) {
      logger.warn('authenticateToken: blocked non-super-admin access to default tenant', {
        userId: user.id,
        email: user.email,
        role: userRole,
        tenantId: req.tenantId || user.tenantId,
        tenantSlug: (req as any).tenant?.slug,
        mode: defaultTenantAccess.mode,
        path: req.originalUrl || req.path,
      });

      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: defaultTenantAccess.reason,
        code: defaultTenantAccess.code,
      });
      return;
    }

    // Recreate req.prisma with correct isSuperAdmin flag
    // Tenant middleware runs before auth, so it created req.prisma with isSuperAdmin=false
    // Now that we know the user's role, recreate it if needed
    if ((req as any).isSuperAdmin && (req as any).tenantId) {
      (req as any).prisma = createTenantPrismaClient((req as any).tenantId, true);
    }

    updateRequestContext({
      userId: user.id,
      tenantId: req.tenantId || user.tenantId,
      isSuperAdmin: (req as any).isSuperAdmin,
      requestPrisma: (req as any).prisma,
      userEmail: user.email,
      userName: user.name,
    });

    // Enhanced logging for admin access to sensitive endpoints
    const isSensitiveEndpoint = req.path && (
      req.path.includes('/cache/') ||
      req.path.includes('/log-files/') ||
      req.path.includes('/backup/settings')
    );
    if (isSensitiveEndpoint && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) {
      logger.info('authenticateToken: SUPER_ADMIN/ADMIN authenticated for sensitive endpoint', {
        path: req.path,
        userId: user.id,
        email: user.email,
        role: user.role,
        fromCache
      });
    }

    next();
  } catch (error: unknown) {
    // Enhanced logging for sensitive endpoints
    const isSensitiveEndpoint = req.path && (
      req.path.includes('/cache/') || 
      req.path.includes('/log-files/') || 
      req.path.includes('/backup/settings')
    );
    
    const errorObj = error as { name?: string; message?: string; stack?: string };
    
    if (isSensitiveEndpoint) {
      logger.error('authenticateToken: Authentication failed for sensitive endpoint', {
        error: errorObj.message,
        errorName: errorObj.name,
        hasCookie: !!req.cookies?.['access_token'],
        path: req.path,
        method: req.method,
        originalUrl: req.originalUrl,
        url: req.url,
        stack: errorObj.stack
      });
    } else if (errorObj.name !== 'TokenExpiredError') {
      logger.warn('Authentication failed:', {
        error: errorObj.message,
        errorName: errorObj.name,
        hasCookie: !!req.cookies?.['access_token'],
        path: req.path,
        method: req.method
      });
    }

    // Clear the invalid cookie
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: env.isProduction(),
      sameSite: 'lax', // Must match cookie creation setting
      path: '/',
    });

    // Return 401 for authentication failures (invalid/expired token)
    // Always return 401 for token errors - 403 should only be for permission issues after successful auth
    if (errorObj.name === 'TokenExpiredError' || errorObj.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: errorObj.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      });
      return;
    }
    // For other errors, still return 401 as it's an authentication issue
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Check if an organizer has permission to access a specific event/contest/category
 * SECURITY FIX: Prevents cross-resource access by organizers
 */
const checkOrganizerPermission = async (
  _userId: string,
  tenantId: string,
  eventId?: string,
  contestId?: string,
  categoryId?: string
): Promise<boolean> => {
  try {
    // If no resource IDs provided, allow access (e.g., for list endpoints)
    if (!eventId && !contestId && !categoryId) {
      return true;
    }

    // Check that the most specific resource provided belongs to this tenant.
    // Organizers can manage any resource within their tenant; tenant isolation
    // is already enforced by authenticateToken.
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, tenantId }
      });
      return !!category;
    }

    if (contestId) {
      const contest = await prisma.contest.findFirst({
        where: { id: contestId, tenantId }
      });
      return !!contest;
    }

    if (eventId) {
      const event = await prisma.event.findFirst({
        where: { id: eventId, tenantId }
      });
      return !!event;
    }

    return false;
  } catch (error) {
    logger.error('checkOrganizerPermission error', { error });
    return false; // Fail closed on errors
  }
};

const requireRole = (roles: string[]): ((req: Request, res: Response, next: NextFunction) => void | Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // CRITICAL: Check if req.user exists - this MUST be set by authenticateToken
    if (!req.user) {
      logger.error('requireRole: CRITICAL - No user object found (authenticateToken may have failed)', {
        path: req.path,
        method: req.method,
        hasCookie: !!req.cookies?.['access_token'],
        originalUrl: req.originalUrl,
        url: req.url,
        timestamp: new Date().toISOString()
      });
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_USER_OBJECT',
        hint: 'Please ensure authenticateToken middleware runs before requireRole'
      });
      return;
    }

    const normalizedRoles = roles.map(r => String(r).trim().toUpperCase());
    const userRole = String(req.user.role).trim().toUpperCase();
    // SUPER_ADMIN has access to all routes.
    if (userRole === 'SUPER_ADMIN') {
      // Log for debugging sensitive endpoints
      const isSensitiveEndpoint = req.path && (
        req.path.includes('/cache/') ||
        req.path.includes('/log-files/') ||
        req.path.includes('/backup/settings')
      );
      if (isSensitiveEndpoint) {
        logger.info('requireRole: ✅ SUPER_ADMIN access granted (unconditional)', {
          userRole,
          path: req.path,
          email: req.user.email,
          userId: req.user.id,
          timestamp: new Date().toISOString()
        });
      }
      next();
      return;
    }

    // ADMIN has broad platform access, but cannot satisfy SUPER_ADMIN-only routes.
    if (userRole === 'ADMIN') {
      const superAdminOnlyRoute = normalizedRoles.includes('SUPER_ADMIN') && !normalizedRoles.includes('ADMIN');
      if (!superAdminOnlyRoute) {
        next();
        return;
      }
    }

    // ORGANIZER access with resource scoping
    // SECURITY FIX: Check if organizer has permission for this specific resource
    if (userRole === 'ORGANIZER') {
      // Extract resource IDs from request params, query, or body
      const eventId = req.params['eventId'] || req.query['eventId'] || req.body?.eventId;
      const contestId = req.params['contestId'] || req.query['contestId'] || req.body?.contestId;
      const categoryId = req.params['categoryId'] || req.query['categoryId'] || req.body?.categoryId;

      // Check permission with await to prevent race condition
      try {
        const hasPermission = await checkOrganizerPermission(
          req.user!.id,
          req.tenantId || '',
          eventId as string,
          contestId as string,
          categoryId as string
        );

        if (hasPermission) {
          next();
        } else {
          logger.warn('requireRole: ORGANIZER permission denied', {
            userId: req.user!.id,
            eventId,
            contestId,
            categoryId,
            path: req.path
          });
          res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'You do not have permission to access this resource'
          });
        }
      } catch (error) {
        logger.error('requireRole: ORGANIZER permission check error', { error });
        res.status(500).json({ success: false, error: 'Permission check failed' });
      }
      return;
    }

    // Check if user role is in allowed roles (normalized comparison)
    if (!normalizedRoles.includes(userRole)) {
      logger.warn('requireRole: Role check failed (403)', {
        userRole: req.user.role,
        normalizedUserRole: userRole,
        requiredRoles: roles,
        normalizedRequiredRoles: normalizedRoles,
        userId: req.user.id,
        userEmail: req.user.email,
        path: req.path,
        method: req.method,
        fullPath: req.originalUrl || req.url
      });
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    // Log successful role check for debugging
    const isSensitiveEndpoint = req.path && (
      req.path.includes('/cache/') || 
      req.path.includes('/log-files/') || 
      req.path.includes('/backup/settings')
    );
    if (isSensitiveEndpoint) {
      logger.info('requireRole: Access granted', {
        userRole,
        requiredRoles: normalizedRoles,
        path: req.path,
        email: req.user.email,
        timestamp: new Date().toISOString()
      });
    }
    next();
  };
};

// Enhanced permission check using the permissions matrix
const requirePermission = (action: string): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // SUPER_ADMIN and ADMIN have all permissions
    if (isAdmin(req.user.role)) {
      next();
      return;
    }

    if (!hasPermission(req.user.role, action)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: action,
        userRole: req.user.role
      });
      return;
    }

    next();
  };
};

// Export checkRoles as an alias for requireRole (for backward compatibility)
const checkRoles = requireRole;

/**
 * Optional authentication middleware - sets req.user if valid token present,
 * but proceeds without error if no token. Useful for public routes that can
 * optionally use user context when available.
 */
const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const token = req.cookies?.['access_token'];

  if (!token) {
    // No token - proceed without user context
    return next();
  }

  try {
    // SECURITY FIX (2026-01-13): Verify and validate JWT payload structure
    const decoded = jwt.verify(token, jwtSecret);

    // Validate JWT payload structure before use
    if (!isValidJWTPayload(decoded)) {
      logger.warn('Invalid JWT payload in optional auth middleware', {
        path: req.path,
        receivedPayload: decoded
      });
      // For optional auth, just proceed without user context
      return next();
    }

    // Try to get user from cache first
    let user = userCache.getById(decoded.userId) as (User & { judge?: any; contestant?: any }) | null;

    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          id: decoded.userId,
          tenantId: decoded.tenantId
        },
        include: {
          judge: true,
          contestant: true
        }
      });

      if (user) {
        userCache.setById(decoded.userId, user, 3600);
      }
    }

    if (user && user.isActive && user.sessionVersion === decoded.sessionVersion) {
      const defaultTenantAccess = evaluateDefaultTenantAccess({
        userId: user.id,
        role: user.role,
        tenantId: req.tenantId || user.tenantId,
        tenantSlug: (req as any).tenant?.slug,
        method: req.method,
        path: req.originalUrl || req.path,
      });

      if (!defaultTenantAccess.allowed && defaultTenantAccess.enforced) {
        return next();
      }

      req.user = user;

      // Set isSuperAdmin flag for tenant filtering bypass
      const userRole = String(user.role).trim().toUpperCase();
      (req as any).isSuperAdmin = (userRole === 'SUPER_ADMIN');
    }
    // If user invalid, proceed without user context (don't fail)
    next();
  } catch {
    // Token invalid - proceed without user context
    next();
  }
};

export {
  authenticateToken,
  optionalAuth,
  requireRole,
  requirePermission,
  checkRoles,
  checkOrganizerPermission
 }
