import Redis, { RedisOptions } from 'ioredis';
export interface CacheOptions {
    ttl?: number;
    namespace?: string;
    tags?: string[];
}
export interface CacheStatistics {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
    hitRate: number;
    memoryUsage?: number;
    keyCount?: number;
    mode: 'redis' | 'memory' | 'disabled';
    redisMode?: string;
}
export declare class RedisCacheService {
    private client;
    private subscriber;
    private isConnected;
    private useMemoryFallback;
    private memoryCache;
    private config;
    private stats;
    constructor(options?: RedisOptions);
    private setupEventListeners;
    private ensureRedisOrFallback;
    private cleanupInterval?;
    private startMemoryCacheCleanup;
    private cleanupExpiredMemoryEntries;
    healthCheck(): Promise<boolean>;
    get<T = any>(key: string, options?: CacheOptions): Promise<T | null>;
    set(key: string, value: any, options?: CacheOptions): Promise<boolean>;
    delete(key: string, namespace?: string): Promise<boolean>;
    exists(key: string, namespace?: string): Promise<boolean>;
    getMany<T = any>(keys: string[], namespace?: string): Promise<(T | null)[]>;
    setMany(items: {
        key: string;
        value: any;
        options?: CacheOptions;
    }[]): Promise<boolean>;
    deleteMany(keys: string[], namespace?: string): Promise<number>;
    deletePattern(pattern: string, namespace?: string): Promise<number>;
    clear(): Promise<boolean>;
    getOrSet<T = any>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T>;
    increment(key: string, amount?: number, namespace?: string): Promise<number>;
    decrement(key: string, amount?: number, namespace?: string): Promise<number>;
    expire(key: string, ttl: number, namespace?: string): Promise<boolean>;
    ttl(key: string, namespace?: string): Promise<number>;
    private tagKey;
    invalidateTag(tag: string): Promise<number>;
    subscribe(channel: string, callback: (message: string) => void): Promise<void>;
    publish(channel: string, message: string): Promise<void>;
    private handleCacheInvalidation;
    getStatistics(): Promise<CacheStatistics>;
    resetStatistics(): void;
    private buildKey;
    disconnect(): Promise<void>;
    getClient(): Redis | null;
    isUsingMemoryCache(): boolean;
    getCacheMode(): {
        mode: 'redis' | 'memory' | 'disabled';
        redisMode?: string;
    };
}
export declare const getCacheService: () => RedisCacheService;
export default RedisCacheService;
//# sourceMappingURL=RedisCacheService.d.ts.map