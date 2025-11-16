import { Request, Response, NextFunction } from 'express';
export declare class TestEventSetupController {
    private testEventSetupService;
    constructor();
    createTestEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const createTestEvent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=testEventSetupController.d.ts.map