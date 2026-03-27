import express, { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { ingestOfflineSyncTelemetry } from '../controllers/offlineSyncTelemetryController';

const router: Router = express.Router();

const offlineSyncTelemetryEventSchema = z.object({
  eventId: z.string().min(1).max(128),
  clientTimestamp: z.string().datetime(),
  queue_source: z.enum(['app', 'sw']),
  operation: z.enum([
    'submit_score',
    'update_score',
    'delete_score',
    'create_comment',
    'update_comment',
    'delete_comment',
    'upload_score_file',
    'update_score_file',
  ]),
  result: z.enum([
    'enqueued',
    'replay_success',
    'replay_retry',
    'replay_permanent_failure',
    'dropped',
  ]),
  network_state: z.enum(['online', 'offline', 'unknown']),
  status_bucket: z.enum(['2xx', '4xx', '429', '5xx', 'timeout', 'network_error']),
});

const ingestOfflineSyncTelemetrySchema = z.object({
  schemaVersion: z.number().int().positive(),
  batchId: z.string().max(128).optional(),
  events: z.array(offlineSyncTelemetryEventSchema).min(1).max(100),
});

router.use(authenticateToken);
router.post('/offline-sync', validate(ingestOfflineSyncTelemetrySchema, 'body'), ingestOfflineSyncTelemetry);

export default router;
