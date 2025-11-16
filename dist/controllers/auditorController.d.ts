import { Request, Response, NextFunction } from 'express';
export declare class AuditorController {
    private auditorService;
    constructor();
    getStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPendingAudits: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCompletedAudits: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    finalCertification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    rejectAudit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getScoreVerification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    verifyScore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTallyMasterStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCertificationWorkflow: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    generateSummaryReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAuditHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPendingAudits: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCompletedAudits: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const finalCertification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rejectAudit: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getScoreVerification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verifyScore: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getTallyMasterStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getCertificationWorkflow: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const generateSummaryReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getAuditHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auditorController.d.ts.map