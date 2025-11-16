import { Request, Response } from 'express';
import { BulkOperationService } from '../services/BulkOperationService';
import { ContestService } from '../services/ContestService';
export declare class BulkContestController {
    private bulkOperationService;
    private contestService;
    constructor(bulkOperationService: BulkOperationService, contestService: ContestService);
    private logger;
    changeContestStatus(req: Request, res: Response): Promise<void>;
    certifyContests(req: Request, res: Response): Promise<void>;
    deleteContests(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=BulkContestController.d.ts.map