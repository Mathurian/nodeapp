-- AlterTable
-- Add winners publication control fields to Contest model
ALTER TABLE "contests" ADD COLUMN "winnersPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contests" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "contests" ADD COLUMN "publishedBy" TEXT;

-- Add indexes for quick queries on published winners
CREATE INDEX "idx_contests_winners_published" ON "contests"("tenantId", "winnersPublished");
CREATE INDEX "idx_contests_published_at" ON "contests"("publishedAt");
