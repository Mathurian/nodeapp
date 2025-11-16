export declare class CacheService {
    private redis;
    private isConnected;
    private isEnabled;
    constructor();
    private setupEventHandlers;
    private connect;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    del(key: string | string[]): Promise<void>;
    invalidatePattern(pattern: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    expire(key: string, ttlSeconds: number): Promise<void>;
    ttl(key: string): Promise<number>;
    flushAll(): Promise<void>;
    getStats(): Promise<{
        connected: boolean;
        enabled: boolean;
        keys: number;
        memory: string;
    }>;
    disconnect(): Promise<void>;
    get enabled(): boolean;
}
//# sourceMappingURL=CacheService.d.ts.map