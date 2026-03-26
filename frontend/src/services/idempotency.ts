export const IDEMPOTENCY_HEADER = 'X-Idempotency-Key'

const randomChunk = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export const createMutationIdempotencyKey = (scope: string): string => {
  const safeScope = scope.replace(/[^a-zA-Z0-9:_-]/g, '-').slice(0, 96)
  return `${safeScope}:${randomChunk()}`
}
