export interface MonitoringConfig {
    sentry: {
        enabled: boolean;
        dsn?: string;
        environment: string;
        tracesSampleRate: number;
        profilesSampleRate: number;
        debug: boolean;
        integrations?: string[];
    };
    metrics: {
        enabled: boolean;
        prefix: string;
        collectInterval: number;
    };
    logging: {
        level: string;
        enableFileLogging: boolean;
        logDirectory: string;
        maxFiles: number;
        maxSize: string;
    };
    healthCheck: {
        enabled: boolean;
        path: string;
        services: string[];
    };
}
export declare const getMonitoringConfig: () => MonitoringConfig;
export declare enum MetricType {
    COUNTER = "counter",
    GAUGE = "gauge",
    HISTOGRAM = "histogram",
    SUMMARY = "summary"
}
export declare const PerformanceThresholds: {
    readonly API_RESPONSE_TIME_SLOW: 1000;
    readonly API_RESPONSE_TIME_VERY_SLOW: 3000;
    readonly DATABASE_QUERY_SLOW: 500;
    readonly DATABASE_QUERY_VERY_SLOW: 2000;
    readonly CACHE_OPERATION_SLOW: 100;
    readonly FILE_SCAN_SLOW: 5000;
};
declare const _default: {
    getMonitoringConfig: () => MonitoringConfig;
    MetricType: typeof MetricType;
    PerformanceThresholds: {
        readonly API_RESPONSE_TIME_SLOW: 1000;
        readonly API_RESPONSE_TIME_VERY_SLOW: 3000;
        readonly DATABASE_QUERY_SLOW: 500;
        readonly DATABASE_QUERY_VERY_SLOW: 2000;
        readonly CACHE_OPERATION_SLOW: 100;
        readonly FILE_SCAN_SLOW: 5000;
    };
};
export default _default;
//# sourceMappingURL=monitoring.config.d.ts.map