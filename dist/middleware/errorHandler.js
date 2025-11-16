"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.logActivity = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const logActivity = (action, resourceType = null, resourceId = null) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        res.send = function (data) {
            if (req.user && res.statusCode < 400) {
                setImmediate(async () => {
                    try {
                        if (!prisma_1.default || !prisma_1.default.activityLog) {
                            return;
                        }
                        let finalResourceId = resourceId;
                        if (!finalResourceId && req.params) {
                            finalResourceId = req.params.id ||
                                req.params.userId ||
                                req.params.eventId ||
                                req.params.contestId ||
                                req.params.categoryId ||
                                req.params.scoreId ||
                                req.params.deductionId ||
                                null;
                        }
                        const userName = req.user?.name || null;
                        const userRole = req.user?.role || null;
                        await prisma_1.default.activityLog.create({
                            data: {
                                userId: req.user.id,
                                userName: userName,
                                userRole: userRole,
                                action: action,
                                resourceType: resourceType,
                                resourceId: finalResourceId,
                                ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
                                userAgent: req.get('User-Agent') || 'Unknown',
                                details: JSON.stringify({
                                    method: req.method,
                                    path: req.path,
                                    timestamp: new Date().toISOString(),
                                    body: req.body ? Object.keys(req.body).reduce((acc, key) => {
                                        if (!['password', 'token', 'secret', 'apiKey'].includes(key.toLowerCase())) {
                                            acc[key] = req.body[key];
                                        }
                                        else {
                                            acc[key] = '[REDACTED]';
                                        }
                                        return acc;
                                    }, {}) : null,
                                    query: req.query || null,
                                    params: req.params || null
                                })
                            }
                        });
                    }
                    catch (error) {
                        console.error('Failed to log activity:', error);
                    }
                });
            }
            return originalSend.call(this, data);
        };
        next();
    };
};
exports.logActivity = logActivity;
const errorHandler = (err, req, res, next) => {
    const errorDetails = {
        message: err.message,
        name: err.name,
        stack: err.stack,
        timestamp: new Date().toISOString(),
        requestId: req.id || req.headers['x-request-id'] || null,
        userId: req.user?.id || null,
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
    };
    console.error('[ERROR]', {
        ...errorDetails,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
    if (err.statusCode >= 500 || !err.statusCode) {
        setImmediate(async () => {
            try {
                if (!prisma_1.default || !prisma_1.default.activityLog) {
                    return;
                }
                await prisma_1.default.activityLog.create({
                    data: {
                        action: 'ERROR',
                        details: JSON.stringify({
                            message: err.message,
                            name: err.name,
                            stack: err.stack,
                            statusCode: err.statusCode || 500,
                            method: req.method,
                            path: req.path,
                            ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
                            userAgent: req.get('User-Agent') || 'Unknown',
                            requestId: (() => {
                                const id = req.id || req.headers['x-request-id'];
                                if (typeof id === 'string')
                                    return id;
                                if (Array.isArray(id))
                                    return id[0] || null;
                                return null;
                            })(),
                            body: req.body || {},
                            query: req.query || {},
                            params: req.params || {},
                        }),
                        userId: req.user?.id || null,
                    },
                });
            }
            catch (logError) {
                console.error('Failed to log error to database:', logError);
            }
        });
    }
    if (err.name === 'ValidationError') {
        res.status(400).json({
            success: false,
            error: 'Validation error',
            details: err.message,
            timestamp: new Date().toISOString(),
        });
        return;
    }
    if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
        res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: err.message || 'Authentication required',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    if (err.name === 'ForbiddenError' || err.statusCode === 403) {
        res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: err.message || 'You do not have permission to access this resource',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    if (err.name === 'NotFoundError' || err.statusCode === 404) {
        res.status(404).json({
            success: false,
            error: 'Not found',
            message: err.message || 'Resource not found',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    if (err.name === 'PrismaClientKnownRequestError') {
        if (err.code === 'P2002') {
            res.status(409).json({
                success: false,
                error: 'Conflict',
                message: 'A record with this value already exists',
                timestamp: new Date().toISOString(),
            });
            return;
        }
        if (err.code === 'P2025') {
            res.status(404).json({
                success: false,
                error: 'Not found',
                message: 'Record not found',
                timestamp: new Date().toISOString(),
            });
            return;
        }
    }
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map