-- Migration: Fix Schema Drift
-- Date: 2025-11-19
-- Description: Add missing columns, indexes, and foreign key constraints to align database with Prisma schema

-- ============================================
-- Add missing columns
-- ============================================

-- Add tenantId, deduction, and deductionReason to scores table
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT,
  ADD COLUMN IF NOT EXISTS deduction INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deductionReason" TEXT;

UPDATE scores SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
ALTER TABLE scores ALTER COLUMN "tenantId" SET NOT NULL;

-- Add tenantId to criteria table
ALTER TABLE criteria ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE criteria SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
ALTER TABLE criteria ALTER COLUMN "tenantId" SET NOT NULL;

-- Add tenantId to category_contestants table
ALTER TABLE category_contestants ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE category_contestants SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
ALTER TABLE category_contestants ALTER COLUMN "tenantId" SET NOT NULL;

-- Add tenantId to category_judges table
ALTER TABLE category_judges ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE category_judges SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
ALTER TABLE category_judges ALTER COLUMN "tenantId" SET NOT NULL;

-- Add tenantId to contest_contestants table
ALTER TABLE contest_contestants ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE contest_contestants SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
ALTER TABLE contest_contestants ALTER COLUMN "tenantId" SET NOT NULL;

-- Add tenantId to contest_judges table
ALTER TABLE contest_judges ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
UPDATE contest_judges SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
ALTER TABLE contest_judges ALTER COLUMN "tenantId" SET NOT NULL;

-- ============================================
-- Add indexes
-- ============================================

-- Indexes for criteria table
CREATE INDEX IF NOT EXISTS "criteria_tenantId_idx" ON criteria ("tenantId");
CREATE INDEX IF NOT EXISTS "criteria_tenantId_categoryId_idx" ON criteria ("tenantId", "categoryId");
CREATE INDEX IF NOT EXISTS "criteria_categoryId_idx" ON criteria ("categoryId");

-- Indexes for scores table
CREATE INDEX IF NOT EXISTS "scores_tenantId_idx" ON scores ("tenantId");
CREATE INDEX IF NOT EXISTS "scores_tenantId_categoryId_idx" ON scores ("tenantId", "categoryId");
CREATE INDEX IF NOT EXISTS "scores_tenantId_categoryId_contestantId_idx" ON scores ("tenantId", "categoryId", "contestantId");
CREATE INDEX IF NOT EXISTS "scores_tenantId_categoryId_judgeId_idx" ON scores ("tenantId", "categoryId", "judgeId");
CREATE INDEX IF NOT EXISTS "scores_tenantId_isCertified_categoryId_idx" ON scores ("tenantId", "isCertified", "categoryId");

-- Update unique constraint to include tenantId
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_categoryId_contestantId_judgeId_criterionId_key') THEN
    ALTER TABLE scores DROP CONSTRAINT "scores_categoryId_contestantId_judgeId_criterionId_key";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "scores_tenantId_categoryId_contestantId_judgeId_criterionId_key"
  ON scores ("tenantId", "categoryId", "contestantId", "judgeId", "criterionId");

-- Indexes for junction tables
CREATE INDEX IF NOT EXISTS "category_contestants_tenantId_idx" ON category_contestants ("tenantId");
CREATE INDEX IF NOT EXISTS "category_contestants_tenantId_categoryId_idx" ON category_contestants ("tenantId", "categoryId");

CREATE INDEX IF NOT EXISTS "category_judges_tenantId_idx" ON category_judges ("tenantId");
CREATE INDEX IF NOT EXISTS "category_judges_tenantId_categoryId_idx" ON category_judges ("tenantId", "categoryId");

CREATE INDEX IF NOT EXISTS "contest_contestants_tenantId_idx" ON contest_contestants ("tenantId");
CREATE INDEX IF NOT EXISTS "contest_contestants_tenantId_contestId_idx" ON contest_contestants ("tenantId", "contestId");

CREATE INDEX IF NOT EXISTS "contest_judges_tenantId_idx" ON contest_judges ("tenantId");
CREATE INDEX IF NOT EXISTS "contest_judges_tenantId_contestId_idx" ON contest_judges ("tenantId", "contestId");

-- ============================================
-- Add foreign key constraints
-- ============================================

-- Criterion foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'criteria_categoryId_fkey') THEN
    ALTER TABLE criteria
      ADD CONSTRAINT "criteria_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Score foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_categoryId_fkey') THEN
    ALTER TABLE scores
      ADD CONSTRAINT "scores_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_contestantId_fkey') THEN
    ALTER TABLE scores
      ADD CONSTRAINT "scores_contestantId_fkey"
      FOREIGN KEY ("contestantId") REFERENCES contestants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_judgeId_fkey') THEN
    ALTER TABLE scores
      ADD CONSTRAINT "scores_judgeId_fkey"
      FOREIGN KEY ("judgeId") REFERENCES judges(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scores_criterionId_fkey') THEN
    ALTER TABLE scores
      ADD CONSTRAINT "scores_criterionId_fkey"
      FOREIGN KEY ("criterionId") REFERENCES criteria(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CategoryContestant foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_contestants_categoryId_fkey') THEN
    ALTER TABLE category_contestants
      ADD CONSTRAINT "category_contestants_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_contestants_contestantId_fkey') THEN
    ALTER TABLE category_contestants
      ADD CONSTRAINT "category_contestants_contestantId_fkey"
      FOREIGN KEY ("contestantId") REFERENCES contestants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CategoryJudge foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_judges_categoryId_fkey') THEN
    ALTER TABLE category_judges
      ADD CONSTRAINT "category_judges_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_judges_judgeId_fkey') THEN
    ALTER TABLE category_judges
      ADD CONSTRAINT "category_judges_judgeId_fkey"
      FOREIGN KEY ("judgeId") REFERENCES judges(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ContestContestant foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contest_contestants_contestId_fkey') THEN
    ALTER TABLE contest_contestants
      ADD CONSTRAINT "contest_contestants_contestId_fkey"
      FOREIGN KEY ("contestId") REFERENCES contests(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contest_contestants_contestantId_fkey') THEN
    ALTER TABLE contest_contestants
      ADD CONSTRAINT "contest_contestants_contestantId_fkey"
      FOREIGN KEY ("contestantId") REFERENCES contestants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ContestJudge foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contest_judges_contestId_fkey') THEN
    ALTER TABLE contest_judges
      ADD CONSTRAINT "contest_judges_contestId_fkey"
      FOREIGN KEY ("contestId") REFERENCES contests(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contest_judges_judgeId_fkey') THEN
    ALTER TABLE contest_judges
      ADD CONSTRAINT "contest_judges_judgeId_fkey"
      FOREIGN KEY ("judgeId") REFERENCES judges(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
