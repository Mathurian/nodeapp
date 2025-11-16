import { Response } from 'express';
interface ApiMeta {
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
    [key: string]: any;
}
export declare const successResponse: (res: Response, data?: any, message?: string, statusCode?: number, meta?: ApiMeta | null) => Response;
export declare const errorResponse: (res: Response, message?: string, statusCode?: number, errors?: any) => Response;
export declare const paginatedResponse: (res: Response, data: any[], page: number, limit: number, total: number, message?: string) => Response;
export declare const createdResponse: (res: Response, data: any, message?: string) => Response;
export declare const noContentResponse: (res: Response) => Response;
export declare const badRequestResponse: (res: Response, message?: string, errors?: any) => Response;
export declare const unauthorizedResponse: (res: Response, message?: string) => Response;
export declare const forbiddenResponse: (res: Response, message?: string) => Response;
export declare const notFoundResponse: (res: Response, message?: string) => Response;
export declare const conflictResponse: (res: Response, message?: string) => Response;
export declare const validationErrorResponse: (res: Response, errors: any[], message?: string) => Response;
export declare const internalErrorResponse: (res: Response, message?: string, error?: any) => Response;
export {};
//# sourceMappingURL=apiResponse.d.ts.map