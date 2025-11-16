import { Request, Response, NextFunction } from 'express';
export declare class ScoreFileController {
    private scoreFileService;
    constructor();
    uploadScoreFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getScoreFileById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getScoreFilesByCategory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getScoreFilesByJudge: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getScoreFilesByContestant: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllScoreFiles: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateScoreFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteScoreFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    downloadScoreFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const uploadScoreFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getScoreFileById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getScoreFilesByCategory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getScoreFilesByJudge: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getScoreFilesByContestant: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getAllScoreFiles: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateScoreFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteScoreFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const downloadScoreFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=scoreFileController.d.ts.map