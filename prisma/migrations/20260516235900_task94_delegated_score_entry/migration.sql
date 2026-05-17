CREATE TYPE "ScoreEntryMode" AS ENUM ('SELF', 'DELEGATED');
CREATE TYPE "ScoreDelegationScopeLevel" AS ENUM ('CATEGORY', 'CONTEST', 'EVENT', 'TENANT');
CREATE TYPE "ScoreDelegationCoverageMode" AS ENUM ('SELECTED_JUDGES', 'ALL_JUDGES_IN_SCOPE');
CREATE TYPE "ScoreDelegationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

ALTER TABLE "scores"
  ADD COLUMN "enteredByUserId" TEXT,
  ADD COLUMN "entryMode" "ScoreEntryMode" NOT NULL DEFAULT 'SELF',
  ADD COLUMN "delegationGrantId" TEXT;

ALTER TABLE "score_files"
  ADD COLUMN "entryMode" "ScoreEntryMode" NOT NULL DEFAULT 'SELF',
  ADD COLUMN "delegationGrantId" TEXT;

CREATE TABLE "score_delegation_grants" (
  "id" TEXT NOT NULL,
  "delegateUserId" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL,
  "revokedById" TEXT,
  "tenantId" TEXT NOT NULL,
  "status" "ScoreDelegationStatus" NOT NULL DEFAULT 'ACTIVE',
  "scopeLevel" "ScoreDelegationScopeLevel" NOT NULL,
  "coverageMode" "ScoreDelegationCoverageMode" NOT NULL DEFAULT 'SELECTED_JUDGES',
  "categoryId" TEXT,
  "contestId" TEXT,
  "eventId" TEXT,
  "reason" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "score_delegation_grants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "score_delegation_grant_judges" (
  "id" TEXT NOT NULL,
  "grantId" TEXT NOT NULL,
  "judgeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "score_delegation_grant_judges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "score_delegation_grant_judges_grantId_judgeId_key"
  ON "score_delegation_grant_judges"("grantId", "judgeId");

CREATE INDEX "scores_tenantId_enteredByUserId_idx" ON "scores"("tenantId", "enteredByUserId");
CREATE INDEX "scores_tenantId_delegationGrantId_idx" ON "scores"("tenantId", "delegationGrantId");
CREATE INDEX "score_files_tenantId_judgeId_idx" ON "score_files"("tenantId", "judgeId");
CREATE INDEX "score_files_tenantId_delegationGrantId_idx" ON "score_files"("tenantId", "delegationGrantId");
CREATE INDEX "score_delegation_grants_tenantId_idx" ON "score_delegation_grants"("tenantId");
CREATE INDEX "score_delegation_grants_tenantId_delegateUserId_idx" ON "score_delegation_grants"("tenantId", "delegateUserId");
CREATE INDEX "score_delegation_grants_tenantId_status_idx" ON "score_delegation_grants"("tenantId", "status");
CREATE INDEX "score_delegation_grants_tenantId_scopeLevel_idx" ON "score_delegation_grants"("tenantId", "scopeLevel");
CREATE INDEX "score_delegation_grants_tenantId_eventId_idx" ON "score_delegation_grants"("tenantId", "eventId");
CREATE INDEX "score_delegation_grants_tenantId_contestId_idx" ON "score_delegation_grants"("tenantId", "contestId");
CREATE INDEX "score_delegation_grants_tenantId_categoryId_idx" ON "score_delegation_grants"("tenantId", "categoryId");
CREATE INDEX "score_delegation_grant_judges_judgeId_idx" ON "score_delegation_grant_judges"("judgeId");

ALTER TABLE "scores"
  ADD CONSTRAINT "scores_enteredByUserId_fkey"
  FOREIGN KEY ("enteredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "scores"
  ADD CONSTRAINT "scores_delegationGrantId_fkey"
  FOREIGN KEY ("delegationGrantId") REFERENCES "score_delegation_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "score_files"
  ADD CONSTRAINT "score_files_delegationGrantId_fkey"
  FOREIGN KEY ("delegationGrantId") REFERENCES "score_delegation_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "score_delegation_grants"
  ADD CONSTRAINT "score_delegation_grants_delegateUserId_fkey"
  FOREIGN KEY ("delegateUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "score_delegation_grants"
  ADD CONSTRAINT "score_delegation_grants_grantedById_fkey"
  FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "score_delegation_grants"
  ADD CONSTRAINT "score_delegation_grants_revokedById_fkey"
  FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "score_delegation_grants"
  ADD CONSTRAINT "score_delegation_grants_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "score_delegation_grants"
  ADD CONSTRAINT "score_delegation_grants_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "score_delegation_grants"
  ADD CONSTRAINT "score_delegation_grants_contestId_fkey"
  FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "score_delegation_grants"
  ADD CONSTRAINT "score_delegation_grants_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "score_delegation_grant_judges"
  ADD CONSTRAINT "score_delegation_grant_judges_grantId_fkey"
  FOREIGN KEY ("grantId") REFERENCES "score_delegation_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "score_delegation_grant_judges"
  ADD CONSTRAINT "score_delegation_grant_judges_judgeId_fkey"
  FOREIGN KEY ("judgeId") REFERENCES "judges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
