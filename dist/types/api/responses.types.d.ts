export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    timestamp: string;
    meta?: ResponseMeta;
    errors?: any;
    stack?: string;
}
export interface SuccessResponse<T = any> extends ApiResponse<T> {
    success: true;
    data: T;
}
export interface ErrorResponse extends ApiResponse<never> {
    success: false;
    errors?: ValidationError[] | any;
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}
export interface ResponseMeta {
    pagination?: PaginationMeta;
    [key: string]: any;
}
export interface ValidationError {
    field: string;
    message: string;
    value?: any;
    rule?: string;
}
export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
    meta: {
        pagination: PaginationMeta;
    };
}
//# sourceMappingURL=responses.types.d.ts.map