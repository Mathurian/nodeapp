/**
 * API Versioning Middleware
 *
 * Implements URL-based API versioning with backward compatibility.
 * Supports both legacy `/api/*` and versioned `/api/v1/*` routes.
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('api-versioning');

/**
 * Current API version
 */
export const CURRENT_API_VERSION = '1';
export const LATEST_API_VERSION = '1';

/**
 * Supported API versions
 */
export const SUPPORTED_VERSIONS = ['1'];

/**
 * Extract API version from request path
 */
export function extractApiVersion(path: string): string | null | undefined {
  const versionMatch = path.match(/^\/api\/v(\d+)\//);
  return versionMatch ? versionMatch[1] : null;
}

/**
 * Check if a version is supported
 */
export function isVersionSupported(version: string): boolean {
  return SUPPORTED_VERSIONS.includes(version);
}

/**
 * API Versioning Middleware
 *
 * Adds version information to responses and validates version requests.
 */
export function apiVersioning() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract version from URL
    const requestedVersion = extractApiVersion(req.path);

    // Determine effective version
    let effectiveVersion = CURRENT_API_VERSION;

    if (requestedVersion) {
      // Explicit version requested
      if (!isVersionSupported(requestedVersion)) {
        res.status(400).json({
          success: false,
          error: 'Unsupported API Version',
          message: `API version v${requestedVersion} is not supported.`,
          currentVersion: CURRENT_API_VERSION,
          latestVersion: LATEST_API_VERSION,
          supportedVersions: SUPPORTED_VERSIONS.map(v => `v${v}`),
          documentation: '/api/docs',
        });
        return;
      }
      effectiveVersion = requestedVersion;
    } else if (req.path.startsWith('/api/')) {
      // Legacy route (no explicit version) - maps to v1
      effectiveVersion = CURRENT_API_VERSION;
    }

    // Add version information to request
    (req as any).apiVersion = effectiveVersion;

    // Add version headers to response
    res.setHeader('X-API-Version', effectiveVersion);
    res.setHeader('X-API-Latest-Version', LATEST_API_VERSION);

    // Log version usage for analytics
    if (requestedVersion) {
      logger.debug('Explicit version request', {
        version: requestedVersion,
        path: req.path,
        method: req.method,
      });
    }

    next();
  };
}

/**
 * Deprecation Warning Middleware
 *
 * Adds deprecation warnings for old API versions.
 * Enable when a version is deprecated.
 */
export function deprecationWarning(options: {
  version: string;
  sunsetDate: string;
  migrationGuide?: string;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestedVersion = extractApiVersion(req.path);

    if (requestedVersion === options.version) {
      // Add deprecation headers
      res.setHeader('X-API-Deprecated', 'true');
      res.setHeader('X-API-Sunset', options.sunsetDate);

      if (options.migrationGuide) {
        res.setHeader('X-API-Migration-Guide', options.migrationGuide);
      }

      // Add Warning header (RFC 7234)
      const warningMessage = `299 - "API version ${options.version} is deprecated and will be removed on ${options.sunsetDate}"`;
      res.setHeader('Warning', warningMessage);

      logger.warn('Deprecated API version used', {
        version: options.version,
        path: req.path,
        sunsetDate: options.sunsetDate,
        userAgent: req.get('user-agent'),
      });
    }

    next();
  };
}

/**
 * Version-specific middleware wrapper
 *
 * Only applies middleware to specific API version
 */
export function forVersion(version: string, middleware: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestedVersion = extractApiVersion(req.path);

    // Apply middleware only if version matches
    if (requestedVersion === version || (!requestedVersion && version === CURRENT_API_VERSION)) {
      middleware(req, res, next);
    } else {
      next();
    }
  };
}

export default {
  apiVersioning,
  deprecationWarning,
  forVersion,
  extractApiVersion,
  isVersionSupported,
  CURRENT_API_VERSION,
  LATEST_API_VERSION,
  SUPPORTED_VERSIONS,
};
