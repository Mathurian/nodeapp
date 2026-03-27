const readNumber = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const OFFLINE_SYNC_TELEMETRY_CONFIG = {
  schemaVersion: 1,
  maxClockSkewMs: readNumber('TELEMETRY_MAX_CLOCK_SKEW_MS', 300_000),
  eventDedupeWindowMs: readNumber('TELEMETRY_EVENT_DEDUPE_WINDOW_MS', 86_400_000),
  maxEventsPerBatch: readNumber('TELEMETRY_MAX_EVENTS_PER_BATCH', 100),
  tenantEventsPerMinute: readNumber('TELEMETRY_TENANT_EVENTS_PER_MINUTE', 2_000),
  actorEventsPerMinute: readNumber('TELEMETRY_ACTOR_EVENTS_PER_MINUTE', 500),
  quotaWindowSeconds: readNumber('TELEMETRY_QUOTA_WINDOW_SECONDS', 60),
};
