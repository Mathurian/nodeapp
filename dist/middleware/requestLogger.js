"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogging = exports.requestLogging = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const requestLogging = (req, res, next) => {
    const requestId = (0, uuid_1.v4)();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    const log = (0, logger_1.createRequestLogger)(req, 'request');
    req.logger = log;
    const start = Date.now();
    log.info('Request started', {
        requestId,
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userId: req.user?.id || 'anonymous'
    });
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 500 ? 'error' :
            res.statusCode >= 400 ? 'warn' :
                'info';
        log[logLevel]('Request completed', {
            requestId,
            method: req.method,
            url: req.url,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            durationCategory: getDurationCategory(duration),
            contentLength: res.get('content-length') || 0,
            userId: req.user?.id || 'anonymous',
            userRole: req.user?.role || 'none'
        });
        if (duration > 2000) {
            log.warn('Slow request detected', {
                requestId,
                method: req.method,
                url: req.url,
                duration,
                statusCode: res.statusCode
            });
        }
    });
    res.on('close', () => {
        if (!res.finished) {
            const duration = Date.now() - start;
            log.warn('Request connection closed before response finished', {
                requestId,
                method: req.method,
                url: req.url,
                duration,
                userId: req.user?.id || 'anonymous'
            });
        }
    });
    next();
};
exports.requestLogging = requestLogging;
function getDurationCategory(duration) {
    if (duration < 100)
        return 'fast';
    if (duration < 500)
        return 'normal';
    if (duration < 1000)
        return 'slow';
    if (duration < 2000)
        return 'very-slow';
    return 'critical';
}
const errorLogging = (err, req, res, next) => {
    const log = req.logger || (0, logger_1.createRequestLogger)(req, 'error');
    log.error('Request error occurred', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        error: err.message,
        stack: err.stack,
        userId: req.user?.id || 'anonymous',
        statusCode: err.statusCode || 500
    });
    next(err);
};
exports.errorLogging = errorLogging;
//# sourceMappingURL=requestLogger.js.map