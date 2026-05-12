-- CreateEnum
CREATE TYPE "PermissionScopeLevel" AS ENUM ('ASSIGNMENT', 'EVENT', 'TENANT');

-- CreateEnum
CREATE TYPE "PermissionAuditChangeType" AS ENUM ('ACTION_PERMISSION', 'RESOURCE_SCOPE');

-- AlterTable
ALTER TABLE "permission_audit_logs"
ADD COLUMN "changeType" "PermissionAuditChangeType" NOT NULL DEFAULT 'ACTION_PERMISSION',
ADD COLUMN "newScope" "PermissionScopeLevel",
ADD COLUMN "previousScope" "PermissionScopeLevel";

-- CreateTable
CREATE TABLE "role_permission_scopes" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "resource" TEXT NOT NULL,
    "scope" "PermissionScopeLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "role_permission_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_permission_scopes_tenantId_role_idx" ON "role_permission_scopes"("tenantId", "role");

-- CreateIndex
CREATE INDEX "role_permission_scopes_resource_idx" ON "role_permission_scopes"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_scopes_tenantId_role_resource_key" ON "role_permission_scopes"("tenantId", "role", "resource");
