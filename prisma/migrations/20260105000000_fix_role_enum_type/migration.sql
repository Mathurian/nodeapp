-- Fix role column type to use UserRole enum instead of TEXT
-- This fixes the "operator does not exist: text = \"UserRole\"" error

-- Alter role_permissions table
ALTER TABLE "role_permissions"
  ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";

-- Alter permission_audit_logs table
ALTER TABLE "permission_audit_logs"
  ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
