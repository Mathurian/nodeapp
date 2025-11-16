declare class InMemoryCache {
    private cache;
    private ttlMap;
    constructor();
    get(key: string): any | null;
    set(key: string, value: any, ttlSeconds?: number): void;
    delete(key: string): void;
    deletePattern(pattern: string): void;
    clear(): void;
    getStats(): {
        size: number;
        keys: string[];
    };
}
declare const cache: InMemoryCache;
declare const userCache: {
    getById(userId: string): any | null;
    setById(userId: string, user: any, ttlSeconds?: number): void;
    invalidate(userId: string): void;
    invalidateAll(): void;
};
export declare const invalidateCache: (pattern: string) => Promise<void>;
export { cache, userCache };
//# sourceMappingURL=cache.d.ts.map