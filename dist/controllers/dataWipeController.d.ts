import { Request, Response, NextFunction } from 'express';
export declare class DataWipeController {
    private dataWipeService;
    constructor();
    wipeAllData: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    wipeEventData: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const wipeAllData: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const wipeEventData: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=dataWipeController.d.ts.map