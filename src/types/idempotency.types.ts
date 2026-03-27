export type IdempotencyActorType = 'USER' | 'SERVICE' | 'SYSTEM';
export type IdempotencyStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED_RETRYABLE'
  | 'FAILED_TERMINAL';

export interface IdempotencyScope {
  tenantId: string;
  actorType: IdempotencyActorType;
  actorId: string;
  method: string;
  path: string;
  canonicalPath: string;
  key: string;
}

export interface IdempotencyResolvedRequest extends IdempotencyScope {
  requestHash: string;
}

export interface IdempotencyReplayRecord extends IdempotencyResolvedRequest {
  id: string;
  status: IdempotencyStatus;
  statusCode: number | null;
  errorCode: string | null;
  digest: string | null;
  responseBody: unknown;
  expiresAt: Date;
  leaseExpiresAt: Date | null;
  updatedAt: Date;
  lastSeenAt: Date;
}

export interface IdempotencyCapturedResponse {
  statusCode: number;
  body: unknown;
  bodyKind: 'json' | 'text' | 'empty';
  errorCode?: string | null;
}

export interface IdempotencyReservationResult {
  record: IdempotencyReplayRecord;
  wasCreated: boolean;
}
