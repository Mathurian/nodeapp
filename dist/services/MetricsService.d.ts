export declare class MetricsService {
    private register;
    private httpRequestDuration;
    private httpRequestTotal;
    private httpRequestErrors;
    private activeConnections;
    private databaseQueryDuration;
    private cacheHitRate;
    private cacheMissRate;
    private log;
    constructor();
    recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void;
    recordHttpError(method: string, route: string, errorType: string): void;
    recordDatabaseQuery(operation: string, table: string, duration: number): void;
    recordCacheHit(cacheKey: string): void;
    recordCacheMiss(cacheKey: string): void;
    setActiveConnections(count: number): void;
    incrementActiveConnections(): void;
    decrementActiveConnections(): void;
    getMetrics(): Promise<string>;
    getMetricsAsJson(): Promise<any>;
    resetMetrics(): void;
    private normalizeRoute;
}
export default MetricsService;
//# sourceMappingURL=MetricsService.d.ts.map