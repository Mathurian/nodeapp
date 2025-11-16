import { Request, Response, NextFunction } from 'express';
export declare class RateLimitController {
    private rateLimitService;
    constructor();
    getAllConfigs: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getConfig: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    updateConfig: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getMyRateLimitStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
declare const controller: RateLimitController;
export declare const getAllConfigs: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getConfig: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const updateConfig: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getMyRateLimitStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export default controller;
//# sourceMappingURL=rateLimitController.d.ts.map