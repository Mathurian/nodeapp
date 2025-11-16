import { Request, Response } from 'express';
import { BulkOperationService } from '../services/BulkOperationService';
import { EventService } from '../services/EventService';
export declare class BulkEventController {
    private bulkOperationService;
    private eventService;
    constructor(bulkOperationService: BulkOperationService, eventService: EventService);
    changeEventStatus(req: Request, res: Response): Promise<void>;
    deleteEvents(req: Request, res: Response): Promise<void>;
    cloneEvents(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=BulkEventController.d.ts.map