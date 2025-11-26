/**
 * Smart Prisma Client with Read Replica Support
 *
 * Automatically routes read queries to replica and write queries to primary.
 * Implements health checking, fallback, and replication lag monitoring.
 */

import { PrismaClient } from '@prisma/client';
import { createPrismaClientWithReplica } from './prismaExtension';
import { logger } from '../utils/logger';

interface QueryOptions {
  /**
   * Force query to use primary database even for reads.
   * Use this for read-after-write consistency.
   */
  forceWrite?: boolean;

  /**
   * Optional timeout for the query (ms)
   */
  timeout?: number;
}

interface ReplicaHealthStatus {
  healthy: boolean;
  lag: number | null;
  lastCheck: Date;
  consecutiveFailures: number;
}

/**
 * Smart Prisma Client that routes queries to appropriate database
 */
class SmartPrismaClient {
  private primary: PrismaClient;
  private replica: PrismaClient;
  private useReplica: boolean;
  private replicaHealth: ReplicaHealthStatus = {
    healthy: true,
    lag: null,
    lastCheck: new Date(),
    consecutiveFailures: 0,
  };
  private healthCheckInterval: NodeJS.Timer | null = null;
  private maxReplicationLag: number;
  private maxConsecutiveFailures: number = 3;

  constructor() {
    const { primary, replica } = createPrismaClientWithReplica();
    this.primary = primary;
    this.replica = replica;
    this.useReplica = process.env.USE_READ_REPLICA === 'true' && replica !== primary;
    this.maxReplicationLag = parseInt(process.env.MAX_REPLICATION_LAG || '1000', 10);

    if (this.useReplica) {
      logger.info('Read replica enabled', {
        maxLag: this.maxReplicationLag,
      });

      // Start health monitoring
      this.startHealthMonitoring();
    } else {
      logger.info('Read replica disabled, all queries use primary');
    }
  }

  /**
   * Get client for read operations
   * Returns replica if healthy, otherwise falls back to primary
   */
  get read(): PrismaClient {
    if (this.useReplica && this.replicaHealth.healthy) {
      return this.replica;
    }
    return this.primary;
  }

  /**
   * Get client for write operations
   * Always returns primary
   */
  get write(): PrismaClient {
    return this.primary;
  }

  /**
   * Execute a query with automatic routing
   *
   * @param operation - Function that executes the Prisma query
   * @param options - Query options (force write, timeout, etc.)
   * @returns Query result
   */
  async query<T>(
    operation: (client: PrismaClient) => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const client = options.forceWrite ? this.write : this.read;
    const isReplica = client === this.replica && this.replicaHealth.healthy;
    const startTime = Date.now();

    try {
      const result = await operation(client);
      const duration = Date.now() - startTime;

      logger.debug('Database query executed', {
        target: isReplica ? 'replica' : 'primary',
        duration,
        forceWrite: options.forceWrite,
      });

      // Reset consecutive failures on success
      if (isReplica) {
        this.replicaHealth.consecutiveFailures = 0;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Database query failed', {
        target: isReplica ? 'replica' : 'primary',
        duration,
        error,
      });

      // Fallback to primary if replica fails
      if (isReplica) {
        logger.warn('Read replica failed, falling back to primary', { error });
        this.replicaHealth.consecutiveFailures++;

        // Mark replica unhealthy if too many failures
        if (this.replicaHealth.consecutiveFailures >= this.maxConsecutiveFailures) {
          this.replicaHealth.healthy = false;
          logger.error('Read replica marked unhealthy after consecutive failures', {
            failures: this.replicaHealth.consecutiveFailures,
          });
        }

        // Retry with primary
        const fallbackStart = Date.now();
        const result = await operation(this.primary);
        const fallbackDuration = Date.now() - fallbackStart;

        logger.info('Query succeeded on primary after replica failure', {
          fallbackDuration,
        });

        return result;
      }

      throw error;
    }
  }

  /**
   * Start monitoring replica health
   */
  private startHealthMonitoring(): void {
    // Check immediately
    this.checkReplicaHealth();

    // Then check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkReplicaHealth();
    }, 30000);

    logger.info('Replica health monitoring started');
  }

  /**
   * Stop monitoring replica health
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Replica health monitoring stopped');
    }
  }

  /**
   * Check replica health and replication lag
   */
  private async checkReplicaHealth(): Promise<void> {
    if (!this.useReplica) return;

    try {
      // Check if replica is responsive
      await this.replica.$queryRaw`SELECT 1`;

      // Check replication lag (PostgreSQL specific)
      // This query returns the delay in seconds between the last WAL record
      // applied on the replica and the current time
      const lagResult = await this.replica.$queryRaw<Array<{ lag_ms: number | null }>>`
        SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) * 1000 AS lag_ms
      `;

      const lag = lagResult[0]?.lag_ms;

      // Update health status
      this.replicaHealth.lastCheck = new Date();
      this.replicaHealth.lag = lag !== null ? Math.round(lag) : null;

      // Check if lag exceeds threshold
      if (lag !== null && lag > this.maxReplicationLag) {
        logger.warn('Replica replication lag exceeds threshold', {
          lag_ms: Math.round(lag),
          threshold_ms: this.maxReplicationLag,
        });
        this.replicaHealth.healthy = false;
      } else {
        // Replica is healthy if lag is acceptable
        if (!this.replicaHealth.healthy) {
          logger.info('Replica recovered', {
            lag_ms: lag !== null ? Math.round(lag) : null,
          });
        }
        this.replicaHealth.healthy = true;
        this.replicaHealth.consecutiveFailures = 0;
      }

      logger.debug('Replica health check passed', {
        lag_ms: lag !== null ? Math.round(lag) : null,
        healthy: this.replicaHealth.healthy,
      });
    } catch (error) {
      logger.error('Replica health check failed', { error });
      this.replicaHealth.consecutiveFailures++;

      // Mark unhealthy after consecutive failures
      if (this.replicaHealth.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.replicaHealth.healthy = false;
        logger.error('Replica marked unhealthy after consecutive health check failures', {
          failures: this.replicaHealth.consecutiveFailures,
        });
      }
    }
  }

  /**
   * Get current replica health status
   */
  getReplicaHealth(): ReplicaHealthStatus {
    return { ...this.replicaHealth };
  }

  /**
   * Force a replica health check
   */
  async refreshReplicaHealth(): Promise<void> {
    await this.checkReplicaHealth();
  }

  /**
   * Disconnect all database clients
   */
  async disconnect(): Promise<void> {
    this.stopHealthMonitoring();

    await this.primary.$disconnect();
    if (this.replica !== this.primary) {
      await this.replica.$disconnect();
    }

    logger.info('Disconnected from all databases');
  }
}

// Export singleton instance
export const db = new SmartPrismaClient();

// Export type for testing
export type { SmartPrismaClient };
