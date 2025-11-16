"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.generalLimiter = void 0;
const rateLimit = require('express-rate-limit');
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true,
    skip: (req) => {
        return req.path === '/health' ||
            req.path.startsWith('/api/auth/') ||
            req.path.startsWith('/api/admin/');
    }
});
exports.generalLimiter = generalLimiter;
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true
});
exports.authLimiter = authLimiter;
//# sourceMappingURL=rateLimiting.js.map