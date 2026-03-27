export type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

export interface CanonicalFileDescriptor {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface CanonicalIdempotencyRequestInput {
  method: string;
  canonicalPath: string;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
  files?:
    | CanonicalFileDescriptor[]
    | Record<string, CanonicalFileDescriptor[]>
    | null;
}

const normalizePrimitive = (value: unknown): CanonicalValue => {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
};

export const normalizeCanonicalValue = (value: unknown): CanonicalValue => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeCanonicalValue(entry));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, normalizeCanonicalValue(entry)] as const);

    return entries.reduce<{ [key: string]: CanonicalValue }>((accumulator, [key, entry]) => {
      accumulator[key] = entry;
      return accumulator;
    }, {});
  }

  return normalizePrimitive(value);
};

export const canonicalizeIdempotencyRequest = (
  input: CanonicalIdempotencyRequestInput,
): CanonicalValue => ({
  method: String(input.method || '').toUpperCase(),
  canonicalPath: input.canonicalPath,
  params: normalizeCanonicalValue(input.params || {}),
  query: normalizeCanonicalValue(input.query || {}),
  body: normalizeCanonicalValue(input.body || {}),
  files: normalizeCanonicalValue(input.files || null),
});

export const serializeCanonicalIdempotencyRequest = (
  input: CanonicalIdempotencyRequestInput,
): string => JSON.stringify(canonicalizeIdempotencyRequest(input));
