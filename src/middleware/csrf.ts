import { Request, Response, NextFunction } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import { env } from '../config/env';

// CSRF secret for token generation

/**
 * Simple CSRF token generation
 */
const generateToken = () => {
  return randomBytes(32).toString('hex')
}

/**
 * Secure token comparison using timing-safe comparison
 * Prevents timing attacks
 */
const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  try {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    return timingSafeEqual(aBuffer, bBuffer);
  } catch (error: unknown) {
    return false;
  }
};

/**
 * Middleware to generate and set CSRF token
 * Use this on routes that need to provide CSRF tokens
 */
const isSecureRequest = (req: Request): boolean => {
  try {
    if (req.secure) return true
    const xfp = (req.headers['x-forwarded-proto'] || '').toString().toLowerCase()
    return xfp === 'https'
  } catch (_) {
    return false
  }
}

const generateCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  const csrfToken = generateToken()
  req.csrfToken = csrfToken
  // For HTTPS requests from external domains, use 'lax' instead of 'strict'
  // to allow cookie to be sent on cross-site POST requests
  const sameSite = isSecureRequest(req) ? 'lax' : 'strict'
  res.cookie('_csrf', csrfToken, {
    httpOnly: true,
    secure: isSecureRequest(req),
    sameSite: sameSite,
    path: '/'
  })
  next()
}

/**
 * Endpoint to get CSRF token
 * Frontend should call this on app initialization
 */
const getCsrfToken = (req: Request, res: Response): void => {
  try {
    const csrfToken = generateToken()
    
    // For HTTPS requests from external domains, use 'lax' instead of 'strict'
    // to allow cookie to be sent on cross-site POST requests
    const sameSite = isSecureRequest(req) ? 'lax' : 'strict'
    
    // Set cookie
    res.cookie('_csrf', csrfToken, {
      httpOnly: true,
      secure: isSecureRequest(req),
      sameSite: sameSite,
      path: '/'
    })
    
    // Return token
    res.json({ csrfToken })
  } catch (error: unknown) {
    const errorObj = error as { message?: string };
    console.error('Error generating CSRF token:', errorObj);
    res.status(500).json({ error: 'Failed to generate CSRF token', details: errorObj.message });
  }
};

/**
 * Middleware to validate CSRF token on state-changing requests
 * Use this to protect POST/PUT/DELETE/PATCH routes
 */
const csrfProtection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  const method = req.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    next(); return;
  }

  // Get token from header (frontend sends as X-CSRF-Token)
  // Check both lowercase and original case headers
  const tokenFromHeader = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token']
  
  // Get token from cookie (set by backend)
  const tokenFromCookie = req.cookies?.['_csrf']

  // Check if both tokens exist
  if (!tokenFromHeader || !tokenFromCookie) {
    const errorDetails = {
      hasHeader: !!tokenFromHeader,
      hasCookie: !!tokenFromCookie,
      method,
      path: req.path,
      origin: req.headers?.origin,
      host: req.headers?.host,
      ip: req.ip || req.connection?.remoteAddress,
      cookies: Object.keys(req.cookies || {}),
      headers: Object.keys(req.headers || {})
    }
    console.warn('CSRF validation failed: Missing token', errorDetails)
    
    // Log to file if logger is available
    try {
      const loggerModule = await import('../utils/logger');
      const log = loggerModule.createRequestLogger(req, 'auth');
      log.warn('CSRF validation failed: Missing token', errorDetails);
    } catch (logError) {
      // Logger not available, continue
    }
    
    res.status(403).json({
      error: 'CSRF token validation failed',
      message: 'Invalid or missing CSRF token. Please refresh the page and try again.',
      details: env.isDevelopment() ? errorDetails : undefined
    }); return;
  }

  // Compare tokens using timing-safe comparison
  const tokenFromHeaderStr = Array.isArray(tokenFromHeader) ? tokenFromHeader[0] : tokenFromHeader;
  if (!secureCompare(tokenFromHeaderStr || '', tokenFromCookie || '')) {
    console.warn('CSRF validation failed: Token mismatch', {
      method,
      path: req.path,
      ip: req.ip
    })
    
    res.status(403).json({
      error: 'CSRF token validation failed',
      message: 'Invalid CSRF token. Please refresh the page and try again.'
    }); return;
  }

  // Token is valid, proceed
  next()
}

/**
 * Error handler for CSRF token validation failures
 */
const csrfErrorHandler = (err: any, _req: Request, res: Response, next: NextFunction): void => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({ 
      error: 'CSRF token validation failed',
      message: 'Invalid or missing CSRF token. Please refresh the page and try again.'
    }); return;
  }
  next(err)
}

export { 
  generateCsrfToken,
  getCsrfToken,
  csrfProtection,
  csrfErrorHandler
 }

