-- Migration: Add score files and restrictions
-- Description: Adds ScoreFile junction table, contestant view restrictions, and edit locks for events/contests

-- Create ScoreFile junction table
CREATE TABLE IF NOT EXISTS "score_files" (
    "id" TEXT NOT NULL,
    "scoreId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "score_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "score_files_scoreId_idx" ON "score_files"("scoreId");
CREATE INDEX IF NOT EXISTS "score_files_fileId_idx" ON "score_files"("fileId");
CREATE UNIQUE INDEX IF NOT EXISTS "score_files_scoreId_fileId_key" ON "score_files"("scoreId", "fileId");

ALTER TABLE "score_files" ADD CONSTRAINT "score_files_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "score_files" ADD CONSTRAINT "score_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "contestantViewRestricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "contestantViewReleaseDate" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "lockedBy" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "lockVerifiedBy" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "lockVerifiedAt" TIMESTAMP(3);

ALTER TABLE "contests" ADD COLUMN IF NOT EXISTS "contestantViewRestricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contests" ADD COLUMN IF NOT EXISTS "contestantViewReleaseDate" TIMESTAMP(3);
ALTER TABLE "contests" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contests" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
ALTER TABLE "contests" ADD COLUMN IF NOT EXISTS "lockedBy" TEXT;
ALTER TABLE "contests" ADD COLUMN IF NOT EXISTS "lockVerifiedBy" TEXT;
ALTER TABLE "contests" ADD COLUMN IF NOT EXISTS "lockVerifiedAt" TIMESTAMP(3);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SCORE_ATTACHMENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'FileCategory')) THEN
        ALTER TYPE "FileCategory" ADD VALUE 'SCORE_ATTACHMENT';
    END IF;
END $$;
