import { Request, Response, NextFunction } from 'express';
export declare class ResultsController {
    private resultsService;
    constructor();
    getAllResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCategories: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getContestantResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCategoryResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getContestResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEventResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getAllResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCategories: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getContestantResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCategoryResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getContestResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getEventResults: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=resultsController.d.ts.map