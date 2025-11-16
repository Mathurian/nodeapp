"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class CacheService {
    redis = null;
    enabled = false;
    constructor() {
        this.initialize();
    }
    initialize() {
        try {
            this.redis = new ioredis_1.default({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD || undefined,
                db: parseInt(process.env.REDIS_DB || '0'),
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
                lazyConnect: true
            });
            this.redis.on('connect', () => {
                console.log('✅ Redis cache connected');
                this.enabled = true;
            });
            let errorLogged = false;
            this.redis.on('error', (error) => {
                if (!errorLogged) {
                    console.log('⚠️  Redis cache unavailable - continuing without caching');
                    errorLogged = true;
                }
                this.enabled = false;
            });
            this.redis.on('close', () => {
                this.enabled = false;
            });
            this.redis.connect().catch(() => {
                if (!errorLogged) {
                    console.log('⚠️  Redis cache unavailable - continuing without caching');
                    errorLogged = true;
                }
                this.enabled = false;
            });
        }
        catch (error) {
            console.warn('⚠️  Redis initialization failed (will continue without caching):', error.message);
            this.enabled = false;
        }
    }
    async get(key) {
        if (!this.enabled || !this.redis) {
            return null;
        }
        try {
            const value = await this.redis.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
    async set(key, value, ttl = 300) {
        if (!this.enabled || !this.redis) {
            return false;
        }
        try {
            await this.redis.setex(key, ttl, JSON.stringify(value));
            return true;
        }
        catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }
    async delete(key) {
        if (!this.enabled || !this.redis) {
            return false;
        }
        try {
            await this.redis.del(key);
            return true;
        }
        catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }
    async del(key) {
        return this.delete(key);
    }
    async deletePattern(pattern) {
        if (!this.enabled || !this.redis) {
            return false;
        }
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            return true;
        }
        catch (error) {
            console.error('Cache deletePattern error:', error);
            return false;
        }
    }
    async invalidatePattern(pattern) {
        return this.deletePattern(pattern);
    }
    async remember(key, ttl, callback) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        const value = await callback();
        await this.set(key, value, ttl);
        return value;
    }
    async flush() {
        if (!this.enabled || !this.redis) {
            return false;
        }
        try {
            await this.redis.flushdb();
            return true;
        }
        catch (error) {
            console.error('Cache flush error:', error);
            return false;
        }
    }
    async getStats() {
        if (!this.enabled || !this.redis) {
            return {
                enabled: false,
                hits: 0,
                misses: 0,
                keys: 0,
                memory: '0'
            };
        }
        try {
            const info = await this.redis.info('stats');
            const keyspace = await this.redis.info('keyspace');
            const stats = {};
            info.split('\r\n').forEach(line => {
                const [key, value] = line.split(':');
                if (key && value) {
                    stats[key] = value;
                }
            });
            const dbSize = await this.redis.dbsize();
            return {
                enabled: true,
                hits: parseInt(stats.keyspace_hits || '0'),
                misses: parseInt(stats.keyspace_misses || '0'),
                keys: dbSize,
                hitRate: stats.keyspace_hits && stats.keyspace_misses
                    ? (parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2) + '%'
                    : '0%',
                memory: stats.used_memory_human || '0'
            };
        }
        catch (error) {
            console.error('Cache stats error:', error);
            return {
                enabled: false,
                error: error.message
            };
        }
    }
    isEnabled() {
        return this.enabled && this.redis !== null && this.redis.status === 'ready';
    }
    async close() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}
exports.CacheService = CacheService;
exports.default = new CacheService();
//# sourceMappingURL=cacheService.js.map