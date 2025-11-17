import { Request, Response } from 'express';
import { BulkOperationService } from '../services/BulkOperationService';
import { CSVService } from '../services/CSVService';
import { UserService } from '../services/UserService';
export declare class BulkUserController {
    private bulkOperationService;
    private csvService;
    private userService;
    constructor(bulkOperationService: BulkOperationService, csvService: CSVService, userService: UserService);
    activateUsers(req: Request, res: Response): Promise<void>;
    deactivateUsers(req: Request, res: Response): Promise<void>;
    deleteUsers(req: Request, res: Response): Promise<void>;
    changeUserRoles(req: Request, res: Response): Promise<void>;
    importUsers(req: Request, res: Response): Promise<void>;
    exportUsers(req: Request, res: Response): Promise<void>;
    getImportTemplate(_req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=BulkUserController.d.ts.map