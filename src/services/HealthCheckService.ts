/**
 * Health Check Service
 * Comprehensive health checks for all system components
 */

import prisma from '../utils/prisma';
import { getCacheService } from './RedisCacheService';
import { getVirusScanService } from './VirusScanService';
import { SecretManager } from './SecretManager';

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

export class HealthCheckService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Perform comprehensive health check
   */
  public async checkHealth(): Promise<HealthStatus> {
    const services: ServiceHealth[] = [];

    // Check all services in parallel
    const [
      databaseHealth,
      redisHealth,
      virusScanHealth,
      secretsHealth,
      fileSystemHealth,
    ] = await Promise.all([
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

    // Calculate summary
    const summary = {
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
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

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      await prisma.$queryRaw`SELECT 1`;

      return {
        name: 'database',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        message: 'Database connection is healthy',
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Database connection failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check Redis cache health
   */
  private async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const cacheService = getCacheService();
      const isHealthy = await cacheService.healthCheck();
      const cacheMode = cacheService.getCacheMode();
      const isUsingMemory = cacheService.isUsingMemoryCache();

      if (isHealthy) {
        const stats = await cacheService.getStatistics();

        // Determine status based on mode
        let status: 'healthy' | 'degraded' = 'healthy';
        let message = 'Redis cache is healthy';

        if (cacheMode.mode === 'memory') {
          status = 'degraded';
          message = 'Using in-memory cache (Redis unavailable)';
        } else if (isUsingMemory) {
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
      } else {
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
    } catch (error) {
      return {
        name: 'redis',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: 'Redis cache check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check virus scan health
   */
  private async checkVirusScan(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const virusScanService = getVirusScanService();
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
      } else {
        // Determine status based on fallback behavior
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
    } catch (error) {
      return {
        name: 'virusScan',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        message: 'Virus scan check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check secrets management health
   */
  private async checkSecrets(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const secretManager = SecretManager.getInstance();
      const isHealthy = await secretManager.healthCheck();

      if (isHealthy) {
        return {
          name: 'secrets',
          status: 'healthy',
          responseTime: Date.now() - startTime,
          message: 'Secrets management is healthy',
        };
      } else {
        return {
          name: 'secrets',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          message: 'Secrets management is not healthy',
        };
      }
    } catch (error) {
      return {
        name: 'secrets',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Secrets check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check file system health
   */
  private async checkFileSystem(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const fs = require('fs');
      const os = require('os');

      const tmpDir = os.tmpdir();
      const testFile = `${tmpDir}/.health_check_${Date.now()}`;

      // Try to write a test file
      fs.writeFileSync(testFile, 'health check');
      fs.unlinkSync(testFile);

      return {
        name: 'fileSystem',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        message: 'File system is accessible',
      };
    } catch (error) {
      return {
        name: 'fileSystem',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'File system is not accessible',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check if system is ready to accept requests
   */
  public async checkReadiness(): Promise<boolean> {
    const health = await this.checkHealth();
    // System is ready if database is healthy
    const databaseHealth = health.services.find(s => s.name === 'database');
    return databaseHealth?.status === 'healthy';
  }

  /**
   * Check if system is alive
   */
  public checkLiveness(): boolean {
    // Simple check - process is running
    return true;
  }
}

// Singleton instance
let healthCheckServiceInstance: HealthCheckService | null = null;

/**
 * Get singleton health check service instance
 */
export const getHealthCheckService = (): HealthCheckService => {
  if (!healthCheckServiceInstance) {
    healthCheckServiceInstance = new HealthCheckService();
  }
  return healthCheckServiceInstance;
};

export default HealthCheckService;
