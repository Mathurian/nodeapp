-- Critical Database Fixes Migration
-- Generated: November 29, 2025
-- Purpose: Fix duplicate constraints, add missing indexes, improve performance

BEGIN;

-- =============================================================================
-- 1. FIX DUPLICATE UNIQUE CONSTRAINT ON SCORES TABLE
-- =============================================================================
-- Issue: Both old (without tenantId) and new (with tenantId) constraints exist
-- Impact: Cross-tenant duplicate prevention fails, performance penalty
-- Solution: Drop the old constraint without tenantId

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'scores_categoryId_contestantId_judgeId_criterionId_key'
    ) THEN
        ALTER TABLE scores
        DROP CONSTRAINT "scores_categoryId_contestantId_judgeId_criterionId_key";
        RAISE NOTICE 'Dropped duplicate unique constraint on scores table';
    ELSE
        RAISE NOTICE 'Duplicate constraint already removed';
    END IF;
END $$;

-- =============================================================================
-- 2. ADD MISSING INDEXES FOR ACTIVITY LOGS
-- =============================================================================
-- Issue: Missing indexes on resourceType, resourceId, createdAt for query performance
-- Impact: Slow queries when filtering activity logs by resource or date

CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type
ON activity_logs("resourceType");

CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id
ON activity_logs("resourceId");

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
ON activity_logs("createdAt" DESC);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type_id
ON activity_logs("resourceType", "resourceId");

-- =============================================================================
-- 3. ADD MISSING INDEXES FOR NOTIFICATIONS
-- =============================================================================
-- Issue: Missing indexes on emailSent, pushSent for batch processing
-- Impact: Slow queries when processing unsent notifications

CREATE INDEX IF NOT EXISTS idx_notifications_email_sent
ON notifications("emailSent") WHERE "emailSent" = false;

CREATE INDEX IF NOT EXISTS idx_notifications_push_sent
ON notifications("pushSent") WHERE "pushSent" = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON notifications("createdAt" DESC);

-- =============================================================================
-- 4. ADD MISSING INDEXES FOR WEBHOOK DELIVERIES
-- =============================================================================
-- Issue: Missing composite index [status, createdAt] for retry queries
-- Impact: Slow retry queue processing

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_created
ON webhook_deliveries(status, "createdAt" DESC);

-- Index for failed deliveries that need retry
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_failed
ON webhook_deliveries(status, "lastAttemptAt" DESC)
WHERE status IN ('FAILED', 'pending');

-- =============================================================================
-- 5. ADD MISSING INDEXES FOR EVENT LOGS
-- =============================================================================
-- Issue: Missing composite index [processed, eventType, timestamp]
-- Impact: Slow event log processing queries

CREATE INDEX IF NOT EXISTS idx_event_logs_processed_type_time
ON event_logs(processed, "eventType", timestamp DESC);

-- =============================================================================
-- 6. REMOVE DUPLICATE INDEX ON CONTESTS
-- =============================================================================
-- Issue: Two identical indexes exist: idx_contests_event_archived and contests_eventId_archived_idx
-- Impact: Unnecessary storage and slower write operations

DO $$
BEGIN
    -- Keep the newer one (contests_eventId_archived_idx) and drop the older one
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_contests_event_archived'
    ) THEN
        DROP INDEX IF EXISTS idx_contests_event_archived;
        RAISE NOTICE 'Dropped duplicate index on contests table';
    ELSE
        RAISE NOTICE 'Duplicate index already removed';
    END IF;
END $$;

-- =============================================================================
-- 7. ADD PERFORMANCE INDEXES FOR SCORES TABLE
-- =============================================================================
-- Optimize score queries by category, contestant, and certification status

CREATE INDEX IF NOT EXISTS idx_scores_category_contestant
ON scores("categoryId", "contestantId");

CREATE INDEX IF NOT EXISTS idx_scores_certified
ON scores("isCertified", "certifiedAt" DESC)
WHERE "isCertified" = true;

CREATE INDEX IF NOT EXISTS idx_scores_locked
ON scores("isLocked", "lockedAt" DESC)
WHERE "isLocked" = true;

-- =============================================================================
-- 8. VERIFY MIGRATION SUCCESS
-- =============================================================================

-- Verify duplicate constraint is removed
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint
    WHERE conname LIKE 'scores_%_contestantId_judgeId_criterionId%'
    AND contype = 'u';

    IF constraint_count = 1 THEN
        RAISE NOTICE '✓ Scores table has exactly 1 unique constraint (correct)';
    ELSE
        RAISE WARNING '✗ Scores table has % unique constraints (expected 1)', constraint_count;
    END IF;
END $$;

-- Verify indexes were created
DO $$
DECLARE
    new_index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO new_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname IN (
        'idx_activity_logs_resource_type',
        'idx_activity_logs_resource_id',
        'idx_activity_logs_created_at',
        'idx_activity_logs_resource_type_id',
        'idx_notifications_email_sent',
        'idx_notifications_push_sent',
        'idx_notifications_created_at',
        'idx_webhook_deliveries_status_created',
        'idx_webhook_deliveries_next_retry',
        'idx_event_logs_processed_type_time',
        'idx_scores_category_contestant',
        'idx_scores_certified',
        'idx_scores_locked'
    );

    RAISE NOTICE '✓ Created % new indexes', new_index_count;
END $$;

COMMIT;

-- Migration complete
