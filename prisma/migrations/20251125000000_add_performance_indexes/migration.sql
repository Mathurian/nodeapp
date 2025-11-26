-- P2-3: Performance Index Optimization
-- Sprint 2 Epic 3 - Connection Pool & Index Optimization
-- Date: November 25, 2025
-- Note: Many indexes already exist! This only adds missing ones.

-- Findings: The following indexes ALREADY EXIST and are well-optimized:
-- scores: categoryId+contestantId, categoryId+judgeId, tenantId+categoryId+contestantId (EXCELLENT!)
-- So ResultsService N+1 fix will benefit from existing indexes

-- Add timestamp-based index for results ordering (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
                 WHERE tablename = 'scores'
                 AND indexname = 'idx_scores_category_contestant_created') THEN
    CREATE INDEX idx_scores_category_contestant_created
    ON scores("categoryId", "contestantId", "createdAt" DESC);
  END IF;
END$$;

-- Add rate limit config lookup index (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
                 WHERE tablename = 'rate_limit_configs'
                 AND indexname = 'idx_rate_limit_config_lookup') THEN
    CREATE INDEX idx_rate_limit_config_lookup
    ON rate_limit_configs("tenantId", "userId", endpoint);
  END IF;
END$$;

-- Add event tenant+archived+startDate index (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
                 WHERE tablename = 'events'
                 AND indexname = 'idx_events_tenant_archived_start') THEN
    CREATE INDEX idx_events_tenant_archived_start
    ON events("tenantId", archived, "startDate" DESC);
  END IF;
END$$;

-- Add category contest+createdAt index (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes
                 WHERE tablename = 'categories'
                 AND indexname = 'idx_categories_contest_created') THEN
    CREATE INDEX idx_categories_contest_created
    ON categories("contestId", "createdAt" DESC);
  END IF;
END$$;

-- JSONB GIN indexes (only if columns exist and are JSONB)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'tenants' AND column_name = 'settings'
             AND data_type = 'jsonb') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE tablename = 'tenants'
                   AND indexname = 'idx_tenants_settings_gin') THEN
      CREATE INDEX idx_tenants_settings_gin ON tenants USING GIN (settings);
    END IF;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'system_settings' AND column_name = 'value'
             AND data_type = 'jsonb') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE tablename = 'system_settings'
                   AND indexname = 'idx_system_settings_value_gin') THEN
      CREATE INDEX idx_system_settings_value_gin ON system_settings USING GIN (value);
    END IF;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'audit_logs' AND column_name = 'data'
             AND data_type = 'jsonb') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE tablename = 'audit_logs'
                   AND indexname = 'idx_audit_logs_data_gin') THEN
      CREATE INDEX idx_audit_logs_data_gin ON audit_logs USING GIN (data);
    END IF;
  END IF;
END$$;

-- Summary: Schema is already well-indexed!
-- This migration adds:
-- 1. Timestamp-based sorting indexes
-- 2. Rate limit lookup optimization
-- 3. JSONB GIN indexes for JSON queries (if applicable)
