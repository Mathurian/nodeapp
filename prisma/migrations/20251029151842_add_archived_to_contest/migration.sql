-- Migration: Add archived field to contests table
-- This migration adds an archived boolean field to the contests table
-- with a default value of false

ALTER TABLE contests ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Create an index on archived for better query performance
CREATE INDEX IF NOT EXISTS idx_contests_archived ON contests(archived);


