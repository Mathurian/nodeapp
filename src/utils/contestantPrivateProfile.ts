export interface ContestantPrivateDocumentRecord {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: string;
  uploadedBy: string;
}

type ContestantPrivateFieldKey =
  | 'contestantAccommodations'
  | 'contestantPrivateNotes'
  | 'contestantRecommendationNotes'
  | 'contestantPrivateDocuments';

const PRIVATE_FIELD_KEYS: ContestantPrivateFieldKey[] = [
  'contestantAccommodations',
  'contestantPrivateNotes',
  'contestantRecommendationNotes',
  'contestantPrivateDocuments',
];

export function parseContestantPrivateDocuments(value: unknown): ContestantPrivateDocumentRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const record = entry as Record<string, unknown>;
    if (
      typeof record['id'] !== 'string' ||
      typeof record['filename'] !== 'string' ||
      typeof record['originalName'] !== 'string' ||
      typeof record['mimeType'] !== 'string' ||
      typeof record['size'] !== 'number' ||
      typeof record['path'] !== 'string' ||
      typeof record['uploadedAt'] !== 'string' ||
      typeof record['uploadedBy'] !== 'string'
    ) {
      return [];
    }

    return [{
      id: record['id'],
      filename: record['filename'],
      originalName: record['originalName'],
      mimeType: record['mimeType'],
      size: record['size'],
      path: record['path'],
      uploadedAt: record['uploadedAt'],
      uploadedBy: record['uploadedBy'],
    }];
  });
}

export function stripContestantPrivateFields<T extends Record<string, unknown>>(user: T): Omit<T, ContestantPrivateFieldKey> {
  const sanitized = { ...user } as T & Partial<Record<ContestantPrivateFieldKey, unknown>>;

  for (const key of PRIVATE_FIELD_KEYS) {
    delete sanitized[key];
  }

  return sanitized as Omit<T, ContestantPrivateFieldKey>;
}
