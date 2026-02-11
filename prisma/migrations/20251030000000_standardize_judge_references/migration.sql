-- Migration: Standardize judge references
-- This migration changes Assignment.judgeId and ScoreRemovalRequest.judgeId 
-- to reference Judge model instead of User model

-- Step 1: First, ensure all judges have corresponding Judge records
-- If assignments reference users that don't have judge records, we need to create them
INSERT INTO judges (id, name, email, "createdAt", "updatedAt")
SELECT DISTINCT ON (u.id) 
  u.id,
  u.name,
  u.email,
  u."createdAt",
  u."updatedAt"
FROM users u
INNER JOIN assignments a ON a."judgeId" = u.id
WHERE u.role = 'JUDGE'
AND NOT EXISTS (SELECT 1 FROM judges j WHERE j.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Ensure judges exist for score removal requests
INSERT INTO judges (id, name, email, "createdAt", "updatedAt")
SELECT DISTINCT ON (u.id) 
  u.id,
  u.name,
  u.email,
  u."createdAt",
  u."updatedAt"
FROM users u
INNER JOIN score_removal_requests srr ON srr."judgeId" = u.id
WHERE u.role = 'JUDGE'
AND NOT EXISTS (SELECT 1 FROM judges j WHERE j.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Drop foreign key constraints
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS "assignments_judgeId_fkey";
ALTER TABLE score_removal_requests DROP CONSTRAINT IF EXISTS "score_removal_requests_judgeId_fkey";

-- Step 4: Add new foreign key constraints pointing to judges table
ALTER TABLE assignments 
  ADD CONSTRAINT "assignments_judgeId_fkey" 
  FOREIGN KEY ("judgeId") REFERENCES judges(id) ON DELETE CASCADE;

ALTER TABLE score_removal_requests 
  ADD CONSTRAINT "score_removal_requests_judgeId_fkey" 
  FOREIGN KEY ("judgeId") REFERENCES judges(id) ON DELETE CASCADE;

-- Step 5: Add foreign key for assignedBy in assignments (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'assignments_assignedBy_fkey'
  ) THEN
    ALTER TABLE assignments 
    ADD CONSTRAINT "assignments_assignedBy_fkey" 
    FOREIGN KEY ("assignedBy") REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 6: Add foreign key for requestedBy in score_removal_requests (if not exists)  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'score_removal_requests_requestedBy_fkey'
  ) THEN
    ALTER TABLE score_removal_requests 
    ADD CONSTRAINT "score_removal_requests_requestedBy_fkey" 
    FOREIGN KEY ("requestedBy") REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

