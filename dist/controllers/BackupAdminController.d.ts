import { Request, Response } from 'express';
export declare class BackupAdminController {
    listBackups(req: Request, res: Response): Promise<void>;
    getStats(req: Request, res: Response): Promise<void>;
    getLatest(req: Request, res: Response): Promise<void>;
    getHealth(req: Request, res: Response): Promise<void>;
    verifyBackups(req: Request, res: Response): Promise<void>;
    triggerFullBackup(req: Request, res: Response): Promise<void>;
    getSizeTrend(req: Request, res: Response): Promise<void>;
    listBackupFiles(req: Request, res: Response): Promise<void>;
    logBackup(req: Request, res: Response): Promise<void>;
    receiveAlert(req: Request, res: Response): Promise<void>;
    cleanupLogs(req: Request, res: Response): Promise<void>;
}
declare const _default: BackupAdminController;
export default _default;
//# sourceMappingURL=BackupAdminController.d.ts.map