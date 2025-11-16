import { ErrorSeverity } from '../utils/errorTracking';
export declare class ServiceError extends Error {
    statusCode: number;
    code?: string;
    details?: any;
    constructor(message: string, statusCode?: number, code?: string, details?: any);
}
export declare class ValidationError extends ServiceError {
    validationErrors?: any[];
    constructor(message: string, validationErrors?: any[]);
}
export declare class NotFoundError extends ServiceError {
    constructor(resource: string, identifier?: string);
}
export declare class UnauthorizedError extends ServiceError {
    constructor(message?: string);
}
export declare class ForbiddenError extends ServiceError {
    constructor(message?: string);
}
export declare class ConflictError extends ServiceError {
    constructor(message: string);
}
export declare abstract class BaseService {
    protected handleError(error: any, context?: any): never;
    protected getErrorSeverity(error: any): ErrorSeverity;
    protected validateRequired(data: any, fields: string[]): void;
    protected assertExists<T>(entity: T | null | undefined, resourceName: string, identifier?: string): asserts entity is T;
    protected notFoundError(resource: string, identifier?: string): NotFoundError;
    protected createNotFoundError(message: string): NotFoundError;
    protected createBadRequestError(message: string): ServiceError;
    protected badRequestError(message: string): ServiceError;
    protected validationError(message: string, validationErrors?: any[]): ValidationError;
    protected forbiddenError(message?: string): ForbiddenError;
    protected unauthorizedError(message?: string): UnauthorizedError;
    protected conflictError(message: string): ConflictError;
    protected assert(condition: boolean, message: string, statusCode?: number): void;
    protected sanitizeUser(user: any): any;
    protected paginate<T>(data: T[], page: number, limit: number): {
        data: T[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    };
    protected withRetry<T>(operation: () => Promise<T>, maxRetries?: number, delay?: number): Promise<T>;
    protected sleep(ms: number): Promise<void>;
    protected logInfo(message: string, data?: any): void;
    protected logWarn(message: string, data?: any): void;
    protected logDebug(message: string, data?: any): void;
    protected logError(message: string, error?: any): void;
}
//# sourceMappingURL=BaseService.d.ts.map