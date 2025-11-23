-- Migration: Add missing tenantId columns to 39 tables
-- Date: 2025-11-20
-- Description: Extensive schema drift fix - adding tenantId columns and constraints

-- 1. archived_events
ALTER TABLE archived_events ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "archived_events_tenantId_idx" ON archived_events("tenantId");

-- 2. backup_settings
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "backup_settings_tenantId_idx" ON backup_settings("tenantId");

-- 3. category_certifications
ALTER TABLE category_certifications ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "category_certifications_tenantId_idx" ON category_certifications("tenantId");

-- 4. category_templates
ALTER TABLE category_templates ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "category_templates_tenantId_idx" ON category_templates("tenantId");

-- 5. category_types
ALTER TABLE category_types ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "category_types_tenantId_idx" ON category_types("tenantId");

-- 6. contest_certifications
ALTER TABLE contest_certifications ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "contest_certifications_tenantId_idx" ON contest_certifications("tenantId");

-- 7. custom_fields
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "custom_fields_tenantId_idx" ON custom_fields("tenantId");

-- 8. custom_field_values
ALTER TABLE custom_field_values ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "custom_field_values_tenantId_idx" ON custom_field_values("tenantId");

-- 9. deduction_approvals
ALTER TABLE deduction_approvals ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "deduction_approvals_tenantId_idx" ON deduction_approvals("tenantId");

-- 10. deduction_requests
ALTER TABLE deduction_requests ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "deduction_requests_tenantId_idx" ON deduction_requests("tenantId");

-- 11. email_logs
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "email_logs_tenantId_idx" ON email_logs("tenantId");

-- 12. emcee_scripts
ALTER TABLE emcee_scripts ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "emcee_scripts_tenantId_idx" ON emcee_scripts("tenantId");

-- 13. event_templates
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "event_templates_tenantId_idx" ON event_templates("tenantId");

-- 14. files
ALTER TABLE files ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "files_tenantId_idx" ON files("tenantId");

-- 15. judge_certifications
ALTER TABLE judge_certifications ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "judge_certifications_tenantId_idx" ON judge_certifications("tenantId");

-- 16. judge_comments
ALTER TABLE judge_comments ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "judge_comments_tenantId_idx" ON judge_comments("tenantId");

-- 17. judge_contestant_certifications
ALTER TABLE judge_contestant_certifications ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "judge_contestant_certifications_tenantId_idx" ON judge_contestant_certifications("tenantId");

-- 18. judge_score_removal_requests
ALTER TABLE judge_score_removal_requests ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "judge_score_removal_requests_tenantId_idx" ON judge_score_removal_requests("tenantId");

-- 19. judge_uncertification_requests
ALTER TABLE judge_uncertification_requests ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "judge_uncertification_requests_tenantId_idx" ON judge_uncertification_requests("tenantId");

-- 20. notification_digests
ALTER TABLE notification_digests ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "notification_digests_tenantId_idx" ON notification_digests("tenantId");

-- 21. notification_templates
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "notification_templates_tenantId_idx" ON notification_templates("tenantId");

-- 22. overall_deductions
ALTER TABLE overall_deductions ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "overall_deductions_tenantId_idx" ON overall_deductions("tenantId");

-- 23. report_instances
ALTER TABLE report_instances ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "report_instances_tenantId_idx" ON report_instances("tenantId");

-- 24. report_templates
ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "report_templates_tenantId_idx" ON report_templates("tenantId");

-- 25. review_contestant_certifications
ALTER TABLE review_contestant_certifications ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "review_contestant_certifications_tenantId_idx" ON review_contestant_certifications("tenantId");

-- 26. review_judge_score_certifications
ALTER TABLE review_judge_score_certifications ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "review_judge_score_certifications_tenantId_idx" ON review_judge_score_certifications("tenantId");

-- 27. role_assignments
ALTER TABLE role_assignments ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "role_assignments_tenantId_idx" ON role_assignments("tenantId");

-- 28. saved_searches
ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "saved_searches_tenantId_idx" ON saved_searches("tenantId");

-- 29. score_comments
ALTER TABLE score_comments ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "score_comments_tenantId_idx" ON score_comments("tenantId");

-- 30. score_files
ALTER TABLE score_files ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "score_files_tenantId_idx" ON score_files("tenantId");

-- 31. score_removal_requests
ALTER TABLE score_removal_requests ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "score_removal_requests_tenantId_idx" ON score_removal_requests("tenantId");

-- 32. template_criteria
ALTER TABLE template_criteria ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "template_criteria_tenantId_idx" ON template_criteria("tenantId");

-- 33. theme_settings
ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "theme_settings_tenantId_idx" ON theme_settings("tenantId");

-- 34. user_field_configurations
ALTER TABLE user_field_configurations ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "user_field_configurations_tenantId_idx" ON user_field_configurations("tenantId");

-- 35. webhook_deliveries
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "webhook_deliveries_tenantId_idx" ON webhook_deliveries("tenantId");

-- 36. winner_signatures
ALTER TABLE winner_signatures ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "winner_signatures_tenantId_idx" ON winner_signatures("tenantId");

-- 37. workflow_steps
ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "workflow_steps_tenantId_idx" ON workflow_steps("tenantId");

-- 38. workflow_step_executions
ALTER TABLE workflow_step_executions ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "workflow_step_executions_tenantId_idx" ON workflow_step_executions("tenantId");

