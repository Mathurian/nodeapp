export interface ResolvedBio {
  bio: string | null;
  bioFilePath: string | null;
}

const BIO_FILE_PATH_REGEX = /(\/uploads\/(?:users\/bios|bios)\/[^\]\s)]+)/i;
const BIO_PLACEHOLDER_REGEX = /^\s*\[Bio file(?: uploaded)?:\s*([^\]]+)\]\s*$/i;

export function extractBioFilePath(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;

  const placeholderMatch = value.match(BIO_PLACEHOLDER_REGEX);
  if (placeholderMatch?.[1]) {
    return placeholderMatch[1].trim();
  }

  const pathMatch = value.match(BIO_FILE_PATH_REGEX);
  if (pathMatch?.[1]) {
    return pathMatch[1].trim();
  }

  return null;
}

export function isBioPlaceholder(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return BIO_PLACEHOLDER_REGEX.test(value.trim());
}

export function resolveBioFromCandidates(candidates: Array<string | null | undefined>): ResolvedBio {
  let bioFilePath: string | null = null;

  for (const candidate of candidates) {
    const maybePath = extractBioFilePath(candidate);
    if (maybePath) {
      bioFilePath = maybePath;
      break;
    }
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    if (isBioPlaceholder(trimmed)) continue;
    return { bio: trimmed, bioFilePath };
  }

  return { bio: null, bioFilePath };
}
