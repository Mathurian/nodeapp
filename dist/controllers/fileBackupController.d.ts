import { Request, Response, NextFunction } from 'express';
export declare class FileBackupController {
    private fileBackupService;
    private prisma;
    constructor();
    createBackup: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        success: boolean;
        backupPath: string;
        timestamp: string;
    }>, Record<string, any>>>;
    listBackups: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<string[]>, Record<string, any>>>;
    deleteBackup: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    createFileBackup: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    restoreFileBackup: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    listFileBackups: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    deleteFileBackup: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getBackupDetails: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    downloadBackup: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const createBackup: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    success: boolean;
    backupPath: string;
    timestamp: string;
}>, Record<string, any>>>;
export declare const listBackups: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<string[]>, Record<string, any>>>;
export declare const deleteBackup: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const createFileBackup: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const restoreFileBackup: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const listFileBackups: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const deleteFileBackup: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getBackupDetails: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const downloadBackup: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=fileBackupController.d.ts.map