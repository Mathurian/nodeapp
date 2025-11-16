import { Request, Response, NextFunction } from 'express';
export declare class CategoryTypeController {
    private categoryTypeService;
    constructor();
    getAllCategoryTypes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createCategoryType: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateCategoryType: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteCategoryType: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getAllCategoryTypes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createCategoryType: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateCategoryType: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteCategoryType: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=categoryTypeController.d.ts.map