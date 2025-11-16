import { Request, Response, NextFunction } from 'express';
export declare class ArchiveController {
    private archiveService;
    constructor();
    getAllArchives: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getActiveEvents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getArchivedEvents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    archiveItem: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    restoreItem: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteArchivedItem: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    archiveEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    restoreEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getAllArchives: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getActiveEvents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getArchivedEvents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const archiveItem: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const restoreItem: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteArchivedItem: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const archiveEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const restoreEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=archiveController.d.ts.map