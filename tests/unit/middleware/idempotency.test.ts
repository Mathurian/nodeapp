import { idempotencyMiddleware } from '../../../src/middleware/idempotency'

describe('idempotencyMiddleware', () => {
  const buildReq = (key?: string) => ({
    method: 'POST',
    path: '/api/v1/scoring/category/c1/contestant/u1',
    user: { tenantId: 'tenant-1' },
    header: (name: string) => (name.toLowerCase() === 'x-idempotency-key' ? key : undefined),
  }) as any

  const buildRes = () => {
    const res: any = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: undefined as any,
      setHeader(name: string, value: string) {
        this.headers[name] = value
      },
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(payload: unknown) {
        this.body = payload
        return this
      },
    }
    return res
  }

  it('replays successful cached responses for duplicate idempotency keys', () => {
    const firstReq = buildReq('same-key')
    const firstRes = buildRes()
    const next = jest.fn()

    idempotencyMiddleware(firstReq, firstRes, next)
    firstRes.status(201).json({ success: true, scoreId: 'abc' })

    const replayReq = buildReq('same-key')
    const replayRes = buildRes()
    const replayNext = jest.fn()

    idempotencyMiddleware(replayReq, replayRes, replayNext)

    expect(replayNext).not.toHaveBeenCalled()
    expect(replayRes.statusCode).toBe(201)
    expect(replayRes.body).toEqual({ success: true, scoreId: 'abc' })
    expect(replayRes.headers['X-Idempotent-Replay']).toBe('true')
  })
})
