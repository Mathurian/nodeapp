import { Request, Response, NextFunction } from 'express';
export declare class DatabaseBrowserController {
    private databaseBrowserService;
    private prisma;
    constructor();
    getTables: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<string[]>, Record<string, any>>>;
    getTableData: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        table: string;
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            pages: number;
        };
    }>, Record<string, any>>>;
    getTableSchema: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        table: string;
        message: string;
    }>, Record<string, any>>>;
    executeQuery: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getQueryHistory: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getTables: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<string[]>, Record<string, any>>>;
export declare const getTableData: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    table: string;
    data: any;
    pagination: {
        page: number;
        limit: number;
        total: any;
        pages: number;
    };
}>, Record<string, any>>>;
export declare const getTableSchema: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    table: string;
    message: string;
}>, Record<string, any>>>;
export declare const executeQuery: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getQueryHistory: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=databaseBrowserController.d.ts.map