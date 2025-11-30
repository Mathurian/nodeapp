import { Request } from 'express';
const rateLimit = require('express-rate-limit')

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes (20/min average)
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  message: 'Too many requests, please try again later',
  skip: (req: Request): boolean => {
    // Only skip health checks, not admin routes (admins need rate limiting too)
    return req.path === '/health';
  }
})

// Auth endpoints rate limiter - strict limits to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes per IP
  skipSuccessfulRequests: true, // Only count failed attempts
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
})

// Per-email rate limiting for login (more strict than IP-based)
const perEmailAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per email
  keyGenerator: (req: Request) => req.body?.email || req.ip,
  message: 'Too many login attempts for this account',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
})

// Password reset rate limiter - very strict to prevent abuse
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour per IP
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skipSuccessfulRequests: false // Count all requests, even successful ones
})

export {
  generalLimiter,
  authLimiter,
  perEmailAuthLimiter,
  passwordResetLimiter
 }
