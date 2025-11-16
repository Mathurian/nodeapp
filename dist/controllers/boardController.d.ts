import { Request, Response, NextFunction } from 'express';
export declare class BoardController {
    private boardService;
    constructor();
    getStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCertifications: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    approveCertification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    rejectCertification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getEmceeScripts: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createEmceeScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateEmceeScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteEmceeScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    generateReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getScoreRemovalRequests: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    approveScoreRemoval: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    rejectScoreRemoval: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCertifications: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const approveCertification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rejectCertification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getEmceeScripts: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createEmceeScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateEmceeScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteEmceeScript: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const generateReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getScoreRemovalRequests: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const approveScoreRemoval: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rejectScoreRemoval: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=boardController.d.ts.map