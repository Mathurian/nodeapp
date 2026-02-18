import { format } from 'date-fns'

const asDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

export const safeFormatDate = (
  value: unknown,
  pattern: string,
  fallback = '-'
): string => {
  const parsed = asDate(value)
  if (!parsed) return fallback

  try {
    return format(parsed, pattern)
  } catch {
    return fallback
  }
}

export const safeLocaleDateString = (
  value: unknown,
  fallback = '-',
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions
): string => {
  const parsed = asDate(value)
  return parsed ? parsed.toLocaleDateString(locales, options) : fallback
}

export const safeLocaleString = (
  value: unknown,
  fallback = '-',
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions
): string => {
  const parsed = asDate(value)
  return parsed ? parsed.toLocaleString(locales, options) : fallback
}
