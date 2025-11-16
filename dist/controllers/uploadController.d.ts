import { Request, Response, NextFunction } from 'express';
export declare class UploadController {
    private uploadService;
    constructor();
    uploadFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    uploadImage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getFiles: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
export declare const uploadFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const uploadImage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getFiles: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=uploadController.d.ts.map