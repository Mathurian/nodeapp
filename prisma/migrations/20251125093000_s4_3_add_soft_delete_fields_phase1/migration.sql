-- Sprint 4 - Epic 3: Soft Delete Pattern (Phase 1)
-- Add soft delete fields to Event, Contest, and Category models

-- Add soft delete fields to events table
ALTER TABLE "events" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN "deletedBy" TEXT;

-- Add index for soft delete queries on events
CREATE INDEX "events_tenantId_deletedAt_idx" ON "events"("tenantId", "deletedAt");

-- Add soft delete fields to contests table
ALTER TABLE "contests" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "contests" ADD COLUMN "deletedBy" TEXT;

-- Add index for soft delete queries on contests
CREATE INDEX "contests_tenantId_deletedAt_idx" ON "contests"("tenantId", "deletedAt");

-- Add soft delete fields to categories table
ALTER TABLE "categories" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "categories" ADD COLUMN "deletedBy" TEXT;

-- Add index for soft delete queries on categories
CREATE INDEX "categories_tenantId_deletedAt_idx" ON "categories"("tenantId", "deletedAt");
