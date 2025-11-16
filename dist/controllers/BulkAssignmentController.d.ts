import { Request, Response } from 'express';
import { BulkOperationService } from '../services/BulkOperationService';
import { AssignmentService } from '../services/AssignmentService';
export declare class BulkAssignmentController {
    private bulkOperationService;
    private assignmentService;
    constructor(bulkOperationService: BulkOperationService, assignmentService: AssignmentService);
    private logger;
    createAssignments(req: Request, res: Response): Promise<void>;
    deleteAssignments(req: Request, res: Response): Promise<void>;
    reassignJudges(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=BulkAssignmentController.d.ts.map