import { Request, Response, NextFunction } from 'express';
export declare class LogFilesController {
    private logFilesService;
    constructor();
    getLogFiles: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        files: import("../services/LogFilesService").LogFileInfo[];
        directory: string;
    }>, Record<string, any>>>;
    getLogFileContents: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    downloadLogFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    cleanupOldLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    deleteLogFile: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
}
export declare const getLogFiles: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    files: import("../services/LogFilesService").LogFileInfo[];
    directory: string;
}>, Record<string, any>>>;
export declare const getLogFileContents: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const downloadLogFile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const cleanupOldLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const deleteLogFile: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
//# sourceMappingURL=logFilesController.d.ts.map