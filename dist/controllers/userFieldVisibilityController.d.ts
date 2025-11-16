import { Request, Response, NextFunction } from 'express';
export declare class UserFieldVisibilityController {
    private userFieldVisibilityService;
    constructor();
    getFieldVisibilitySettings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateFieldVisibility: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    resetFieldVisibility: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getFieldVisibilitySettings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateFieldVisibility: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const resetFieldVisibility: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=userFieldVisibilityController.d.ts.map