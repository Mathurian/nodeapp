"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfErrorHandler = exports.csrfProtection = exports.getCsrfToken = exports.generateCsrfToken = void 0;
const crypto_1 = require("crypto");
const generateToken = () => {
    return (0, crypto_1.randomBytes)(32).toString('hex');
};
const secureCompare = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }
    try {
        const aBuffer = Buffer.from(a);
        const bBuffer = Buffer.from(b);
        return (0, crypto_1.timingSafeEqual)(aBuffer, bBuffer);
    }
    catch (error) {
        return false;
    }
};
const isSecureRequest = (req) => {
    try {
        if (req.secure)
            return true;
        const xfp = (req.headers['x-forwarded-proto'] || '').toString().toLowerCase();
        return xfp === 'https';
    }
    catch (_) {
        return false;
    }
};
const generateCsrfToken = (req, res, next) => {
    const csrfToken = generateToken();
    req.csrfToken = csrfToken;
    const sameSite = isSecureRequest(req) ? 'lax' : 'strict';
    res.cookie('_csrf', csrfToken, {
        httpOnly: true,
        secure: isSecureRequest(req),
        sameSite: sameSite,
        path: '/'
    });
    next();
};
exports.generateCsrfToken = generateCsrfToken;
const getCsrfToken = (req, res) => {
    try {
        const csrfToken = generateToken();
        const sameSite = isSecureRequest(req) ? 'lax' : 'strict';
        res.cookie('_csrf', csrfToken, {
            httpOnly: true,
            secure: isSecureRequest(req),
            sameSite: sameSite,
            path: '/'
        });
        res.json({ csrfToken });
    }
    catch (error) {
        const errorObj = error;
        console.error('Error generating CSRF token:', errorObj);
        res.status(500).json({ error: 'Failed to generate CSRF token', details: errorObj.message });
    }
};
exports.getCsrfToken = getCsrfToken;
const csrfProtection = async (req, res, next) => {
    const method = req.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        next();
        return;
    }
    const tokenFromHeader = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];
    const tokenFromCookie = req.cookies?._csrf;
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
        };
        console.warn('CSRF validation failed: Missing token', errorDetails);
        try {
            const loggerModule = await Promise.resolve().then(() => __importStar(require('../utils/logger')));
            const log = loggerModule.createRequestLogger(req, 'auth');
            log.warn('CSRF validation failed: Missing token', errorDetails);
        }
        catch (logError) {
        }
        res.status(403).json({
            error: 'CSRF token validation failed',
            message: 'Invalid or missing CSRF token. Please refresh the page and try again.',
            details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
        });
        return;
    }
    const tokenFromHeaderStr = Array.isArray(tokenFromHeader) ? tokenFromHeader[0] : tokenFromHeader;
    if (!secureCompare(tokenFromHeaderStr || '', tokenFromCookie || '')) {
        console.warn('CSRF validation failed: Token mismatch', {
            method,
            path: req.path,
            ip: req.ip
        });
        res.status(403).json({
            error: 'CSRF token validation failed',
            message: 'Invalid CSRF token. Please refresh the page and try again.'
        });
        return;
    }
    next();
};
exports.csrfProtection = csrfProtection;
const csrfErrorHandler = (err, _req, res, next) => {
    if (err && err.code === 'EBADCSRFTOKEN') {
        res.status(403).json({
            error: 'CSRF token validation failed',
            message: 'Invalid or missing CSRF token. Please refresh the page and try again.'
        });
        return;
    }
    next(err);
};
exports.csrfErrorHandler = csrfErrorHandler;
//# sourceMappingURL=csrf.js.map