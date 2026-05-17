CREATE TABLE "score_sheet_import_drafts" (
    "id" TEXT NOT NULL,
    "scoreFileId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "contestantId" TEXT,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "importIntent" TEXT NOT NULL DEFAULT 'SCORESHEET_IMPORT',
    "templateKey" TEXT,
    "processingError" TEXT,
    "detectedPaperTotal" INTEGER,
    "computedTotal" INTEGER,
    "overallConfidence" DOUBLE PRECISION,
    "pageCount" INTEGER,
    "extraction" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "score_sheet_import_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "score_sheet_import_drafts_scoreFileId_key" ON "score_sheet_import_drafts"("scoreFileId");
CREATE INDEX "score_sheet_import_drafts_tenantId_idx" ON "score_sheet_import_drafts"("tenantId");
CREATE INDEX "score_sheet_import_drafts_tenantId_categoryId_idx" ON "score_sheet_import_drafts"("tenantId", "categoryId");
CREATE INDEX "score_sheet_import_drafts_tenantId_judgeId_idx" ON "score_sheet_import_drafts"("tenantId", "judgeId");
CREATE INDEX "score_sheet_import_drafts_tenantId_contestantId_idx" ON "score_sheet_import_drafts"("tenantId", "contestantId");
CREATE INDEX "score_sheet_import_drafts_tenantId_status_idx" ON "score_sheet_import_drafts"("tenantId", "status");

ALTER TABLE "score_sheet_import_drafts"
ADD CONSTRAINT "score_sheet_import_drafts_scoreFileId_fkey"
FOREIGN KEY ("scoreFileId") REFERENCES "score_files"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "score_sheet_import_drafts"
ADD CONSTRAINT "score_sheet_import_drafts_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "score_sheet_import_drafts"
ADD CONSTRAINT "score_sheet_import_drafts_judgeId_fkey"
FOREIGN KEY ("judgeId") REFERENCES "judges"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "score_sheet_import_drafts"
ADD CONSTRAINT "score_sheet_import_drafts_contestantId_fkey"
FOREIGN KEY ("contestantId") REFERENCES "contestants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
