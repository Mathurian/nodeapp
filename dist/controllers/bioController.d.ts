import { Request, Response, NextFunction } from 'express';
export declare class BioController {
    private bioService;
    constructor();
    getContestantBios: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getJudgeBios: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    updateContestantBio: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    updateJudgeBio: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getContestantBios: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getJudgeBios: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const updateContestantBio: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const updateJudgeBio: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=bioController.d.ts.map