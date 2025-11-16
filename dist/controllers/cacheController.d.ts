import { Request, Response, NextFunction } from 'express';
export declare class CacheController {
    private cacheService;
    constructor();
    getCacheStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    flushCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteCacheKey: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteCachePattern: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCacheStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getCacheStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const flushCache: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteCacheKey: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteCachePattern: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCacheStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=cacheController.d.ts.map