import { Request, Response } from 'express';
export declare class VirusScanAdminController {
    static healthCheck(_req: Request, res: Response): Promise<void>;
    static getStatistics(_req: Request, res: Response): Promise<void>;
    static listQuarantinedFiles(_req: Request, res: Response): Promise<void>;
    static getQuarantinedFile(req: Request, res: Response): Promise<void>;
    static deleteQuarantinedFile(req: Request, res: Response): Promise<void>;
    static scanFile(req: Request, res: Response): Promise<void>;
    static bulkScan(req: Request, res: Response): Promise<void>;
    static clearCache(_req: Request, res: Response): Promise<void>;
}
export default VirusScanAdminController;
//# sourceMappingURL=virusScanAdminController.d.ts.map