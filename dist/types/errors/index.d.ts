export declare enum ErrorCode {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INVALID_INPUT = "INVALID_INPUT",
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    INVALID_TOKEN = "INVALID_TOKEN",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    SESSION_VERSION_MISMATCH = "SESSION_VERSION_MISMATCH",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    ACCESS_DENIED = "ACCESS_DENIED",
    NOT_FOUND = "NOT_FOUND",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    USER_NOT_FOUND = "USER_NOT_FOUND",
    EVENT_NOT_FOUND = "EVENT_NOT_FOUND",
    CONFLICT = "CONFLICT",
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
    RESOURCE_EXISTS = "RESOURCE_EXISTS",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
}
export interface AppError extends Error {
    code: ErrorCode;
    statusCode: number;
    details?: unknown;
    isOperational: boolean;
}
export declare class BaseAppError extends Error implements AppError {
    readonly code: ErrorCode;
    readonly statusCode: number;
    readonly details?: unknown;
    readonly isOperational: boolean;
    constructor(message: string, code: ErrorCode, statusCode: number, details?: unknown);
}
export declare class ValidationError extends BaseAppError {
    constructor(message?: string, details?: unknown);
}
export declare class AuthenticationError extends BaseAppError {
    constructor(message?: string, code?: ErrorCode, details?: unknown);
}
export declare class AuthorizationError extends BaseAppError {
    constructor(message?: string, code?: ErrorCode, details?: unknown);
}
export declare class NotFoundError extends BaseAppError {
    constructor(message?: string, code?: ErrorCode, details?: unknown);
}
export declare class ConflictError extends BaseAppError {
    constructor(message?: string, code?: ErrorCode, details?: unknown);
}
export declare class InternalError extends BaseAppError {
    constructor(message?: string, code?: ErrorCode, details?: unknown);
}
export declare class RateLimitError extends BaseAppError {
    constructor(message?: string, details?: unknown);
}
export declare function isAppError(error: unknown): error is AppError;
export declare function isOperationalError(error: unknown): boolean;
//# sourceMappingURL=index.d.ts.map