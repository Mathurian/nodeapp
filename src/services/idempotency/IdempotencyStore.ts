import crypto from 'crypto';
import { rawPrisma } from '../../config/database';
import { IDEMPOTENCY_CONFIG } from '../../config/idempotency.config';
import { RedisCacheService } from '../RedisCacheService';
import {
  IdempotencyCapturedResponse,
  IdempotencyReplayRecord,
  IdempotencyReservationResult,
  IdempotencyResolvedRequest,
  IdempotencyStatus,
} from '../../types/idempotency.types';
import { EncryptedPayloadEnvelope } from '../../types/security.types';
import { createLogger } from '../../utils/logger';
import { decryptReplayPayload, encryptReplayPayload } from '../../security/replayPayloadCrypto';
import { withMutationTimeoutTx } from '../../utils/dbMutationTimeout';
import { ErrorCode } from '../../types/errors';
import { container } from 'tsyringe';
import { MetricsService } from '../MetricsService';

const logger = createLogger('idempotency-store');
const CACHE_NAMESPACE = 'idempotency';

type IdempotencyRow = {
  id: string;
  tenantId: string;
  actorType: string;
  actorId: string;
  method: string;
  path: string;
  canonicalPath: string;
  key: string;
  requestHash: string;
  status: string;
  statusCode: number | null;
  errorCode: string | null;
  responseBody: unknown;
  digest: string | null;
  expiresAt: Date;
  leaseExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
};

const redisCache = new RedisCacheService();

const getMetricsService = (): MetricsService | null => {
  try {
    return container.resolve(MetricsService);
  } catch {
    return null;
  }
};

const now = (): Date => new Date();

const computeDigest = (body: unknown): string =>
  crypto.createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');

const isRetryableStatusCode = (statusCode: number): boolean =>
  statusCode === 408 || statusCode === 429 || statusCode >= 500;

const isTerminalStatusCode = (statusCode: number): boolean =>
  statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 429;

const RETRYABLE_ERROR_CODES = new Set<string>([
  ErrorCode.IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE,
  ErrorCode.IDEMPOTENCY_REQUEST_IN_PROGRESS,
  ErrorCode.QUERY_TIMEOUT,
  ErrorCode.TRANSIENT_UPSTREAM_FAILURE,
  ErrorCode.UNKNOWN_RETRYABLE,
]);

const buildScopeCacheKey = (scope: Pick<
  IdempotencyResolvedRequest,
  'tenantId' | 'actorType' | 'actorId' | 'method' | 'canonicalPath' | 'key'
>): string =>
  [
    scope.tenantId,
    scope.actorType,
    scope.actorId,
    scope.method,
    scope.canonicalPath,
    scope.key,
  ].join(':');

const selectByScope = async (scope: IdempotencyResolvedRequest): Promise<IdempotencyRow | null> => {
  const rows = await rawPrisma.$queryRawUnsafe<IdempotencyRow[]>(
    `
      SELECT *
      FROM "idempotency_records"
      WHERE "tenantId" = $1
        AND "actorType" = $2::"IdempotencyActorType"
        AND "actorId" = $3
        AND "method" = $4
        AND "canonicalPath" = $5
        AND "key" = $6
      LIMIT 1
    `,
    scope.tenantId,
    scope.actorType,
    scope.actorId,
    scope.method,
    scope.canonicalPath,
    scope.key,
  );

  return rows[0] || null;
};

const selectById = async (id: string): Promise<IdempotencyRow | null> => {
  const rows = await rawPrisma.$queryRawUnsafe<IdempotencyRow[]>(
    `
      SELECT *
      FROM "idempotency_records"
      WHERE "id" = $1
      LIMIT 1
    `,
    id,
  );

  return rows[0] || null;
};

