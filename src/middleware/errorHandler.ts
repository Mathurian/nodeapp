import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

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
              finalResourceId = req.params.id || 
                               req.params.userId || 
                               req.params.eventId || 
                               req.params.contestId || 
                               req.params.categoryId || 
                               req.params.scoreId ||
                               req.params.deductionId ||
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
                  body: req.body ? Object.keys(req.body).reduce((acc: Record<string, any>, key: string) => {
                    // Exclude sensitive fields from logging
                    if (!['password', 'token', 'secret', 'apiKey'].includes(key.toLowerCase())) {
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

const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction): void => {
  // Enhanced error tracking and monitoring
  const errorDetails = {
    message: err.message,
    name: err.name,
    stack: err.stack,
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
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  })

  // Log critical errors to database asynchronously
  if (err.statusCode >= 500 || !err.statusCode) {
    setImmediate(async () => {
      try {
        // Use ActivityLog instead of errorLog (which doesn't exist in schema)
        if (!prisma || !prisma.activityLog) {
          return;
        }

        await prisma.activityLog.create({
          data: {
            action: 'ERROR',
            details: JSON.stringify({
              message: err.message,
              name: err.name,
              stack: err.stack,
              statusCode: err.statusCode || 500,
              method: req.method,
              path: req.path,
              ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
              userAgent: req.get('User-Agent') || 'Unknown',
              requestId: (() => {
                const id = req.id || req.headers['x-request-id'];
                if (typeof id === 'string') return id;
                if (Array.isArray(id)) return id[0] || null;
                return null;
              })(),
              body: req.body || {},
              query: req.query || {},
              params: req.params || {},
            }),
            userId: req.user?.id || null,
          },
        })
      } catch (logError) {
        console.error('Failed to log error to database:', logError)
      }
    })
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: err.message || 'Authentication required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err.name === 'ForbiddenError' || err.statusCode === 403) {
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: err.message || 'You do not have permission to access this resource',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err.name === 'NotFoundError' || err.statusCode === 404) {
    res.status(404).json({
      success: false,
      error: 'Not found',
      message: err.message || 'Resource not found',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'A record with this value already exists',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (err.code === 'P2025') {
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
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    timestamp: new Date().toISOString(),
    // Include stack trace only in development
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
}

export { 
  logActivity,
  errorHandler
 }
