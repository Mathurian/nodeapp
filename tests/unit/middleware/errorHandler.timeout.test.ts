jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(() => ({
      logHttpError: jest.fn().mockResolvedValue(undefined),
    })),
  },
}))

import { errorHandler } from '../../../src/middleware/errorHandler'

const flushAsyncErrorLogs = () => new Promise<void>((resolve) => setImmediate(resolve))

describe('errorHandler timeout/transient mapping', () => {
  const baseReq: any = {
    method: 'GET',
    path: '/api/v1/scoring/categories',
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    get: () => 'jest',
    headers: {},
  }

  const createRes = () => {
    const res: any = {
      statusCode: 200,
      payload: null as any,
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(body: any) {
        this.payload = body
        return this
      },
    }
    return res
  }

  it('maps timeout-like failures to QUERY_TIMEOUT', async () => {
    const err: any = new Error('statement timeout exceeded')
    err.code = 'ETIMEDOUT'
    const res = createRes()

    errorHandler(err, baseReq, res, jest.fn())
    await flushAsyncErrorLogs()

    expect(res.statusCode).toBe(504)
    expect(res.payload.code).toBe('QUERY_TIMEOUT')
  })

  it('maps transient upstream failures to TRANSIENT_UPSTREAM_FAILURE', async () => {
    const err: any = new Error('transient upstream connection reset')
    err.code = 'ECONNRESET'
    const res = createRes()

    errorHandler(err, baseReq, res, jest.fn())
    await flushAsyncErrorLogs()

    expect(res.statusCode).toBe(503)
    expect(res.payload.code).toBe('TRANSIENT_UPSTREAM_FAILURE')
  })
})
