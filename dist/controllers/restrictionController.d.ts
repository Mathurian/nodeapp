import { Request, Response, NextFunction } from 'express';
export declare class RestrictionController {
    private restrictionService;
    constructor();
    setContestantViewRestriction: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    canContestantView: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    lockEventContest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    isLocked: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const setContestantViewRestriction: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const canContestantView: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const lockEventContest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const isLocked: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=restrictionController.d.ts.map