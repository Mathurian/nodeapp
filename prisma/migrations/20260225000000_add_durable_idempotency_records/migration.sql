CREATE TYPE "IdempotencyActorType" AS ENUM ('USER', 'SERVICE', 'SYSTEM');

CREATE TYPE "IdempotencyStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED_RETRYABLE',
  'FAILED_TERMINAL'
);

CREATE TABLE "idempotency_records" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "actorType" "IdempotencyActorType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "canonicalPath" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" "IdempotencyStatus" NOT NULL,
  "statusCode" INTEGER,
  "errorCode" TEXT,
  "responseBody" JSONB,
  "digest" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "leaseExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uniq_idempotency_scope"
  ON "idempotency_records"("tenantId", "actorType", "actorId", "method", "canonicalPath", "key");

CREATE INDEX "idempotency_records_tenantId_expiresAt_idx"
  ON "idempotency_records"("tenantId", "expiresAt");

CREATE INDEX "idempotency_records_tenantId_status_updatedAt_idx"
  ON "idempotency_records"("tenantId", "status", "updatedAt");
