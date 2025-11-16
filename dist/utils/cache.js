"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userCache = exports.cache = exports.invalidateCache = void 0;
class InMemoryCache {
    cache;
    ttlMap;
    constructor() {
        this.cache = new Map();
        this.ttlMap = new Map();
    }
    get(key) {
        const ttl = this.ttlMap.get(key);
        if (ttl && Date.now() > ttl) {
            this.delete(key);
            return null;
        }
        return this.cache.get(key) || null;
    }
    set(key, value, ttlSeconds = 3600) {
        this.cache.set(key, value);
        this.ttlMap.set(key, Date.now() + (ttlSeconds * 1000));
    }
    delete(key) {
        this.cache.delete(key);
        this.ttlMap.delete(key);
    }
    deletePattern(pattern) {
        const keys = Array.from(this.cache.keys());
        keys.forEach(key => {
            if (key.startsWith(pattern)) {
                this.delete(key);
            }
        });
    }
    clear() {
        this.cache.clear();
        this.ttlMap.clear();
    }
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}
const cache = new InMemoryCache();
exports.cache = cache;
const userCache = {
    getById(userId) {
        return cache.get(`user:${userId}`);
    },
    setById(userId, user, ttlSeconds = 3600) {
        cache.set(`user:${userId}`, user, ttlSeconds);
    },
    invalidate(userId) {
        cache.delete(`user:${userId}`);
    },
    invalidateAll() {
        cache.deletePattern('user:');
    }
};
exports.userCache = userCache;
const invalidateCache = (pattern) => {
    return Promise.resolve(cache.deletePattern(pattern));
};
exports.invalidateCache = invalidateCache;
//# sourceMappingURL=cache.js.map