import { createIdempotencyMiddleware } from '../../../src/middleware/idempotency';
import { IDEMPOTENCY_CONFIG } from '../../../src/config/idempotency.config';
import { ErrorCode } from '../../../src/types/errors';
import { IdempotencyReplayRecord } from '../../../src/types/idempotency.types';
import { buildIdempotencyRequestHash } from '../../../src/utils/idempotency/requestHashCanonicalizer';

const buildReplayRecord = (requestHash: string): IdempotencyReplayRecord => ({
  id: 'idem-1',
  tenantId: 'tenant-1',
  actorType: 'USER',
  actorId: 'user-1',
  method: 'POST',
  path: '/scoring/category/c1/contestant/u1',
  canonicalPath: '/scoring/category/:categoryId/contestant/:contestantId',
  key: 'valid-key-12345678',
  requestHash,
  status: 'COMPLETED',
  statusCode: 201,
  errorCode: null,
  digest: 'digest-1',
  responseBody: { success: true, scoreId: 'abc' },
  expiresAt: new Date(Date.now() + 60_000),
  leaseExpiresAt: null,
  updatedAt: new Date(),
  lastSeenAt: new Date(),
});

const buildReq = (key?: string, rawHeaders?: string[]) =>
  ({
    method: 'POST',
    originalUrl: '/api/v1/scoring/category/c1/contestant/u1',
    url: '/api/v1/scoring/category/c1/contestant/u1',
    baseUrl: '/api/v1/scoring',
    route: { path: '/category/:categoryId/contestant/:contestantId' },
    params: { categoryId: 'c1', contestantId: 'u1' },
    query: {},
    body: { score: 10 },
    rawHeaders: rawHeaders || (key ? ['x-idempotency-key', key] : []),
    user: { id: 'user-1', tenantId: 'tenant-1' },
    header: (name: string) => (name.toLowerCase() === 'x-idempotency-key' ? key : undefined),
  }) as any;

const buildRes = () => {
  const finishHandlers: Array<() => void> = [];
  const closeHandlers: Array<() => void> = [];
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as any,
    headersSent: false,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.headersSent = true;
      finishHandlers.forEach((handler) => handler());
      return this;
    },
    send(payload?: unknown) {
      this.body = payload;
      this.headersSent = true;
      finishHandlers.forEach((handler) => handler());
      return this;
    },
    once(event: string, handler: () => void) {
      if (event === 'finish') {
        finishHandlers.push(handler);
      }
      return this;
    },
    on(event: string, handler: () => void) {
      if (event === 'close') {
        closeHandlers.push(handler);
      }
      return this;
    },
    triggerClose() {
      closeHandlers.forEach((handler) => handler());
    },
  };
  return res;
};

