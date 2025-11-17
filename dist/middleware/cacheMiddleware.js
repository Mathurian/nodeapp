"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.noCache = exports.invalidateCacheTag = exports.invalidateCache = exports.cachePaginated = exports.cacheAuthenticated = exports.cacheIf = exports.cacheMiddleware = void 0;
const crypto_1 = __importDefault(require("crypto"));
const RedisCacheService_1 = require("../services/RedisCacheService");
const redis_config_1 = require("../config/redis.config");
const cacheMiddleware = (options = {}) => {
    const cacheService = (0, RedisCacheService_1.getCacheService)();
    const ttl = options.ttl || redis_config_1.CacheTTL.MEDIUM;
    const namespace = options.namespace || 'http';
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            next();
            return;
        }
        if (options.condition && !options.condition(req)) {
            next();
            return;
        }
        try {
            const cacheKey = options.keyGenerator
                ? options.keyGenerator(req)
                : generateCacheKey(req, options.varyBy);
            const cachedResponse = await cacheService.get(cacheKey, {
                namespace,
            });
            if (cachedResponse) {
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('X-Cache-Key', cacheKey);
                if (cachedResponse.headers) {
                    Object.entries(cachedResponse.headers).forEach(([key, value]) => {
                        res.setHeader(key, value);
                    });
                }
                res.status(cachedResponse.status).json(cachedResponse.body);
                return;
            }
            res.setHeader('X-Cache', 'MISS');
            res.setHeader('X-Cache-Key', cacheKey);
            const originalJson = res.json.bind(res);
            res.json = function (body) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const cachedResponse = {
                        status: res.statusCode,
                        body,
                        headers: extractRelevantHeaders(res),
                        cachedAt: new Date().toISOString(),
                    };
                    cacheService.set(cacheKey, cachedResponse, {
                        namespace,
                        ttl,
                        tags: extractCacheTags(req),
                    }).catch(error => {
                        console.error('Error caching response:', error);
                    });
                }
                return originalJson(body);
            };
            next();
        }
        catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
};
exports.cacheMiddleware = cacheMiddleware;
const cacheIf = (condition, options = {}) => {
    return (0, exports.cacheMiddleware)({
        ...options,
        condition,
    });
};
exports.cacheIf = cacheIf;
const cacheAuthenticated = (options = {}) => {
    return (0, exports.cacheMiddleware)({
        ...options,
        varyBy: ['user.id', 'user.role'],
        condition: (req) => {
            return !!req.user;
        },
    });
};
exports.cacheAuthenticated = cacheAuthenticated;
const cachePaginated = (options = {}) => {
    return (0, exports.cacheMiddleware)({
        ...options,
        varyBy: ['query.page', 'query.limit', 'query.sort', ...(options.varyBy || [])],
    });
};
exports.cachePaginated = cachePaginated;
const invalidateCache = (patterns, namespace) => {
    const cacheService = (0, RedisCacheService_1.getCacheService)();
    return async (_req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const patternArray = Array.isArray(patterns) ? patterns : [patterns];
                Promise.all(patternArray.map(pattern => cacheService.deletePattern(pattern, namespace))).catch(error => {
                    console.error('Error invalidating cache:', error);
                });
            }
            return originalJson(body);
        };
        next();
    };
};
exports.invalidateCache = invalidateCache;
const invalidateCacheTag = (tag) => {
    const cacheService = (0, RedisCacheService_1.getCacheService)();
    return async (_req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = function (body) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const tags = Array.isArray(tag) ? tag : [tag];
                Promise.all(tags.map(t => cacheService.invalidateTag(t))).catch(error => {
                    console.error('Error invalidating cache tags:', error);
                });
            }
            return originalJson(body);
        };
        next();
    };
};
exports.invalidateCacheTag = invalidateCacheTag;
const noCache = (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};
exports.noCache = noCache;
function generateCacheKey(req, varyBy) {
    const parts = [
        req.method,
        req.path,
    ];
    const queryString = JSON.stringify(req.query);
    if (queryString !== '{}') {
        parts.push(queryString);
    }
    if (varyBy && varyBy.length > 0) {
        varyBy.forEach(prop => {
            const value = getNestedProperty(req, prop);
            if (value !== undefined) {
                parts.push(`${prop}:${value}`);
            }
        });
    }
    const combined = parts.join('|');
    return crypto_1.default.createHash('md5').update(combined).digest('hex');
}
function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, prop) => {
        return current?.[prop];
    }, obj);
}
function extractRelevantHeaders(res) {
    const headers = {};
    const relevantHeaders = ['content-type', 'content-length', 'etag', 'last-modified'];
    relevantHeaders.forEach(header => {
        const value = res.getHeader(header);
        if (value) {
            headers[header] = String(value);
        }
    });
    return headers;
}
function extractCacheTags(req) {
    const tags = [];
    const pathParts = req.path.split('/').filter(Boolean);
    if (pathParts.length > 0) {
        tags.push(pathParts[0]);
    }
    if (req.user && 'id' in req.user) {
        tags.push(`user:${req.user.id}`);
    }
    return tags;
}
exports.default = {
    cacheMiddleware: exports.cacheMiddleware,
    cacheIf: exports.cacheIf,
    cacheAuthenticated: exports.cacheAuthenticated,
    cachePaginated: exports.cachePaginated,
    invalidateCache: exports.invalidateCache,
    invalidateCacheTag: exports.invalidateCacheTag,
    noCache: exports.noCache,
};
//# sourceMappingURL=cacheMiddleware.js.map