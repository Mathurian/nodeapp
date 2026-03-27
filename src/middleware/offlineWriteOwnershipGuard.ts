import { NextFunction, Request, Response } from 'express';
import {
  isOfflineWriteManifestReadyForRoute,
  matchOfflineWriteOwnershipRoute,
} from '../config/offlineWriteOwnership.config';
import { ErrorCode } from '../types/errors';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const offlineWriteOwnershipGuard = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const method = String(req.method || '').toUpperCase();
  if (!MUTATION_METHODS.has(method)) {
    next();
    return;
  }

  const route = matchOfflineWriteOwnershipRoute(method, req.originalUrl || req.path);
  if (!route) {
    next();
    return;
  }

  const readiness = isOfflineWriteManifestReadyForRoute(method, req.originalUrl || req.path);
  if (readiness.ready) {
    next();
    return;
  }

  res.status(503).json({
    success: false,
    error: readiness.reason || 'Covered write route is temporarily unavailable',
    code: ErrorCode.TRANSIENT_UPSTREAM_FAILURE,
    retryable: true,
    requestId: req.id,
    correlationId: req.correlationId,
    timestamp: new Date().toISOString(),
    details: {
      routeId: route.id,
      queueOwner: route.queueOwner,
      timeoutProfile: route.timeoutProfile,
    },
  });
};

