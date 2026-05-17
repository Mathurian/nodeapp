CREATE TYPE "JudgeCertificationMode" AS ENUM ('SELF', 'DELEGATED');

ALTER TABLE "judge_certifications"
  ADD COLUMN "certifiedByUserId" TEXT,
  ADD COLUMN "certificationMode" "JudgeCertificationMode" NOT NULL DEFAULT 'SELF',
  ADD COLUMN "delegationGrantId" TEXT;

CREATE INDEX "judge_certifications_tenantId_certifiedByUserId_idx"
  ON "judge_certifications"("tenantId", "certifiedByUserId");

CREATE INDEX "judge_certifications_tenantId_delegationGrantId_idx"
  ON "judge_certifications"("tenantId", "delegationGrantId");

ALTER TABLE "judge_certifications"
  ADD CONSTRAINT "judge_certifications_certifiedByUserId_fkey"
  FOREIGN KEY ("certifiedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "judge_certifications"
  ADD CONSTRAINT "judge_certifications_delegationGrantId_fkey"
  FOREIGN KEY ("delegationGrantId") REFERENCES "score_delegation_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
