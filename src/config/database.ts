/**
 * Database Configuration and Connection Management
 * Centralized Prisma client with optimized connection pooling
 */

import { PrismaClient } from '@prisma/client';
import { container } from 'tsyringe';
import { env } from './env';
import { createLogger } from '../utils/logger';

const logger = createLogger('database');

/**
 * Global Prisma instance to prevent multiple connections
 */
declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Prisma Client Configuration
 * - Connection pooling optimized for production
 * - Query logging in development
 * - Error logging in all environments
 * - Connection lifecycle management
 */
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: env.isDevelopment()
      ? ['query', 'info', 'warn', 'error']
      : ['error'],

    datasources: {
      db: {
        url: env.get('DATABASE_URL')
      }
    },

    // Optimized connection pool settings
    // See: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
  });

  // Query performance monitoring is now handled by Prisma's built-in logging
  // Slow query warnings are shown in the log output when log level includes 'query'

  return client;
};

/**
 * Singleton Prisma Client Instance
 * Prevents multiple instances in development (hot reload)
 */
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (!env.isProduction()) {
  globalThis.prisma = prisma;
}

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });

    // Log database connection failure
    try {
      const { ErrorLogService } = await import('../services/ErrorLogService');
      const errorLogService = container.resolve(ErrorLogService);
      await errorLogService.logException(
        error as Error,
        'database:testConnection',
        {
          databaseUrl: env.get('DATABASE_URL')?.substring(0, 20) + '...',
          timestamp: new Date().toISOString(),
        }
      );
    } catch (logError) {
      logger.error('Failed to log database connection error', { error: logError });
    }

    return false;
  }
}

/**
 * Get database connection pool stats
 */
export async function getDatabasePoolStats() {
  try {
    const poolStats = await prisma.$queryRaw<any[]>`
      SELECT
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    return poolStats[0];
  } catch (error) {
    logger.error('Error fetching pool stats', { error });
    return null;
  }
}

/**
 * Graceful shutdown - close database connections
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting database', { error });
    throw error;
  }
}

/**
 * Health check - verify database is responsive
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return {
      status: 'healthy',
      latency
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Execute database operations in a transaction
 */
export async function executeInTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}

/**
 * Batch operations helper
 */
export async function batchExecute<T>(
  operations: Promise<T>[]
): Promise<T[]> {
  return Promise.all(operations);
}

export default prisma;
