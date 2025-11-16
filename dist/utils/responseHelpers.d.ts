import { Response } from 'express';
import { SuccessResponse, ErrorResponse, PaginatedResponse, PaginationMeta, ValidationError } from '../types/api/responses.types';
export declare function sendSuccess<T>(res: Response, data: T, message?: string, statusCode?: number): Response<SuccessResponse<T>>;
export declare const successResponse: typeof sendSuccess;
export declare function sendCreated<T>(res: Response, data: T, message?: string): Response<SuccessResponse<T>>;
export declare function sendNoContent(res: Response): Response;
export declare function sendError(res: Response, message: string, statusCode?: number, errors?: ValidationError[] | any, stack?: string): Response<ErrorResponse>;
export declare function sendBadRequest(res: Response, message?: string, errors?: ValidationError[]): Response<ErrorResponse>;
export declare function sendUnauthorized(res: Response, message?: string): Response<ErrorResponse>;
export declare function sendForbidden(res: Response, message?: string): Response<ErrorResponse>;
export declare function sendNotFound(res: Response, message?: string): Response<ErrorResponse>;
export declare function sendConflict(res: Response, message?: string): Response<ErrorResponse>;
export declare function sendValidationError(res: Response, errors: ValidationError[], message?: string): Response<ErrorResponse>;
export declare function sendInternalError(res: Response, message?: string, error?: Error): Response<ErrorResponse>;
export declare function sendPaginated<T>(res: Response, data: T[], pagination: PaginationMeta, message?: string): Response<PaginatedResponse<T>>;
export declare function calculatePagination(page: number, limit: number, total: number): PaginationMeta;
export declare function parsePaginationParams(query: any): {
    page: number;
    limit: number;
};
export declare function asyncHandler(fn: Function): (req: any, res: any, next: any) => void;
//# sourceMappingURL=responseHelpers.d.ts.map