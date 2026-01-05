-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_audit_logs" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "previousVal" BOOLEAN,
    "newVal" BOOLEAN NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "permission_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_permissions_tenantId_role_idx" ON "role_permissions"("tenantId", "role");

-- CreateIndex
CREATE INDEX "role_permissions_resource_idx" ON "role_permissions"("resource");

-- CreateIndex
CREATE UNIQUE INDEX "tenantId_role_resource_operation" ON "role_permissions"("tenantId", "role", "resource", "operation");

-- CreateIndex
CREATE INDEX "permission_audit_logs_tenantId_changedAt_idx" ON "permission_audit_logs"("tenantId", "changedAt");

-- Migration Notes:
-- Phase 4: Dynamic CRUD Permissions System
-- This migration adds support for database-driven permission management
-- allowing administrators to configure role permissions via GUI
