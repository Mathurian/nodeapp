import { Request, Response, NextFunction } from 'express';
export declare class DeductionController {
    private deductionService;
    constructor();
    createDeductionRequest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPendingDeductions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    approveDeduction: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    rejectDeduction: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getApprovalStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getDeductionHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const createDeductionRequest: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPendingDeductions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const approveDeduction: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rejectDeduction: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getApprovalStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getDeductionHistory: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=deductionController.d.ts.map