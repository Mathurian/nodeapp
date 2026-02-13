-- Score governance workflow for throw-out and uncertification requests
CREATE TABLE IF NOT EXISTS "score_governance_requests" (
  "id" TEXT PRIMARY KEY,
  "actionType" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL,
  "targetCertificationLevel" TEXT,
  "eventId" TEXT,
  "contestId" TEXT,
  "categoryId" TEXT,
  "contestantId" TEXT,
  "judgeId" TEXT,
  "scoreId" TEXT,
  "reason" TEXT NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedById" TEXT NOT NULL,
  "requesterRole" TEXT NOT NULL,
  "initiatorTypedSignature" TEXT,
  "initiatorDrawnSignatureData" TEXT,
  "initiatorSignatureFilePath" TEXT,
  "requiredAdditionalApprovals" INTEGER NOT NULL DEFAULT 2,
  "executedAt" TIMESTAMP(3),
  "executedById" TEXT,
  "executionSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "score_governance_approvals" (
  "id" TEXT PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "approvedById" TEXT NOT NULL,
  "approverRole" TEXT NOT NULL,
  "typedSignature" TEXT,
  "drawnSignatureData" TEXT,
  "signatureFilePath" TEXT,
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "score_governance_approvals_tenantId_requestId_approvedById_key"
ON "score_governance_approvals"("tenantId", "requestId", "approvedById");

CREATE INDEX IF NOT EXISTS "score_governance_requests_tenantId_idx"
ON "score_governance_requests"("tenantId");
CREATE INDEX IF NOT EXISTS "score_governance_requests_tenantId_status_idx"
ON "score_governance_requests"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "score_governance_requests_tenantId_actionType_idx"
ON "score_governance_requests"("tenantId", "actionType");
CREATE INDEX IF NOT EXISTS "score_governance_requests_tenantId_scopeType_idx"
ON "score_governance_requests"("tenantId", "scopeType");
CREATE INDEX IF NOT EXISTS "score_governance_requests_tenantId_contestId_idx"
ON "score_governance_requests"("tenantId", "contestId");
CREATE INDEX IF NOT EXISTS "score_governance_requests_tenantId_categoryId_idx"
ON "score_governance_requests"("tenantId", "categoryId");
CREATE INDEX IF NOT EXISTS "score_governance_requests_tenantId_contestantId_idx"
ON "score_governance_requests"("tenantId", "contestantId");
CREATE INDEX IF NOT EXISTS "score_governance_requests_tenantId_judgeId_idx"
ON "score_governance_requests"("tenantId", "judgeId");

CREATE INDEX IF NOT EXISTS "score_governance_approvals_tenantId_idx"
ON "score_governance_approvals"("tenantId");
CREATE INDEX IF NOT EXISTS "score_governance_approvals_tenantId_requestId_idx"
ON "score_governance_approvals"("tenantId", "requestId");

ALTER TABLE "score_governance_requests"
  ADD CONSTRAINT "score_governance_requests_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "score_governance_requests"
  ADD CONSTRAINT "score_governance_requests_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "score_governance_requests"
  ADD CONSTRAINT "score_governance_requests_contestId_fkey"
  FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "score_governance_requests"
  ADD CONSTRAINT "score_governance_requests_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "score_governance_requests"
  ADD CONSTRAINT "score_governance_requests_contestantId_fkey"
  FOREIGN KEY ("contestantId") REFERENCES "contestants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "score_governance_requests"
  ADD CONSTRAINT "score_governance_requests_judgeId_fkey"
  FOREIGN KEY ("judgeId") REFERENCES "judges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "score_governance_approvals"
  ADD CONSTRAINT "score_governance_approvals_requestId_fkey"
  FOREIGN KEY ("requestId") REFERENCES "score_governance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "score_governance_approvals"
  ADD CONSTRAINT "score_governance_approvals_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