const normalizeStoredRecord = async (
  record: IdempotencyRow | null,
): Promise<IdempotencyReplayRecord | null> => {
  if (!record) {
    return null;
  }

  let responseBody: unknown = null;
  if (record.responseBody) {
    try {
      responseBody = await decryptReplayPayload(
        record.responseBody as EncryptedPayloadEnvelope,
        `${record.method}:${record.canonicalPath}`,
      );
    } catch (error) {
      logger.error('Failed to decrypt idempotency replay payload', {
        recordId: record.id,
        error: error instanceof Error ? error.message : String(error),
      });
      responseBody = null;
    }
  }

  return {
    id: record.id,
    tenantId: record.tenantId,
    actorType: record.actorType as IdempotencyReplayRecord['actorType'],
    actorId: record.actorId,
    method: record.method,
    path: record.path,
    canonicalPath: record.canonicalPath,
    key: record.key,
    requestHash: record.requestHash,
    status: record.status as IdempotencyStatus,
    statusCode: record.statusCode,
    errorCode: record.errorCode,
    digest: record.digest,
    responseBody,
    expiresAt: new Date(record.expiresAt),
    leaseExpiresAt: record.leaseExpiresAt ? new Date(record.leaseExpiresAt) : null,
    updatedAt: new Date(record.updatedAt),
    lastSeenAt: new Date(record.lastSeenAt),
  };
};

export class IdempotencyStore {
  async getByScope(scope: IdempotencyResolvedRequest): Promise<IdempotencyReplayRecord | null> {
    const cacheKey = buildScopeCacheKey(scope);
    const cached = await redisCache.get<IdempotencyReplayRecord>(cacheKey, {
      namespace: CACHE_NAMESPACE,
    });

    if (cached) {
      return {
        ...cached,
        expiresAt: new Date(cached.expiresAt),
        leaseExpiresAt: cached.leaseExpiresAt ? new Date(cached.leaseExpiresAt) : null,
        updatedAt: new Date(cached.updatedAt),
        lastSeenAt: new Date(cached.lastSeenAt),
      };
    }

    const record = await selectByScope(scope);
    const normalized = await normalizeStoredRecord(record);
    if (normalized && this.isReplayable(normalized)) {
      await this.cacheReplayable(scope, normalized);
    }

    return normalized;
  }

  async reserve(scope: IdempotencyResolvedRequest): Promise<IdempotencyReservationResult> {
    const reservedAt = now();
    const leaseExpiresAt = new Date(reservedAt.getTime() + IDEMPOTENCY_CONFIG.pendingStaleMs);
    const expiresAt = new Date(reservedAt.getTime() + IDEMPOTENCY_CONFIG.ttlMs);
    const recordId = crypto.randomUUID();

    try {
      const rows = await withMutationTimeoutTx(async (tx) =>
        await tx.$queryRawUnsafe<IdempotencyRow[]>(
          `
            INSERT INTO "idempotency_records" (
              "id",
              "tenantId",
              "actorType",
              "actorId",
              "method",
              "path",
              "canonicalPath",
              "key",
              "requestHash",
              "status",
              "expiresAt",
              "leaseExpiresAt",
              "lastSeenAt",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              $1,
              $2,
              $3::"IdempotencyActorType",
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              'PENDING'::"IdempotencyStatus",
              $10,
              $11,
              $12,
              NOW(),
              NOW()
            )
            RETURNING *
          `,
          recordId,
          scope.tenantId,
          scope.actorType,
          scope.actorId,
          scope.method,
          scope.path,
          scope.canonicalPath,
          scope.key,
          scope.requestHash,
          expiresAt,
          leaseExpiresAt,
          reservedAt,
        ),
      );

      const normalized = await normalizeStoredRecord(rows[0] || null);
      if (!normalized) {
        throw new Error('Failed to normalize newly reserved idempotency record');
      }

      getMetricsService()?.recordIdempotencyReservation('created');

      return {
        record: normalized,
        wasCreated: true,
      };
    } catch (error) {
      const existing = await this.getByScope(scope);
      if (existing) {
        getMetricsService()?.recordIdempotencyReservation('reused');
        return {
          record: existing,
          wasCreated: false,
        };
      }

      getMetricsService()?.recordIdempotencyReservation('failed');
      throw error;
    }
  }

