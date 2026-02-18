export type RuntimeEnvironment = 'dev' | 'staging' | 'test' | 'prod'

const normalizeHost = (host: string): string => host.toLowerCase().trim()

export const detectRuntimeEnvironment = (hostInput?: string): RuntimeEnvironment => {
  const host = normalizeHost(
    hostInput ??
      (typeof window !== 'undefined' ? window.location.hostname : '')
  )

  if (!host) return 'prod'

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return 'dev'
  }

  if (host.includes('dev')) return 'dev'
  if (host.includes('staging') || host.includes('stage') || host.includes('preprod')) return 'staging'
  if (host.includes('test') || host.includes('qa') || host.includes('uat')) return 'test'

  return 'prod'
}
