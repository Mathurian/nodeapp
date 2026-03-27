import { inject, injectable } from 'tsyringe';
import { ErrorCode } from '../types/errors';
import { OFFLINE_SYNC_TELEMETRY_CONFIG } from '../config/offlineSyncTelemetry.config';
import { MetricsService } from './MetricsService';
import { TelemetryDedupeStore } from './TelemetryDedupeStore';

export type OfflineSyncTelemetryOperation =
  | 'submit_score'
  | 'update_score'
  | 'delete_score'
  | 'create_comment'
  | 'update_comment'
  | 'delete_comment'
  | 'upload_score_file'
  | 'update_score_file';

export type OfflineSyncTelemetryResult =
  | 'enqueued'
  | 'replay_success'
  | 'replay_retry'
  | 'replay_permanent_failure'
  | 'dropped';

export type OfflineSyncTelemetryQueueSource = 'app' | 'sw';
export type OfflineSyncTelemetryNetworkState = 'online' | 'offline' | 'unknown';
export type OfflineSyncTelemetryStatusBucket =
  | '2xx'
  | '4xx'
  | '429'
  | '5xx'
  | 'timeout'
  | 'network_error';

export interface OfflineSyncTelemetryEvent {
  eventId: string;
  clientTimestamp: string;
  queue_source: OfflineSyncTelemetryQueueSource;
  operation: OfflineSyncTelemetryOperation;
  result: OfflineSyncTelemetryResult;
  network_state: OfflineSyncTelemetryNetworkState;
  status_bucket: OfflineSyncTelemetryStatusBucket;
}

export interface OfflineSyncTelemetryPayload {
  schemaVersion: number;
  batchId?: string;
  events: OfflineSyncTelemetryEvent[];
}

class OfflineSyncTelemetryError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'OfflineSyncTelemetryError';
  }
}

@injectable()
export class OfflineSyncTelemetryService {
  constructor(
    @inject(TelemetryDedupeStore) private readonly dedupeStore: TelemetryDedupeStore,
    @inject(MetricsService) private readonly metricsService: MetricsService,
  ) {}

  async ingest(
    tenantId: string,
    actorId: string,
    payload: OfflineSyncTelemetryPayload,
  ): Promise<{ acceptedCount: number; duplicateCount: number }> {
    if (payload.schemaVersion !== OFFLINE_SYNC_TELEMETRY_CONFIG.schemaVersion) {
      throw new OfflineSyncTelemetryError(
        'Unsupported telemetry schema version',
        ErrorCode.TELEMETRY_INVALID_PAYLOAD,
        400,
      );
    }

    if (payload.events.length > OFFLINE_SYNC_TELEMETRY_CONFIG.maxEventsPerBatch) {
      throw new OfflineSyncTelemetryError(
        'Telemetry batch exceeds configured limit',
        ErrorCode.TELEMETRY_INVALID_PAYLOAD,
        400,
      );
    }

    const tenantCount = await this.dedupeStore.incrementTenantQuota(
      tenantId,
      payload.events.length,
    );
    const actorCount = await this.dedupeStore.incrementActorQuota(
      actorId,
      payload.events.length,
    );

    if (
      tenantCount > OFFLINE_SYNC_TELEMETRY_CONFIG.tenantEventsPerMinute ||
      actorCount > OFFLINE_SYNC_TELEMETRY_CONFIG.actorEventsPerMinute
    ) {
      throw new OfflineSyncTelemetryError(
        'Telemetry quota exceeded',
        ErrorCode.TELEMETRY_QUOTA_EXCEEDED,
        429,
        OFFLINE_SYNC_TELEMETRY_CONFIG.quotaWindowSeconds,
      );
    }

    const now = Date.now();
    let acceptedCount = 0;
    let duplicateCount = 0;

    for (const event of payload.events) {
      const eventTimestamp = Date.parse(event.clientTimestamp);
      if (!Number.isFinite(eventTimestamp)) {
        throw new OfflineSyncTelemetryError(
          'Telemetry event timestamp is invalid',
          ErrorCode.TELEMETRY_INVALID_PAYLOAD,
          400,
        );
      }

      if (
        Math.abs(now - eventTimestamp) > OFFLINE_SYNC_TELEMETRY_CONFIG.maxClockSkewMs
      ) {
        throw new OfflineSyncTelemetryError(
          'Telemetry event is outside the allowed freshness window',
          ErrorCode.TELEMETRY_STALE_EVENT,
          422,
        );
      }

      if (await this.dedupeStore.isDuplicate(tenantId, event.eventId)) {
        duplicateCount += 1;
        continue;
      }

      await this.dedupeStore.markSeen(tenantId, event.eventId);
      acceptedCount += 1;
      this.metricsService.recordOfflineSyncTelemetryEvent(
        event.queue_source,
        event.operation,
        event.result,
        event.network_state,
        event.status_bucket,
      );
    }

    this.metricsService.recordOfflineSyncTelemetryBatch(
      duplicateCount > 0 ? 'accepted_with_duplicates' : 'accepted',
      payload.events.length,
    );

    return {
      acceptedCount,
      duplicateCount,
    };
  }
}

export const isOfflineSyncTelemetryError = (
  error: unknown,
): error is OfflineSyncTelemetryError => error instanceof OfflineSyncTelemetryError;
