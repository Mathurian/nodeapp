import { Request, Response } from 'express';
export declare class CacheAdminController {
    static getStatistics(req: Request, res: Response): Promise<void>;
    static healthCheck(req: Request, res: Response): Promise<void>;
    static clearNamespace(req: Request, res: Response): Promise<void>;
    static clearAll(req: Request, res: Response): Promise<void>;
    static deleteKey(req: Request, res: Response): Promise<void>;
    static invalidateTag(req: Request, res: Response): Promise<void>;
    static warmCache(req: Request, res: Response): Promise<void>;
    static resetStatistics(req: Request, res: Response): Promise<void>;
}
export default CacheAdminController;
//# sourceMappingURL=cacheAdminController.d.ts.map