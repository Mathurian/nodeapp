"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheConfig = exports.CacheNamespace = exports.CacheTTL = exports.getRedisOptions = exports.getRedisConfig = exports.detectRedisMode = void 0;
const detectRedisMode = () => {
    if (process.env.REDIS_ENABLED === 'false') {
        return 'disabled';
    }
    if (process.env.REDIS_SOCKET) {
        return 'socket';
    }
    if (process.env.REDIS_HOST === 'redis' || process.env.DOCKER_ENV === 'true') {
        return 'docker';
    }
    return 'native';
};
exports.detectRedisMode = detectRedisMode;
const getRedisConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const mode = (0, exports.detectRedisMode)();
    const enabled = process.env.REDIS_ENABLED !== 'false';
    const socketPath = process.env.REDIS_SOCKET || undefined;
    return {
        enabled,
        mode,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        path: socketPath,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'event-manager:',
        enableOfflineQueue: true,
        maxRetriesPerRequest: mode === 'disabled' ? 0 : 3,
        connectTimeout: 10000,
        lazyConnect: false,
        showFriendlyErrorStack: !isProduction,
        fallbackToMemory: process.env.REDIS_FALLBACK_TO_MEMORY !== 'false',
        retryStrategy: (times) => {
            if (!enabled) {
                return undefined;
            }
            const delay = Math.min(times * 500, 30000);
            console.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
            if (process.env.REDIS_FALLBACK_TO_MEMORY !== 'false' && times > 10) {
                console.warn('Redis max retries reached, will use in-memory fallback');
                return undefined;
            }
            return delay;
        },
    };
};
exports.getRedisConfig = getRedisConfig;
const getRedisOptions = () => {
    const config = (0, exports.getRedisConfig)();
    if (!config.enabled || config.mode === 'disabled') {
        return {
            lazyConnect: true,
            maxRetriesPerRequest: 0,
        };
    }
    const options = {
        password: config.password,
        db: config.db,
        keyPrefix: config.keyPrefix,
        retryStrategy: config.retryStrategy,
        enableOfflineQueue: config.enableOfflineQueue,
        maxRetriesPerRequest: config.maxRetriesPerRequest,
        connectTimeout: config.connectTimeout,
        lazyConnect: config.lazyConnect,
        showFriendlyErrorStack: config.showFriendlyErrorStack,
    };
    if (config.mode === 'socket' && config.path) {
        options.path = config.path;
    }
    else {
        options.host = config.host;
        options.port = config.port;
    }
    return options;
};
exports.getRedisOptions = getRedisOptions;
exports.CacheTTL = {
    VERY_SHORT: 60,
    SHORT: 300,
    MEDIUM: 900,
    LONG: 3600,
    VERY_LONG: 86400,
    WEEK: 604800,
};
exports.CacheNamespace = {
    USER: 'user',
    EVENT: 'event',
    CONTEST: 'contest',
    CATEGORY: 'category',
    SCORE: 'score',
    JUDGE: 'judge',
    CONTESTANT: 'contestant',
    ASSIGNMENT: 'assignment',
    SETTINGS: 'settings',
    SESSION: 'session',
    RATE_LIMIT: 'rate_limit',
    REPORT: 'report',
    TEMPLATE: 'template',
    CERTIFICATION: 'certification',
};
exports.CacheConfig = {
    [exports.CacheNamespace.USER]: {
        ttl: exports.CacheTTL.LONG,
        invalidateOn: ['user:update', 'user:delete'],
    },
    [exports.CacheNamespace.EVENT]: {
        ttl: exports.CacheTTL.MEDIUM,
        invalidateOn: ['event:update', 'event:delete'],
    },
    [exports.CacheNamespace.CONTEST]: {
        ttl: exports.CacheTTL.MEDIUM,
        invalidateOn: ['contest:update', 'contest:delete'],
    },
    [exports.CacheNamespace.CATEGORY]: {
        ttl: exports.CacheTTL.MEDIUM,
        invalidateOn: ['category:update', 'category:delete'],
    },
    [exports.CacheNamespace.SCORE]: {
        ttl: exports.CacheTTL.SHORT,
        invalidateOn: ['score:update', 'score:delete'],
    },
    [exports.CacheNamespace.JUDGE]: {
        ttl: exports.CacheTTL.LONG,
        invalidateOn: ['judge:update', 'judge:delete'],
    },
    [exports.CacheNamespace.CONTESTANT]: {
        ttl: exports.CacheTTL.LONG,
        invalidateOn: ['contestant:update', 'contestant:delete'],
    },
    [exports.CacheNamespace.ASSIGNMENT]: {
        ttl: exports.CacheTTL.MEDIUM,
        invalidateOn: ['assignment:update', 'assignment:delete'],
    },
    [exports.CacheNamespace.SETTINGS]: {
        ttl: exports.CacheTTL.VERY_LONG,
        invalidateOn: ['settings:update'],
    },
    [exports.CacheNamespace.SESSION]: {
        ttl: exports.CacheTTL.VERY_LONG,
        invalidateOn: ['session:invalidate'],
    },
    [exports.CacheNamespace.RATE_LIMIT]: {
        ttl: exports.CacheTTL.SHORT,
        invalidateOn: [],
    },
    [exports.CacheNamespace.REPORT]: {
        ttl: exports.CacheTTL.MEDIUM,
        invalidateOn: ['report:regenerate'],
    },
    [exports.CacheNamespace.TEMPLATE]: {
        ttl: exports.CacheTTL.VERY_LONG,
        invalidateOn: ['template:update', 'template:delete'],
    },
    [exports.CacheNamespace.CERTIFICATION]: {
        ttl: exports.CacheTTL.LONG,
        invalidateOn: ['certification:update'],
    },
};
exports.default = {
    getRedisConfig: exports.getRedisConfig,
    getRedisOptions: exports.getRedisOptions,
    CacheTTL: exports.CacheTTL,
    CacheNamespace: exports.CacheNamespace,
    CacheConfig: exports.CacheConfig,
};
//# sourceMappingURL=redis.config.js.map