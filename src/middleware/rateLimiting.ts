import { Request, Response, NextFunction } from 'express';
const rateLimit = require('express-rate-limit')

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // 5000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skip: (req: Request): boolean => {
    return req.path === '/health' || 
           req.path.startsWith('/api/auth/') ||
           req.path.startsWith('/api/admin/')
  }
})

// Auth endpoints rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10000 requests per 15 minutes for auth
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true
})

export { 
  generalLimiter,
  authLimiter
 }
