import { Request, Response, NextFunction } from 'express';
export declare const createBackup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listBackups: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const downloadBackup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const restoreBackup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteBackup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getBackupSettings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createBackupSetting: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateBackupSetting: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteBackupSetting: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const runScheduledBackup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getActiveSchedules: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const debugBackupSettings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=backupController.d.ts.map