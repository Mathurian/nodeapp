import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

const SW_MIGRATION_KEY = 'event-manager-sw-migration-version'
const SW_MIGRATION_VERSION = '2026-02-pwa-reenable-v1'
const UPDATE_AVAILABLE_EVENT = 'event-manager:update-available'
const SW_UPDATE_CHECK_INTERVAL_MS = 60_000
const PWA_ENABLED = import.meta.env.PROD && String(import.meta.env.VITE_PWA_ENABLED || 'true').toLowerCase() !== 'false'

const isStandalonePwaContext = (): boolean => {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches === true
  const iosStandalone = (window.navigator as any)?.standalone === true
  return mediaStandalone || iosStandalone
}

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

const hasCompletedMigration = (): boolean => {
  try {
    return localStorage.getItem(SW_MIGRATION_KEY) === SW_MIGRATION_VERSION
  } catch {
    return false
  }
}

const markMigrationComplete = (): void => {
  try {
    localStorage.setItem(SW_MIGRATION_KEY, SW_MIGRATION_VERSION)
  } catch {
    // Best effort local persistence only.
  }
}

const clearKnownServiceWorkerCaches = async (): Promise<void> => {
  if (!('caches' in window)) return

  const cachePrefixes = ['workbox-', 'event-manager-', 'api-cache', 'image-cache']
  const cacheKeys = await caches.keys()
  await Promise.all(
    cacheKeys
      .filter((key) => cachePrefixes.some((prefix) => key.startsWith(prefix)))
      .map((key) => caches.delete(key))
  )
}

const unregisterServiceWorkers = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) return
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.map((registration) => registration.unregister()))
}

const recoverFromStaleServiceWorker = async (): Promise<void> => {
  try {
    // Installed PWAs should not repeatedly clear service workers/caches during startup,
    // otherwise push subscription setup on iOS can stall.
    if (isStandalonePwaContext()) {
      return
    }

    if (hasCompletedMigration()) {
      return
    }

    await unregisterServiceWorkers()
    await clearKnownServiceWorkerCaches()
    markMigrationComplete()
  } catch {
    // Best effort cleanup. App render continues.
  }
}

const registerPwa = () => {
  if (!PWA_ENABLED) return

  const announceUpdateAvailable = () => {
    window.dispatchEvent(new Event(UPDATE_AVAILABLE_EVENT))
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      announceUpdateAvailable()
    },
    onRegisteredSW(_swScriptUrl, registration) {
      if (!registration) return

      const checkForServiceWorkerUpdate = async () => {
        try {
          await registration.update()
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('PWA service worker update check failed', error)
          }
        }
      }

      void checkForServiceWorkerUpdate()

      window.setInterval(() => {
        void checkForServiceWorkerUpdate()
      }, SW_UPDATE_CHECK_INTERVAL_MS)

      window.addEventListener('focus', () => {
        void checkForServiceWorkerUpdate()
      })

      window.addEventListener('online', () => {
        void checkForServiceWorkerUpdate()
      })
    },
    onRegisterError(error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('PWA service worker registration failed', error)
      }
    }
  })

  void updateSW
}

void recoverFromStaleServiceWorker().finally(() => {
  renderApp()
  registerPwa()
})
