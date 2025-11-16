import { Request, Response } from 'express';
import { MFAService } from '../services/MFAService';
import { ErrorHandlingService } from '../services/ErrorHandlingService';
export declare class MFAController {
    private mfaService;
    private errorHandler;
    constructor(mfaService: MFAService, errorHandler: ErrorHandlingService);
    setupMFA(req: Request, res: Response): Promise<void>;
    enableMFA(req: Request, res: Response): Promise<void>;
    disableMFA(req: Request, res: Response): Promise<void>;
    verifyMFA(req: Request, res: Response): Promise<void>;
    regenerateBackupCodes(req: Request, res: Response): Promise<void>;
    getMFAStatus(req: Request, res: Response): Promise<void>;
}
export default MFAController;
//# sourceMappingURL=mfaController.d.ts.map