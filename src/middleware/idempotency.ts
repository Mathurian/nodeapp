import { NextFunction, Request, Response } from 'express';
import { promises as fs } from 'fs';
import {
  IDEMPOTENCY_CONFIG,
  IDEMPOTENCY_DIGEST_HEADER,
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_REPLAY_HEADER,
} from '../config/idempotency.config';
import { buildIdempotencyRequestHash } from '../utils/idempotency/requestHashCanonicalizer';
import { canonicalizeExpressRoute } from '../utils/idempotency/routeCanonicalizer';
import { getIdempotencyStore, IdempotencyStore } from '../services/idempotency/IdempotencyStore';
import {
  IdempotencyActorType,
  IdempotencyCapturedResponse,
  IdempotencyReplayRecord,
  IdempotencyResolvedRequest,
} from '../types/idempotency.types';
import { errorResponse } from '../utils/responseHelpers';
import { ErrorCode } from '../types/errors';
import { createLogger } from '../utils/logger';
import { isValidIdempotencyKey } from '../config/idempotency.config';
import { resolveRequestTenantId } from '../utils/tenantContext';
import { matchOfflineWriteOwnershipRoute } from '../config/offlineWriteOwnership.config';

const logger = createLogger('idempotency');

const countHeaderOccurrences = (req: Request, headerName: string): number => {
  if (!Array.isArray(req.rawHeaders)) {
    return 0;
  }

  let count = 0;
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    if (req.rawHeaders[index]?.toLowerCase() === headerName.toLowerCase()) {
      count += 1;
    }
  }
  return count;
};

const parseIdempotencyKey = (
  req: Request,
): { key: string | null; invalid: boolean } => {
  const headerValue = req.header(IDEMPOTENCY_HEADER);
  if (!headerValue) {
    return { key: null, invalid: false };
  }

  if (countHeaderOccurrences(req, IDEMPOTENCY_HEADER) > 1) {
    return { key: null, invalid: true };
  }

  if (headerValue.includes(',')) {
    return { key: null, invalid: true };
  }

  try {
    return {
      key: decodeURIComponent(headerValue),
      invalid: false,
    };
  } catch {
    return {
      key: null,
      invalid: true,
    };
  }
};

const extractErrorCode = (body: unknown): string | null => {
  if (
    typeof body === 'object' &&
    body !== null &&
    'code' in (body as Record<string, unknown>)
  ) {
    const code = (body as Record<string, unknown>)['code'];
    return code ? String(code) : null;
  }

  return null;
};

const buildInvalidKeyResponse = (res: Response): void => {
  errorResponse(
    res,
    'Invalid idempotency key',
    ErrorCode.IDEMPOTENCY_INVALID_KEY,
    400,
  );
};

const buildMissingKeyResponse = (res: Response): void => {
  errorResponse(
    res,
    'Idempotency key is required for this write operation',
    ErrorCode.IDEMPOTENCY_REQUIRED,
    400,
  );
};

const resolveActor = (req: Request): { actorType: IdempotencyActorType; actorId: string } => {
  if (req.user?.id) {
    return {
      actorType: 'USER',
      actorId: req.user.id,
    };
  }

  return {
    actorType: 'SYSTEM',
    actorId: 'internal',
  };
};

const cleanupUploadedFiles = async (req: Request): Promise<void> => {
  const singleFile = (req as Request & { file?: Express.Multer.File }).file;
  if (singleFile?.path) {
    await fs.unlink(singleFile.path).catch(() => undefined);
  }

  const files = (req as Request & { files?: Express.Multer.File[] | Record<string, Express.Multer.File[]> }).files;
  if (!files) {
    return;
  }

  if (Array.isArray(files)) {
    await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => undefined)));
    return;
  }

  await Promise.all(
    Object.values(files).flat().map((file) => fs.unlink(file.path).catch(() => undefined)),
  );
};

const resolveIdempotencyRoute = (req: Request) =>
  matchOfflineWriteOwnershipRoute(req.method, req.originalUrl || req.path || req.url || '/');

