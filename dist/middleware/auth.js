"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRoles = exports.requirePermission = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const permissions_1 = require("./permissions");
const config_1 = require("../utils/config");
const prisma_1 = __importDefault(require("../utils/prisma"));
const cache_1 = require("../utils/cache");
const JWT_SECRET = config_1.jwtSecret;
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        const isSensitiveEndpoint = req.path && (req.path.includes('/cache/') ||
            req.path.includes('/log-files/') ||
            req.path.includes('/backup/settings'));
        if (isSensitiveEndpoint) {
            console.warn('authenticateToken: Missing token for sensitive endpoint', {
                path: req.path,
                method: req.method,
                originalUrl: req.originalUrl,
                url: req.url,
                hasAuthHeader: !!req.headers['authorization'],
                authHeaderValue: req.headers['authorization'] ? 'present' : 'missing'
            });
        }
        res.status(401).json({ error: 'Access token required' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.jwtSecret);
        let user = cache_1.userCache.getById(decoded.userId);
        let fromCache = false;
        if (!user) {
            user = await prisma_1.default.user.findUnique({
                where: { id: decoded.userId },
                include: {
                    judge: true,
                    contestant: true
                }
            });
            if (user) {
                cache_1.userCache.setById(decoded.userId, user, 3600);
            }
        }
        else {
            fromCache = true;
        }
        if (!user) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        const tokenSessionVersion = decoded.sessionVersion || 1;
        const dbSessionVersion = user.sessionVersion || 1;
        if (tokenSessionVersion !== dbSessionVersion) {
            cache_1.userCache.invalidate(decoded.userId);
            console.warn('Session version mismatch detected', {
                userId: user.id,
                email: user.email,
                tokenVersion: tokenSessionVersion,
                dbVersion: dbSessionVersion,
                fromCache
            });
            res.status(401).json({
                error: 'Session expired',
                message: 'Your session has been invalidated. Please log in again.',
                code: 'SESSION_VERSION_MISMATCH'
            });
            return;
        }
        req.user = user;
        const isSensitiveEndpoint = req.path && (req.path.includes('/cache/') ||
            req.path.includes('/log-files/') ||
            req.path.includes('/backup/settings'));
        if (isSensitiveEndpoint && user.role === 'ADMIN') {
            console.log('authenticateToken: Admin authenticated for sensitive endpoint', {
                path: req.path,
                userId: user.id,
                email: user.email,
                role: user.role,
                fromCache
            });
        }
        next();
    }
    catch (error) {
        const isSensitiveEndpoint = req.path && (req.path.includes('/cache/') ||
            req.path.includes('/log-files/') ||
            req.path.includes('/backup/settings'));
        const errorObj = error;
        if (isSensitiveEndpoint) {
            console.error('authenticateToken: Authentication failed for sensitive endpoint', {
                error: errorObj.message,
                errorName: errorObj.name,
                hasToken: !!req.headers['authorization'],
                path: req.path,
                method: req.method,
                originalUrl: req.originalUrl,
                url: req.url,
                stack: errorObj.stack
            });
        }
        else if (errorObj.name !== 'TokenExpiredError') {
            console.warn('Authentication failed:', {
                error: errorObj.message,
                errorName: errorObj.name,
                hasToken: !!req.headers['authorization'],
                path: req.path,
                method: req.method
            });
        }
        if (errorObj.name === 'TokenExpiredError' || errorObj.name === 'JsonWebTokenError') {
            res.status(401).json({
                error: 'Invalid or expired token',
                code: errorObj.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
            });
            return;
        }
        res.status(401).json({
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            console.error('requireRole: CRITICAL - No user object found (authenticateToken may have failed)', {
                path: req.path,
                method: req.method,
                hasAuthHeader: !!req.headers['authorization'],
                authHeaderPresent: req.headers['authorization'] ? 'yes' : 'no',
                originalUrl: req.originalUrl,
                url: req.url,
                timestamp: new Date().toISOString()
            });
            res.status(401).json({
                error: 'Authentication required',
                code: 'NO_USER_OBJECT',
                hint: 'Please ensure authenticateToken middleware runs before requireRole'
            });
            return;
        }
        const userRole = String(req.user.role).trim().toUpperCase();
        if (userRole === 'ADMIN') {
            const isSensitiveEndpoint = req.path && (req.path.includes('/cache/') ||
                req.path.includes('/log-files/') ||
                req.path.includes('/backup/settings'));
            if (isSensitiveEndpoint) {
                console.log('requireRole: ✅ ADMIN access granted (unconditional)', {
                    userRole,
                    path: req.path,
                    email: req.user.email,
                    userId: req.user.id,
                    timestamp: new Date().toISOString()
                });
            }
            next();
            return;
        }
        if (userRole === 'ORGANIZER') {
            next();
            return;
        }
        const normalizedRoles = roles.map(r => String(r).trim().toUpperCase());
        if (!normalizedRoles.includes(userRole)) {
            console.warn('requireRole: Role check failed (403)', {
                userRole: req.user.role,
                normalizedUserRole: userRole,
                requiredRoles: roles,
                normalizedRequiredRoles: normalizedRoles,
                userId: req.user.id,
                userEmail: req.user.email,
                path: req.path,
                method: req.method,
                fullPath: req.originalUrl || req.url
            });
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }
        const isSensitiveEndpoint = req.path && (req.path.includes('/cache/') ||
            req.path.includes('/log-files/') ||
            req.path.includes('/backup/settings'));
        if (isSensitiveEndpoint) {
            console.log('requireRole: Access granted', {
                userRole,
                requiredRoles: normalizedRoles,
                path: req.path,
                email: req.user.email,
                timestamp: new Date().toISOString()
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
const requirePermission = (action) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if ((0, permissions_1.isAdmin)(req.user.role)) {
            next();
            return;
        }
        if (!(0, permissions_1.hasPermission)(req.user.role, action)) {
            res.status(403).json({
                error: 'Insufficient permissions',
                required: action,
                userRole: req.user.role
            });
            return;
        }
        next();
    };
};
exports.requirePermission = requirePermission;
const checkRoles = requireRole;
exports.checkRoles = checkRoles;
//# sourceMappingURL=auth.js.map