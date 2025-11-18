import { Request, Response, NextFunction } from 'express';
export declare class TemplatesController {
    private templateService;
    constructor();
    getAllTemplates: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTemplateById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    duplicateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const getAllTemplates: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getTemplateById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const duplicateTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=templatesController.d.ts.map