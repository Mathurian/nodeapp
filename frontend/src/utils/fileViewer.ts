const STANDALONE_MEDIA_QUERY = '(display-mode: standalone)'

const INLINE_MIME_PREFIXES = ['application/pdf', 'text/', 'image/']
const INLINE_EXTENSIONS = new Set([
  '.pdf',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
])
const OFFICE_EXTENSIONS = new Set([
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
])

const getFileExtension = (value?: string | null): string => {
  if (!value) return ''
  const clean = value.split('?')[0]?.split('#')[0] || ''
  const index = clean.lastIndexOf('.')
  return index >= 0 ? clean.slice(index).toLowerCase() : ''
}

export const inferFileNameFromPath = (value?: string | null, fallback = 'document'): string => {
  if (!value) return fallback
  const clean = value.split('?')[0]?.split('#')[0] || ''
  const parts = clean.split('/').filter(Boolean)
  return parts[parts.length - 1] || fallback
}

export const isStandaloneAppContext = (): boolean => {
  if (typeof window === 'undefined') return false
  const mediaStandalone = window.matchMedia?.(STANDALONE_MEDIA_QUERY)?.matches === true
  const iosStandalone = Boolean((window.navigator as any)?.standalone)
  return mediaStandalone || iosStandalone
}

const canInlinePreview = (mimeType?: string | null, fileName?: string | null): boolean => {
  const normalizedMime = String(mimeType || '').toLowerCase()
  if (INLINE_MIME_PREFIXES.some(prefix => normalizedMime.startsWith(prefix))) {
    return true
  }

  return INLINE_EXTENSIONS.has(getFileExtension(fileName))
}

export const isOfficeDocumentFile = (
  fileName?: string | null,
  mimeType?: string | null
): boolean => {
  const normalizedMime = String(mimeType || '').toLowerCase()
  if (
    normalizedMime.includes('msword') ||
    normalizedMime.includes('officedocument.wordprocessingml') ||
    normalizedMime.includes('spreadsheetml') ||
    normalizedMime.includes('presentationml')
  ) {
    return true
  }

  return OFFICE_EXTENSIONS.has(getFileExtension(fileName))
}

export const isDocxFile = (fileName?: string | null, mimeType?: string | null): boolean => {
  const normalizedMime = String(mimeType || '').toLowerCase()
  if (normalizedMime.includes('officedocument.wordprocessingml.document')) {
    return true
  }
  return getFileExtension(fileName) === '.docx'
}

export const appendDocxPreviewQuery = (url: string): string => {
  if (!url) return url
  return `${url}${url.includes('?') ? '&' : '?'}preview=html`
}

interface OpenBlobDocumentOptions {
  blob: Blob
  fileName?: string | null
  revokeAfterMs?: number
}

export const openBlobDocument = ({
  blob,
  fileName,
  revokeAfterMs = 60_000,
}: OpenBlobDocumentOptions): boolean => {
  if (typeof window === 'undefined') return false

  const objectUrl = URL.createObjectURL(blob)
  const standalone = isStandaloneAppContext()
  const resolvedFileName = inferFileNameFromPath(fileName)
  const previewable = canInlinePreview(blob.type, resolvedFileName)
  let opened = false

  if (!standalone) {
    const popup = window.open(objectUrl, '_blank', 'noopener,noreferrer')
    opened = Boolean(popup)
  }

  if (!opened) {
    const link = document.createElement('a')
    link.href = objectUrl
    link.rel = 'noopener noreferrer'
    link.target = standalone ? '_self' : '_blank'
    if (!previewable) {
      link.download = resolvedFileName || 'document'
    }
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    opened = true
  }

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), revokeAfterMs)
  return opened
}

interface OpenDocumentUrlOptions {
  preferSameTabInStandalone?: boolean
  allowSameTabFallback?: boolean
}

export const openDocumentUrl = (
  url: string,
  {
    preferSameTabInStandalone = true,
    allowSameTabFallback = true,
  }: OpenDocumentUrlOptions = {}
): boolean => {
  if (!url || typeof window === 'undefined') return false

  const standalone = isStandaloneAppContext()
  if (standalone && preferSameTabInStandalone) {
    window.location.assign(url)
    return true
  }

  const popup = window.open(url, '_blank', 'noopener,noreferrer')
  if (popup) {
    return true
  }

  if (allowSameTabFallback) {
    window.location.assign(url)
    return true
  }

  return false
}
