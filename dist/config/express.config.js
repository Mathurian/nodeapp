"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureMiddleware = exports.buildConnectSrc = exports.createCorsOptions = exports.isAllowedOrigin = exports.parseAllowedOrigins = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const parseAllowedOrigins = () => {
    const origins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    if (process.env.NODE_ENV === 'development' && origins.length === 0) {
        return [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
        ];
    }
    return origins;
};
exports.parseAllowedOrigins = parseAllowedOrigins;
const isAllowedOrigin = (origin, allowedOrigins) => {
    if (!origin)
        return true;
    if (allowedOrigins.length === 0) {
        if (process.env.NODE_ENV === 'production')
            return false;
        return true;
    }
    const normalizedOrigin = origin.trim().replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(allowed => {
        const normalizedAllowed = allowed.trim().replace(/\/$/, '');
        const exactMatch = normalizedAllowed === normalizedOrigin;
        const protocolAgnosticMatch = normalizedAllowed.replace(/^https?:\/\//, '') === normalizedOrigin.replace(/^https?:\/\//, '');
        return exactMatch || protocolAgnosticMatch || normalizedOrigin.startsWith(normalizedAllowed);
    });
    if (!isAllowed) {
        console.warn('CORS rejection:', {
            origin: normalizedOrigin,
            allowedOrigins,
            timestamp: new Date().toISOString(),
        });
    }
    return isAllowed;
};
exports.isAllowedOrigin = isAllowedOrigin;
const createCorsOptions = (allowedOrigins) => ({
    origin: function (origin, callback) {
        if ((0, exports.isAllowedOrigin)(origin, allowedOrigins)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
});
exports.createCorsOptions = createCorsOptions;
const buildConnectSrc = (allowedOrigins) => {
    const socketOrigins = (process.env.SOCKET_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    const connectSrc = ["'self'"];
    allowedOrigins.forEach(origin => {
        if (origin && !connectSrc.includes(origin)) {
            connectSrc.push(origin);
        }
    });
    socketOrigins.forEach(origin => {
        if (origin && !connectSrc.includes(origin)) {
            connectSrc.push(origin);
        }
    });
    return connectSrc;
};
exports.buildConnectSrc = buildConnectSrc;
const configureMiddleware = (app, allowedOrigins) => {
    app.set('trust proxy', 1);
    const connectSrc = (0, exports.buildConnectSrc)(allowedOrigins);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                fontSrc: ["'self'", "data:"],
                connectSrc,
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: null } : {}),
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
        frameguard: {
            action: 'deny',
        },
        noSniff: true,
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin',
        },
        dnsPrefetchControl: { allow: false },
        hidePoweredBy: true,
    }));
    app.use((_req, res, next) => {
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
        next();
    });
    app.use((0, cors_1.default)((0, exports.createCorsOptions)(allowedOrigins)));
    app.use((0, compression_1.default)());
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
};
exports.configureMiddleware = configureMiddleware;
//# sourceMappingURL=express.config.js.map