const readNumber = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

export const IDEMPOTENCY_HEADER = 'x-idempotency-key';
export const IDEMPOTENCY_REPLAY_HEADER = 'X-Idempotent-Replay';
export const IDEMPOTENCY_DIGEST_HEADER = 'X-Idempotency-Digest';
export const IDEMPOTENCY_STORE_HEADER = 'X-Idempotency-Store';
export const IDEMPOTENCY_QUEUE_SOURCE_HEADER = 'X-Queue-Source';

export const IDEMPOTENCY_CONFIG = {
  keyMinLength: readNumber('IDEMPOTENCY_KEY_MIN_LENGTH', 16),
  keyMaxLength: readNumber('IDEMPOTENCY_KEY_MAX_LENGTH', 255),
  ttlMs: readNumber('IDEMPOTENCY_TTL_MS', 24 * 60 * 60 * 1000),
  pendingStaleMs: readNumber('IDEMPOTENCY_PENDING_STALE_MS', 30_000),
  retryableStaleMs: readNumber('IDEMPOTENCY_RETRYABLE_STALE_MS', 30_000),
  retryAfterSeconds: readNumber('IDEMPOTENCY_RETRY_AFTER_SECONDS', 3),
  maxResponseBytes: readNumber('IDEMPOTENCY_MAX_RESPONSE_BYTES', 65_536),
  canonicalEnforce: readBoolean('IDEMPOTENCY_CANONICAL_ENFORCE', true),
};

export const isValidIdempotencyKey = (value: string): boolean => {
  const byteLength = Buffer.byteLength(value, 'utf8');
  if (
    byteLength < IDEMPOTENCY_CONFIG.keyMinLength ||
    byteLength > IDEMPOTENCY_CONFIG.keyMaxLength
  ) {
    return false;
  }

  return /^[A-Za-z0-9:_-]+$/.test(value);
};
