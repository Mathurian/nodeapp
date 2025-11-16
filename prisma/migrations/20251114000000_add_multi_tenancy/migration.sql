-- Multi-Tenancy Migration
-- This migration adds complete multi-tenancy support to the system

-- Step 1: Create tenants table
CREATE TABLE IF NOT EXISTS "tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "domain" TEXT UNIQUE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "maxUsers" INTEGER,
    "maxEvents" INTEGER,
    "maxStorage" BIGINT,
    "planType" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
    "subscriptionEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for tenants table
CREATE INDEX IF NOT EXISTS "tenants_slug_idx" ON "tenants"("slug");
CREATE INDEX IF NOT EXISTS "tenants_domain_idx" ON "tenants"("domain");
CREATE INDEX IF NOT EXISTS "tenants_isActive_idx" ON "tenants"("isActive");

-- Step 2: Insert default tenant for existing data
INSERT INTO "tenants" ("id", "name", "slug", "domain", "isActive", "planType", "subscriptionStatus", "createdAt", "updatedAt")
VALUES ('default_tenant', 'Default Organization', 'default', NULL, true, 'enterprise', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Step 3: Add tenantId column to all tables that need it

-- Core tables
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "contests" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "contestants" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "judges" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN DEFAULT false;

-- Supporting tables
ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "certifications" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "backup_logs" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- Step 4: Update existing records to use default tenant
UPDATE "events" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
UPDATE "contests" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
UPDATE "categories" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
UPDATE "contestants" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
UPDATE "judges" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
UPDATE "users" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
UPDATE "assignments" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
UPDATE "certifications" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
UPDATE "notifications" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
UPDATE "reports" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
UPDATE "audit_logs" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;
UPDATE "backup_logs" SET "tenantId" = 'default_tenant' WHERE "tenantId" IS NULL;

-- Step 5: Make tenantId NOT NULL after population
ALTER TABLE "events" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "contests" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "categories" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "contestants" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "judges" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "assignments" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "certifications" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "reports" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "backup_logs" ALTER COLUMN "tenantId" SET NOT NULL;

-- Step 6: Update unique constraints to include tenantId

-- Drop old unique constraints
ALTER TABLE "contestants" DROP CONSTRAINT IF EXISTS "contestants_email_key";
ALTER TABLE "judges" DROP CONSTRAINT IF EXISTS "judges_email_key";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";
ALTER TABLE "assignments" DROP CONSTRAINT IF EXISTS "assignments_judgeId_categoryId_key";
ALTER TABLE "certifications" DROP CONSTRAINT IF EXISTS "certifications_categoryId_contestId_eventId_key";

-- Add new unique constraints scoped to tenantId
CREATE UNIQUE INDEX IF NOT EXISTS "contestants_tenantId_email_key" ON "contestants"("tenantId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "judges_tenantId_email_key" ON "judges"("tenantId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_tenantId_email_key" ON "users"("tenantId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "assignments_tenantId_judgeId_categoryId_key" ON "assignments"("tenantId", "judgeId", "categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "certifications_tenantId_categoryId_contestId_eventId_key" ON "certifications"("tenantId", "categoryId", "contestId", "eventId");

-- Step 7: Create tenant-scoped indexes for all tables

-- Events
CREATE INDEX IF NOT EXISTS "events_tenantId_idx" ON "events"("tenantId");
CREATE INDEX IF NOT EXISTS "events_tenantId_archived_idx" ON "events"("tenantId", "archived");

-- Contests
CREATE INDEX IF NOT EXISTS "contests_tenantId_idx" ON "contests"("tenantId");
CREATE INDEX IF NOT EXISTS "contests_tenantId_eventId_idx" ON "contests"("tenantId", "eventId");

-- Categories
CREATE INDEX IF NOT EXISTS "categories_tenantId_idx" ON "categories"("tenantId");
CREATE INDEX IF NOT EXISTS "categories_tenantId_contestId_idx" ON "categories"("tenantId", "contestId");

-- Contestants
CREATE INDEX IF NOT EXISTS "contestants_tenantId_idx" ON "contestants"("tenantId");
CREATE INDEX IF NOT EXISTS "contestants_tenantId_contestantNumber_idx" ON "contestants"("tenantId", "contestantNumber");

-- Judges
CREATE INDEX IF NOT EXISTS "judges_tenantId_idx" ON "judges"("tenantId");

-- Users
CREATE INDEX IF NOT EXISTS "users_tenantId_idx" ON "users"("tenantId");
CREATE INDEX IF NOT EXISTS "users_tenantId_role_idx" ON "users"("tenantId", "role");
CREATE INDEX IF NOT EXISTS "users_tenantId_isActive_idx" ON "users"("tenantId", "isActive");

-- Assignments
CREATE INDEX IF NOT EXISTS "assignments_tenantId_idx" ON "assignments"("tenantId");
CREATE INDEX IF NOT EXISTS "assignments_tenantId_judgeId_status_idx" ON "assignments"("tenantId", "judgeId", "status");

-- Certifications
CREATE INDEX IF NOT EXISTS "certifications_tenantId_idx" ON "certifications"("tenantId");
CREATE INDEX IF NOT EXISTS "certifications_tenantId_status_idx" ON "certifications"("tenantId", "status");

-- Notifications
CREATE INDEX IF NOT EXISTS "notifications_tenantId_idx" ON "notifications"("tenantId");
CREATE INDEX IF NOT EXISTS "notifications_tenantId_userId_read_idx" ON "notifications"("tenantId", "userId", "read");

-- Reports
CREATE INDEX IF NOT EXISTS "reports_tenantId_idx" ON "reports"("tenantId");
CREATE INDEX IF NOT EXISTS "reports_tenantId_type_idx" ON "reports"("tenantId", "type");
CREATE INDEX IF NOT EXISTS "reports_tenantId_createdAt_idx" ON "reports"("tenantId", "createdAt");

-- Audit Logs
CREATE INDEX IF NOT EXISTS "audit_logs_tenantId_idx" ON "audit_logs"("tenantId");
CREATE INDEX IF NOT EXISTS "audit_logs_tenantId_userId_idx" ON "audit_logs"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "audit_logs_tenantId_action_idx" ON "audit_logs"("tenantId", "action");

-- Backup Logs
CREATE INDEX IF NOT EXISTS "backup_logs_tenantId_idx" ON "backup_logs"("tenantId");
CREATE INDEX IF NOT EXISTS "backup_logs_tenantId_type_status_idx" ON "backup_logs"("tenantId", "type", "status");

-- Step 8: Update backup_logs table to handle schema changes
ALTER TABLE "backup_logs" ALTER COLUMN "type" SET DEFAULT 'full';
ALTER TABLE "backup_logs" ALTER COLUMN "status" SET DEFAULT 'success';
ALTER TABLE "backup_logs" ALTER COLUMN "startedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "backup_logs" ALTER COLUMN "location" SET DEFAULT '';

-- Handle old columns if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'backup_logs' AND column_name = 'backupType') THEN
        UPDATE "backup_logs" SET "type" = "backupType" WHERE "type" IS NULL OR "type" = '';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'backup_logs' AND column_name = 'filePath') THEN
        UPDATE "backup_logs" SET "location" = "filePath" WHERE "location" IS NULL OR "location" = '';
    END IF;
END $$;

-- Migration complete
