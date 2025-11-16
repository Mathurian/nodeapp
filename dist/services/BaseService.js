"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.ServiceError = void 0;
const errorTracking_1 = require("../utils/errorTracking");
class ServiceError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'ServiceError';
        Object.setPrototypeOf(this, ServiceError.prototype);
    }
}
exports.ServiceError = ServiceError;
class ValidationError extends ServiceError {
    validationErrors;
    constructor(message, validationErrors) {
        super(message, 422, 'VALIDATION_ERROR', validationErrors);
        this.validationErrors = validationErrors;
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends ServiceError {
    constructor(resource, identifier) {
        const message = identifier
            ? `${resource} with identifier '${identifier}' not found`
            : `${resource} not found`;
        super(message, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends ServiceError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends ServiceError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends ServiceError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}
exports.ConflictError = ConflictError;
class BaseService {
    handleError(error, context) {
        const severity = this.getErrorSeverity(error);
        (0, errorTracking_1.trackError)(error, severity, context);
        if (error instanceof ServiceError) {
            throw error;
        }
        throw new ServiceError(error.message || 'An unexpected error occurred', 500, 'INTERNAL_ERROR', error);
    }
    getErrorSeverity(error) {
        if (error instanceof ValidationError) {
            return errorTracking_1.ErrorSeverity.LOW;
        }
        if (error instanceof NotFoundError) {
            return errorTracking_1.ErrorSeverity.LOW;
        }
        if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
            return errorTracking_1.ErrorSeverity.MEDIUM;
        }
        if (error instanceof ConflictError) {
            return errorTracking_1.ErrorSeverity.MEDIUM;
        }
        return errorTracking_1.ErrorSeverity.HIGH;
    }
    validateRequired(data, fields) {
        const missing = [];
        fields.forEach(field => {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                missing.push(field);
            }
        });
        if (missing.length > 0) {
            throw new ValidationError(`Missing required fields: ${missing.join(', ')}`, missing.map(field => ({
                field,
                message: 'This field is required',
                rule: 'required'
            })));
        }
    }
    assertExists(entity, resourceName, identifier) {
        if (!entity) {
            throw new NotFoundError(resourceName, identifier);
        }
    }
    notFoundError(resource, identifier) {
        return new NotFoundError(resource, identifier);
    }
    createNotFoundError(message) {
        return new NotFoundError(message);
    }
    createBadRequestError(message) {
        return new ServiceError(message, 400, 'BAD_REQUEST');
    }
    badRequestError(message) {
        return new ServiceError(message, 400, 'BAD_REQUEST');
    }
    validationError(message, validationErrors) {
        return new ValidationError(message, validationErrors);
    }
    forbiddenError(message) {
        return new ForbiddenError(message);
    }
    unauthorizedError(message) {
        return new UnauthorizedError(message);
    }
    conflictError(message) {
        return new ConflictError(message);
    }
    assert(condition, message, statusCode = 400) {
        if (!condition) {
            throw new ServiceError(message, statusCode);
        }
    }
    sanitizeUser(user) {
        const { password, resetToken, resetTokenExpiry, ...sanitized } = user;
        return sanitized;
    }
    paginate(data, page, limit) {
        const total = data.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        return {
            data: data.slice(startIndex, endIndex),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        };
    }
    async withRetry(operation, maxRetries = 3, delay = 1000) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (error instanceof ValidationError ||
                    error instanceof NotFoundError ||
                    error instanceof UnauthorizedError ||
                    error instanceof ForbiddenError) {
                    throw error;
                }
                if (attempt < maxRetries) {
                    await this.sleep(delay * attempt);
                }
            }
        }
        throw lastError;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    logInfo(message, data) {
        console.log(`[${this.constructor.name}] ${message}`, data || '');
    }
    logWarn(message, data) {
        console.warn(`[${this.constructor.name}] ${message}`, data || '');
    }
    logDebug(message, data) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${this.constructor.name}] DEBUG: ${message}`, data || '');
        }
    }
    logError(message, error) {
        console.error(`[${this.constructor.name}] ${message}`, error || '');
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=BaseService.js.map