/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SOCKET_URL: string
  readonly VITE_PWA_ENABLED?: string
  readonly VITE_OFFLINE_MUTATION_QUEUE_ENABLED?: string
  readonly VITE_APP_OFFLINE_QUEUE_MAX_AGE_MS?: string
  readonly VITE_OFFLINE_SYNC_TELEMETRY_MAX_BUFFERED_EVENTS?: string
  readonly VITE_OFFLINE_SYNC_TELEMETRY_MAX_EVENT_AGE_MS?: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
