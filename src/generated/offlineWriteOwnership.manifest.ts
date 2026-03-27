import { normalizeConcreteRoutePath } from './idempotency/routeCanonicalizer';

export type OfflineWriteQueueOwner = 'app' | 'sw' | 'none';
export type OfflineWriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OfflineWriteOwnershipRoute {
  id: string;
  method: OfflineWriteMethod;
  pattern: string;
  matchExpression: string;
  queueOwner: OfflineWriteQueueOwner;
  idempotencyRequired: boolean;
  idempotencyPhase: string;
  timeoutProfile: string;
  backgroundSync?: {
    queueName: string;
    maxRetentionMinutes: number;
  };
}

export interface OfflineWriteOwnershipManifest {
  version: number;
  routes: OfflineWriteOwnershipRoute[];
}

export const offlineWriteOwnershipManifest: OfflineWriteOwnershipManifest = {
  "version": 1,
  "routes": [
    {
      "id": "scoring-submit",
      "method": "POST",
      "pattern": "/scoring/category/:categoryId/contestant/:contestantId",
      "queueOwner": "app",
      "idempotencyRequired": true,
      "idempotencyPhase": "enforced",
      "timeoutProfile": "mutation",
      "matchExpression": "^/scoring/category/[^/]+/contestant/[^/]+$"
    },
    {
      "id": "scoring-update",
      "method": "PUT",
      "pattern": "/scoring/:scoreId",
      "queueOwner": "app",
      "idempotencyRequired": true,
      "idempotencyPhase": "enforced",
      "timeoutProfile": "mutation",
      "matchExpression": "^/scoring/[^/]+$"
    },
    {
      "id": "scoring-delete",
      "method": "DELETE",
      "pattern": "/scoring/:scoreId",
      "queueOwner": "app",
      "idempotencyRequired": true,
      "idempotencyPhase": "enforced",
      "timeoutProfile": "mutation",
      "matchExpression": "^/scoring/[^/]+$"
    },
    {
      "id": "commentary-create",
      "method": "POST",
      "pattern": "/commentary",
      "queueOwner": "app",
      "idempotencyRequired": true,
      "idempotencyPhase": "enforced",
      "timeoutProfile": "mutation",
      "matchExpression": "^/commentary$"
    },
    {
      "id": "commentary-score-create",
      "method": "POST",
      "pattern": "/commentary/scores",
      "queueOwner": "app",
      "idempotencyRequired": true,
      "idempotencyPhase": "enforced",
      "timeoutProfile": "mutation",
      "matchExpression": "^/commentary/scores$"
    },
    {
      "id": "commentary-update",
      "method": "PUT",
      "pattern": "/commentary/:id",
      "queueOwner": "app",
      "idempotencyRequired": true,
      "idempotencyPhase": "enforced",
      "timeoutProfile": "mutation",
      "matchExpression": "^/commentary/[^/]+$"
    },
    {
      "id": "commentary-delete",
      "method": "DELETE",
      "pattern": "/commentary/:id",
      "queueOwner": "app",
      "idempotencyRequired": true,
      "idempotencyPhase": "enforced",
      "timeoutProfile": "mutation",
      "matchExpression": "^/commentary/[^/]+$"
    },
    {
      "id": "score-files-upload",
      "method": "POST",
      "pattern": "/score-files",
      "queueOwner": "sw",
      "idempotencyRequired": true,
      "idempotencyPhase": "enforced",
      "timeoutProfile": "upload",
      "backgroundSync": {
        "queueName": "score-file-write-queue",
        "maxRetentionMinutes": 1440
      },
      "matchExpression": "^/score-files$"
    },
    {
      "id": "score-files-update",
      "method": "PATCH",
      "pattern": "/score-files/:id",
      "queueOwner": "sw",
      "idempotencyRequired": true,
      "idempotencyPhase": "enforced",
      "timeoutProfile": "upload",
      "backgroundSync": {
        "queueName": "score-file-write-queue",
        "maxRetentionMinutes": 1440
      },
      "matchExpression": "^/score-files/[^/]+$"
    },
    {
      "id": "score-files-delete",
      "method": "DELETE",
      "pattern": "/score-files/:id",
      "queueOwner": "none",
      "idempotencyRequired": true,
      "idempotencyPhase": "enforced",
      "timeoutProfile": "upload",
      "matchExpression": "^/score-files/[^/]+$"
    }
  ]
} as const;

export const normalizeOfflineOwnershipPath = (value: string): string => {
  return normalizeConcreteRoutePath(value);
};

export const matchOfflineWriteOwnership = (
  method: string,
  value: string,
): OfflineWriteOwnershipRoute | null => {
  const normalizedMethod = String(method || '').toUpperCase();
  const normalizedPath = normalizeOfflineOwnershipPath(value);

  for (const route of offlineWriteOwnershipManifest.routes) {
    if (route.method !== normalizedMethod) {
      continue;
    }

    if (new RegExp(route.matchExpression).test(normalizedPath)) {
      return route;
    }
  }

  return null;
};

