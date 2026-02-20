import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

const SW_MIGRATION_KEY = 'event-manager-sw-migration-version'
const SW_MIGRATION_VERSION = '2026-02-pwa-reenable-v1'
const PWA_ENABLED = import.meta.env.PROD && String(import.meta.env.VITE_PWA_ENABLED || 'true').toLowerCase() !== 'false'

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

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true)
    },
    onRegisterError(error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('PWA service worker registration failed', error)
      }
    }
  })
}

void recoverFromStaleServiceWorker().finally(() => {
  renderApp()
  registerPwa()
})
