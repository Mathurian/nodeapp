import { Request, Response, NextFunction } from 'express';
export declare class FileManagementController {
    private fileManagementService;
    private prisma;
    constructor();
    getFileInfo: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        name: string;
        size: number;
        created: Date;
        modified: Date;
    }>, Record<string, any>>>;
    moveFile: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        success: boolean;
        newPath: string;
    }>, Record<string, any>>>;
    copyFile: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        success: boolean;
        newPath: string;
    }>, Record<string, any>>>;
    getFilesWithFilters: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    bulkFileOperations: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getFileSearchSuggestions: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getFileAnalytics: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    checkFileIntegrity: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    bulkCheckFileIntegrity: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getFileInfo: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    name: string;
    size: number;
    created: Date;
    modified: Date;
}>, Record<string, any>>>;
export declare const moveFile: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    success: boolean;
    newPath: string;
}>, Record<string, any>>>;
export declare const copyFile: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    success: boolean;
    newPath: string;
}>, Record<string, any>>>;
export declare const getFilesWithFilters: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const bulkFileOperations: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getFileSearchSuggestions: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getFileAnalytics: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const checkFileIntegrity: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const bulkCheckFileIntegrity: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=fileManagementController.d.ts.map