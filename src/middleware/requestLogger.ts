import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createRequestLogger } from '../utils/logger';

/**
 * Request logging middleware
 * Attaches a unique request ID to each request for correlation tracking
 * Logs request start and completion with timing information
 */
const requestLogging = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID for correlation tracking
  const requestId = uuidv4()
  req.requestId = requestId

  // Attach request ID to response headers for client-side correlation
  res.setHeader('X-Request-ID', requestId)

  // Create logger for this request
  const log = createRequestLogger(req, 'request')

  // Attach logger to request for use in controllers
  req.logger = log

  const start = Date.now()

  // Log request start with basic information
  log.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || 'anonymous'
  })

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - start
    const logLevel = res.statusCode >= 500 ? 'error' :
                     res.statusCode >= 400 ? 'warn' :
                     'info'

    log[logLevel]('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      durationCategory: getDurationCategory(duration),
      contentLength: res.get('content-length') || 0,
      userId: req.user?.id || 'anonymous',
      userRole: req.user?.role || 'none'
    })

    // Warn on slow requests (>2 seconds)
    if (duration > 2000) {
      log.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode
      })
    }
  })

  // Capture response close event (connection closed before response finished)
  res.on('close', () => {
    if (!res.finished) {
      const duration = Date.now() - start
      log.warn('Request connection closed before response finished', {
        requestId,
        method: req.method,
        url: req.url,
        duration,
        userId: req.user?.id || 'anonymous'
      })
    }
  })

  next()
}

/**
 * Categorize request duration for metrics
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Duration category
 */
function getDurationCategory(duration: number): string {
  if (duration < 100) return 'fast'
  if (duration < 500) return 'normal'
  if (duration < 1000) return 'slow'
  if (duration < 2000) return 'very-slow'
  return 'critical'
}

/**
 * Error logging middleware
 * Logs any errors that occur during request processing
 * Should be placed after all routes
 */
const errorLogging = (err: unknown, req: Request, res: Response, next: NextFunction): void => {
  const log = req.logger || createRequestLogger(req, 'error')
  const error = err as { message?: string; stack?: string; statusCode?: number };

  log.error('Request error occurred', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: error.message || 'Unknown error',
    stack: error.stack,
    userId: req.user?.id || 'anonymous',
    statusCode: error.statusCode || 500
  })

  next(err)
}

export { 
  requestLogging,
  errorLogging
 }