const shouldRequireIdempotencyKey = (req: Request): boolean => {
  const route = resolveIdempotencyRoute(req);
  if (!route?.idempotencyRequired) {
    return false;
  }

  return String(route.idempotencyPhase || '').toLowerCase() === 'enforced';
};

const buildResolvedRequest = (req: Request, key: string): IdempotencyResolvedRequest | null => {
  const tenantId = resolveRequestTenantId(req) || 'global';
  const { actorType, actorId } = resolveActor(req);
  const { path, canonicalPath } = canonicalizeExpressRoute(req);
  const effectiveCanonicalPath = IDEMPOTENCY_CONFIG.canonicalEnforce ? canonicalPath : path;

  if (!IDEMPOTENCY_CONFIG.canonicalEnforce && path !== canonicalPath) {
    logger.debug('Idempotency canonical shadow divergence observed', {
      method: req.method,
      path,
      canonicalPath,
      routeId: resolveIdempotencyRoute(req)?.id || null,
    });
  }

  return {
    tenantId,
    actorType,
    actorId,
    method: String(req.method || '').toUpperCase(),
    path,
    canonicalPath: effectiveCanonicalPath,
    key,
    requestHash: buildIdempotencyRequestHash(req, effectiveCanonicalPath),
  };
};

const replayStoredResponse = (res: Response, record: IdempotencyReplayRecord): void => {
  res.setHeader(IDEMPOTENCY_REPLAY_HEADER, 'true');
  if (record.digest) {
    res.setHeader(IDEMPOTENCY_DIGEST_HEADER, record.digest);
  }

  const statusCode = record.statusCode || 200;
  if (record.responseBody === null || record.responseBody === undefined) {
    res.status(statusCode).send();
    return;
  }

  if (typeof record.responseBody === 'string') {
    res.status(statusCode).send(record.responseBody);
    return;
  }

  res.status(statusCode).json(record.responseBody);
};

const sendRequestInProgress = (res: Response): void => {
  res.setHeader('Retry-After', String(IDEMPOTENCY_CONFIG.retryAfterSeconds));
  errorResponse(
    res,
    'An identical request is already in progress',
    ErrorCode.IDEMPOTENCY_REQUEST_IN_PROGRESS,
    409,
  );
};

const sendPayloadMismatch = (res: Response): void => {
  errorResponse(
    res,
    'The provided idempotency key has already been used with a different request payload',
    ErrorCode.IDEMPOTENCY_KEY_PAYLOAD_MISMATCH,
    409,
  );
};

const captureFromSend = (
  body: unknown,
  pendingJsonBody: unknown | undefined,
): IdempotencyCapturedResponse => {
  if (pendingJsonBody !== undefined) {
    return {
      statusCode: 200,
      body: pendingJsonBody,
      bodyKind: 'json',
      errorCode: extractErrorCode(pendingJsonBody),
    };
  }

  return {
    statusCode: 200,
    body,
    bodyKind:
      body === undefined || body === null
        ? 'empty'
        : typeof body === 'string'
          ? 'text'
          : 'json',
  };
};

const shouldFinalizeStatus = (statusCode: number): boolean => statusCode >= 200 && statusCode < 600;

