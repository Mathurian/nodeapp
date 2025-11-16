import { Request, Response, NextFunction } from 'express';
export declare class FileController {
    private fileService;
    private prisma;
    constructor();
    listFiles: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        name: string;
        isDirectory: boolean;
        path: string;
    }[]>, Record<string, any>>>;
    downloadFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteFile: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    getAllFiles: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    uploadFiles: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getFileById: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    updateFile: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getFileStats: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    upload: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const listFiles: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    name: string;
    isDirectory: boolean;
    path: string;
}[]>, Record<string, any>>>;
export declare const downloadFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteFile: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const getAllFiles: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const uploadFiles: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getFileById: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const updateFile: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getFileStats: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const upload: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=fileController.d.ts.map