/**
 * Express Application Configuration
 * Modular configuration for Express app middleware and routes
 */

import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { env } from './env'

/**
 * Parse allowed origins from environment
 */
export const parseAllowedOrigins = (): string[] => {
  const origins = env.get('ALLOWED_ORIGINS')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  // In development with no env set, allow localhost for convenience
  if (env.isDevelopment() && origins.length === 0) {
    return [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ]
  }

  return origins
}

/**
 * CORS origin validation function
 */
export const isAllowedOrigin = (origin: string | undefined, allowedOrigins: string[]): boolean => {
  if (!origin) return true // Allow same-origin/no-origin requests

  if (allowedOrigins.length === 0) {
    // If no origins configured in production, deny all
    if (env.isProduction()) return false
    // Development fallback
    return true
  }

  // Normalize origin (remove trailing slash, ensure protocol)
  const normalizedOrigin = origin.trim().replace(/\/$/, '')
  
  // Also check protocol-agnostic match (http vs https)
  const isAllowed = allowedOrigins.some(allowed => {
    const normalizedAllowed = allowed.trim().replace(/\/$/, '')
    const exactMatch = normalizedAllowed === normalizedOrigin
    // Also allow http version if https is allowed, and vice versa (for same domain)
    const protocolAgnosticMatch = normalizedAllowed.replace(/^https?:\/\//, '') === normalizedOrigin.replace(/^https?:\/\//, '')
    return exactMatch || protocolAgnosticMatch || normalizedOrigin.startsWith(normalizedAllowed)
  })

  // Log CORS rejections for debugging
  if (!isAllowed) {
    console.warn('CORS rejection:', {
      origin: normalizedOrigin,
      allowedOrigins,
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
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
  // Trust proxy for rate limiting behind Nginx
  app.set('trust proxy', 1)

  const connectSrc = buildConnectSrc(allowedOrigins)

  // Enhanced security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // React dev requires unsafe-eval
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
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