export const createIdempotencyMiddleware = (
  store: IdempotencyStore = getIdempotencyStore(),
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsedHeader = parseIdempotencyKey(req);
    if (parsedHeader.invalid) {
      await cleanupUploadedFiles(req);
      buildInvalidKeyResponse(res);
      return;
    }

    const key = parsedHeader.key;
    if (!key) {
      if (shouldRequireIdempotencyKey(req)) {
        await cleanupUploadedFiles(req);
        buildMissingKeyResponse(res);
        return;
      }
      next();
      return;
    }

    if (!isValidIdempotencyKey(key)) {
      await cleanupUploadedFiles(req);
      buildInvalidKeyResponse(res);
      return;
    }

    const resolvedRequest = buildResolvedRequest(req, key);
    if (!resolvedRequest) {
      errorResponse(
        res,
        'Tenant context is required for idempotent mutations',
        ErrorCode.BAD_REQUEST,
        400,
      );
      return;
    }

    try {
      let reservation = await store.reserve(resolvedRequest);
      let activeRecord = reservation.record;

      while (!reservation.wasCreated) {
        if (store.isExpired(activeRecord)) {
          const released = await store.releaseExpired(activeRecord);
          if (!released) {
            sendRequestInProgress(res);
            return;
          }
          reservation = await store.reserve(resolvedRequest);
          activeRecord = reservation.record;
          continue;
        }

        if (activeRecord.requestHash !== resolvedRequest.requestHash) {
          await cleanupUploadedFiles(req);
          sendPayloadMismatch(res);
          return;
        }

        if (store.isReplayable(activeRecord)) {
          await store.touch(activeRecord.id);
          await cleanupUploadedFiles(req);
          replayStoredResponse(res, activeRecord);
          return;
        }

        if (store.isReclaimable(activeRecord)) {
          const reclaimed = await store.reclaim(activeRecord);
          if (reclaimed) {
            reservation = {
              record: reclaimed,
              wasCreated: true,
            };
            activeRecord = reclaimed;
            break;
          }

          reservation = await store.reserve(resolvedRequest);
          activeRecord = reservation.record;
          continue;
        }

        await cleanupUploadedFiles(req);
        sendRequestInProgress(res);
        return;
      }

      let pendingJsonBody: unknown | undefined;
      let capturedResponse: IdempotencyCapturedResponse | null = null;
      let finalized = false;
      let responseFinished = false;
      const heartbeatIntervalMs = Math.max(
        1_000,
        Math.floor(IDEMPOTENCY_CONFIG.pendingStaleMs / 3),
      );
      const heartbeatHandle = setInterval(() => {
        void store.touch(activeRecord.id);
      }, heartbeatIntervalMs);
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);
      const clearHeartbeat = (): void => {
        clearInterval(heartbeatHandle);
      };

      const finalizeIfNeeded = async (
        captured: IdempotencyCapturedResponse,
      ): Promise<void> => {
        if (finalized || !shouldFinalizeStatus(captured.statusCode)) {
          return;
        }

        finalized = true;
        try {
          const finalizedRecord = await store.finalize(activeRecord, captured);

          if (finalizedRecord.digest && !res.headersSent) {
            res.setHeader(IDEMPOTENCY_DIGEST_HEADER, finalizedRecord.digest);
          }
        } catch (error) {
          logger.error('Failed to finalize idempotency record', {
            path: resolvedRequest.path,
            canonicalPath: resolvedRequest.canonicalPath,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      };

      res.json = ((body: unknown) => {
        pendingJsonBody = body;
        capturedResponse = {
          statusCode: res.statusCode,
          body,
          bodyKind: 'json',
          errorCode: extractErrorCode(body),
        };
        return originalJson(body);
      }) as unknown as typeof res.json;

      res.send = ((body?: unknown) => {
        const captured = captureFromSend(body, pendingJsonBody);
        captured.statusCode = res.statusCode;
        capturedResponse = captured;
        return originalSend(body);
      }) as unknown as typeof res.send;

      res.once('finish', () => {
        clearHeartbeat();
        responseFinished = true;
        const responseToPersist =
          capturedResponse ||
          ({
            statusCode: res.statusCode,
            body: null,
            bodyKind: 'empty',
            errorCode: null,
          } satisfies IdempotencyCapturedResponse);

        void finalizeIfNeeded(responseToPersist);
      });

      res.on('close', () => {
        clearHeartbeat();
        if (!responseFinished && !finalized && res.statusCode >= 500) {
          void store.finalize(activeRecord, {
            statusCode: res.statusCode,
            body: {
              success: false,
              error: 'Request terminated before response completed',
              code: ErrorCode.UNKNOWN_RETRYABLE,
            },
            bodyKind: 'json',
            errorCode: ErrorCode.UNKNOWN_RETRYABLE,
          }).catch((error) => {
            logger.error('Failed to finalize idempotency record on socket close', {
              path: resolvedRequest.path,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        }
      });

      next();
    } catch (error) {
      logger.error('Idempotency middleware failure', {
        path: resolvedRequest.path,
        canonicalPath: resolvedRequest.canonicalPath,
        error: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  };
};

export const idempotencyMiddleware = createIdempotencyMiddleware();
