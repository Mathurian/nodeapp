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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const tsyringe_1 = require("tsyringe");
let CacheService = class CacheService {
    redis;
    isConnected = false;
    isEnabled = false;
    constructor() {
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB || '0', 10),
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: true,
        });
        this.setupEventHandlers();
        this.connect();
    }
    setupEventHandlers() {
        this.redis.on('connect', () => {
            console.log('✅ Redis cache connected');
            this.isConnected = true;
            this.isEnabled = true;
        });
        let errorLogged = false;
        this.redis.on('error', (_error) => {
            if (!errorLogged) {
                console.log('⚠️  Redis cache unavailable - continuing without caching');
                errorLogged = true;
            }
            this.isConnected = false;
            this.isEnabled = false;
        });
        this.redis.on('close', () => {
            this.isConnected = false;
            this.isEnabled = false;
        });
        this.redis.on('ready', () => {
            this.isConnected = true;
            this.isEnabled = true;
        });
    }
    async connect() {
        try {
            await this.redis.connect();
        }
        catch (error) {
            console.log('Redis connection failed - continuing without caching');
            this.isEnabled = false;
        }
    }
    async get(key) {
        if (!this.isEnabled) {
            return null;
        }
        try {
            const value = await this.redis.get(key);
            if (!value) {
                return null;
            }
            return JSON.parse(value);
        }
        catch (error) {
            console.error(`Cache get error for key "${key}":`, error);
            return null;
        }
    }
    async set(key, value, ttlSeconds = 3600) {
        if (!this.isEnabled) {
            return;
        }
        try {
            const serialized = JSON.stringify(value);
            await this.redis.setex(key, ttlSeconds, serialized);
        }
        catch (error) {
            console.error(`Cache set error for key "${key}":`, error);
        }
    }
    async del(key) {
        if (!this.isEnabled) {
            return;
        }
        try {
            if (Array.isArray(key)) {
                if (key.length > 0) {
                    await this.redis.del(...key);
                }
            }
            else {
                await this.redis.del(key);
            }
        }
        catch (error) {
            console.error('Cache delete error:', error);
        }
    }
    async invalidatePattern(pattern) {
        if (!this.isEnabled) {
            return;
        }
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        catch (error) {
            console.error(`Cache invalidate pattern error for "${pattern}":`, error);
        }
    }
    async exists(key) {
        if (!this.isEnabled) {
            return false;
        }
        try {
            const result = await this.redis.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error(`Cache exists error for key "${key}":`, error);
            return false;
        }
    }
    async expire(key, ttlSeconds) {
        if (!this.isEnabled) {
            return;
        }
        try {
            await this.redis.expire(key, ttlSeconds);
        }
        catch (error) {
            console.error(`Cache expire error for key "${key}":`, error);
        }
    }
    async ttl(key) {
        if (!this.isEnabled) {
            return -1;
        }
        try {
            return await this.redis.ttl(key);
        }
        catch (error) {
            console.error(`Cache TTL error for key "${key}":`, error);
            return -1;
        }
    }
    async flushAll() {
        if (!this.isEnabled) {
            return;
        }
        try {
            await this.redis.flushdb();
        }
        catch (error) {
            console.error('Cache flush error:', error);
        }
    }
    async getStats() {
        if (!this.isEnabled) {
            return {
                connected: false,
                enabled: false,
                keys: 0,
                memory: '0',
            };
        }
        try {
            const dbsize = await this.redis.dbsize();
            const info = await this.redis.info('memory');
            const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
            const memory = (memoryMatch && memoryMatch[1]) || '0';
            return {
                connected: this.isConnected,
                enabled: this.isEnabled,
                keys: dbsize,
                memory,
            };
        }
        catch (error) {
            console.error('Cache stats error:', error);
            return {
                connected: false,
                enabled: false,
                keys: 0,
                memory: '0',
            };
        }
    }
    async disconnect() {
        try {
            await this.redis.quit();
        }
        catch (error) {
            console.error('Cache disconnect error:', error);
        }
    }
    get enabled() {
        return this.isEnabled && this.isConnected;
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], CacheService);
//# sourceMappingURL=CacheService.js.map