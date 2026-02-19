ALTER TABLE "category_certifications"
ADD COLUMN IF NOT EXISTS "boardRoleSnapshot" TEXT;

ALTER TABLE "contest_certifications"
ADD COLUMN IF NOT EXISTS "boardRoleSnapshot" TEXT;

ALTER TABLE "deduction_approvals"
ADD COLUMN IF NOT EXISTS "boardRoleSnapshot" TEXT;

ALTER TABLE "judge_uncertification_requests"
ADD COLUMN IF NOT EXISTS "requestedByBoardRoleSnapshot" TEXT,
ADD COLUMN IF NOT EXISTS "approvedByBoardRoleSnapshot" TEXT,
ADD COLUMN IF NOT EXISTS "rejectedByBoardRoleSnapshot" TEXT;

ALTER TABLE "score_removal_requests"
ADD COLUMN IF NOT EXISTS "boardRoleSnapshot" TEXT;

ALTER TABLE "score_governance_requests"
ADD COLUMN IF NOT EXISTS "requesterBoardRoleSnapshot" TEXT;

ALTER TABLE "score_governance_approvals"
ADD COLUMN IF NOT EXISTS "approverBoardRoleSnapshot" TEXT;
