import { Request, Response, NextFunction } from 'express';
export declare class ErrorHandlingController {
    private errorHandlingService;
    private prisma;
    constructor();
    logError: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        logged: boolean;
        timestamp: Date;
        error: string;
    }>, Record<string, any>>>;
    getErrorStats: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        total: number;
        last24Hours: number;
        byType: {};
    }>, Record<string, any>>>;
    getErrorStatistics: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getErrorDetails: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    markErrorResolved: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getErrorTrends: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    cleanupErrorLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    exportErrorLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const logError: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    logged: boolean;
    timestamp: Date;
    error: string;
}>, Record<string, any>>>;
export declare const getErrorStats: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    total: number;
    last24Hours: number;
    byType: {};
}>, Record<string, any>>>;
export declare const getErrorStatistics: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getErrorDetails: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const markErrorResolved: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getErrorTrends: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const cleanupErrorLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const exportErrorLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=errorHandlingController.d.ts.map