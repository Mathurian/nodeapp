import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const SW_RECOVERY_KEY = 'event-manager-sw-recovery-v3'

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

const recoverFromStaleServiceWorker = async () => {
  try {
    if (sessionStorage.getItem(SW_RECOVERY_KEY) === 'done') {
      return
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }

    if ('caches' in window) {
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.map((key) => caches.delete(key)))
    }

    sessionStorage.setItem(SW_RECOVERY_KEY, 'done')
  } catch {
    // Best effort cleanup. App render continues.
  }
}

void recoverFromStaleServiceWorker().finally(renderApp)
