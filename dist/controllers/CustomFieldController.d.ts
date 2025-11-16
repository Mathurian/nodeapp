import { Request, Response } from 'express';
export declare class CustomFieldController {
    getCustomFields(req: Request, res: Response): Promise<void>;
    getCustomFieldById(req: Request, res: Response): Promise<void>;
    createCustomField(req: Request, res: Response): Promise<void>;
    updateCustomField(req: Request, res: Response): Promise<void>;
    deleteCustomField(req: Request, res: Response): Promise<void>;
    getCustomFieldValues(req: Request, res: Response): Promise<void>;
    setCustomFieldValue(req: Request, res: Response): Promise<void>;
    bulkSetCustomFieldValues(req: Request, res: Response): Promise<void>;
    deleteCustomFieldValue(req: Request, res: Response): Promise<void>;
    reorderCustomFields(req: Request, res: Response): Promise<void>;
}
export declare const customFieldController: CustomFieldController;
//# sourceMappingURL=CustomFieldController.d.ts.map