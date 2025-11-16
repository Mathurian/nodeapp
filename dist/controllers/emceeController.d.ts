import { Request, Response, NextFunction } from 'express';
export declare class EmceeController {
    private emceeService;
    constructor();
    getStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getScripts: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getContestantBios: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getJudgeBios: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEvents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getContests: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getContest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEmceeHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    uploadScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    toggleScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    serveScriptFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getFileViewUrl: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getScripts: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getContestantBios: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getJudgeBios: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getEvents: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getContests: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getContest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getEmceeHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const uploadScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const toggleScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const serveScriptFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getFileViewUrl: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=emceeController.d.ts.map