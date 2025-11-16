"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = void 0;
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendNoContent = sendNoContent;
exports.sendError = sendError;
exports.sendBadRequest = sendBadRequest;
exports.sendUnauthorized = sendUnauthorized;
exports.sendForbidden = sendForbidden;
exports.sendNotFound = sendNotFound;
exports.sendConflict = sendConflict;
exports.sendValidationError = sendValidationError;
exports.sendInternalError = sendInternalError;
exports.sendPaginated = sendPaginated;
exports.calculatePagination = calculatePagination;
exports.parsePaginationParams = parsePaginationParams;
exports.asyncHandler = asyncHandler;
function sendSuccess(res, data, message = 'Success', statusCode = 200) {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    };
    return res.status(statusCode).json(response);
}
exports.successResponse = sendSuccess;
function sendCreated(res, data, message = 'Resource created successfully') {
    return sendSuccess(res, data, message, 201);
}
function sendNoContent(res) {
    return res.status(204).send();
}
function sendError(res, message, statusCode = 500, errors, stack) {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };
    if (errors) {
        response.errors = errors;
    }
    if (stack && process.env.NODE_ENV !== 'production') {
        response.stack = stack;
    }
    return res.status(statusCode).json(response);
}
function sendBadRequest(res, message = 'Bad request', errors) {
    return sendError(res, message, 400, errors);
}
function sendUnauthorized(res, message = 'Unauthorized') {
    return sendError(res, message, 401);
}
function sendForbidden(res, message = 'Forbidden') {
    return sendError(res, message, 403);
}
function sendNotFound(res, message = 'Resource not found') {
    return sendError(res, message, 404);
}
function sendConflict(res, message = 'Resource conflict') {
    return sendError(res, message, 409);
}
function sendValidationError(res, errors, message = 'Validation failed') {
    return sendError(res, message, 422, errors);
}
function sendInternalError(res, message = 'Internal server error', error) {
    return sendError(res, message, 500, undefined, error?.stack);
}
function sendPaginated(res, data, pagination, message = 'Success') {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
        meta: {
            pagination
        }
    };
    return res.status(200).json(response);
}
function calculatePagination(page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    };
}
function parsePaginationParams(query) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    return { page, limit };
}
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=responseHelpers.js.map