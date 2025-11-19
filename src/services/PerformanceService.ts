import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import * as os from 'os';
import { promises as fs } from 'fs';
import * as path from 'path';
import { BaseService } from './BaseService';
import { env } from '../config/env';

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

interface HealthCheckResult {
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
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    super();
  }

  /**
   * Log performance metrics with sampling
   */
  async logPerformance(data: PerformanceLogData): Promise<void> {
    try {
      // Sample rate: only log a percentage of requests (default 20%)
      const sampleRate = parseFloat(env.get('PERF_SAMPLE_RATE') || '0.2');
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
        console.error('Performance logging error:', error);
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
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
    };

    // Database connection status
    const dbStatus = await this.prisma.$queryRaw`SELECT 1 as status`;

    // Database connection count
    const connectionCount = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
    `;

    // Disk usage (if possible)
    let diskUsage: { available: boolean; path?: string; error?: string } = {
      available: false,
    };
    try {
      const projectRoot = path.join(__dirname, '../../');
      await fs.stat(projectRoot);
      diskUsage = {
        available: true,
        path: projectRoot,
      };
    } catch (error) {
      diskUsage = {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
        connectionCount: connectionCount[0]?.count || 0,
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
      console.error('Database health check failed:', error);
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
      console.error('Disk health check failed:', error);
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
}
