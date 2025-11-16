"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.InternalError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.BaseAppError = exports.ErrorCode = void 0;
exports.isAppError = isAppError;
exports.isOperationalError = isOperationalError;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["MISSING_REQUIRED_FIELD"] = "MISSING_REQUIRED_FIELD";
    ErrorCode["AUTHENTICATION_ERROR"] = "AUTHENTICATION_ERROR";
    ErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    ErrorCode["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    ErrorCode["SESSION_VERSION_MISMATCH"] = "SESSION_VERSION_MISMATCH";
    ErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    ErrorCode["AUTHORIZATION_ERROR"] = "AUTHORIZATION_ERROR";
    ErrorCode["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    ErrorCode["ACCESS_DENIED"] = "ACCESS_DENIED";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    ErrorCode["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    ErrorCode["EVENT_NOT_FOUND"] = "EVENT_NOT_FOUND";
    ErrorCode["CONFLICT"] = "CONFLICT";
    ErrorCode["DUPLICATE_ENTRY"] = "DUPLICATE_ENTRY";
    ErrorCode["RESOURCE_EXISTS"] = "RESOURCE_EXISTS";
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["DATABASE_ERROR"] = "DATABASE_ERROR";
    ErrorCode["EXTERNAL_SERVICE_ERROR"] = "EXTERNAL_SERVICE_ERROR";
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class BaseAppError extends Error {
    code;
    statusCode;
    details;
    isOperational = true;
    constructor(message, code, statusCode, details) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.BaseAppError = BaseAppError;
class ValidationError extends BaseAppError {
    constructor(message = 'Validation failed', details) {
        super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends BaseAppError {
    constructor(message = 'Authentication failed', code = ErrorCode.AUTHENTICATION_ERROR, details) {
        super(message, code, 401, details);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends BaseAppError {
    constructor(message = 'Insufficient permissions', code = ErrorCode.AUTHORIZATION_ERROR, details) {
        super(message, code, 403, details);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends BaseAppError {
    constructor(message = 'Resource not found', code = ErrorCode.NOT_FOUND, details) {
        super(message, code, 404, details);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends BaseAppError {
    constructor(message = 'Resource conflict', code = ErrorCode.CONFLICT, details) {
        super(message, code, 409, details);
    }
}
exports.ConflictError = ConflictError;
class InternalError extends BaseAppError {
    constructor(message = 'Internal server error', code = ErrorCode.INTERNAL_ERROR, details) {
        super(message, code, 500, details);
    }
}
exports.InternalError = InternalError;
class RateLimitError extends BaseAppError {
    constructor(message = 'Rate limit exceeded', details) {
        super(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429, details);
    }
}
exports.RateLimitError = RateLimitError;
function isAppError(error) {
    return error instanceof BaseAppError;
}
function isOperationalError(error) {
    if (isAppError(error)) {
        return error.isOperational;
    }
    return false;
}
//# sourceMappingURL=index.js.map