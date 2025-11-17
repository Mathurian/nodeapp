"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
let RateLimitService = class RateLimitService {
    _prisma;
    configCache = new Map();
    redis = null;
    redisEnabled = false;
    redisUnavailableLogged = false;
    log = (0, logger_1.createLogger)('rate-limit');
    constructor(_prisma) {
        this._prisma = _prisma;
        this.initializeRedis();
        this.initializeDefaultConfigs();
    }
    initializeRedis() {
        try {
            const redisHost = process.env.REDIS_HOST || 'localhost';
            const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
            const redisPassword = process.env.REDIS_PASSWORD || undefined;
            const redisDb = parseInt(process.env.REDIS_DB || '1', 10);
            this.redis = new ioredis_1.default({
                host: redisHost,
                port: redisPort,
                password: redisPassword,
                db: redisDb,
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
                lazyConnect: true,
            });
            this.redis.on('connect', () => {
                this.redisEnabled = true;
                this.redisUnavailableLogged = false;
                this.log.info('Redis connected for rate limiting');
            });
            this.redis.on('error', (error) => {
                this.redisEnabled = false;
                if (!this.redisUnavailableLogged) {
                    this.log.warn('Redis unavailable for rate limiting, falling back to memory:', error.message);
                    this.redisUnavailableLogged = true;
                }
            });
            this.redis.on('close', () => {
                this.redisEnabled = false;
            });
            this.redis.connect().catch(() => {
                if (!this.redisUnavailableLogged) {
                    this.log.warn('Redis connection failed, using in-memory rate limiting');
                    this.redisUnavailableLogged = true;
                }
            });
        }
        catch (error) {
            if (!this.redisUnavailableLogged) {
                this.log.warn('Redis initialization failed, using in-memory rate limiting:', error.message);
                this.redisUnavailableLogged = true;
            }
            this.redisEnabled = false;
        }
    }
    async initializeDefaultConfigs() {
        const defaults = [
            { tier: 'public', points: 100, duration: 60, blockDuration: 300 },
            { tier: 'authenticated', points: 500, duration: 60, blockDuration: 300 },
            { tier: 'judge', points: 1000, duration: 60, blockDuration: 60 },
            { tier: 'admin', points: 5000, duration: 60, blockDuration: 0 },
        ];
        for (const config of defaults) {
            if (!this.configCache.has(config.tier)) {
                this.configCache.set(config.tier, config);
            }
        }
    }
    async getConfig(tier) {
        if (this.configCache.has(tier)) {
            return this.configCache.get(tier);
        }
        return this.configCache.get('public') || defaults[0];
    }
    async updateConfig(tier, updates) {
        const current = await this.getConfig(tier);
        const updated = { ...current, ...updates };
        this.configCache.set(tier, updated);
        this.log.info(`Rate limit config updated for tier: ${tier}`, updated);
        return updated;
    }
    async getAllConfigs() {
        return Array.from(this.configCache.values());
    }
    createLimiter(tier, customConfig) {
        return async (_req) => {
            const config = customConfig
                ? { ...await this.getConfig(tier), ...customConfig }
                : await this.getConfig(tier);
            return config;
        };
    }
    getTierFromRequest(req) {
        const user = req.user;
        if (!user) {
            return 'public';
        }
        const role = user.role?.toLowerCase() || 'authenticated';
        const roleTierMap = {
            'admin': 'admin',
            'organizer': 'admin',
            'judge': 'judge',
            'board': 'admin',
            'tally_master': 'admin',
            'auditor': 'admin',
            'emcee': 'authenticated',
            'contestant': 'authenticated',
        };
        return roleTierMap[role] || 'authenticated';
    }
    createRedisStore(windowMs) {
        if (!this.redis || !this.redisEnabled) {
            return undefined;
        }
        const windowSeconds = Math.ceil(windowMs / 1000);
        const redis = this.redis;
        return {
            async increment(key) {
                try {
                    const exists = await redis.exists(key);
                    const current = await redis.incr(key);
                    if (exists === 0) {
                        await redis.expire(key, windowSeconds);
                    }
                    const ttl = await redis.ttl(key);
                    const resetTime = ttl > 0
                        ? new Date(Date.now() + ttl * 1000)
                        : new Date(Date.now() + windowMs);
                    return { totalHits: current, resetTime };
                }
                catch (error) {
                    return { totalHits: 1, resetTime: new Date(Date.now() + windowMs) };
                }
            },
            async decrement(key) {
                try {
                    const current = await redis.get(key);
                    if (current && parseInt(current, 10) > 0) {
                        await redis.decr(key);
                    }
                }
                catch (error) {
                }
            },
            async resetKey(key) {
                try {
                    await redis.del(key);
                }
                catch (error) {
                }
            },
            async shutdown() {
            },
        };
    }
    createEndpointLimiter(endpoint, config) {
        const windowMs = (config.duration || 60) * 1000;
        const redisStore = this.createRedisStore(windowMs);
        const limiterConfig = {
            windowMs,
            max: config.points || 100,
            standardHeaders: true,
            legacyHeaders: false,
            trustProxy: true,
            store: redisStore,
            skip: (req) => {
                return req.path === '/health' || req.path === '/api/health';
            },
            handler: (_req, res) => {
                const resetAt = new Date(Date.now() + (config.duration || 60) * 1000);
                res.status(429).json({
                    success: false,
                    error: 'RATE_LIMIT_EXCEEDED',
                    message: `Too many requests to ${endpoint}. Please try again later.`,
                    retryAfter: resetAt.toISOString(),
                });
            },
        };
        return (0, express_rate_limit_1.default)(limiterConfig);
    }
    createUserLimiter(userId, config) {
        const windowMs = (config.duration || 60) * 1000;
        const redisStore = this.createRedisStore(windowMs);
        return (0, express_rate_limit_1.default)({
            windowMs,
            max: config.points || 100,
            keyGenerator: () => `user:${userId}`,
            store: redisStore,
            standardHeaders: true,
            legacyHeaders: false,
            ...{ trustProxy: true },
        });
    }
    isRedisAvailable() {
        return this.redisEnabled && this.redis !== null && this.redis.status === 'ready';
    }
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], RateLimitService);
const defaults = [
    { tier: 'public', points: 100, duration: 60, blockDuration: 300 },
    { tier: 'authenticated', points: 500, duration: 60, blockDuration: 300 },
    { tier: 'judge', points: 1000, duration: 60, blockDuration: 60 },
    { tier: 'admin', points: 5000, duration: 60, blockDuration: 0 },
];
exports.default = RateLimitService;
//# sourceMappingURL=RateLimitService.js.map