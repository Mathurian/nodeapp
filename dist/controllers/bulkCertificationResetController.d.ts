import { Request, Response, NextFunction } from 'express';
export declare class BulkCertificationResetController {
    private bulkCertificationResetService;
    constructor();
    resetCertifications: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const resetCertifications: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=bulkCertificationResetController.d.ts.map