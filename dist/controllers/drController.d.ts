import { Request, Response, NextFunction } from 'express';
export declare const getDRConfig: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateDRConfig: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createBackupSchedule: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateBackupSchedule: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteBackupSchedule: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listBackupSchedules: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createBackupTarget: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateBackupTarget: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteBackupTarget: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const listBackupTargets: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verifyBackupTarget: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const executeBackup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const executeDRTest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getDRMetrics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getDRDashboard: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const checkRTORPO: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=drController.d.ts.map