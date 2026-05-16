-- AlterEnum
ALTER TYPE "PermissionAuditChangeType" ADD VALUE IF NOT EXISTS 'OPERATION_SCOPE';

-- AlterTable
ALTER TABLE "role_permission_scopes"
ADD COLUMN "operation" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "role_permission_scopes_tenantId_role_resource_key";

-- CreateIndex
CREATE INDEX "role_permission_scopes_tenantId_role_resource_operation_idx"
ON "role_permission_scopes"("tenantId", "role", "resource", "operation");

-- CreateIndex
CREATE INDEX "role_permission_scopes_operation_idx"
ON "role_permission_scopes"("operation");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_scopes_resource_default_key"
ON "role_permission_scopes"("tenantId", "role", "resource")
WHERE "operation" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_scopes_operation_override_key"
ON "role_permission_scopes"("tenantId", "role", "resource", "operation")
WHERE "operation" IS NOT NULL;