describe('idempotencyMiddleware', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('replays stored responses for completed records', async () => {
    const req = buildReq('valid-key-12345678');
    const replayRecord = buildReplayRecord(
      buildIdempotencyRequestHash(req, '/scoring/category/:categoryId/contestant/:contestantId'),
    );
    const store = {
      reserve: jest.fn().mockResolvedValue({ record: replayRecord, wasCreated: false }),
      isExpired: jest.fn().mockReturnValue(false),
      releaseExpired: jest.fn(),
      isReplayable: jest.fn().mockReturnValue(true),
      touch: jest.fn().mockResolvedValue(undefined),
      isReclaimable: jest.fn().mockReturnValue(false),
      reclaim: jest.fn(),
      finalize: jest.fn(),
    } as any;

    const middleware = createIdempotencyMiddleware(store);
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ success: true, scoreId: 'abc' });
    expect(res.headers['X-Idempotent-Replay']).toBe('true');
    expect(res.headers['X-Idempotency-Digest']).toBe('digest-1');
    expect(store.touch).toHaveBeenCalledWith(replayRecord.id);
  });

  it('rejects duplicated idempotency headers as invalid input', async () => {
    const store = {
      reserve: jest.fn(),
      isExpired: jest.fn(),
      releaseExpired: jest.fn(),
      isReplayable: jest.fn(),
      touch: jest.fn(),
      isReclaimable: jest.fn(),
      reclaim: jest.fn(),
      finalize: jest.fn(),
    } as any;

    const middleware = createIdempotencyMiddleware(store);
    const req = buildReq('valid-key-12345678', [
      'x-idempotency-key',
      'valid-key-12345678',
      'X-Idempotency-Key',
      'another-key-12345678',
    ]);
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      code: ErrorCode.IDEMPOTENCY_INVALID_KEY,
    });
    expect(store.reserve).not.toHaveBeenCalled();
  });

  it('rejects missing idempotency keys on enforced covered write routes', async () => {
    const store = {
      reserve: jest.fn(),
      isExpired: jest.fn(),
      releaseExpired: jest.fn(),
      isReplayable: jest.fn(),
      touch: jest.fn(),
      isReclaimable: jest.fn(),
      reclaim: jest.fn(),
      finalize: jest.fn(),
    } as any;

    const middleware = createIdempotencyMiddleware(store);
    const req = buildReq(undefined);
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      code: ErrorCode.IDEMPOTENCY_REQUIRED,
    });
    expect(store.reserve).not.toHaveBeenCalled();
  });

  it('rejects malformed percent-encoded idempotency keys', async () => {
    const store = {
      reserve: jest.fn(),
      isExpired: jest.fn(),
      releaseExpired: jest.fn(),
      isReplayable: jest.fn(),
      touch: jest.fn(),
      isReclaimable: jest.fn(),
      reclaim: jest.fn(),
      finalize: jest.fn(),
    } as any;

    const middleware = createIdempotencyMiddleware(store);
    const req = buildReq('%E0%A4%A');
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      code: ErrorCode.IDEMPOTENCY_INVALID_KEY,
    });
    expect(store.reserve).not.toHaveBeenCalled();
  });

  it('refreshes the pending lease while a request is still in flight', async () => {
    jest.useFakeTimers();

    const req = buildReq('valid-key-12345678');
    const pendingRecord = {
      ...buildReplayRecord(
        buildIdempotencyRequestHash(req, '/scoring/category/:categoryId/contestant/:contestantId'),
      ),
      status: 'PENDING' as const,
      statusCode: null,
      responseBody: null,
      digest: null,
      leaseExpiresAt: new Date(Date.now() + IDEMPOTENCY_CONFIG.pendingStaleMs),
    };

    const store = {
      reserve: jest.fn().mockResolvedValue({ record: pendingRecord, wasCreated: true }),
      isExpired: jest.fn().mockReturnValue(false),
      releaseExpired: jest.fn(),
      isReplayable: jest.fn().mockReturnValue(false),
      touch: jest.fn().mockResolvedValue(undefined),
      isReclaimable: jest.fn().mockReturnValue(false),
      reclaim: jest.fn(),
      finalize: jest.fn().mockResolvedValue({
        ...pendingRecord,
        status: 'COMPLETED',
        statusCode: 201,
        responseBody: { success: true },
        digest: 'digest-2',
      }),
    } as any;

    const middleware = createIdempotencyMiddleware(store);
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(Math.floor(IDEMPOTENCY_CONFIG.pendingStaleMs / 3) + 10);
    await Promise.resolve();

    expect(store.touch).toHaveBeenCalledWith(pendingRecord.id);

    res.status(201).json({ success: true });
    await Promise.resolve();

    expect(store.finalize).toHaveBeenCalled();
  });

  it('unrefs the pending lease heartbeat so unfinished requests do not hold Jest open', async () => {
    const req = buildReq('valid-key-12345678');
    const pendingRecord = {
      ...buildReplayRecord(
        buildIdempotencyRequestHash(req, '/scoring/category/:categoryId/contestant/:contestantId'),
      ),
      status: 'PENDING' as const,
      statusCode: null,
      responseBody: null,
      digest: null,
      leaseExpiresAt: new Date(Date.now() + IDEMPOTENCY_CONFIG.pendingStaleMs),
    };
    const unref = jest.fn();
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockReturnValue({ unref } as unknown as NodeJS.Timeout);
    const store = {
      reserve: jest.fn().mockResolvedValue({ record: pendingRecord, wasCreated: true }),
      isExpired: jest.fn().mockReturnValue(false),
      releaseExpired: jest.fn(),
      isReplayable: jest.fn().mockReturnValue(false),
      touch: jest.fn().mockResolvedValue(undefined),
      isReclaimable: jest.fn().mockReturnValue(false),
      reclaim: jest.fn(),
      finalize: jest.fn(),
    } as any;

    const middleware = createIdempotencyMiddleware(store);
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));
    expect(unref).toHaveBeenCalledTimes(1);

    setIntervalSpy.mockRestore();
  });

  it('uses legacy concrete paths as the reservation scope when canonical enforcement is disabled', async () => {
    jest.resetModules();
    process.env.IDEMPOTENCY_CANONICAL_ENFORCE = 'false';
    const { createIdempotencyMiddleware: createShadowMiddleware } = await import(
      '../../../src/middleware/idempotency'
    );

    const req = buildReq('valid-key-12345678');
    const store = {
      reserve: jest.fn().mockResolvedValue({
        record: {
          ...buildReplayRecord(
            buildIdempotencyRequestHash(req, '/scoring/category/c1/contestant/u1'),
          ),
          canonicalPath: '/scoring/category/c1/contestant/u1',
          status: 'PENDING' as const,
          statusCode: null,
          responseBody: null,
          digest: null,
          leaseExpiresAt: new Date(Date.now() + IDEMPOTENCY_CONFIG.pendingStaleMs),
        },
        wasCreated: true,
      }),
      isExpired: jest.fn().mockReturnValue(false),
      releaseExpired: jest.fn(),
      isReplayable: jest.fn().mockReturnValue(false),
      touch: jest.fn().mockResolvedValue(undefined),
      isReclaimable: jest.fn().mockReturnValue(false),
      reclaim: jest.fn(),
      finalize: jest.fn().mockResolvedValue({
        ...buildReplayRecord(
          buildIdempotencyRequestHash(req, '/scoring/category/c1/contestant/u1'),
        ),
        canonicalPath: '/scoring/category/c1/contestant/u1',
      }),
    } as any;

    const middleware = createShadowMiddleware(store);
    const res = buildRes();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(store.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/scoring/category/c1/contestant/u1',
        canonicalPath: '/scoring/category/c1/contestant/u1',
      }),
    );
  });
});
