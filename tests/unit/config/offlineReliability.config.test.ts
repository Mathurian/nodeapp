describe('offline reliability invariant configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('passes when queue retention is aligned with server idempotency TTL', async () => {
    process.env.NODE_ENV = 'test';
    process.env.IDEMPOTENCY_TTL_MS = String(24 * 60 * 60 * 1000);
    process.env.APP_OFFLINE_QUEUE_MAX_AGE_MS = String(24 * 60 * 60 * 1000);

    const config = await import('../../../src/config/offlineReliability.config');
    const state = config.initializeOfflineReliabilityInvariants();

    expect(state.valid).toBe(true);
    expect(state.violations).toHaveLength(0);
  });

  it('throws when queue retention exceeds server idempotency TTL without fallback enabled', async () => {
    process.env.NODE_ENV = 'test';
    process.env.IDEMPOTENCY_TTL_MS = String(24 * 60 * 60 * 1000);
    process.env.APP_OFFLINE_QUEUE_MAX_AGE_MS = String((24 * 60 * 60 * 1000) + 60_000);
    process.env.OFFLINE_IDEMPOTENCY_TTL_FALLBACK_ENABLED = 'false';

    const config = await import('../../../src/config/offlineReliability.config');

    expect(() => config.initializeOfflineReliabilityInvariants()).toThrow(
      /APP_OFFLINE_QUEUE_MAX_AGE_MS/,
    );
  });
});
