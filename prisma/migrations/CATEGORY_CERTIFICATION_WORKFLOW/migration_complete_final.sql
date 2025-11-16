-- Complete migration for FINAL corrected certification workflow
-- This creates all tables needed for the proper 14-step certification sequence

-- 1. Create review_contestant_certifications table
CREATE TABLE IF NOT EXISTS "review_contestant_certifications" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "reviewerRole" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,

    CONSTRAINT "review_contestant_certifications_pkey" PRIMARY KEY ("id")
);

-- 2. Create review_judge_score_certifications table (NEW)
CREATE TABLE IF NOT EXISTS "review_judge_score_certifications" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "reviewedBy" TEXT NOT NULL,
    "reviewerRole" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,

    CONSTRAINT "review_judge_score_certifications_pkey" PRIMARY KEY ("id")
);

-- 3. Create category_certifications table
CREATE TABLE IF NOT EXISTS "category_certifications" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signatureName" TEXT,
    "certifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comments" TEXT,

    CONSTRAINT "category_certifications_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "review_contestant_certifications_categoryId_contestantId_reviewedBy_key" 
    ON "review_contestant_certifications"("categoryId", "contestantId", "reviewedBy");

CREATE UNIQUE INDEX IF NOT EXISTS "review_judge_score_certifications_categoryId_judgeId_reviewedBy_key" 
    ON "review_judge_score_certifications"("categoryId", "judgeId", "reviewedBy");

CREATE UNIQUE INDEX IF NOT EXISTS "category_certifications_categoryId_role_key" 
    ON "category_certifications"("categoryId", "role");

-- Add foreign key constraints for review_contestant_certifications
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'review_contestant_certifications_categoryId_fkey' 
        AND table_name = 'review_contestant_certifications'
    ) THEN
        ALTER TABLE "review_contestant_certifications" 
        ADD CONSTRAINT "review_contestant_certifications_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'review_contestant_certifications_contestantId_fkey' 
        AND table_name = 'review_contestant_certifications'
    ) THEN
        ALTER TABLE "review_contestant_certifications" 
        ADD CONSTRAINT "review_contestant_certifications_contestantId_fkey" 
        FOREIGN KEY ("contestantId") REFERENCES "contestants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'review_contestant_certifications_reviewedBy_fkey' 
        AND table_name = 'review_contestant_certifications'
    ) THEN
        ALTER TABLE "review_contestant_certifications" 
        ADD CONSTRAINT "review_contestant_certifications_reviewedBy_fkey" 
        FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for review_judge_score_certifications
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'review_judge_score_certifications_categoryId_fkey' 
        AND table_name = 'review_judge_score_certifications'
    ) THEN
        ALTER TABLE "review_judge_score_certifications" 
        ADD CONSTRAINT "review_judge_score_certifications_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'review_judge_score_certifications_judgeId_fkey' 
        AND table_name = 'review_judge_score_certifications'
    ) THEN
        ALTER TABLE "review_judge_score_certifications" 
        ADD CONSTRAINT "review_judge_score_certifications_judgeId_fkey" 
        FOREIGN KEY ("judgeId") REFERENCES "judges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'review_judge_score_certifications_reviewedBy_fkey' 
        AND table_name = 'review_judge_score_certifications'
    ) THEN
        ALTER TABLE "review_judge_score_certifications" 
        ADD CONSTRAINT "review_judge_score_certifications_reviewedBy_fkey" 
        FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for category_certifications
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'category_certifications_categoryId_fkey' 
        AND table_name = 'category_certifications'
    ) THEN
        ALTER TABLE "category_certifications" 
        ADD CONSTRAINT "category_certifications_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'category_certifications_userId_fkey' 
        AND table_name = 'category_certifications'
    ) THEN
        ALTER TABLE "category_certifications" 
        ADD CONSTRAINT "category_certifications_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "review_contestant_certifications_categoryId_idx" 
    ON "review_contestant_certifications"("categoryId");
CREATE INDEX IF NOT EXISTS "review_contestant_certifications_contestantId_idx" 
    ON "review_contestant_certifications"("contestantId");
CREATE INDEX IF NOT EXISTS "review_contestant_certifications_reviewedBy_idx" 
    ON "review_contestant_certifications"("reviewedBy");

CREATE INDEX IF NOT EXISTS "review_judge_score_certifications_categoryId_idx" 
    ON "review_judge_score_certifications"("categoryId");
CREATE INDEX IF NOT EXISTS "review_judge_score_certifications_judgeId_idx" 
    ON "review_judge_score_certifications"("judgeId");
CREATE INDEX IF NOT EXISTS "review_judge_score_certifications_reviewedBy_idx" 
    ON "review_judge_score_certifications"("reviewedBy");

CREATE INDEX IF NOT EXISTS "category_certifications_categoryId_idx" 
    ON "category_certifications"("categoryId");
CREATE INDEX IF NOT EXISTS "category_certifications_userId_idx" 
    ON "category_certifications"("userId");

-- Drop old certification tables if they exist (tally_master_certifications and auditor_certifications)
-- These are being replaced by the new unified category_certifications table

DROP TABLE IF EXISTS "tally_master_certifications";
DROP TABLE IF EXISTS "auditor_certifications";

