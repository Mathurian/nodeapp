import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'

interface CachedResponse {
  statusCode: number
  body: unknown
  digest: string
  createdAt: number
}

const IDEMPOTENCY_HEADER = 'x-idempotency-key'
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map<string, CachedResponse>()

const buildCacheKey = (req: Request, key: string): string => {
  const tenantId = (req as any).tenantId || req.user?.tenantId || 'global'
  return `${tenantId}:${req.method}:${req.path}:${key}`
}

const pruneExpiredEntries = (): void => {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.createdAt > IDEMPOTENCY_TTL_MS) {
      cache.delete(key)
    }
  }
}

export const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const keyHeader = req.header(IDEMPOTENCY_HEADER)
  if (!keyHeader) {
    next()
    return
  }

  pruneExpiredEntries()
  const cacheKey = buildCacheKey(req, keyHeader)
  const cached = cache.get(cacheKey)
  if (cached) {
    res.setHeader('X-Idempotent-Replay', 'true')
    res.setHeader('X-Idempotency-Digest', cached.digest)
    res.status(cached.statusCode).json(cached.body)
    return
  }

  const originalJson = res.json.bind(res)
  res.json = ((body: unknown) => {
    const statusCode = res.statusCode
    if (statusCode >= 200 && statusCode < 300) {
      const digest = crypto.createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex')
      cache.set(cacheKey, {
        statusCode,
        body,
        digest,
        createdAt: Date.now(),
      })
      res.setHeader('X-Idempotency-Digest', digest)
    }

    return originalJson(body)
  }) as typeof res.json

  next()
}
