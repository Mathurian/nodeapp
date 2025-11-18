import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isAdmin, hasPermission } from './permissions';
import { jwtSecret } from '../utils/config';
import prisma from '../utils/prisma';
import { userCache } from '../utils/cache';


const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Read token from httpOnly cookie instead of Authorization header
  const token = req.cookies?.access_token;

  if (!token) {
    // Enhanced logging for sensitive endpoints that frequently have issues
    const isSensitiveEndpoint = req.path && (
      req.path.includes('/cache/') ||
      req.path.includes('/log-files/') ||
      req.path.includes('/backup/settings')
    );

    if (isSensitiveEndpoint) {
      console.warn('authenticateToken: Missing token for sensitive endpoint', {
        path: req.path,
        method: req.method,
        originalUrl: req.originalUrl,
        url: req.url,
        hasCookie: !!req.cookies?.access_token
      });
    }
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;

    // Try to get user from cache first (50-70% reduction in DB queries)
    let user = userCache.getById(decoded.userId);
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
        } as any
      } as any);

      if (user) {
        // Cache the user for 1 hour (3600 seconds)
        userCache.setById(decoded.userId, user, 3600);
      }
    } else {
      fromCache = true;
      // SECURITY FIX: Validate tenantId for cached users to prevent cross-tenant access
      if (user.tenantId !== decoded.tenantId) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Check session version to detect security events (password change, etc.)
    const tokenSessionVersion = decoded.sessionVersion || 1;
    const dbSessionVersion = user.sessionVersion || 1;

    if (tokenSessionVersion !== dbSessionVersion) {
      // Invalidate cache on session version mismatch
      userCache.invalidate(decoded.userId);

      console.warn('Session version mismatch detected', {
        userId: user.id,
        email: user.email,
        tokenVersion: tokenSessionVersion,
        dbVersion: dbSessionVersion,
        fromCache
      });

      // Clear the invalid cookie
      res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      res.status(401).json({
        error: 'Session expired',
        message: 'Your session has been invalidated. Please log in again.',
        code: 'SESSION_VERSION_MISMATCH'
      });
      return;
    }

    req.user = user;

    // Enhanced logging for admin access to sensitive endpoints
    const isSensitiveEndpoint = req.path && (
      req.path.includes('/cache/') ||
      req.path.includes('/log-files/') ||
      req.path.includes('/backup/settings')
    );
    if (isSensitiveEndpoint && user.role === 'ADMIN') {
      console.log('authenticateToken: Admin authenticated for sensitive endpoint', {
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
      console.error('authenticateToken: Authentication failed for sensitive endpoint', {
        error: errorObj.message,
        errorName: errorObj.name,
        hasCookie: !!req.cookies?.access_token,
        path: req.path,
        method: req.method,
        originalUrl: req.originalUrl,
        url: req.url,
        stack: errorObj.stack
      });
    } else if (errorObj.name !== 'TokenExpiredError') {
      console.warn('Authentication failed:', {
        error: errorObj.message,
        errorName: errorObj.name,
        hasCookie: !!req.cookies?.access_token,
        path: req.path,
        method: req.method
      });
    }

    // Clear the invalid cookie
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    // Return 401 for authentication failures (invalid/expired token)
    // Always return 401 for token errors - 403 should only be for permission issues after successful auth
    if (errorObj.name === 'TokenExpiredError' || errorObj.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: 'Invalid or expired token',
        code: errorObj.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      });
      return;
    }
    // For other errors, still return 401 as it's an authentication issue
    res.status(401).json({
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
  userId: string,
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

    // Check if organizer has created any assignments for this resource
    // This indicates they have been involved in managing this event/contest
    const assignmentExists = await prisma.assignment.findFirst({
      where: {
        assignedBy: userId,
        tenantId: tenantId,
        ...(eventId && { eventId }),
        ...(contestId && { contestId }),
        ...(categoryId && { categoryId })
      }
    });

    return !!assignmentExists;
  } catch (error) {
    console.error('checkOrganizerPermission error:', error);
    return false; // Fail closed on errors
  }
};

const requireRole = (roles: string[]): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // CRITICAL: Check if req.user exists - this MUST be set by authenticateToken
    if (!req.user) {
      console.error('requireRole: CRITICAL - No user object found (authenticateToken may have failed)', {
        path: req.path,
        method: req.method,
        hasCookie: !!req.cookies?.access_token,
        originalUrl: req.originalUrl,
        url: req.url,
        timestamp: new Date().toISOString()
      });
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_USER_OBJECT',
        hint: 'Please ensure authenticateToken middleware runs before requireRole'
      });
      return;
    }

    // ADMIN has access to EVERYTHING - always allow, no exceptions
    // Check this FIRST before any other logic
    const userRole = String(req.user.role).trim().toUpperCase();
    if (userRole === 'ADMIN') {
      // Log for debugging sensitive endpoints
      const isSensitiveEndpoint = req.path && (
        req.path.includes('/cache/') || 
        req.path.includes('/log-files/') || 
        req.path.includes('/backup/settings')
      );
      if (isSensitiveEndpoint) {
        console.log('requireRole: ✅ ADMIN access granted (unconditional)', {
          userRole,
          path: req.path,
          email: req.user.email,
          userId: req.user.id,
          timestamp: new Date().toISOString()
        });
      }
      next(); // ADMIN always passes - never block, no matter what
      return;
    }

    // ORGANIZER access with resource scoping
    // SECURITY FIX: Check if organizer has permission for this specific resource
    if (userRole === 'ORGANIZER') {
      // Extract resource IDs from request params, query, or body
      const eventId = req.params.eventId || req.query.eventId || req.body?.eventId;
      const contestId = req.params.contestId || req.query.contestId || req.body?.contestId;
      const categoryId = req.params.categoryId || req.query.categoryId || req.body?.categoryId;

      // Check permission asynchronously
      checkOrganizerPermission(
        req.user!.id,
        req.tenantId || '',
        eventId as string,
        contestId as string,
        categoryId as string
      ).then(hasPermission => {
        if (hasPermission) {
          next();
        } else {
          console.warn('requireRole: ORGANIZER permission denied', {
            userId: req.user!.id,
            eventId,
            contestId,
            categoryId,
            path: req.path
          });
          res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to access this resource'
          });
        }
      }).catch(error => {
        console.error('requireRole: ORGANIZER permission check error', error);
        res.status(500).json({ error: 'Permission check failed' });
      });
      return;
    }

    // Check if user role is in allowed roles (normalized comparison)
    const normalizedRoles = roles.map(r => String(r).trim().toUpperCase());
    if (!normalizedRoles.includes(userRole)) {
      console.warn('requireRole: Role check failed (403)', {
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
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Log successful role check for debugging
    const isSensitiveEndpoint = req.path && (
      req.path.includes('/cache/') || 
      req.path.includes('/log-files/') || 
      req.path.includes('/backup/settings')
    );
    if (isSensitiveEndpoint) {
      console.log('requireRole: Access granted', {
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
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // ADMIN has all permissions
    if (isAdmin(req.user.role)) {
      next();
      return;
    }

    if (!hasPermission(req.user.role, action)) {
      res.status(403).json({ 
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

export {
  authenticateToken,
  requireRole,
  requirePermission,
  checkRoles,
  checkOrganizerPermission
 }
