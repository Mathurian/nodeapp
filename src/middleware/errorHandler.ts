import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import prisma from '../utils/prisma';
import { env } from '../config/env';
import { ErrorLogService } from '../services/ErrorLogService';

const logActivity = (action: string, resourceType: string | null = null, resourceId: string | null = null) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalSend = res.send
    
    res.send = function(data) {
      // Log activity after response is sent
      if (req.user && res.statusCode < 400) {
        // Log to database asynchronously
        setImmediate(async () => {
          try {
            // Check if prisma and activityLog are available
            if (!prisma || !prisma.activityLog) {
              return;
            }

            // Extract resourceId from route parameters if not provided
            let finalResourceId = resourceId
            if (!finalResourceId && req.params) {
              // Try common parameter names
              finalResourceId = req.params['id'] || 
                               req.params['userId'] || 
                               req.params['eventId'] || 
                               req.params['contestId'] || 
                               req.params['categoryId'] || 
                               req.params['scoreId'] ||
                               req.params['deductionId'] ||
                               null
            }
            
            // Extract userName and userRole from request if available
            const userName: string | null = req.user?.name || null;
            const userRole: string | null = req.user?.role || null;
            
            await prisma.activityLog.create({
              data: {
                userId: req.user!.id,
                userName: userName,
                userRole: userRole,
                action: action,
                resourceType: resourceType,
                resourceId: finalResourceId,
                ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
                userAgent: req.get('User-Agent') || 'Unknown',
                details: JSON.stringify({
                  method: req.method,
                  path: req.path,
                  timestamp: new Date().toISOString(),
                  // Include relevant request data
                  body: req.body ? Object.keys(req.body).reduce((acc: Record<string, unknown>, key: string) => {
                    // Exclude sensitive fields from logging
                    // SECURITY FIX: Case-insensitive field filtering with comprehensive list
                    const sensitiveFields = [
                      'password', 'token', 'secret', 'apikey', 'api_key',
                      'mfa', 'totp', 'otp', 'mfasecret', 'mfa_secret',
                      'certificate', 'privatekey', 'private_key',
                      'accesstoken', 'access_token', 'refreshtoken', 'refresh_token',
                      'sessionid', 'session_id', 'auth', 'authorization',
                      'bearer', 'jwt', 'ssn', 'creditcard', 'credit_card',
                      'cvv', 'pin', 'backupcodes', 'backup_codes'
                    ];
                    const normalizedKey = key.toLowerCase();
                    const isSensitive = sensitiveFields.some(field => normalizedKey.includes(field));

                    if (!isSensitive) {
                      acc[key] = req.body[key];
                    } else {
                      acc[key] = '[REDACTED]';
                    }
                    return acc;
                  }, {}) : null,
                  query: req.query || null,
                  params: req.params || null
                })
              }
            })
          } catch (error) {
            console.error('Failed to log activity:', error)
          }
        })
      }
      
      return originalSend.call(this, data)
    }
    
    next()
  }
}

const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  // Enhanced error tracking and monitoring
  const error = err as { message?: string; name?: string; stack?: string; statusCode?: number; code?: string };
  const errorDetails = {
    message: error.message || 'Unknown error',
    name: error.name || 'Error',
    stack: error.stack,
    timestamp: new Date().toISOString(),
    requestId: req.id || (req.headers['x-request-id'] as string) || null,
    userId: req.user?.id || null,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  }

  // Log error to console with structured format
  console.error('[ERROR]', {
    ...errorDetails,
    // Exclude stack trace from console in production
    stack: env.isProduction() ? undefined : error.stack,
  })

  // Log ALL errors to database using ErrorLogService
  setImmediate(async () => {
    try {
      const errorLogService = container.resolve(ErrorLogService);
      const tenantId = (req as any).tenantId || req.user?.tenantId || 'default_tenant';

      // Create error object with stack trace
      const errorObj = new Error(error.message || 'Unknown error');
      errorObj.stack = error.stack;
      errorObj.name = error.name || 'Error';

      await errorLogService.logHttpError({
        error: errorObj,
        path: req.path,
        method: req.method,
        statusCode: error.statusCode || 500,
        userId: req.user?.id,
        tenantId,
        metadata: {
          errorCode: error.code,
          requestId: (() => {
            const id = req.id || req.headers['x-request-id'];
            if (typeof id === 'string') return id;
            if (Array.isArray(id)) return id[0] || null;
            return null;
          })(),
          query: req.query || {},
          params: req.params || {},
          ipAddress: req.ip || req.connection?.remoteAddress || 'Unknown',
          userAgent: req.get('User-Agent') || 'Unknown',
        }
      });
    } catch (logError) {
      console.error('Failed to log error to database:', logError);
    }
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (error.name === 'UnauthorizedError' || error.statusCode === 401) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: error.message || 'Authentication required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (error.name === 'ForbiddenError' || error.statusCode === 403) {
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: error.message || 'You do not have permission to access this resource',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (error.name === 'NotFoundError' || error.statusCode === 404) {
    res.status(404).json({
      success: false,
      error: 'Not found',
      message: error.message || 'Resource not found',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    if (error.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'A record with this value already exists',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Record not found',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  // Default internal server error
  const statusCode = error.statusCode || 500
  res.status(statusCode).json({
    success: false,
    error: 'Internal server error',
    message: env.isProduction() ? 'An unexpected error occurred' : error.message,
    timestamp: new Date().toISOString(),
    // Include stack trace only in development
    ...(!env.isProduction() && { stack: error.stack }),
  })
}

export { 
  logActivity,
  errorHandler
 }
