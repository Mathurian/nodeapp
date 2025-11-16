"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsEndpoint = exports.metricsMiddleware = exports.initMetrics = void 0;
const tsyringe_1 = require("tsyringe");
const MetricsService_1 = require("../services/MetricsService");
let metricsService = null;
const initMetrics = () => {
    try {
        metricsService = tsyringe_1.container.resolve(MetricsService_1.MetricsService);
    }
    catch (error) {
        console.warn('Metrics service not available:', error);
    }
};
exports.initMetrics = initMetrics;
const metricsMiddleware = (req, res, next) => {
    if (!metricsService) {
        return next();
    }
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        metricsService.recordHttpRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
        if (res.statusCode >= 400) {
            const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
            metricsService.recordHttpError(req.method, req.route?.path || req.path, errorType);
        }
    });
    next();
};
exports.metricsMiddleware = metricsMiddleware;
const metricsEndpoint = async (req, res) => {
    if (!metricsService) {
        res.status(503).json({ error: 'Metrics service not available' });
        return;
    }
    try {
        const metrics = await metricsService.getMetrics();
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(metrics);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.metricsEndpoint = metricsEndpoint;
exports.default = { initMetrics: exports.initMetrics, metricsMiddleware: exports.metricsMiddleware, metricsEndpoint: exports.metricsEndpoint };
//# sourceMappingURL=metrics.js.map