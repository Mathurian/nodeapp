import { Request, Response, NextFunction } from 'express';
export declare class ContestsController {
    private contestService;
    constructor();
    getContestById: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getContestsByEvent: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    createContest: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    updateContest: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    deleteContest: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    archiveContest: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    reactivateContest: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getArchivedContests: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getContestStats: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    searchContests: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getContestById: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getContestsByEvent: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const createContest: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const updateContest: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const deleteContest: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const archiveContest: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const reactivateContest: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getArchivedContests: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getContestStats: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const searchContests: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=contestsController.d.ts.map