  async releaseExpired(record: IdempotencyReplayRecord): Promise<boolean> {
    if (!this.isExpired(record)) {
      return false;
    }

    const count = await withMutationTimeoutTx(async (tx) =>
      await tx.$executeRawUnsafe(
        `
          DELETE FROM "idempotency_records"
          WHERE "id" = $1
            AND "expiresAt" <= $2
        `,
        record.id,
        now(),
      ),
    );

    return count > 0;
  }

  async reclaim(record: IdempotencyReplayRecord): Promise<IdempotencyReplayRecord | null> {
    const reclaimedAt = now();
    const leaseExpiresAt = new Date(reclaimedAt.getTime() + IDEMPOTENCY_CONFIG.pendingStaleMs);

    let updatedCount = 0;
    if (record.status === 'PENDING') {
      updatedCount = await withMutationTimeoutTx(async (tx) =>
        await tx.$executeRawUnsafe(
          `
            UPDATE "idempotency_records"
            SET "lastSeenAt" = $2,
                "leaseExpiresAt" = $3,
                "updatedAt" = NOW()
            WHERE "id" = $1
              AND "status" = 'PENDING'::"IdempotencyStatus"
              AND "leaseExpiresAt" <= $2
          `,
          record.id,
          reclaimedAt,
          leaseExpiresAt,
        ),
      );
    } else if (record.status === 'FAILED_RETRYABLE') {
      updatedCount = await withMutationTimeoutTx(async (tx) =>
        await tx.$executeRawUnsafe(
          `
            UPDATE "idempotency_records"
            SET "status" = 'PENDING'::"IdempotencyStatus",
                "lastSeenAt" = $2,
                "leaseExpiresAt" = $3,
                "statusCode" = NULL,
                "errorCode" = NULL,
                "digest" = NULL,
                "responseBody" = NULL,
                "updatedAt" = NOW()
            WHERE "id" = $1
              AND "status" = 'FAILED_RETRYABLE'::"IdempotencyStatus"
              AND "updatedAt" <= $4
          `,
          record.id,
          reclaimedAt,
          leaseExpiresAt,
          new Date(reclaimedAt.getTime() - IDEMPOTENCY_CONFIG.retryableStaleMs),
        ),
      );
    }

    if (updatedCount === 0) {
      return null;
    }

    return normalizeStoredRecord(await selectById(record.id));
  }

  async touch(recordId: string): Promise<void> {
    const touchedAt = now();
    const leaseExpiresAt = new Date(touchedAt.getTime() + IDEMPOTENCY_CONFIG.pendingStaleMs);
    await rawPrisma
      .$executeRawUnsafe(
        `
          UPDATE "idempotency_records"
          SET "lastSeenAt" = $2,
              "leaseExpiresAt" = CASE
                WHEN "status" = 'PENDING'::"IdempotencyStatus" THEN $3
                ELSE "leaseExpiresAt"
              END,
              "updatedAt" = NOW()
          WHERE "id" = $1
        `,
        recordId,
        touchedAt,
        leaseExpiresAt,
      )
      .catch(() => undefined);
  }

