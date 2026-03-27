import { IDEMPOTENCY_CONFIG } from './idempotency.config';
import { offlineWriteOwnershipManifest } from '../generated/offlineWriteOwnership.manifest';

export type OfflineReliabilityInvariantState = {
  initialized: boolean;
  valid: boolean;
  fallbackEnabled: boolean;
  violations: string[];
  serverTtlMs: number;
  appQueueMaxAgeMs: number;
  workboxMaxRetentionMs: number;
  redisReplayTtlMs: number;
};

const readBoolean = (key: string, fallback: boolean): boolean => {
  const raw = process.env[key];
  if (typeof raw !== 'string') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
};

const readNumber = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (typeof raw !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveWorkboxMaxRetentionMs = (): number =>
  offlineWriteOwnershipManifest.routes.reduce((maxRetentionMs, route) => {
    const retentionMs = (route.backgroundSync?.maxRetentionMinutes || 0) * 60_000;
    return Math.max(maxRetentionMs, retentionMs);
  }, 0);

const buildInvariantState = (): OfflineReliabilityInvariantState => {
  const fallbackEnabled = readBoolean('OFFLINE_IDEMPOTENCY_TTL_FALLBACK_ENABLED', false);
  const appQueueMaxAgeMs = readNumber('APP_OFFLINE_QUEUE_MAX_AGE_MS', IDEMPOTENCY_CONFIG.ttlMs);
  const workboxMaxRetentionMs = resolveWorkboxMaxRetentionMs();
  const serverTtlMs = IDEMPOTENCY_CONFIG.ttlMs;
  const redisReplayTtlMs = serverTtlMs;
  const violations: string[] = [];

  if (appQueueMaxAgeMs > serverTtlMs && !fallbackEnabled) {
    violations.push(
      `APP_OFFLINE_QUEUE_MAX_AGE_MS (${appQueueMaxAgeMs}) exceeds server idempotency TTL (${serverTtlMs})`,
    );
  }

  if (workboxMaxRetentionMs > serverTtlMs && !fallbackEnabled) {
    violations.push(
      `Workbox retention (${workboxMaxRetentionMs}) exceeds server idempotency TTL (${serverTtlMs})`,
    );
  }

  if (redisReplayTtlMs > serverTtlMs) {
    violations.push(
      `Redis replay TTL (${redisReplayTtlMs}) exceeds server idempotency TTL (${serverTtlMs})`,
    );
  }

  return {
    initialized: true,
    valid: violations.length === 0,
    fallbackEnabled,
    violations,
    serverTtlMs,
    appQueueMaxAgeMs,
    workboxMaxRetentionMs,
    redisReplayTtlMs,
  };
};

let invariantState: OfflineReliabilityInvariantState = {
  initialized: false,
  valid: false,
  fallbackEnabled: false,
  violations: ['Offline reliability invariants not initialized'],
  serverTtlMs: IDEMPOTENCY_CONFIG.ttlMs,
  appQueueMaxAgeMs: IDEMPOTENCY_CONFIG.ttlMs,
  workboxMaxRetentionMs: resolveWorkboxMaxRetentionMs(),
  redisReplayTtlMs: IDEMPOTENCY_CONFIG.ttlMs,
};

export const initializeOfflineReliabilityInvariants = (): OfflineReliabilityInvariantState => {
  const nextState = buildInvariantState();
  invariantState = nextState;

  if (!nextState.valid && !nextState.fallbackEnabled) {
    throw new Error(
      `Offline reliability invariant violation: ${nextState.violations.join('; ')}`,
    );
  }

  return nextState;
};

export const getOfflineReliabilityInvariantState = (): OfflineReliabilityInvariantState =>
  invariantState.initialized ? invariantState : buildInvariantState();