-- 39. workflow_transitions
ALTER TABLE workflow_transitions ADD COLUMN IF NOT EXISTS "tenantId" TEXT NOT NULL DEFAULT 'default_tenant';
CREATE INDEX IF NOT EXISTS "workflow_transitions_tenantId_idx" ON workflow_transitions("tenantId");

-- Add foreign key constraints (split to avoid transaction size issues)
-- Part 1: Tables 1-13
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'archived_events_tenantId_fkey') THEN
    ALTER TABLE archived_events ADD CONSTRAINT "archived_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'backup_settings_tenantId_fkey') THEN
    ALTER TABLE backup_settings ADD CONSTRAINT "backup_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_certifications_tenantId_fkey') THEN
    ALTER TABLE category_certifications ADD CONSTRAINT "category_certifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_templates_tenantId_fkey') THEN
    ALTER TABLE category_templates ADD CONSTRAINT "category_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_types_tenantId_fkey') THEN
    ALTER TABLE category_types ADD CONSTRAINT "category_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contest_certifications_tenantId_fkey') THEN
    ALTER TABLE contest_certifications ADD CONSTRAINT "contest_certifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_fields_tenantId_fkey') THEN
    ALTER TABLE custom_fields ADD CONSTRAINT "custom_fields_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_field_values_tenantId_fkey') THEN
    ALTER TABLE custom_field_values ADD CONSTRAINT "custom_field_values_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deduction_approvals_tenantId_fkey') THEN
    ALTER TABLE deduction_approvals ADD CONSTRAINT "deduction_approvals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deduction_requests_tenantId_fkey') THEN
    ALTER TABLE deduction_requests ADD CONSTRAINT "deduction_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_logs_tenantId_fkey') THEN
    ALTER TABLE email_logs ADD CONSTRAINT "email_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'emcee_scripts_tenantId_fkey') THEN
    ALTER TABLE emcee_scripts ADD CONSTRAINT "emcee_scripts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_templates_tenantId_fkey') THEN
    ALTER TABLE event_templates ADD CONSTRAINT "event_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Part 2: Tables 14-26
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'files_tenantId_fkey') THEN
    ALTER TABLE files ADD CONSTRAINT "files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'judge_certifications_tenantId_fkey') THEN
    ALTER TABLE judge_certifications ADD CONSTRAINT "judge_certifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'judge_comments_tenantId_fkey') THEN
    ALTER TABLE judge_comments ADD CONSTRAINT "judge_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'judge_contestant_certifications_tenantId_fkey') THEN
    ALTER TABLE judge_contestant_certifications ADD CONSTRAINT "judge_contestant_certifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'judge_score_removal_requests_tenantId_fkey') THEN
    ALTER TABLE judge_score_removal_requests ADD CONSTRAINT "judge_score_removal_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'judge_uncertification_requests_tenantId_fkey') THEN
    ALTER TABLE judge_uncertification_requests ADD CONSTRAINT "judge_uncertification_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_digests_tenantId_fkey') THEN
    ALTER TABLE notification_digests ADD CONSTRAINT "notification_digests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_templates_tenantId_fkey') THEN
    ALTER TABLE notification_templates ADD CONSTRAINT "notification_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'overall_deductions_tenantId_fkey') THEN
    ALTER TABLE overall_deductions ADD CONSTRAINT "overall_deductions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_instances_tenantId_fkey') THEN
    ALTER TABLE report_instances ADD CONSTRAINT "report_instances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'report_templates_tenantId_fkey') THEN
    ALTER TABLE report_templates ADD CONSTRAINT "report_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_contestant_certifications_tenantId_fkey') THEN
    ALTER TABLE review_contestant_certifications ADD CONSTRAINT "review_contestant_certifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_judge_score_certifications_tenantId_fkey') THEN
    ALTER TABLE review_judge_score_certifications ADD CONSTRAINT "review_judge_score_certifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Part 3: Tables 27-39
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_assignments_tenantId_fkey') THEN
    ALTER TABLE role_assignments ADD CONSTRAINT "role_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_searches_tenantId_fkey') THEN
    ALTER TABLE saved_searches ADD CONSTRAINT "saved_searches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'score_comments_tenantId_fkey') THEN
    ALTER TABLE score_comments ADD CONSTRAINT "score_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'score_files_tenantId_fkey') THEN
    ALTER TABLE score_files ADD CONSTRAINT "score_files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'score_removal_requests_tenantId_fkey') THEN
    ALTER TABLE score_removal_requests ADD CONSTRAINT "score_removal_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'template_criteria_tenantId_fkey') THEN
    ALTER TABLE template_criteria ADD CONSTRAINT "template_criteria_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'theme_settings_tenantId_fkey') THEN
    ALTER TABLE theme_settings ADD CONSTRAINT "theme_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_field_configurations_tenantId_fkey') THEN
    ALTER TABLE user_field_configurations ADD CONSTRAINT "user_field_configurations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'webhook_deliveries_tenantId_fkey') THEN
    ALTER TABLE webhook_deliveries ADD CONSTRAINT "webhook_deliveries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'winner_signatures_tenantId_fkey') THEN
    ALTER TABLE winner_signatures ADD CONSTRAINT "winner_signatures_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workflow_steps_tenantId_fkey') THEN
    ALTER TABLE workflow_steps ADD CONSTRAINT "workflow_steps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workflow_step_executions_tenantId_fkey') THEN
    ALTER TABLE workflow_step_executions ADD CONSTRAINT "workflow_step_executions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workflow_transitions_tenantId_fkey') THEN
    ALTER TABLE workflow_transitions ADD CONSTRAINT "workflow_transitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
