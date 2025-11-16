import { Request, Response, NextFunction } from 'express';
export declare class JudgeController {
    private judgeService;
    constructor();
    getStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAssignments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateAssignmentStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getScoringInterface: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    submitScore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCertificationWorkflow: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getContestantBios: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getContestantBio: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getJudgeHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getAssignments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateAssignmentStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getScoringInterface: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const submitScore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCertificationWorkflow: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getContestantBios: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getContestantBio: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getJudgeHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=judgeController.d.ts.map