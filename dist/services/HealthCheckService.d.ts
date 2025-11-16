export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    services: ServiceHealth[];
    summary: {
        healthy: number;
        degraded: number;
        unhealthy: number;
    };
}
export interface ServiceHealth {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    message?: string;
    details?: any;
}
export declare class HealthCheckService {
    private startTime;
    constructor();
    checkHealth(): Promise<HealthStatus>;
    private checkDatabase;
    private checkRedis;
    private checkVirusScan;
    private checkSecrets;
    private checkFileSystem;
    checkReadiness(): Promise<boolean>;
    checkLiveness(): boolean;
}
export declare const getHealthCheckService: () => HealthCheckService;
export default HealthCheckService;
//# sourceMappingURL=HealthCheckService.d.ts.map