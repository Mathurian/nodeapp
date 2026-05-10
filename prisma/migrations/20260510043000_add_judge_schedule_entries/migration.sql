CREATE TABLE "judge_schedule_entries" (
    "id" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "eventId" TEXT,
    "contestId" TEXT,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "importBatchId" TEXT NOT NULL,
    "sourceRowNumber" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "judge_schedule_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "judge_schedule_entries_tenantId_idx" ON "judge_schedule_entries"("tenantId");
CREATE INDEX "judge_schedule_entries_tenantId_judgeId_startAt_idx" ON "judge_schedule_entries"("tenantId", "judgeId", "startAt");
CREATE INDEX "judge_schedule_entries_tenantId_importBatchId_idx" ON "judge_schedule_entries"("tenantId", "importBatchId");
CREATE INDEX "judge_schedule_entries_eventId_idx" ON "judge_schedule_entries"("eventId");
CREATE INDEX "judge_schedule_entries_contestId_idx" ON "judge_schedule_entries"("contestId");
CREATE INDEX "judge_schedule_entries_categoryId_idx" ON "judge_schedule_entries"("categoryId");

ALTER TABLE "judge_schedule_entries"
ADD CONSTRAINT "judge_schedule_entries_judgeId_fkey"
FOREIGN KEY ("judgeId") REFERENCES "judges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "judge_schedule_entries"
ADD CONSTRAINT "judge_schedule_entries_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "judge_schedule_entries"
ADD CONSTRAINT "judge_schedule_entries_contestId_fkey"
FOREIGN KEY ("contestId") REFERENCES "contests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "judge_schedule_entries"
ADD CONSTRAINT "judge_schedule_entries_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
