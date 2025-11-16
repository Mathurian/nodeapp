declare class CacheService {
    private redis;
    private enabled;
    constructor();
    initialize(): void;
    get<T = any>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    del(key: string): Promise<boolean>;
    deletePattern(pattern: string): Promise<boolean>;
    invalidatePattern(pattern: string): Promise<boolean>;
    remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T>;
    flush(): Promise<boolean>;
    getStats(): Promise<any>;
    isEnabled(): boolean;
    close(): Promise<void>;
}
declare const _default: CacheService;
export default _default;
export { CacheService };
//# sourceMappingURL=cacheService.d.ts.map