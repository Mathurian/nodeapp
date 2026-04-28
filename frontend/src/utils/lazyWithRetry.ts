import { lazy, type ComponentType } from 'react'

type ModuleFactory<T extends ComponentType<any>> = () => Promise<{ default: T }>
const UPDATE_RECOVERY_NOTICE_KEY = 'app:update-recovery-notice'
const GLOBAL_LAZY_RETRY_KEY = 'lazy-retry:global'

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '')
  const lower = message.toLowerCase()
  return (
    lower.includes('importing a module script failed') ||
    lower.includes('module script failed') ||
    lower.includes('dynamically imported module') ||
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('chunkloaderror') ||
    lower.includes('loading chunk')
  )
}

/**
 * Wrap React.lazy imports with one-time hard reload recovery.
 * This handles stale HTML/runtime pointing at removed hashed chunks after deploy.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: ModuleFactory<T>,
  key: string
) {
  return lazy(async () => {
    try {
      return await importer()
    } catch (error) {
      if (typeof window !== 'undefined' && isChunkLoadError(error)) {
        const retryKey = `lazy-retry:${key}`
        const alreadyRetriedForChunk = window.sessionStorage.getItem(retryKey) === '1'
        const alreadyRetriedGlobally = window.sessionStorage.getItem(GLOBAL_LAZY_RETRY_KEY) === '1'
        const alreadyRetried = alreadyRetriedForChunk || alreadyRetriedGlobally
        if (!alreadyRetried) {
          window.sessionStorage.setItem(retryKey, '1')
          window.sessionStorage.setItem(GLOBAL_LAZY_RETRY_KEY, '1')
          window.sessionStorage.setItem(UPDATE_RECOVERY_NOTICE_KEY, '1')
          window.location.reload()
          return new Promise<never>(() => {})
        }
        window.sessionStorage.removeItem(retryKey)
      }
      throw error
    }
  })
}
