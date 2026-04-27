export const PWA_HARD_REFRESH_NOTICE_KEY = 'app:pwa-hard-refresh-notice'

const HARD_REFRESH_CACHE_PREFIXES = ['workbox-', 'event-manager-', 'api-cache', 'image-cache']

export const performPwaHardRefresh = async (): Promise<void> => {
  try {
    window.sessionStorage.setItem(PWA_HARD_REFRESH_NOTICE_KEY, '1')
  } catch {
    // Best effort only.
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(
        registrations.map(async (registration) => {
          try {
            await registration.update()
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
          } catch {
            // Best effort only.
          }
        })
      )
    }

    if ('caches' in window) {
      const cacheKeys = await caches.keys()
      await Promise.all(
        cacheKeys
          .filter((key) => HARD_REFRESH_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
          .map((key) => caches.delete(key))
      )
    }
  } finally {
    const url = new URL(window.location.href)
    url.searchParams.set('refresh', Date.now().toString())
    window.location.replace(url.toString())
  }
}
