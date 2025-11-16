"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthCheckService = exports.HealthCheckService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const RedisCacheService_1 = require("./RedisCacheService");
const VirusScanService_1 = require("./VirusScanService");
const SecretManager_1 = require("./SecretManager");
class HealthCheckService {
    startTime;
    constructor() {
        this.startTime = Date.now();
    }
    async checkHealth() {
        const services = [];
        const [databaseHealth, redisHealth, virusScanHealth, secretsHealth, fileSystemHealth,] = await Promise.all([
            this.checkDatabase(),
            this.checkRedis(),
            this.checkVirusScan(),
            this.checkSecrets(),
            this.checkFileSystem(),
        ]);
        services.push(databaseHealth);
        services.push(redisHealth);
        services.push(virusScanHealth);
        services.push(secretsHealth);
        services.push(fileSystemHealth);
        const summary = {
            healthy: services.filter(s => s.status === 'healthy').length,
            degraded: services.filter(s => s.status === 'degraded').length,
            unhealthy: services.filter(s => s.status === 'unhealthy').length,
        };
        let overallStatus = 'healthy';
        if (summary.unhealthy > 0) {
            overallStatus = 'unhealthy';
        }
        else if (summary.degraded > 0) {
            overallStatus = 'degraded';
        }
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            services,
            summary,
        };
    }
    async checkDatabase() {
        const startTime = Date.now();
        try {
            await prisma_1.default.$queryRaw `SELECT 1`;
            return {
                name: 'database',
                status: 'healthy',
                responseTime: Date.now() - startTime,
                message: 'Database connection is healthy',
            };
        }
        catch (error) {
            return {
                name: 'database',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                message: 'Database connection failed',
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
            };
        }
    }
    async checkRedis() {
        const startTime = Date.now();
        try {
            const cacheService = (0, RedisCacheService_1.getCacheService)();
            const isHealthy = await cacheService.healthCheck();
            const cacheMode = cacheService.getCacheMode();
            const isUsingMemory = cacheService.isUsingMemoryCache();
            if (isHealthy) {
                const stats = await cacheService.getStatistics();
                let status = 'healthy';
                let message = 'Redis cache is healthy';
                if (cacheMode.mode === 'memory') {
                    status = 'degraded';
                    message = 'Using in-memory cache (Redis unavailable)';
                }
                else if (isUsingMemory) {
                    status = 'degraded';
                    message = 'Redis connection failed, using in-memory fallback';
                }
                return {
                    name: 'redis',
                    status,
                    responseTime: Date.now() - startTime,
                    message,
                    details: {
                        mode: cacheMode.mode,
                        redisMode: cacheMode.redisMode,
                        usingMemoryFallback: isUsingMemory,
                        hitRate: stats.hitRate,
                        keyCount: stats.keyCount,
                        memoryUsage: stats.memoryUsage,
                    },
                };
            }
            else {
                return {
                    name: 'redis',
                    status: 'degraded',
                    responseTime: Date.now() - startTime,
                    message: 'Redis cache is not responding',
                    details: {
                        mode: cacheMode.mode,
                        redisMode: cacheMode.redisMode,
                    },
                };
            }
        }
        catch (error) {
            return {
                name: 'redis',
                status: 'degraded',
                responseTime: Date.now() - startTime,
                message: 'Redis cache check failed',
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
            };
        }
    }
    async checkVirusScan() {
        const startTime = Date.now();
        try {
            const virusScanService = (0, VirusScanService_1.getVirusScanService)();
            const serviceInfo = virusScanService.getServiceInfo();
            const isAvailable = await virusScanService.isAvailable();
            if (!serviceInfo.enabled) {
                return {
                    name: 'virusScan',
                    status: 'degraded',
                    responseTime: Date.now() - startTime,
                    message: 'ClamAV virus scanning is disabled',
                    details: {
                        enabled: false,
                        mode: serviceInfo.mode,
                        fallbackBehavior: serviceInfo.config.fallbackBehavior,
                    },
                };
            }
            if (isAvailable) {
                return {
                    name: 'virusScan',
                    status: 'healthy',
                    responseTime: Date.now() - startTime,
                    message: `ClamAV is available (${serviceInfo.mode})`,
                    details: {
                        enabled: true,
                        mode: serviceInfo.mode,
                        connection: serviceInfo.connection,
                        cacheSize: serviceInfo.cacheSize,
                        config: serviceInfo.config,
                    },
                };
            }
            else {
                const status = serviceInfo.config.fallbackBehavior === 'allow' ? 'degraded' : 'unhealthy';
                const message = serviceInfo.config.fallbackBehavior === 'allow'
                    ? 'ClamAV unavailable, allowing uploads without scanning'
                    : 'ClamAV unavailable, file uploads disabled';
                return {
                    name: 'virusScan',
                    status,
                    responseTime: Date.now() - startTime,
                    message,
                    details: {
                        enabled: true,
                        mode: serviceInfo.mode,
                        connection: serviceInfo.connection,
                        fallbackBehavior: serviceInfo.config.fallbackBehavior,
                    },
                };
            }
        }
        catch (error) {
            return {
                name: 'virusScan',
                status: 'degraded',
                responseTime: Date.now() - startTime,
                message: 'Virus scan check failed',
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
            };
        }
    }
    async checkSecrets() {
        const startTime = Date.now();
        try {
            const secretManager = SecretManager_1.SecretManager.getInstance();
            const isHealthy = await secretManager.healthCheck();
            if (isHealthy) {
                return {
                    name: 'secrets',
                    status: 'healthy',
                    responseTime: Date.now() - startTime,
                    message: 'Secrets management is healthy',
                };
            }
            else {
                return {
                    name: 'secrets',
                    status: 'unhealthy',
                    responseTime: Date.now() - startTime,
                    message: 'Secrets management is not healthy',
                };
            }
        }
        catch (error) {
            return {
                name: 'secrets',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                message: 'Secrets check failed',
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
            };
        }
    }
    async checkFileSystem() {
        const startTime = Date.now();
        try {
            const fs = require('fs');
            const os = require('os');
            const tmpDir = os.tmpdir();
            const testFile = `${tmpDir}/.health_check_${Date.now()}`;
            fs.writeFileSync(testFile, 'health check');
            fs.unlinkSync(testFile);
            return {
                name: 'fileSystem',
                status: 'healthy',
                responseTime: Date.now() - startTime,
                message: 'File system is accessible',
            };
        }
        catch (error) {
            return {
                name: 'fileSystem',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                message: 'File system is not accessible',
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
            };
        }
    }
    async checkReadiness() {
        const health = await this.checkHealth();
        const databaseHealth = health.services.find(s => s.name === 'database');
        return databaseHealth?.status === 'healthy';
    }
    checkLiveness() {
        return true;
    }
}
exports.HealthCheckService = HealthCheckService;
let healthCheckServiceInstance = null;
const getHealthCheckService = () => {
    if (!healthCheckServiceInstance) {
        healthCheckServiceInstance = new HealthCheckService();
    }
    return healthCheckServiceInstance;
};
exports.getHealthCheckService = getHealthCheckService;
exports.default = HealthCheckService;
//# sourceMappingURL=HealthCheckService.js.map