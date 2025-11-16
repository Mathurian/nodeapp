"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalErrorResponse = exports.validationErrorResponse = exports.conflictResponse = exports.notFoundResponse = exports.forbiddenResponse = exports.unauthorizedResponse = exports.badRequestResponse = exports.noContentResponse = exports.createdResponse = exports.paginatedResponse = exports.errorResponse = exports.successResponse = void 0;
const successResponse = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    };
    if (meta) {
        response.meta = meta;
    }
    return res.status(statusCode).json(response);
};
exports.successResponse = successResponse;
const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
    };
    if (errors) {
        response.errors = errors;
    }
    if (process.env.NODE_ENV !== 'production' && errors?.stack) {
        response.stack = errors.stack;
    }
    return res.status(statusCode).json(response);
};
exports.errorResponse = errorResponse;
const paginatedResponse = (res, data, page, limit, total, message = 'Success') => {
    const totalPages = Math.ceil(total / limit);
    return (0, exports.successResponse)(res, data, message, 200, {
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    });
};
exports.paginatedResponse = paginatedResponse;
const createdResponse = (res, data, message = 'Resource created successfully') => {
    return (0, exports.successResponse)(res, data, message, 201);
};
exports.createdResponse = createdResponse;
const noContentResponse = (res) => {
    return res.status(204).send();
};
exports.noContentResponse = noContentResponse;
const badRequestResponse = (res, message = 'Bad Request', errors = null) => {
    return (0, exports.errorResponse)(res, message, 400, errors);
};
exports.badRequestResponse = badRequestResponse;
const unauthorizedResponse = (res, message = 'Unauthorized') => {
    return (0, exports.errorResponse)(res, message, 401);
};
exports.unauthorizedResponse = unauthorizedResponse;
const forbiddenResponse = (res, message = 'Forbidden') => {
    return (0, exports.errorResponse)(res, message, 403);
};
exports.forbiddenResponse = forbiddenResponse;
const notFoundResponse = (res, message = 'Resource not found') => {
    return (0, exports.errorResponse)(res, message, 404);
};
exports.notFoundResponse = notFoundResponse;
const conflictResponse = (res, message = 'Resource conflict') => {
    return (0, exports.errorResponse)(res, message, 409);
};
exports.conflictResponse = conflictResponse;
const validationErrorResponse = (res, errors, message = 'Validation failed') => {
    return (0, exports.errorResponse)(res, message, 422, errors);
};
exports.validationErrorResponse = validationErrorResponse;
const internalErrorResponse = (res, message = 'Internal Server Error', error = null) => {
    return (0, exports.errorResponse)(res, message, 500, error);
};
exports.internalErrorResponse = internalErrorResponse;
//# sourceMappingURL=apiResponse.js.map