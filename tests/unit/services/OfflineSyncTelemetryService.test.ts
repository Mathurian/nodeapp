import { ErrorCode } from '../../../src/types/errors';
import {
  OfflineSyncTelemetryPayload,
  OfflineSyncTelemetryService,
} from '../../../src/services/OfflineSyncTelemetryService';

const buildPayload = (): OfflineSyncTelemetryPayload => ({
  schemaVersion: 1,
  events: [
    {
      eventId: 'event-1',
      clientTimestamp: new Date().toISOString(),
      queue_source: 'app',
      operation: 'submit_score',
      result: 'enqueued',
      network_state: 'offline',
      status_bucket: 'network_error',
    },
  ],
});

describe('OfflineSyncTelemetryService', () => {
  it('accepts fresh telemetry events and records metrics', async () => {
    const dedupeStore = {
      incrementTenantQuota: jest.fn().mockResolvedValue(1),
      incrementActorQuota: jest.fn().mockResolvedValue(1),
      isDuplicate: jest.fn().mockResolvedValue(false),
      markSeen: jest.fn().mockResolvedValue(undefined),
    };
    const metricsService = {
      recordOfflineSyncTelemetryEvent: jest.fn(),
      recordOfflineSyncTelemetryBatch: jest.fn(),
    };
    const service = new OfflineSyncTelemetryService(
      dedupeStore as any,
      metricsService as any,
    );

    const result = await service.ingest('tenant-1', 'user-1', buildPayload());

    expect(result).toEqual({ acceptedCount: 1, duplicateCount: 0 });
    expect(dedupeStore.markSeen).toHaveBeenCalledWith('tenant-1', 'event-1');
    expect(metricsService.recordOfflineSyncTelemetryEvent).toHaveBeenCalledWith(
      'app',
      'submit_score',
      'enqueued',
      'offline',
      'network_error',
    );
    expect(metricsService.recordOfflineSyncTelemetryBatch).toHaveBeenCalledWith('accepted', 1);
  });

  it('accepts duplicate telemetry events as a no-op', async () => {
    const dedupeStore = {
      incrementTenantQuota: jest.fn().mockResolvedValue(1),
      incrementActorQuota: jest.fn().mockResolvedValue(1),
      isDuplicate: jest.fn().mockResolvedValue(true),
      markSeen: jest.fn(),
    };
    const metricsService = {
      recordOfflineSyncTelemetryEvent: jest.fn(),
      recordOfflineSyncTelemetryBatch: jest.fn(),
    };
    const service = new OfflineSyncTelemetryService(
      dedupeStore as any,
      metricsService as any,
    );

    const result = await service.ingest('tenant-1', 'user-1', buildPayload());

    expect(result).toEqual({ acceptedCount: 0, duplicateCount: 1 });
    expect(dedupeStore.markSeen).not.toHaveBeenCalled();
    expect(metricsService.recordOfflineSyncTelemetryEvent).not.toHaveBeenCalled();
    expect(metricsService.recordOfflineSyncTelemetryBatch).toHaveBeenCalledWith(
      'accepted_with_duplicates',
      1,
    );
  });

  it('rejects stale telemetry events', async () => {
    const dedupeStore = {
      incrementTenantQuota: jest.fn().mockResolvedValue(1),
      incrementActorQuota: jest.fn().mockResolvedValue(1),
      isDuplicate: jest.fn(),
      markSeen: jest.fn(),
    };
    const metricsService = {
      recordOfflineSyncTelemetryEvent: jest.fn(),
      recordOfflineSyncTelemetryBatch: jest.fn(),
    };
    const service = new OfflineSyncTelemetryService(
      dedupeStore as any,
      metricsService as any,
    );

    const stalePayload: OfflineSyncTelemetryPayload = {
      schemaVersion: 1,
      events: [
        {
          ...buildPayload().events[0],
          clientTimestamp: new Date(Date.now() - (6 * 60 * 1000)).toISOString(),
        },
      ],
    };

    await expect(service.ingest('tenant-1', 'user-1', stalePayload)).rejects.toMatchObject({
      code: ErrorCode.TELEMETRY_STALE_EVENT,
      statusCode: 422,
    });
  });
});
