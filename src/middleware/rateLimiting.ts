import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Skip rate limiting in test environment
const isTestEnv = process.env['NODE_ENV'] === 'test';

// No-op middleware for test environment to avoid IPv6 issues
const noopLimiter = (_req: Request, _res: Response, next: NextFunction) => next();

// Helper to determine if request is from localhost (testing)
const isLocalhost = (req: Request): boolean => {
  const ip = req.ip || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.startsWith('::ffff:127.0.0.1');
};

// General API rate limiter
const generalLimiter = isTestEnv ? noopLimiter : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes in production (20/min average)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request): boolean =>
    req.path === '/health' ||
    isLocalhost(req) ||
    req.path.startsWith('/v1/test-runner') // Test runner has SUPER_ADMIN/ADMIN auth checks
})

// Auth endpoints rate limiter - strict limits to prevent brute force
const authLimiter = isTestEnv ? noopLimiter : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes per IP in production
  skipSuccessfulRequests: true, // Only count failed attempts
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request): boolean => isLocalhost(req)
})

// Per-email rate limiting for login (more strict than IP-based)
const perEmailAuthLimiter = isTestEnv ? noopLimiter : rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per email in production
  keyGenerator: (req: Request) => req.body?.email || 'unknown-user',
  message: 'Too many login attempts for this account',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request): boolean => isLocalhost(req)
})

// Password reset rate limiter - very strict to prevent abuse
const passwordResetLimiter = isTestEnv ? noopLimiter : rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour per IP in production
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, even successful ones
  skip: (req: Request): boolean => isLocalhost(req)
})

export {
  generalLimiter,
  authLimiter,
  perEmailAuthLimiter,
  passwordResetLimiter
 }
