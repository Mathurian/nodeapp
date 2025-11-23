-- Migration: Add tenant-aware settings support
-- Description: Adds tenantId column to system_settings for multi-tenant settings inheritance

-- Add tenantId column to system_settings (NULL = global/platform default)
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Drop existing unique constraint on key (if exists)
ALTER TABLE "system_settings" DROP CONSTRAINT IF EXISTS "system_settings_key_key";

-- Add new unique constraint for key + tenantId combination
-- This allows the same key to exist for global (NULL) and per-tenant
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_key_tenantId_key" UNIQUE ("key", "tenantId");

-- Add foreign key constraint to tenants table
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for tenantId for faster tenant-specific lookups
CREATE INDEX IF NOT EXISTS "system_settings_tenantId_idx" ON "system_settings"("tenantId");

-- Create index for category for faster category-based queries
CREATE INDEX IF NOT EXISTS "system_settings_category_idx" ON "system_settings"("category");

-- Note: Existing settings with NULL tenantId become global/platform defaults
-- New tenants will inherit these settings via application-level fallback logic
