"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceThresholds = exports.MetricType = exports.getMonitoringConfig = void 0;
const getMonitoringConfig = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';
    return {
        sentry: {
            enabled: process.env.SENTRY_ENABLED === 'true' || (isProduction && !!process.env.SENTRY_DSN),
            dsn: process.env.SENTRY_DSN,
            environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
            tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
            profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
            debug: process.env.SENTRY_DEBUG === 'true' || isDevelopment,
        },
        metrics: {
            enabled: process.env.ENABLE_METRICS !== 'false',
            prefix: process.env.METRICS_PREFIX || 'event_manager_',
            collectInterval: parseInt(process.env.METRICS_COLLECT_INTERVAL || '60000', 10),
        },
        logging: {
            level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
            enableFileLogging: process.env.DISABLE_FILE_LOGGING !== 'true',
            logDirectory: process.env.LOG_DIRECTORY || './logs',
            maxFiles: parseInt(process.env.LOG_MAX_FILES || '14', 10),
            maxSize: process.env.LOG_MAX_SIZE || '20m',
        },
        healthCheck: {
            enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
            path: process.env.HEALTH_CHECK_PATH || '/health',
            services: (process.env.HEALTH_CHECK_SERVICES || 'database,redis,cache,virusScan').split(','),
        },
    };
};
exports.getMonitoringConfig = getMonitoringConfig;
var MetricType;
(function (MetricType) {
    MetricType["COUNTER"] = "counter";
    MetricType["GAUGE"] = "gauge";
    MetricType["HISTOGRAM"] = "histogram";
    MetricType["SUMMARY"] = "summary";
})(MetricType || (exports.MetricType = MetricType = {}));
exports.PerformanceThresholds = {
    API_RESPONSE_TIME_SLOW: 1000,
    API_RESPONSE_TIME_VERY_SLOW: 3000,
    DATABASE_QUERY_SLOW: 500,
    DATABASE_QUERY_VERY_SLOW: 2000,
    CACHE_OPERATION_SLOW: 100,
    FILE_SCAN_SLOW: 5000,
};
exports.default = {
    getMonitoringConfig: exports.getMonitoringConfig,
    MetricType,
    PerformanceThresholds: exports.PerformanceThresholds,
};
//# sourceMappingURL=monitoring.config.js.map