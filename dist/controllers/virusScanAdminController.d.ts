import { Request, Response } from 'express';
export declare class VirusScanAdminController {
    static healthCheck(req: Request, res: Response): Promise<void>;
    static getStatistics(req: Request, res: Response): Promise<void>;
    static listQuarantinedFiles(req: Request, res: Response): Promise<void>;
    static getQuarantinedFile(req: Request, res: Response): Promise<void>;
    static deleteQuarantinedFile(req: Request, res: Response): Promise<void>;
    static scanFile(req: Request, res: Response): Promise<void>;
    static bulkScan(req: Request, res: Response): Promise<void>;
    static clearCache(req: Request, res: Response): Promise<void>;
}
export default VirusScanAdminController;
//# sourceMappingURL=virusScanAdminController.d.ts.map