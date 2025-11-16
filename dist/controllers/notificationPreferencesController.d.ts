import { Request, Response, NextFunction } from 'express';
export declare class NotificationPreferencesController {
    private preferenceRepository;
    constructor();
    getPreferences: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    updatePreferences: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    resetPreferences: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getPreferences: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const updatePreferences: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const resetPreferences: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=notificationPreferencesController.d.ts.map