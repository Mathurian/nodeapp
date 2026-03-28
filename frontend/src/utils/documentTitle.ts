import { detectRuntimeEnvironment } from './runtimeEnvironment'

const DEV_TITLE_PREFIX = '[DEV] '

export const formatDocumentTitle = (title: string): string => {
  const trimmedTitle = title.trim()
  const resolvedTitle = trimmedTitle || 'ConMGR'

  if (detectRuntimeEnvironment() !== 'dev') {
    return resolvedTitle
  }

  if (resolvedTitle.startsWith(DEV_TITLE_PREFIX)) {
    return resolvedTitle
  }

  return `${DEV_TITLE_PREFIX}${resolvedTitle}`
}
