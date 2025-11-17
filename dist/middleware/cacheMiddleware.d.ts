import { Request, Response, NextFunction } from 'express';
export interface CacheMiddlewareOptions {
    ttl?: number;
    namespace?: string;
    varyBy?: string[];
    condition?: (req: Request) => boolean;
    keyGenerator?: (req: Request) => string;
}
export declare const cacheMiddleware: (options?: CacheMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const cacheIf: (condition: (req: Request) => boolean, options?: Omit<CacheMiddlewareOptions, "condition">) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const cacheAuthenticated: (options?: Omit<CacheMiddlewareOptions, "varyBy">) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const cachePaginated: (options?: CacheMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const invalidateCache: (patterns: string | string[], namespace?: string) => (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const invalidateCacheTag: (tag: string | string[]) => (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const noCache: (_req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    cacheMiddleware: (options?: CacheMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    cacheIf: (condition: (req: Request) => boolean, options?: Omit<CacheMiddlewareOptions, "condition">) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    cacheAuthenticated: (options?: Omit<CacheMiddlewareOptions, "varyBy">) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    cachePaginated: (options?: CacheMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    invalidateCache: (patterns: string | string[], namespace?: string) => (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    invalidateCacheTag: (tag: string | string[]) => (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    noCache: (_req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
//# sourceMappingURL=cacheMiddleware.d.ts.map