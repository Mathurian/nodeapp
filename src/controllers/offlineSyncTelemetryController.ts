import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { OfflineSyncTelemetryService, isOfflineSyncTelemetryError } from '../services/OfflineSyncTelemetryService';

export const ingestOfflineSyncTelemetry = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const telemetryService = container.resolve(OfflineSyncTelemetryService);
  const tenantId = req.user?.tenantId;
  const actorId = req.user?.id;

  if (!tenantId || !actorId) {
    res.status(401).json({
      success: false,
      error: 'Authentication is required',
    });
    return;
  }

  try {
    const result = await telemetryService.ingest(tenantId, actorId, req.body);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (isOfflineSyncTelemetryError(error)) {
      if (error.retryAfterSeconds) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
      }

      res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code,
        retryable: error.statusCode === 429,
      });
      return;
    }

    throw error;
  }
};
