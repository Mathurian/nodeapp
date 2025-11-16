-- CreateTable: Disaster Recovery Models
CREATE TABLE "dr_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "backupFrequency" TEXT NOT NULL DEFAULT 'daily',
    "backupRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "enableAutoBackup" BOOLEAN NOT NULL DEFAULT true,
    "enablePITR" BOOLEAN NOT NULL DEFAULT false,
    "enableDRTesting" BOOLEAN NOT NULL DEFAULT true,
    "drTestFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "backupLocations" JSONB NOT NULL DEFAULT '[]',
    "rtoMinutes" INTEGER NOT NULL DEFAULT 240,
    "rpoMinutes" INTEGER NOT NULL DEFAULT 60,
    "alertEmail" TEXT,
    "enableFailover" BOOLEAN NOT NULL DEFAULT false,
    "healthCheckInterval" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dr_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backup_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "backupType" TEXT NOT NULL DEFAULT 'full',
    "frequency" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT DEFAULT 'pending',
    "targets" JSONB NOT NULL DEFAULT '[]',
    "compression" BOOLEAN NOT NULL DEFAULT true,
    "encryption" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backup_targets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_targets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dr_test_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "testType" TEXT NOT NULL DEFAULT 'restore',
    "backupId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "testResults" JSONB,
    "errorMessage" TEXT,
    "automatedTest" BOOLEAN NOT NULL DEFAULT true,
    "testedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dr_test_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dr_metrics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "dr_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Workflow Customization Models
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'certification',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stepOrder" INTEGER NOT NULL,
    "requiredRole" TEXT,
    "autoAdvance" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "actions" JSONB,
    "notifyRoles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_transitions" (
    "id" TEXT NOT NULL,
    "fromStepId" TEXT NOT NULL,
    "toStepId" TEXT NOT NULL,
    "condition" TEXT DEFAULT 'approved',
    "transitionType" TEXT NOT NULL DEFAULT 'sequential',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "currentStepId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_step_executions" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "approvalStatus" TEXT,
    "comments" TEXT,
    "metadata" JSONB,

    CONSTRAINT "workflow_step_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Event-Driven Architecture Models
CREATE TABLE "event_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "payload" JSONB NOT NULL,
    "userId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'system',
    "correlationId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "metadata" JSONB,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "secret" TEXT,
    "headers" JSONB,
    "retryAttempts" INTEGER NOT NULL DEFAULT 3,
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dr_configs_tenantId_idx" ON "dr_configs"("tenantId");
CREATE INDEX "backup_schedules_tenantId_idx" ON "backup_schedules"("tenantId");
CREATE INDEX "backup_schedules_enabled_nextRunAt_idx" ON "backup_schedules"("enabled", "nextRunAt");
CREATE INDEX "backup_targets_tenantId_idx" ON "backup_targets"("tenantId");
CREATE INDEX "backup_targets_enabled_priority_idx" ON "backup_targets"("enabled", "priority");
CREATE INDEX "dr_test_logs_tenantId_idx" ON "dr_test_logs"("tenantId");
CREATE INDEX "dr_test_logs_tenantId_status_idx" ON "dr_test_logs"("tenantId", "status");
CREATE INDEX "dr_test_logs_startedAt_idx" ON "dr_test_logs"("startedAt");
CREATE INDEX "dr_metrics_tenantId_idx" ON "dr_metrics"("tenantId");
CREATE INDEX "dr_metrics_tenantId_metricType_timestamp_idx" ON "dr_metrics"("tenantId", "metricType", "timestamp");
CREATE INDEX "dr_metrics_metricType_timestamp_idx" ON "dr_metrics"("metricType", "timestamp");
CREATE INDEX "workflow_templates_tenantId_idx" ON "workflow_templates"("tenantId");
CREATE INDEX "workflow_templates_tenantId_isActive_idx" ON "workflow_templates"("tenantId", "isActive");
CREATE INDEX "workflow_templates_type_isActive_idx" ON "workflow_templates"("type", "isActive");
CREATE INDEX "workflow_steps_templateId_stepOrder_idx" ON "workflow_steps"("templateId", "stepOrder");
CREATE INDEX "workflow_transitions_fromStepId_idx" ON "workflow_transitions"("fromStepId");
CREATE INDEX "workflow_transitions_toStepId_idx" ON "workflow_transitions"("toStepId");
CREATE INDEX "workflow_instances_tenantId_idx" ON "workflow_instances"("tenantId");
CREATE INDEX "workflow_instances_tenantId_entityType_entityId_idx" ON "workflow_instances"("tenantId", "entityType", "entityId");
CREATE INDEX "workflow_instances_status_idx" ON "workflow_instances"("status");
CREATE INDEX "workflow_step_executions_instanceId_idx" ON "workflow_step_executions"("instanceId");
CREATE INDEX "workflow_step_executions_status_idx" ON "workflow_step_executions"("status");
CREATE INDEX "event_logs_tenantId_idx" ON "event_logs"("tenantId");
CREATE INDEX "event_logs_tenantId_eventType_idx" ON "event_logs"("tenantId", "eventType");
CREATE INDEX "event_logs_eventType_timestamp_idx" ON "event_logs"("eventType", "timestamp");
CREATE INDEX "event_logs_correlationId_idx" ON "event_logs"("correlationId");
CREATE INDEX "event_logs_processed_idx" ON "event_logs"("processed");
CREATE INDEX "event_logs_timestamp_idx" ON "event_logs"("timestamp");
CREATE INDEX "webhook_configs_tenantId_idx" ON "webhook_configs"("tenantId");
CREATE INDEX "webhook_configs_enabled_idx" ON "webhook_configs"("enabled");
CREATE INDEX "webhook_deliveries_webhookId_idx" ON "webhook_deliveries"("webhookId");
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries"("status");
CREATE INDEX "webhook_deliveries_createdAt_idx" ON "webhook_deliveries"("createdAt");

-- AddForeignKey
ALTER TABLE "dr_configs" ADD CONSTRAINT "dr_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backup_schedules" ADD CONSTRAINT "backup_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backup_targets" ADD CONSTRAINT "backup_targets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dr_test_logs" ADD CONSTRAINT "dr_test_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dr_metrics" ADD CONSTRAINT "dr_metrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_fromStepId_fkey" FOREIGN KEY ("fromStepId") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_toStepId_fkey" FOREIGN KEY ("toStepId") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_step_executions" ADD CONSTRAINT "workflow_step_executions_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhook_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
