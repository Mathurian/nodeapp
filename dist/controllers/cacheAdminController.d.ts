import { Request, Response } from 'express';
export declare class CacheAdminController {
    static getStatistics(_req: Request, res: Response): Promise<void>;
    static healthCheck(_req: Request, res: Response): Promise<void>;
    static clearNamespace(req: Request, res: Response): Promise<void>;
    static clearAll(_req: Request, res: Response): Promise<void>;
    static deleteKey(req: Request, res: Response): Promise<void>;
    static invalidateTag(req: Request, res: Response): Promise<void>;
    static warmCache(_req: Request, res: Response): Promise<void>;
    static resetStatistics(_req: Request, res: Response): Promise<void>;
}
export default CacheAdminController;
//# sourceMappingURL=cacheAdminController.d.ts.map