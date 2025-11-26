/**
 * Database Health Monitoring Service
 * P2-4: Monitors database health, connection pool, and query performance
 */

import { injectable } from 'tsyringe';
import { BaseService } from './BaseService';
import prisma from '../utils/prisma';
import { getQueryMetrics } from '../config/queryMonitoring';

export interface DatabaseHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    connection: HealthCheck;
    queryPerformance: HealthCheck;
    poolUtilization: HealthCheck;
    slowQueries: HealthCheck;
  };
  metrics: {
    totalQueries: number;
    slowQueries: number;
    errors: number;
    averageDuration: number;
  };
}

export interface HealthCheck {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  value?: number | string;
  threshold?: number | string;
}

@injectable()
export class DatabaseHealthService extends BaseService {
  /**
   * Get comprehensive database health status
   */
  async getHealthStatus(): Promise<DatabaseHealthStatus> {
    const checks = await Promise.all([
      this.checkConnection(),
      this.checkQueryPerformance(),
      this.checkPoolUtilization(),
      this.checkSlowQueries(),
    ]);

    const [connection, queryPerformance, poolUtilization, slowQueries] = checks;

    // Determine overall status
    const hasFailures = checks.some(check => check.status === 'fail');
    const hasWarnings = checks.some(check => check.status === 'warn');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (hasFailures) {
      overallStatus = 'unhealthy';
    } else if (hasWarnings) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    // Get query metrics
    const metrics = getQueryMetrics();

    return {
      status: overallStatus,
      timestamp: new Date(),
      checks: {
        connection,
        queryPerformance,
        poolUtilization,
        slowQueries,
      },
      metrics,
    };
  }

  /**
   * Check database connection
   */
  private async checkConnection(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - startTime;

      if (duration > 1000) {
        return {
          status: 'warn',
          message: 'Database connection slow',
          value: `${duration}ms`,
          threshold: '1000ms',
        };
      }

      return {
        status: 'pass',
        message: 'Database connection healthy',
        value: `${duration}ms`,
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Database connection failed',
        value: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check query performance
   */
  private async checkQueryPerformance(): Promise<HealthCheck> {
    const metrics = getQueryMetrics();

    if (metrics.totalQueries === 0) {
      return {
        status: 'pass',
        message: 'No queries executed yet',
        value: 0,
      };
    }

    const avgDuration = metrics.averageDuration;

    // Warn if average query time > 200ms
    if (avgDuration > 200) {
      return {
        status: 'warn',
        message: 'Average query duration high',
        value: `${avgDuration.toFixed(2)}ms`,
        threshold: '200ms',
      };
    }

    // Warn if average query time > 500ms
    if (avgDuration > 500) {
      return {
        status: 'fail',
        message: 'Average query duration critical',
        value: `${avgDuration.toFixed(2)}ms`,
        threshold: '500ms',
      };
    }

    return {
      status: 'pass',
      message: 'Query performance healthy',
      value: `${avgDuration.toFixed(2)}ms`,
    };
  }

  /**
   * Check connection pool utilization
   */
  private async checkPoolUtilization(): Promise<HealthCheck> {
    try {
      // Get pool stats from PostgreSQL
      const result = await prisma.$queryRaw<Array<{ active: bigint; idle: bigint; total: bigint }>>`
        SELECT
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle,
          (SELECT count(*) FROM pg_stat_activity) as total
      `;

      if (result.length === 0) {
        return {
          status: 'warn',
          message: 'Could not retrieve pool stats',
        };
      }

      const { active, total } = result[0]!;
      const activeNum = Number(active);
      const totalNum = Number(total);

      // Warn if > 70% utilization
      const utilization = (activeNum / Math.max(totalNum, 1)) * 100;

      if (utilization > 90) {
        return {
          status: 'fail',
          message: 'Connection pool near exhaustion',
          value: `${utilization.toFixed(1)}%`,
          threshold: '90%',
        };
      }

      if (utilization > 70) {
        return {
          status: 'warn',
          message: 'Connection pool utilization high',
          value: `${utilization.toFixed(1)}%`,
          threshold: '70%',
        };
      }

      return {
        status: 'pass',
        message: 'Connection pool healthy',
        value: `${utilization.toFixed(1)}% (${activeNum}/${totalNum})`,
      };
    } catch (error) {
      return {
        status: 'warn',
        message: 'Could not check pool utilization',
        value: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check slow query rate
   */
  private async checkSlowQueries(): Promise<HealthCheck> {
    const metrics = getQueryMetrics();

    if (metrics.totalQueries === 0) {
      return {
        status: 'pass',
        message: 'No queries executed yet',
        value: 0,
      };
    }

    const slowQueryRate = (metrics.slowQueries / metrics.totalQueries) * 100;

    // Warn if > 10% of queries are slow
    if (slowQueryRate > 20) {
      return {
        status: 'fail',
        message: 'Slow query rate critical',
        value: `${slowQueryRate.toFixed(1)}%`,
        threshold: '20%',
      };
    }

    if (slowQueryRate > 10) {
      return {
        status: 'warn',
        message: 'Slow query rate elevated',
        value: `${slowQueryRate.toFixed(1)}%`,
        threshold: '10%',
      };
    }

    return {
      status: 'pass',
      message: 'Slow query rate acceptable',
      value: `${slowQueryRate.toFixed(1)}%`,
    };
  }

  /**
   * Get detailed database metrics
   */
  async getDetailedMetrics() {
    try {
      const [databaseSize, tableStats, indexStats] = await Promise.all([
        this.getDatabaseSize(),
        this.getTableStats(),
        this.getIndexUsage(),
      ]);

      return {
        databaseSize,
        tableStats,
        indexStats,
      };
    } catch (error) {
      return this.handleError(error, { operation: 'getDetailedMetrics' });
    }
  }

  /**
   * Get database size
   */
  private async getDatabaseSize() {
    const result = await prisma.$queryRaw<Array<{ size: string }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    return result[0]?.size || 'Unknown';
  }

  /**
   * Get table statistics
   */
  private async getTableStats() {
    const result = await prisma.$queryRaw<
      Array<{ table_name: string; row_count: bigint; total_size: string }>
    >`
      SELECT
        schemaname || '.' || tablename AS table_name,
        n_live_tup AS row_count,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
      LIMIT 10
    `;

    return result.map(row => ({
      tableName: row.table_name,
      rowCount: Number(row.row_count),
      size: row.total_size,
    }));
  }

  /**
   * Get index usage statistics
   */
  private async getIndexUsage() {
    const result = await prisma.$queryRaw<
      Array<{ index_name: string; table_name: string; scans: bigint; size: string }>
    >`
      SELECT
        indexrelname AS index_name,
        schemaname || '.' || tablename AS table_name,
        idx_scan AS scans,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
      AND schemaname = 'public'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 10
    `;

    return result.map(row => ({
      indexName: row.index_name,
      tableName: row.table_name,
      scans: Number(row.scans),
      size: row.size,
    }));
  }
}
