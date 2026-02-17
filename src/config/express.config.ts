/**
 * Express Application Configuration
 * Modular configuration for Express app middleware and routes
 */

import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { env } from './env'
import { createLogger } from '../utils/logger'

const logger = createLogger('express')

const resolveTrustProxySetting = (): boolean | number | string => {
  const raw = (process.env['TRUST_PROXY'] || '').trim();
  if (!raw) {
    return 'loopback, linklocal, uniquelocal';
  }

  const normalized = raw.toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  const parsedNumber = Number(raw);
  if (!Number.isNaN(parsedNumber) && Number.isInteger(parsedNumber) && parsedNumber >= 0) {
    return parsedNumber;
  }

  return raw;
};

/**
 * Parse allowed origins from environment
 */
export const parseAllowedOrigins = (): string[] => {
  const origins = env.get('ALLOWED_ORIGINS')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  // In development/test with no env set, allow localhost for convenience
  if ((env.isDevelopment() || env.get('NODE_ENV') === 'test') && origins.length === 0) {
    return [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ]
  }

  // In test mode, always add Vite dev server port to allowed origins
  if (env.get('NODE_ENV') === 'test' && !origins.includes('http://localhost:5173')) {
    origins.push('http://localhost:5173', 'http://127.0.0.1:5173')
  }

  return origins
}

/**
 * CORS origin validation function
 */
const normalizeOriginValue = (value: string): string | null => {
  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    // Backward compatibility for bare host entries in ALLOWED_ORIGINS.
    try {
      return new URL(`https://${trimmed}`).origin;
    } catch {
      return null;
    }
  }
};

export const isAllowedOrigin = (origin: string | undefined, allowedOrigins: string[]): boolean => {
  if (!origin) return true // Allow same-origin/no-origin requests

  if (allowedOrigins.length === 0) {
    // If no origins configured in production, deny all
    if (env.isProduction()) return false
    // Development fallback
    return true
  }

  const normalizedOrigin = normalizeOriginValue(origin)
  if (!normalizedOrigin) {
    logger.warn('CORS rejection: invalid origin format', {
      origin,
      timestamp: new Date().toISOString(),
    })
    return false
  }

  const normalizedAllowedOrigins = allowedOrigins
    .map(normalizeOriginValue)
    .filter((value): value is string => !!value)

  const isAllowed = normalizedAllowedOrigins.includes(normalizedOrigin)

  // Log CORS rejections for debugging
  if (!isAllowed) {
    logger.warn('CORS rejection', {
      origin: normalizedOrigin,
      allowedOrigins: normalizedAllowedOrigins,
      timestamp: new Date().toISOString(),
    })
  }

  return isAllowed
}

/**
 * CORS configuration
 */
export const createCorsOptions = (allowedOrigins: string[]) => ({
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (isAllowedOrigin(origin, allowedOrigins)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-Tenant-Slug', 'X-Tenant-ID'],
})

/**
 * Build CSP connectSrc dynamically from allowed origins
 */
export const buildConnectSrc = (allowedOrigins: string[]): string[] => {
  const socketOrigins = env.get('SOCKET_ORIGINS')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const connectSrc = ["'self'"]

  // Add allowed origins to connectSrc
  allowedOrigins.forEach(origin => {
    if (origin && !connectSrc.includes(origin)) {
      connectSrc.push(origin)
    }
  })

  // Add socket origins to connectSrc
  socketOrigins.forEach(origin => {
    if (origin && !connectSrc.includes(origin)) {
      connectSrc.push(origin)
    }
  })

  return connectSrc
}

/**
 * Configure Express middleware
 */
export const configureMiddleware = (app: Application, allowedOrigins: string[]): void => {
  // Trust only explicitly configured proxies (or local/private network proxies by default)
  // so req.ip is derived safely from X-Forwarded-For in proxied deployments.
  app.set('trust proxy', resolveTrustProxySetting())

  const connectSrc = buildConnectSrc(allowedOrigins)

  // Enhanced security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://unpkg.com'], // React dev requires unsafe-eval
          styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
          imgSrc: ["'self'", "data:", "blob:", 'https://*.tile.openstreetmap.org'],
          fontSrc: ["'self'", "data:"],
          connectSrc,
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          ...(env.isProduction() ? { upgradeInsecureRequests: null } : {}),
        },
      },
      // HSTS disabled - handled by reverse proxy (SSL termination upstream)
      hsts: false,
      frameguard: {
        action: 'deny', // Prevent clickjacking
      },
      noSniff: true, // Prevent MIME type sniffing
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      dnsPrefetchControl: { allow: false },
      hidePoweredBy: true,
    })
  )

  // Additional Permissions Policy header
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()')
    next()
  })

  // CORS
  app.use(cors(createCorsOptions(allowedOrigins)))

  // Compression
  app.use(compression())

  // Body parsing
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
}
