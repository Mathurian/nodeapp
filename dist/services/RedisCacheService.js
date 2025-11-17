"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheService = exports.RedisCacheService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const redis_config_1 = require("../config/redis.config");
class RedisCacheService {
    client = null;
    subscriber = null;
    isConnected = false;
    useMemoryFallback = false;
    memoryCache = new Map();
    config = (0, redis_config_1.getRedisConfig)();
    stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
    };
    constructor(options) {
        const redisOptions = options || (0, redis_config_1.getRedisOptions)();
        if (this.config.enabled && this.config.mode !== 'disabled') {
            try {
                this.client = new ioredis_1.default(redisOptions);
                this.subscriber = new ioredis_1.default(redisOptions);
                this.setupEventListeners();
            }
            catch (error) {
                console.error('Failed to initialize Redis client:', error);
                if (this.config.fallbackToMemory) {
                    console.warn('Falling back to in-memory cache');
                    this.useMemoryFallback = true;
                }
            }
        }
        else {
            console.log('Redis disabled, using in-memory cache only');
            this.useMemoryFallback = true;
        }
        if (this.useMemoryFallback) {
            this.startMemoryCacheCleanup();
        }
    }
    setupEventListeners() {
        if (!this.client || !this.subscriber)
            return;
        this.client.on('connect', () => {
            console.log(`Redis cache client connected (${this.config.mode} mode)`);
            this.isConnected = true;
            this.useMemoryFallback = false;
        });
        this.client.on('ready', () => {
            console.log('Redis cache client ready');
        });
        this.client.on('error', (error) => {
            console.error('Redis cache client error:', error);
            this.stats.errors++;
            this.isConnected = false;
            if (this.config.fallbackToMemory && !this.useMemoryFallback) {
                console.warn('Redis connection failed, falling back to in-memory cache');
                this.useMemoryFallback = true;
                this.startMemoryCacheCleanup();
            }
        });
        this.client.on('close', () => {
            console.warn('Redis cache client connection closed');
            this.isConnected = false;
            if (this.config.fallbackToMemory && !this.useMemoryFallback) {
                console.warn('Redis connection closed, falling back to in-memory cache');
                this.useMemoryFallback = true;
                this.startMemoryCacheCleanup();
            }
        });
        this.client.on('reconnecting', () => {
            console.log('Redis cache client reconnecting...');
        });
        this.subscriber.on('message', (channel, message) => {
            this.handleCacheInvalidation(channel, message);
        });
    }
    ensureRedisOrFallback() {
        if (!this.client && !this.useMemoryFallback) {
            console.warn('Redis client not available, falling back to memory cache');
            this.useMemoryFallback = true;
            this.startMemoryCacheCleanup();
        }
        return this.client !== null && this.isConnected;
    }
    cleanupInterval;
    startMemoryCacheCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredMemoryEntries();
        }, 60000);
    }
    cleanupExpiredMemoryEntries() {
        const now = Date.now();
        let removed = 0;
        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.expiry < now) {
                this.memoryCache.delete(key);
                removed++;
            }
        }
        if (removed > 0) {
            console.log(`Cleaned up ${removed} expired entries from memory cache`);
        }
    }
    async healthCheck() {
        if (this.useMemoryFallback || !this.client) {
            return true;
        }
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        }
        catch (error) {
            console.error('Redis health check failed:', error);
            return false;
        }
    }
    async get(key, options) {
        const fullKey = this.buildKey(key, options?.namespace);
        if (this.useMemoryFallback || !this.client) {
            const entry = this.memoryCache.get(fullKey);
            if (!entry) {
                this.stats.misses++;
                return null;
            }
            if (entry.expiry < Date.now()) {
                this.memoryCache.delete(fullKey);
                this.stats.misses++;
                return null;
            }
            this.stats.hits++;
            return entry.value;
        }
        try {
            const value = await this.client.get(fullKey);
            if (value === null) {
                this.stats.misses++;
                return null;
            }
            this.stats.hits++;
            return JSON.parse(value);
        }
        catch (error) {
            console.error(`Cache get error for key ${key}:`, error);
            this.stats.errors++;
            return null;
        }
    }
    async set(key, value, options) {
        const fullKey = this.buildKey(key, options?.namespace);
        const ttl = options?.ttl || redis_config_1.CacheTTL.MEDIUM;
        if (this.useMemoryFallback || !this.client) {
            const expiry = Date.now() + (ttl * 1000);
            this.memoryCache.set(fullKey, {
                value,
                expiry,
                tags: options?.tags,
            });
            this.stats.sets++;
            return true;
        }
        try {
            const serialized = JSON.stringify(value);
            await this.client.setex(fullKey, ttl, serialized);
            if (options?.tags && options.tags.length > 0) {
                await this.tagKey(fullKey, options.tags);
            }
            this.stats.sets++;
            return true;
        }
        catch (error) {
            console.error(`Cache set error for key ${key}:`, error);
            this.stats.errors++;
            return false;
        }
    }
    async delete(key, namespace) {
        const fullKey = this.buildKey(key, namespace);
        if (this.useMemoryFallback || !this.client) {
            const deleted = this.memoryCache.delete(fullKey);
            if (deleted) {
                this.stats.deletes++;
            }
            return deleted;
        }
        try {
            const result = await this.client.del(fullKey);
            this.stats.deletes++;
            return result > 0;
        }
        catch (error) {
            console.error(`Cache delete error for key ${key}:`, error);
            this.stats.errors++;
            return false;
        }
    }
    async exists(key, namespace) {
        try {
            const fullKey = this.buildKey(key, namespace);
            if (!this.ensureRedisOrFallback() || !this.client) {
                return this.memoryCache.has(fullKey);
            }
            const result = await this.client.exists(fullKey);
            return result === 1;
        }
        catch (error) {
            console.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }
    async getMany(keys, namespace) {
        try {
            const fullKeys = keys.map(key => this.buildKey(key, namespace));
            if (!this.ensureRedisOrFallback() || !this.client) {
                return fullKeys.map(fullKey => {
                    const entry = this.memoryCache.get(fullKey);
                    if (!entry || entry.expiry < Date.now()) {
                        this.stats.misses++;
                        return null;
                    }
                    this.stats.hits++;
                    return entry.value;
                });
            }
            const values = await this.client.mget(...fullKeys);
            return values.map(value => {
                if (value === null) {
                    this.stats.misses++;
                    return null;
                }
                this.stats.hits++;
                return JSON.parse(value);
            });
        }
        catch (error) {
            console.error('Cache getMany error:', error);
            this.stats.errors++;
            return keys.map(() => null);
        }
    }
    async setMany(items) {
        try {
            if (!this.ensureRedisOrFallback() || !this.client) {
                for (const item of items) {
                    const fullKey = this.buildKey(item.key, item.options?.namespace);
                    const ttl = item.options?.ttl || redis_config_1.CacheTTL.MEDIUM;
                    this.memoryCache.set(fullKey, {
                        value: item.value,
                        expiry: Date.now() + (ttl * 1000),
                        tags: item.options?.tags
                    });
                }
                this.stats.sets += items.length;
                return true;
            }
            const pipeline = this.client.pipeline();
            for (const item of items) {
                const fullKey = this.buildKey(item.key, item.options?.namespace);
                const serialized = JSON.stringify(item.value);
                const ttl = item.options?.ttl || redis_config_1.CacheTTL.MEDIUM;
                pipeline.setex(fullKey, ttl, serialized);
                if (item.options?.tags && item.options.tags.length > 0) {
                    await this.tagKey(fullKey, item.options.tags);
                }
            }
            await pipeline.exec();
            this.stats.sets += items.length;
            return true;
        }
        catch (error) {
            console.error('Cache setMany error:', error);
            this.stats.errors++;
            return false;
        }
    }
    async deleteMany(keys, namespace) {
        try {
            if (keys.length === 0)
                return 0;
            const fullKeys = keys.map(key => this.buildKey(key, namespace));
            if (!this.ensureRedisOrFallback() || !this.client) {
                let deleted = 0;
                fullKeys.forEach(key => {
                    if (this.memoryCache.delete(key))
                        deleted++;
                });
                this.stats.deletes += deleted;
                return deleted;
            }
            const result = await this.client.del(...fullKeys);
            this.stats.deletes += result;
            return result;
        }
        catch (error) {
            console.error('Cache deleteMany error:', error);
            this.stats.errors++;
            return 0;
        }
    }
    async deletePattern(pattern, namespace) {
        try {
            const fullPattern = this.buildKey(pattern, namespace);
            if (!this.ensureRedisOrFallback() || !this.client) {
                const regex = new RegExp(fullPattern.replace(/\*/g, '.*'));
                let deleted = 0;
                for (const key of this.memoryCache.keys()) {
                    if (regex.test(key)) {
                        this.memoryCache.delete(key);
                        deleted++;
                    }
                }
                this.stats.deletes += deleted;
                return deleted;
            }
            const keys = await this.client.keys(fullPattern);
            if (keys.length === 0)
                return 0;
            const result = await this.client.del(...keys);
            this.stats.deletes += result;
            return result;
        }
        catch (error) {
            console.error('Cache deletePattern error:', error);
            this.stats.errors++;
            return 0;
        }
    }
    async clear() {
        try {
            if (!this.ensureRedisOrFallback() || !this.client) {
                this.memoryCache.clear();
                return true;
            }
            await this.client.flushdb();
            return true;
        }
        catch (error) {
            console.error('Cache clear error:', error);
            this.stats.errors++;
            return false;
        }
    }
    async getOrSet(key, factory, options) {
        const cached = await this.get(key, options);
        if (cached !== null) {
            return cached;
        }
        const value = await factory();
        this.set(key, value, options).catch(error => {
            console.error('Cache set error in getOrSet:', error);
        });
        return value;
    }
    async increment(key, amount = 1, namespace) {
        try {
            const fullKey = this.buildKey(key, namespace);
            if (!this.ensureRedisOrFallback() || !this.client) {
                const entry = this.memoryCache.get(fullKey);
                const current = entry && typeof entry.value === 'number' ? entry.value : 0;
                const newValue = current + amount;
                this.memoryCache.set(fullKey, {
                    value: newValue,
                    expiry: Date.now() + (redis_config_1.CacheTTL.LONG * 1000)
                });
                return newValue;
            }
            return await this.client.incrby(fullKey, amount);
        }
        catch (error) {
            console.error(`Cache increment error for key ${key}:`, error);
            this.stats.errors++;
            return 0;
        }
    }
    async decrement(key, amount = 1, namespace) {
        try {
            const fullKey = this.buildKey(key, namespace);
            if (!this.ensureRedisOrFallback() || !this.client) {
                const entry = this.memoryCache.get(fullKey);
                const current = entry && typeof entry.value === 'number' ? entry.value : 0;
                const newValue = current - amount;
                this.memoryCache.set(fullKey, {
                    value: newValue,
                    expiry: Date.now() + (redis_config_1.CacheTTL.LONG * 1000)
                });
                return newValue;
            }
            return await this.client.decrby(fullKey, amount);
        }
        catch (error) {
            console.error(`Cache decrement error for key ${key}:`, error);
            this.stats.errors++;
            return 0;
        }
    }
    async expire(key, ttl, namespace) {
        try {
            const fullKey = this.buildKey(key, namespace);
            if (!this.ensureRedisOrFallback() || !this.client) {
                const entry = this.memoryCache.get(fullKey);
                if (entry) {
                    entry.expiry = Date.now() + (ttl * 1000);
                    return true;
                }
                return false;
            }
            const result = await this.client.expire(fullKey, ttl);
            return result === 1;
        }
        catch (error) {
            console.error(`Cache expire error for key ${key}:`, error);
            return false;
        }
    }
    async ttl(key, namespace) {
        try {
            const fullKey = this.buildKey(key, namespace);
            if (!this.ensureRedisOrFallback() || !this.client) {
                const entry = this.memoryCache.get(fullKey);
                if (!entry)
                    return -2;
                const ttl = Math.floor((entry.expiry - Date.now()) / 1000);
                return ttl > 0 ? ttl : -1;
            }
            return await this.client.ttl(fullKey);
        }
        catch (error) {
            console.error(`Cache ttl error for key ${key}:`, error);
            return -1;
        }
    }
    async tagKey(key, tags) {
        try {
            if (!this.ensureRedisOrFallback() || !this.client) {
                return;
            }
            const pipeline = this.client.pipeline();
            for (const tag of tags) {
                const tagKey = this.buildKey(`tag:${tag}`, undefined);
                pipeline.sadd(tagKey, key);
            }
            await pipeline.exec();
        }
        catch (error) {
            console.error('Cache tagKey error:', error);
        }
    }
    async invalidateTag(tag) {
        try {
            if (!this.ensureRedisOrFallback() || !this.client) {
                let deleted = 0;
                for (const [key, entry] of this.memoryCache.entries()) {
                    if (entry.tags && entry.tags.includes(tag)) {
                        this.memoryCache.delete(key);
                        deleted++;
                    }
                }
                this.stats.deletes += deleted;
                return deleted;
            }
            const tagKey = this.buildKey(`tag:${tag}`, undefined);
            const keys = await this.client.smembers(tagKey);
            if (keys.length === 0)
                return 0;
            const pipeline = this.client.pipeline();
            keys.forEach(key => pipeline.del(key));
            pipeline.del(tagKey);
            const results = await pipeline.exec();
            const deletedCount = results?.filter(([err, result]) => !err && result === 1).length || 0;
            this.stats.deletes += deletedCount;
            return deletedCount;
        }
        catch (error) {
            console.error('Cache invalidateTag error:', error);
            this.stats.errors++;
            return 0;
        }
    }
    async subscribe(channel, callback) {
        try {
            if (!this.subscriber) {
                console.warn('Redis subscriber not available, cannot subscribe');
                return;
            }
            await this.subscriber.subscribe(channel);
            this.subscriber.on('message', (ch, msg) => {
                if (ch === channel) {
                    callback(msg);
                }
            });
        }
        catch (error) {
            console.error('Cache subscribe error:', error);
        }
    }
    async publish(channel, message) {
        try {
            if (!this.client) {
                console.warn('Redis client not available, cannot publish');
                return;
            }
            await this.client.publish(channel, message);
        }
        catch (error) {
            console.error('Cache publish error:', error);
        }
    }
    handleCacheInvalidation(_channel, message) {
        try {
            const data = JSON.parse(message);
            if (data.pattern) {
                this.deletePattern(data.pattern).catch(console.error);
            }
            else if (data.keys) {
                this.deleteMany(data.keys).catch(console.error);
            }
        }
        catch (error) {
            console.error('Error handling cache invalidation:', error);
        }
    }
    async getStatistics() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
            : 0;
        let memoryUsage;
        let keyCount;
        let mode = 'disabled';
        if (this.useMemoryFallback || !this.client) {
            mode = 'memory';
            keyCount = this.memoryCache.size;
            let estimatedMemory = 0;
            for (const [key, entry] of this.memoryCache.entries()) {
                estimatedMemory += key.length * 2;
                estimatedMemory += JSON.stringify(entry.value).length * 2;
                estimatedMemory += 16;
            }
            memoryUsage = estimatedMemory;
        }
        else {
            mode = 'redis';
            try {
                const info = await this.client.info('memory');
                const memoryMatch = info.match(/used_memory:(\d+)/);
                if (memoryMatch) {
                    memoryUsage = parseInt(memoryMatch[1], 10);
                }
                keyCount = await this.client.dbsize();
            }
            catch (error) {
                console.error('Error fetching cache statistics:', error);
            }
        }
        return {
            ...this.stats,
            hitRate: parseFloat(hitRate.toFixed(2)),
            memoryUsage,
            keyCount,
            mode,
            redisMode: this.config.mode,
        };
    }
    resetStatistics() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0,
        };
    }
    buildKey(key, namespace) {
        if (namespace) {
            return `${namespace}:${key}`;
        }
        return key;
    }
    async disconnect() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.useMemoryFallback) {
            this.memoryCache.clear();
        }
        if (this.client) {
            try {
                await this.client.quit();
                this.isConnected = false;
                console.log('Redis cache client closed');
            }
            catch (error) {
                console.error('Error disconnecting Redis cache client:', error);
            }
        }
        if (this.subscriber) {
            try {
                await this.subscriber.quit();
                console.log('Redis cache subscriber closed');
            }
            catch (error) {
                console.error('Error disconnecting Redis cache subscriber:', error);
            }
        }
    }
    getClient() {
        return this.client;
    }
    isUsingMemoryCache() {
        return this.useMemoryFallback;
    }
    getCacheMode() {
        if (this.useMemoryFallback || !this.client) {
            return { mode: 'memory' };
        }
        return { mode: 'redis', redisMode: this.config.mode };
    }
}
exports.RedisCacheService = RedisCacheService;
let cacheServiceInstance = null;
const getCacheService = () => {
    if (!cacheServiceInstance) {
        cacheServiceInstance = new RedisCacheService();
    }
    return cacheServiceInstance;
};
exports.getCacheService = getCacheService;
exports.default = RedisCacheService;
//# sourceMappingURL=RedisCacheService.js.map