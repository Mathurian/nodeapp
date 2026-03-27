export const collapseSlashes = (value: string): string => value.replace(/\/{2,}/g, '/');

export const stripApiPrefix = (value: string): string =>
  value
    .replace(/^\/api\/v\d+(?=\/|$)/i, '')
    .replace(/^\/api(?=\/|$)/i, '');

export const normalizeRoutePath = (value: string): string => {
  const normalized = collapseSlashes(value.trim());
  if (!normalized || normalized === '/') {
    return '/';
  }

  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
};

const encodePathSegment = (segment: string): string => {
  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
};

export const normalizeConcreteRoutePath = (value: string): string => {
  const pathOnly = value.split('?')[0]?.split('#')[0] || '/';
  const withoutPrefix = stripApiPrefix(pathOnly);
  const collapsed = normalizeRoutePath(withoutPrefix);

  if (collapsed === '/') {
    return '/';
  }

  return collapsed
    .split('/')
    .filter(Boolean)
    .map(encodePathSegment)
    .reduce((accumulator, segment) => `${accumulator}/${segment}`, '');
};

export const normalizeRouteTemplatePath = (value: string): string =>
  normalizeRoutePath(stripApiPrefix(value || '/'));

export const canonicalizeRouteParts = (input: {
  basePath?: string;
  routePath?: string;
  requestUrl?: string;
}): { path: string; canonicalPath: string } => {
  const basePath = normalizeRouteTemplatePath(input.basePath || '');
  const routePath = normalizeRouteTemplatePath(input.routePath || '');
  const canonicalPath = normalizeRoutePath(`${basePath}${routePath}`) || '/';
  const path = normalizeConcreteRoutePath(input.requestUrl || canonicalPath);

  return {
    path,
    canonicalPath,
  };
};
