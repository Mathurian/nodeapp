-- Add performance indexes for better query performance

-- Score model indexes
CREATE INDEX IF NOT EXISTS "scores_categoryId_judgeId_idx" ON "scores"("categoryId", "judgeId");
CREATE INDEX IF NOT EXISTS "scores_categoryId_contestantId_idx" ON "scores"("categoryId", "contestantId");
CREATE INDEX IF NOT EXISTS "scores_isCertified_categoryId_idx" ON "scores"("isCertified", "categoryId");

-- RoleAssignment model indexes
CREATE INDEX IF NOT EXISTS "role_assignments_userId_role_isActive_idx" ON "role_assignments"("userId", "role", "isActive");
CREATE INDEX IF NOT EXISTS "role_assignments_categoryId_role_isActive_idx" ON "role_assignments"("categoryId", "role", "isActive");

-- Assignment model indexes
CREATE INDEX IF NOT EXISTS "assignments_judgeId_status_idx" ON "assignments"("judgeId", "status");
CREATE INDEX IF NOT EXISTS "assignments_contestId_categoryId_idx" ON "assignments"("contestId", "categoryId");

