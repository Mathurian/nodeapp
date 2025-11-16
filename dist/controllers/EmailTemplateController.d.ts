import { Request, Response } from 'express';
export declare class EmailTemplateController {
    getAllTemplates(req: Request, res: Response): Promise<void>;
    getTemplateById(req: Request, res: Response): Promise<void>;
    getTemplatesByType(req: Request, res: Response): Promise<void>;
    createTemplate(req: Request, res: Response): Promise<void>;
    updateTemplate(req: Request, res: Response): Promise<void>;
    deleteTemplate(req: Request, res: Response): Promise<void>;
    cloneTemplate(req: Request, res: Response): Promise<void>;
    previewTemplate(req: Request, res: Response): Promise<void>;
    getAvailableVariables(req: Request, res: Response): Promise<void>;
}
export declare const emailTemplateController: EmailTemplateController;
//# sourceMappingURL=EmailTemplateController.d.ts.map