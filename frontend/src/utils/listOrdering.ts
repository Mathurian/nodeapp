const textCollator = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true,
})

const toComparableText = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

const compareNullableNumbers = (a: number | null | undefined, b: number | null | undefined): number => {
  const aMissing = a === null || a === undefined
  const bMissing = b === null || b === undefined

  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1

  return a - b
}

export const compareText = (a: unknown, b: unknown): number =>
  textCollator.compare(toComparableText(a), toComparableText(b))

export const compareIds = (a: { id?: string | null }, b: { id?: string | null }): number =>
  compareText(a.id || '', b.id || '')

export const compareContestants = <
  T extends { id?: string | null; name?: string | null; contestantNumber?: number | null }
>(a: T, b: T): number => {
  const byNumber = compareNullableNumbers(a.contestantNumber, b.contestantNumber)
  if (byNumber !== 0) return byNumber

  const byName = compareText(a.name || '', b.name || '')
  if (byName !== 0) return byName

  return compareIds(a, b)
}

export const compareCategories = <T extends { id?: string | null; name?: string | null }>(a: T, b: T): number => {
  const byName = compareText(a.name || '', b.name || '')
  if (byName !== 0) return byName

  return compareIds(a, b)
}

export const compareContests = <T extends { id?: string | null; name?: string | null }>(a: T, b: T): number => {
  const byName = compareText(a.name || '', b.name || '')
  if (byName !== 0) return byName

  return compareIds(a, b)
}

export const compareEvents = <
  T extends { id?: string | null; name?: string | null; startDate?: string | Date | null }
>(a: T, b: T, direction: 'asc' | 'desc' = 'desc'): number => {
  const aTime = a.startDate ? new Date(a.startDate).getTime() : Number.NaN
  const bTime = b.startDate ? new Date(b.startDate).getTime() : Number.NaN
  const aValid = Number.isFinite(aTime)
  const bValid = Number.isFinite(bTime)

  if (aValid && bValid && aTime !== bTime) {
    return direction === 'asc' ? aTime - bTime : bTime - aTime
  }

  if (aValid !== bValid) {
    return aValid ? -1 : 1
  }

  const byName = compareText(a.name || '', b.name || '')
  if (byName !== 0) return byName

  return compareIds(a, b)
}

export const compareUsersByName = <
  T extends { id?: string | null; name?: string | null; email?: string | null }
>(a: T, b: T): number => {
  const byName = compareText(a.name || '', b.name || '')
  if (byName !== 0) return byName

  const byEmail = compareText(a.email || '', b.email || '')
  if (byEmail !== 0) return byEmail

  return compareIds(a, b)
}

export const stableSort = <T>(items: readonly T[], compare: (a: T, b: T) => number): T[] =>
  items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const compared = compare(left.item, right.item)
      if (compared !== 0) return compared
      return left.index - right.index
    })
    .map(({ item }) => item)
