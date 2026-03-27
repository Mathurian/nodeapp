import { inject, injectable } from 'tsyringe';
import { rawPrisma } from '../../config/database';
import { MetricsService } from '../MetricsService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('idempotency-lifecycle');
const ADVISORY_LOCK_KEY = 10422026;

const readNumber = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (typeof raw !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

@injectable()
export class IdempotencyLifecycleService {
  private cleanupInterval: NodeJS.Timeout | null = null;

  private running = false;

  constructor(@inject(MetricsService) private readonly metricsService: MetricsService) {}

  start(
    intervalMs: number = readNumber('IDEMPOTENCY_CLEANUP_INTERVAL_MS', 5 * 60 * 1000),
    batchSize: number = readNumber('IDEMPOTENCY_CLEANUP_BATCH_SIZE', 500),
    maxBatches: number = readNumber('IDEMPOTENCY_CLEANUP_MAX_BATCHES', 10),
  ): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      void this.runCleanupCycle(batchSize, maxBatches);
    }, intervalMs);

    if (typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }

    void this.runCleanupCycle(batchSize, maxBatches);
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async runCleanupCycle(
    batchSize: number = readNumber('IDEMPOTENCY_CLEANUP_BATCH_SIZE', 500),
    maxBatches: number = readNumber('IDEMPOTENCY_CLEANUP_MAX_BATCHES', 10),
  ): Promise<number> {
    if (this.running) {
      return 0;
    }

    this.running = true;
    let hasLock = false;
    let totalDeleted = 0;

    try {
      hasLock = await this.acquireAdvisoryLock();
      if (!hasLock) {
        this.metricsService.recordIdempotencyCleanupRun('lock_skipped');
        return 0;
      }

      for (let batch = 0; batch < Math.max(1, maxBatches); batch += 1) {
        const deleted = await this.deleteExpiredBatch(Math.max(1, batchSize));
        totalDeleted += deleted;
        this.metricsService.recordIdempotencyCleanupRows('expired_delete', deleted);

        if (deleted < batchSize) {
          break;
        }
      }

      this.metricsService.recordIdempotencyCleanupRun('success');
      return totalDeleted;
    } catch (error) {
      this.metricsService.recordIdempotencyCleanupRun('failed');
      logger.error('Idempotency cleanup cycle failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return totalDeleted;
    } finally {
      if (hasLock) {
        await this.releaseAdvisoryLock().catch((error) => {
          logger.warn('Failed to release idempotency cleanup advisory lock', {
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }

      this.running = false;
    }
  }

  private async acquireAdvisoryLock(): Promise<boolean> {
    const rows = await rawPrisma.$queryRawUnsafe<Array<{ locked: boolean }>>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      ADVISORY_LOCK_KEY,
    );

    return rows[0]?.locked === true;
  }

  private async releaseAdvisoryLock(): Promise<void> {
    await rawPrisma.$executeRawUnsafe(
      'SELECT pg_advisory_unlock($1)',
      ADVISORY_LOCK_KEY,
    );
  }

  private async deleteExpiredBatch(limit: number): Promise<number> {
    const rows = await rawPrisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
        WITH expired AS (
          SELECT "id"
          FROM "idempotency_records"
          WHERE "expiresAt" <= NOW()
          ORDER BY "expiresAt" ASC
          LIMIT $1
        )
        DELETE FROM "idempotency_records"
        WHERE "id" IN (SELECT "id" FROM expired)
        RETURNING "id"
      `,
      limit,
    );

    return rows.length;
  }
}
