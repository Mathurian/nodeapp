"use strict";
/**
 * Base Service Class
 * Provides common functionality for all services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = exports.ServiceError = void 0;
const errorTracking_1 = require("../utils/errorTracking");
/**
 * Service Error
 */
class ServiceError extends Error {
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
/**
 * Validation Error
 */
class ValidationError extends ServiceError {
    constructor(message, validationErrors) {
        super(message, 422, 'VALIDATION_ERROR', validationErrors);
        this.validationErrors = validationErrors;
        this.name = 'ValidationError';
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
exports.ValidationError = ValidationError;
/**
 * Not Found Error
 */
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
/**
 * Unauthorized Error
 */
class UnauthorizedError extends ServiceError {
    constructor(message = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}
exports.UnauthorizedError = UnauthorizedError;
/**
 * Forbidden Error
 */
class ForbiddenError extends ServiceError {
    constructor(message = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}
exports.ForbiddenError = ForbiddenError;
/**
 * Conflict Error
 */
class ConflictError extends ServiceError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}
exports.ConflictError = ConflictError;
/**
 * Base Service
 */
class BaseService {
    /**
     * Handle service errors
     */
    handleError(error, context) {
        // Log the error
        const severity = this.getErrorSeverity(error);
        (0, errorTracking_1.trackError)(error, severity, context);
        // Re-throw service errors as-is
        if (error instanceof ServiceError) {
            throw error;
        }
        // Wrap other errors
        throw new ServiceError(error.message || 'An unexpected error occurred', 500, 'INTERNAL_ERROR', error);
    }
    /**
     * Determine error severity
     */
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
    /**
     * Validate required fields
     */
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
    /**
     * Assert entity exists
     */
    assertExists(entity, resourceName, identifier) {
        if (!entity) {
            throw new NotFoundError(resourceName, identifier);
        }
    }
    /**
     * Create Not Found Error
     */
    notFoundError(resource, identifier) {
        return new NotFoundError(resource, identifier);
    }
    /**
     * Create Not Found Error (alias)
     */
    createNotFoundError(message) {
        return new NotFoundError(message);
    }
    /**
     * Create Bad Request Error
     */
    createBadRequestError(message) {
        return new ServiceError(message, 400, 'BAD_REQUEST');
    }
    /**
     * Create Bad Request Error (alias)
     */
    badRequestError(message) {
        return new ServiceError(message, 400, 'BAD_REQUEST');
    }
    /**
     * Create Validation Error
     */
    validationError(message, validationErrors) {
        return new ValidationError(message, validationErrors);
    }
    /**
     * Create Forbidden Error
     */
    forbiddenError(message) {
        return new ForbiddenError(message);
    }
    /**
     * Create Unauthorized Error
     */
    unauthorizedError(message) {
        return new UnauthorizedError(message);
    }
    /**
     * Create Conflict Error
     */
    conflictError(message) {
        return new ConflictError(message);
    }
    /**
     * Assert condition
     */
    assert(condition, message, statusCode = 400) {
        if (!condition) {
            throw new ServiceError(message, statusCode);
        }
    }
    /**
     * Sanitize data for response (remove sensitive fields)
     */
    sanitizeUser(user) {
        const { password, resetToken, resetTokenExpiry, ...sanitized } = user;
        return sanitized;
    }
    /**
     * Paginate results
     */
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
    /**
     * Execute with retry logic
     */
    async withRetry(operation, maxRetries = 3, delay = 1000) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                // Don't retry on validation or client errors
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
    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Log info
     */
    logInfo(message, data) {
        console.log(`[${this.constructor.name}] ${message}`, data || '');
    }
    /**
     * Log warning
     */
    logWarn(message, data) {
        console.warn(`[${this.constructor.name}] ${message}`, data || '');
    }
    /**
     * Log debug
     */
    logDebug(message, data) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${this.constructor.name}] DEBUG: ${message}`, data || '');
        }
    }
    /**
     * Log error
     */
    logError(message, error) {
        console.error(`[${this.constructor.name}] ${message}`, error || '');
    }
}
exports.BaseService = BaseService;
