import type { Request } from 'express';
import {
  canonicalizeRouteParts,
  normalizeConcreteRoutePath as normalizeConcretePath,
  normalizeRoutePath,
  normalizeRouteTemplatePath as normalizeRouteTemplate,
} from '../../generated/idempotency/routeCanonicalizer';

export const canonicalizeExpressRoute = (req: Request): { path: string; canonicalPath: string } => {
  const routePath =
    typeof req.route?.path === 'string'
      ? req.route.path
      : Array.isArray(req.route?.path)
        ? req.route.path[0] || ''
        : '';

  return canonicalizeRouteParts({
    basePath: req.baseUrl || '',
    routePath,
    requestUrl: req.originalUrl || req.url || '/',
  });
};

export { normalizeConcretePath, normalizeRoutePath, normalizeRouteTemplate };
