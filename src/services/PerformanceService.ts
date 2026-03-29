import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import * as os from 'os';
import { promises as fs } from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { BaseService } from './BaseService';
import { env } from '../config/env';
import { createLogger } from '../utils/logger';
// S4-4: Import circuit breaker registry and metrics service for dashboard
import { CircuitBreakerRegistry } from '../utils/circuitBreaker';
import { MetricsService } from './MetricsService';
import { cache } from '../utils/cache';
import { ActiveSessionTracker } from './ActiveSessionTracker';

const logger = createLogger('PerformanceService');

interface PerformanceLogData {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userId?: string | null;
  eventId?: string | null;
  // tenantId removed - column doesn't exist in performance_logs table
}

interface PerformanceStatsQuery {
  timeRange?: '1h' | '24h' | '7d' | '30d';
  endpoint?: string;
  method?: string;
}

interface PerformanceLogsQuery {
  page?: number;
  limit?: number;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  minResponseTime?: number;
  maxResponseTime?: number;
  startDate?: string;
  endDate?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    memory: boolean;
    disk: boolean;
    uptime: boolean;
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percent: string;
  };
}

@injectable()
export class PerformanceService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(MetricsService) private metricsService: MetricsService,
    @inject(ActiveSessionTracker) private activeSessionTracker: ActiveSessionTracker
  ) {
    super();
  }

  private async getUserActivityMetrics(tenantId?: string) {
    const liveSnapshot = await this.activeSessionTracker.getPresenceSnapshot(tenantId);
    const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentUsersWhere: Prisma.UserWhereInput = {
      isActive: true,
      lastLoginAt: {
        gte: recentThreshold,
      },
      ...(tenantId ? { tenantId } : {}),
    };

    const [recentUsers24h, recentUsers24hByRoleGroups] = await Promise.all([
      this.prisma.user.count({
        where: recentUsersWhere,
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: recentUsersWhere,
        _count: true,
      }),
    ]);

    const recentUsers24hByRole = recentUsers24hByRoleGroups
      .map((group) => ({ role: group.role, count: group._count }))
      .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role));

    return {
      scope: tenantId ? 'tenant' : 'global',
      tenantId: tenantId || null,
      liveUsers: liveSnapshot.liveUsers,
      liveUsersByRole: liveSnapshot.liveUsersByRole,
      liveWindowMinutes: this.activeSessionTracker.getLiveWindowMinutes(),
      recentUsers24h,
      recentUsers24hByRole,
      recentWindowHours: 24,
      recentWindowField: 'lastLoginAt',
    };
  }

  private getTenantLabel(tenantId?: string): string | undefined {
    const normalized = tenantId?.trim();
    return normalized ? normalized : undefined;
  }

  private metricValueNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private findMetricFamily(metrics: Array<{ name?: string }>, name: string) {
    return metrics.find((metric) => metric.name === name) as
      | {
          name?: string;
          values?: Array<{
            metricName?: string;
            labels?: Record<string, string>;
            value?: unknown;
          }>;
        }
      | undefined;
  }

  private matchesTenant(labels: Record<string, string> | undefined, tenantLabel?: string): boolean {
    if (!tenantLabel) {
      return true;
    }

    return labels?.['tenant_id'] === tenantLabel;
  }

  private getScopedRequestMetrics(
    metrics: Array<{ name?: string; values?: Array<{ metricName?: string; labels?: Record<string, string>; value?: unknown }> }>,
    tenantId?: string
  ) {
    const tenantLabel = this.getTenantLabel(tenantId);
    const requestTotalMetric = this.findMetricFamily(metrics, 'http_requests_total');
    const requestDurationMetric = this.findMetricFamily(metrics, 'http_request_duration_seconds');
    const requestErrorMetric = this.findMetricFamily(metrics, 'http_request_errors_total');

    const totalRequests = (requestTotalMetric?.values || [])
      .filter((entry) => this.matchesTenant(entry.labels, tenantLabel))
      .reduce((sum, entry) => sum + this.metricValueNumber(entry.value), 0);

    const totalDurationSeconds = (requestDurationMetric?.values || [])
      .filter(
        (entry) =>
          entry.metricName === 'http_request_duration_seconds_sum' &&
          this.matchesTenant(entry.labels, tenantLabel)
      )
      .reduce((sum, entry) => sum + this.metricValueNumber(entry.value), 0);

    const totalDurationCount = (requestDurationMetric?.values || [])
      .filter(
        (entry) =>
          entry.metricName === 'http_request_duration_seconds_count' &&
          this.matchesTenant(entry.labels, tenantLabel)
      )
      .reduce((sum, entry) => sum + this.metricValueNumber(entry.value), 0);

    const errorRequests = (requestErrorMetric?.values || [])
      .filter((entry) => this.matchesTenant(entry.labels, tenantLabel))
      .reduce((sum, entry) => sum + this.metricValueNumber(entry.value), 0);

    const routes = new Map<string, { totalDuration: number; totalCount: number }>();
    for (const entry of requestDurationMetric?.values || []) {
      if (!this.matchesTenant(entry.labels, tenantLabel)) {
        continue;
      }

      const route = entry.labels?.['route'];
      if (!route) {
        continue;
      }

      const current = routes.get(route) || { totalDuration: 0, totalCount: 0 };
      if (entry.metricName === 'http_request_duration_seconds_sum') {
        current.totalDuration += this.metricValueNumber(entry.value);
      } else if (entry.metricName === 'http_request_duration_seconds_count') {
        current.totalCount += this.metricValueNumber(entry.value);
      }
      routes.set(route, current);
    }

    const slowEndpoints = Array.from(routes.entries())
      .filter(([, aggregate]) => aggregate.totalCount > 0)
      .map(([endpoint, aggregate]) => ({
        endpoint,
        _avg: {
          responseTime: (aggregate.totalDuration / aggregate.totalCount) * 1000,
        },
        _count: {
          id: aggregate.totalCount,
        },
      }))
      .sort((left, right) => right._avg.responseTime - left._avg.responseTime)
      .slice(0, 5);

    return {
      scope: tenantLabel ? 'tenant' : 'global',
      totalRequests,
      averageResponseTime: totalDurationCount > 0 ? (totalDurationSeconds / totalDurationCount) * 1000 : 0,
      errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
      slowEndpoints,
    };
  }

  private getScopedDatabaseMetrics(
    metrics: Array<{ name?: string; values?: Array<{ metricName?: string; labels?: Record<string, string>; value?: unknown }> }>,
    tenantId?: string
  ) {
    const tenantLabel = this.getTenantLabel(tenantId);
    const dbMetric = this.findMetricFamily(metrics, 'database_query_duration_seconds');

    const totalDurationSeconds = (dbMetric?.values || [])
      .filter(
        (entry) =>
          entry.metricName === 'database_query_duration_seconds_sum' &&
          this.matchesTenant(entry.labels, tenantLabel)
      )
      .reduce((sum, entry) => sum + this.metricValueNumber(entry.value), 0);

    const totalCount = (dbMetric?.values || [])
      .filter(
        (entry) =>
          entry.metricName === 'database_query_duration_seconds_count' &&
          this.matchesTenant(entry.labels, tenantLabel)
      )
      .reduce((sum, entry) => sum + this.metricValueNumber(entry.value), 0);

    const underOrEqualOneSecond = (dbMetric?.values || [])
      .filter(
        (entry) =>
          entry.metricName === 'database_query_duration_seconds_bucket' &&
          entry.labels?.['le'] === '1' &&
          this.matchesTenant(entry.labels, tenantLabel)
      )
      .reduce((sum, entry) => sum + this.metricValueNumber(entry.value), 0);

    return {
      scope: tenantLabel ? 'tenant' : 'global',
      averageQueryTime: totalCount > 0 ? (totalDurationSeconds / totalCount) * 1000 : 0,
      slowQueries: Math.max(0, totalCount - underOrEqualOneSecond),
    };
  }

  /**
   * Log performance metrics with sampling
   */
  async logPerformance(data: PerformanceLogData): Promise<void> {
    try {
      // Sample rate: only log a percentage of requests (default 20%)
      const sampleRate = env.get('PERF_SAMPLE_RATE') ?? 0.2;
      if (Math.random() > sampleRate) {
        return; // Skip logging this request
      }

      await this.prisma.performanceLog.create({
        data: {
          endpoint: data.endpoint,
          method: data.method,
          responseTime: data.responseTime,
          statusCode: data.statusCode,
          userId: data.userId || null,
          ipAddress: null, // PII removed
          userAgent: null, // PII removed
          eventId: data.eventId || null,
          // tenantId removed - column doesn't exist in performance_logs table
        },
      });
    } catch (error) {
      // Silently fail performance logging to avoid impacting request handling
      if (env.isDevelopment()) {
        logger.error('Performance logging error', { error });
      }
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(query: PerformanceStatsQuery) {
    const { timeRange = '24h', endpoint, method } = query;

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const whereClause: Prisma.PerformanceLogWhereInput = {
      createdAt: {
        gte: startTime,
      },
      ...(endpoint && { endpoint }),
      ...(method && { method }),
    };

    // Get performance statistics
    const stats = await this.prisma.performanceLog.aggregate({
      where: whereClause,
      _avg: {
        responseTime: true,
      },
      _min: {
        responseTime: true,
      },
      _max: {
        responseTime: true,
      },
      _count: {
        id: true,
      },
    });

    // Get response time distribution
    const responseTimeDistribution = await this.prisma.performanceLog.groupBy({
      by: ['statusCode'],
      where: whereClause,
      _count: {
        id: true,
      },
      _avg: {
        responseTime: true,
      },
    });

    // Get top slow endpoints
    const slowEndpoints = await this.prisma.performanceLog.groupBy({
      by: ['endpoint'],
      where: whereClause,
      _avg: {
        responseTime: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _avg: {
          responseTime: 'desc',
        },
      },
      take: 10,
    });

    // Get error rates
    const errorStats = await this.prisma.performanceLog.groupBy({
      by: ['statusCode'],
      where: {
        ...whereClause,
        statusCode: {
          gte: 400,
        },
      },
      _count: {
        id: true,
      },
    });

    const totalRequests = stats._count.id;
    const errorCount = errorStats.reduce((sum, stat) => sum + stat._count.id, 0);

    return {
      timeRange,
      totalRequests,
      averageResponseTime: Math.round(stats._avg.responseTime || 0),
      minResponseTime: stats._min.responseTime || 0,
      maxResponseTime: stats._max.responseTime || 0,
      responseTimeDistribution,
      slowEndpoints,
      errorStats,
      errorRate: totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(2) : '0',
    };
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    // CPU and Memory usage
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();

    // System information
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const loadAverage = os.loadavg();
    const cpuCount = os.cpus().length || 1;
    const cpuPercent = Math.max(0, Math.min(100, (((loadAverage[0] ?? 0) / cpuCount) * 100)));

    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadAverage,
      totalMemory,
      freeMemory,
      usedMemory,
      memoryPercent: totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0,
      cpuCount,
      cpuPercent,
    };

    // Database connection status
    const dbStatus = await this.prisma.$queryRaw`SELECT 1 as status`;

    // Database connection count
    const connectionCount = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
    `;

    // Disk usage
    let diskUsage: {
      available: boolean;
      path?: string;
      total?: number;
      free?: number;
      used?: number;
      percentage?: number;
      error?: string;
    } = {
      available: false,
    };
    try {
      const projectRoot = path.join(__dirname, '../../');
      await fs.stat(projectRoot);
      const statfs = await fs.statfs(projectRoot);
      const total = Number(statfs.bsize) * Number(statfs.blocks);
      const free = Number(statfs.bsize) * Number(statfs.bavail);
      const used = Math.max(total - free, 0);
      diskUsage = {
        available: true,
        path: projectRoot,
        total,
        free,
        used,
        percentage: total > 0 ? (used / total) * 100 : 0,
      };
    } catch (primaryError) {
      try {
        // Fallback for environments without fs.statfs support
        const projectRoot = path.join(__dirname, '../../');
        const output = execFileSync('df', ['-kP', projectRoot], { encoding: 'utf8' });
        const lines = output.trim().split('\n');
        const row = lines[1]?.trim().split(/\s+/);
        const total = Number(row?.[1] || 0) * 1024;
        const used = Number(row?.[2] || 0) * 1024;
        const free = Number(row?.[3] || 0) * 1024;
        diskUsage = {
          available: true,
          path: projectRoot,
          total,
          free,
          used,
          percentage: total > 0 ? (used / total) * 100 : 0,
        };
      } catch (fallbackError) {
        const primaryMessage = primaryError instanceof Error ? primaryError.message : 'Unknown error';
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
        diskUsage = {
          available: false,
          error: `statfs failed: ${primaryMessage}; df fallback failed: ${fallbackMessage}`,
        };
      }
    }

    return {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        cpuUsage: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        memoryUsage: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
        },
      },
      system: systemInfo,
      database: {
        status: dbStatus ? 'connected' : 'disconnected',
        connectionCount: Number(connectionCount[0]?.count || 0),
      },
      disk: diskUsage,
    };
  }

  /**
   * Get performance logs with filtering and pagination
   */
  async getPerformanceLogs(query: PerformanceLogsQuery) {
    const {
      page = 1,
      limit = 50,
      endpoint,
      method,
      statusCode,
      userId,
      minResponseTime,
      maxResponseTime,
      startDate,
      endDate,
    } = query;

    const whereClause: Prisma.PerformanceLogWhereInput = {
      ...(endpoint && { endpoint: { contains: endpoint } }),
      ...(method && { method }),
      ...(statusCode && { statusCode: Number(statusCode) }),
      ...(userId && { userId }),
      ...(minResponseTime && { responseTime: { gte: Number(minResponseTime) } }),
      ...(maxResponseTime && { responseTime: { lte: Number(maxResponseTime) } }),
      ...(startDate &&
        endDate && {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const logs = await this.prisma.performanceLog.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await this.prisma.performanceLog.count({
      where: whereClause,
    });

    return {
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Clear performance logs
   */
  async clearPerformanceLogs(olderThan?: string) {
    const whereClause: Prisma.PerformanceLogWhereInput = olderThan
      ? {
          createdAt: {
            lt: new Date(olderThan),
          },
        }
      : {};

    const result = await this.prisma.performanceLog.deleteMany({
      where: whereClause,
    });

    return {
      message: `Cleared ${result.count} performance log entries`,
      count: result.count,
    };
  }

  /**
   * Perform health check
   */
  async getHealthCheck(): Promise<HealthCheckResult> {
    const checks = {
      database: false,
      memory: false,
      disk: false,
      uptime: false,
    };

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      logger.error('Database health check failed', { error });
    }

    // Memory check
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    checks.memory = memoryUsagePercent < 90; // Less than 90% memory usage

    // Disk check (basic)
    try {
      await fs.access(path.join(__dirname, '../../'));
      checks.disk = true;
    } catch (error) {
      logger.error('Disk health check failed', { error });
    }

    // Uptime check
    checks.uptime = process.uptime() > 0;

    const allHealthy = Object.values(checks).every((check) => check === true);

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percent: memoryUsagePercent.toFixed(2),
      },
    };
  }

  /**
   * S4-4: Get comprehensive monitoring dashboard
   * Aggregates circuit breaker stats, metrics, health, and performance data
   */
  async getMonitoringDashboard(tenantId?: string) {
    try {
      // 1. Get circuit breaker statistics
      const circuitBreakerStats = CircuitBreakerRegistry.getAllStats();

      // 2. Get Prometheus metrics as JSON
      const prometheusMetrics = await this.metricsService.getMetricsAsJson();

      // 3. Get health check data
      const healthCheck = await this.getHealthCheck();

      // 4. Get system metrics
      const systemMetrics = await this.getSystemMetrics();

      // 5. Get cache statistics
      const cacheStats = cache.getStats();

      // 7. Get database connection info
      const dbConnectionCount = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
      `;

      const dbIdleConnectionCount = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count FROM pg_stat_activity WHERE state = 'idle'
      `;

      const userActivity = await this.getUserActivityMetrics(tenantId);
      const scopedRequestMetrics = this.getScopedRequestMetrics(prometheusMetrics, tenantId);
      const scopedDatabaseMetrics = this.getScopedDatabaseMetrics(prometheusMetrics, tenantId);

      // Aggregate everything into a comprehensive dashboard
      return {
        timestamp: new Date().toISOString(),
        status: healthCheck.status,
        uptime: process.uptime(),

        // Circuit breakers
        circuitBreakers: {
          count: Object.keys(circuitBreakerStats).length,
          breakers: circuitBreakerStats,
        },

        // Health checks
        health: healthCheck,

        // System metrics
        system: {
          cpu: {
            percent: systemMetrics.system.cpuPercent,
            loadAverage: systemMetrics.system.loadAverage,
            cpuCount: systemMetrics.system.cpuCount,
          },
          memory: {
            used: systemMetrics.system.usedMemory,
            free: systemMetrics.system.freeMemory,
            total: systemMetrics.system.totalMemory,
            percentage: systemMetrics.system.memoryPercent,
          },
          disk: {
            available: systemMetrics.disk.available,
            path: systemMetrics.disk.path,
            used: systemMetrics.disk.used ?? 0,
            free: systemMetrics.disk.free ?? 0,
            total: systemMetrics.disk.total ?? 0,
            percentage: systemMetrics.disk.percentage ?? 0,
          },
          processMemory: systemMetrics.process.memoryUsage,
          loadAverage: systemMetrics.system.loadAverage,
          platform: systemMetrics.system.platform,
          cpuCount: systemMetrics.system.cpuCount,
        },

        // Database metrics
        database: {
          status: systemMetrics.database.status,
          activeConnections: Number(dbConnectionCount[0]?.count || 0),
          idleConnections: Number(dbIdleConnectionCount[0]?.count || 0),
          totalConnections: Number(dbConnectionCount[0]?.count || 0) + Number(dbIdleConnectionCount[0]?.count || 0),
          scope: scopedDatabaseMetrics.scope,
          averageQueryTime: scopedDatabaseMetrics.averageQueryTime,
          slowQueries: scopedDatabaseMetrics.slowQueries,
          activeConnectionsScope: 'global',
        },

        // Cache metrics
        cache: {
          size: cacheStats.size,
          keysCount: cacheStats.keys.length,
          sampleKeys: cacheStats.keys.slice(0, 10), // First 10 keys as sample
        },

        // Performance metrics (recent 1 hour)
        performance: {
          scope: scopedRequestMetrics.scope,
          totalRequests: scopedRequestMetrics.totalRequests,
          averageResponseTime: scopedRequestMetrics.averageResponseTime,
          errorRate: scopedRequestMetrics.errorRate,
          slowEndpoints: scopedRequestMetrics.slowEndpoints,
        },

        activity: userActivity,

        // Prometheus metrics (as JSON)
        metrics: prometheusMetrics,
      };
    } catch (error) {
      logger.error('Failed to generate monitoring dashboard', { error });
      return this.handleError(error, { operation: 'getMonitoringDashboard' });
    }
  }
}