  async finalize(
    record: IdempotencyReplayRecord,
    captured: IdempotencyCapturedResponse,
  ): Promise<IdempotencyReplayRecord> {
    const finalizedAt = now();
    const serializedBody = JSON.stringify(captured.body ?? null);
    const responseBytes = Buffer.byteLength(serializedBody, 'utf8');
    const replayBody =
      responseBytes <= IDEMPOTENCY_CONFIG.maxResponseBytes
        ? captured.body
        : {
            success: captured.statusCode >= 200 && captured.statusCode < 300,
            code: captured.errorCode || null,
            message:
              typeof captured.body === 'object' &&
              captured.body !== null &&
              'message' in (captured.body as Record<string, unknown>)
                ? String((captured.body as Record<string, unknown>)['message'])
                : 'Replay payload truncated',
          };

    const encryptedPayload = await encryptReplayPayload(
      replayBody,
      `${record.method}:${record.canonicalPath}`,
    );
    const digest = computeDigest(replayBody);
    const finalStatus = this.classifyStatus(captured.statusCode, captured.errorCode);

    await withMutationTimeoutTx(async (tx) =>
      await tx.$executeRawUnsafe(
        `
          UPDATE "idempotency_records"
          SET "status" = $2::"IdempotencyStatus",
              "statusCode" = $3,
              "errorCode" = $4,
              "digest" = $5,
              "responseBody" = $6::jsonb,
              "leaseExpiresAt" = NULL,
              "expiresAt" = $7,
              "lastSeenAt" = $8,
              "updatedAt" = NOW()
          WHERE "id" = $1
        `,
        record.id,
        finalStatus,
        captured.statusCode,
        captured.errorCode || null,
        digest,
        JSON.stringify(encryptedPayload),
        new Date(finalizedAt.getTime() + IDEMPOTENCY_CONFIG.ttlMs),
        finalizedAt,
      ),
    );

    const normalized = await normalizeStoredRecord(await selectById(record.id));
    if (!normalized) {
      throw new Error('Failed to reload finalized idempotency record');
    }

    if (this.isReplayable(normalized)) {
      await this.cacheReplayable(record, normalized);
    } else {
      await redisCache.delete(buildScopeCacheKey(record), CACHE_NAMESPACE);
    }

    getMetricsService()?.recordIdempotencyFinalization(finalStatus);

    return normalized;
  }

  isExpired(record: IdempotencyReplayRecord): boolean {
    return record.expiresAt.getTime() <= Date.now();
  }

  isReclaimable(record: IdempotencyReplayRecord): boolean {
    const currentTime = Date.now();
    if (record.status === 'PENDING') {
      return !!record.leaseExpiresAt && record.leaseExpiresAt.getTime() <= currentTime;
    }

    if (record.status === 'FAILED_RETRYABLE') {
      return record.updatedAt.getTime() <= currentTime - IDEMPOTENCY_CONFIG.retryableStaleMs;
    }

    return false;
  }

  isReplayable(record: IdempotencyReplayRecord): boolean {
    return record.status === 'COMPLETED' || record.status === 'FAILED_TERMINAL';
  }

  private classifyStatus(statusCode: number, errorCode?: string | null): IdempotencyStatus {
    if (errorCode && RETRYABLE_ERROR_CODES.has(errorCode)) {
      return 'FAILED_RETRYABLE';
    }

    if (statusCode >= 200 && statusCode < 300) {
      return 'COMPLETED';
    }

    if (isRetryableStatusCode(statusCode)) {
      return 'FAILED_RETRYABLE';
    }

    if (isTerminalStatusCode(statusCode)) {
      return 'FAILED_TERMINAL';
    }

    return statusCode >= 500 ? 'FAILED_RETRYABLE' : 'FAILED_TERMINAL';
  }

  private async cacheReplayable(
    scope: Pick<
      IdempotencyResolvedRequest,
      'tenantId' | 'actorType' | 'actorId' | 'method' | 'canonicalPath' | 'key'
    >,
    record: IdempotencyReplayRecord,
  ): Promise<void> {
    const cacheKey = buildScopeCacheKey(scope);
    const ttlSeconds = Math.max(1, Math.floor((record.expiresAt.getTime() - Date.now()) / 1000));

    await redisCache
      .set(
        cacheKey,
        {
          ...record,
          expiresAt: record.expiresAt.toISOString(),
          leaseExpiresAt: record.leaseExpiresAt?.toISOString() || null,
          updatedAt: record.updatedAt.toISOString(),
          lastSeenAt: record.lastSeenAt.toISOString(),
        },
        { namespace: CACHE_NAMESPACE, ttl: ttlSeconds },
      )
      .catch((error) => {
        logger.warn('Failed to cache idempotency replay record', {
          cacheKey,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }
}

let storeInstance: IdempotencyStore | null = null;

export const getIdempotencyStore = (): IdempotencyStore => {
  if (!storeInstance) {
    storeInstance = new IdempotencyStore();
  }

  return storeInstance;
};

export const resetIdempotencyStoreForTests = (): void => {
  storeInstance = null;
};
