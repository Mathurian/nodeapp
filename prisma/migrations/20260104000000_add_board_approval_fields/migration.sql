-- AlterTable
-- Add board approval tracking fields to Category model for Stage 4 of certification workflow
ALTER TABLE "categories" ADD COLUMN "boardApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "categories" ADD COLUMN "approvedBy" TEXT;

-- Add index for quick queries on board-approved categories
CREATE INDEX "idx_categories_board_approved" ON "categories"("tenantId", "boardApproved");
CREATE INDEX "idx_categories_approved_at" ON "categories"("approvedAt");
