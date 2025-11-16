-- Comprehensive Index Migration for Performance Optimization
-- Generated: 2025-11-12
-- This migration adds missing indexes to improve query performance

-- Event indexes
CREATE INDEX IF NOT EXISTS "idx_events_archived" ON "events"("archived");
CREATE INDEX IF NOT EXISTS "idx_events_start_date" ON "events"("startDate");
CREATE INDEX IF NOT EXISTS "idx_events_end_date" ON "events"("endDate");
CREATE INDEX IF NOT EXISTS "idx_events_created_at" ON "events"("createdAt");

-- Contest indexes
CREATE INDEX IF NOT EXISTS "idx_contests_event_id" ON "contests"("eventId");
CREATE INDEX IF NOT EXISTS "idx_contests_archived" ON "contests"("archived");
CREATE INDEX IF NOT EXISTS "idx_contests_event_archived" ON "contests"("eventId", "archived");
CREATE INDEX IF NOT EXISTS "idx_contests_created_at" ON "contests"("createdAt");

-- Category indexes
CREATE INDEX IF NOT EXISTS "idx_categories_contest_id" ON "categories"("contestId");
CREATE INDEX IF NOT EXISTS "idx_categories_certified" ON "categories"("totalsCertified");
CREATE INDEX IF NOT EXISTS "idx_categories_contest_certified" ON "categories"("contestId", "totalsCertified");

-- User indexes (critical for authentication and queries)
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users"("role");
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "users"("isActive");
CREATE INDEX IF NOT EXISTS "idx_users_role_active" ON "users"("role", "isActive");
CREATE INDEX IF NOT EXISTS "idx_users_judge_id" ON "users"("judgeId") WHERE "judgeId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_users_contestant_id" ON "users"("contestantId") WHERE "contestantId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_users_last_login" ON "users"("lastLoginAt");
CREATE INDEX IF NOT EXISTS "idx_users_session_version" ON "users"("sessionVersion");

-- Score indexes (most queried table)
CREATE INDEX IF NOT EXISTS "idx_scores_judge_id" ON "scores"("judgeId");
CREATE INDEX IF NOT EXISTS "idx_scores_contestant_id" ON "scores"("contestantId");
CREATE INDEX IF NOT EXISTS "idx_scores_category_locked" ON "scores"("categoryId", "isLocked");
CREATE INDEX IF NOT EXISTS "idx_scores_created_at" ON "scores"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_scores_updated_at" ON "scores"("updatedAt");
CREATE INDEX IF NOT EXISTS "idx_scores_certified_at" ON "scores"("certifiedAt") WHERE "certifiedAt" IS NOT NULL;

-- Assignment indexes
CREATE INDEX IF NOT EXISTS "idx_assignments_event_id" ON "assignments"("eventId");
CREATE INDEX IF NOT EXISTS "idx_assignments_category_id" ON "assignments"("categoryId") WHERE "categoryId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_assignments_assigned_at" ON "assignments"("assignedAt");

-- Certification indexes
CREATE INDEX IF NOT EXISTS "idx_certifications_status" ON "certifications"("status");
CREATE INDEX IF NOT EXISTS "idx_certifications_event_id" ON "certifications"("eventId");
CREATE INDEX IF NOT EXISTS "idx_certifications_contest_id" ON "certifications"("contestId");
CREATE INDEX IF NOT EXISTS "idx_certifications_category_id" ON "certifications"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_certifications_user_id" ON "certifications"("userId") WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_certifications_event_status" ON "certifications"("eventId", "status");
CREATE INDEX IF NOT EXISTS "idx_certifications_created_at" ON "certifications"("createdAt");

-- Activity Log indexes (critical for audit trail queries)
CREATE INDEX IF NOT EXISTS "idx_activity_logs_user_id" ON "activity_logs"("userId") WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_activity_logs_created_at" ON "activity_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_action" ON "activity_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_resource" ON "activity_logs"("resourceType", "resourceId");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_user_created" ON "activity_logs"("userId", "createdAt") WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_activity_logs_log_level" ON "activity_logs"("logLevel");

-- Performance Log indexes
CREATE INDEX IF NOT EXISTS "idx_performance_logs_endpoint" ON "performance_logs"("endpoint");
CREATE INDEX IF NOT EXISTS "idx_performance_logs_created_at" ON "performance_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_performance_logs_response_time" ON "performance_logs"("responseTime");
CREATE INDEX IF NOT EXISTS "idx_performance_logs_status_code" ON "performance_logs"("statusCode");
CREATE INDEX IF NOT EXISTS "idx_performance_logs_user_id" ON "performance_logs"("userId") WHERE "userId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_performance_logs_endpoint_created" ON "performance_logs"("endpoint", "createdAt");

-- Judge and Contestant relationship indexes
CREATE INDEX IF NOT EXISTS "idx_category_judges_category_id" ON "category_judges"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_category_judges_judge_id" ON "category_judges"("judgeId");
CREATE INDEX IF NOT EXISTS "idx_category_contestants_category_id" ON "category_contestants"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_category_contestants_contestant_id" ON "category_contestants"("contestantId");
CREATE INDEX IF NOT EXISTS "idx_contest_judges_contest_id" ON "contest_judges"("contestId");
CREATE INDEX IF NOT EXISTS "idx_contest_judges_judge_id" ON "contest_judges"("judgeId");
CREATE INDEX IF NOT EXISTS "idx_contest_contestants_contest_id" ON "contest_contestants"("contestId");
CREATE INDEX IF NOT EXISTS "idx_contest_contestants_contestant_id" ON "contest_contestants"("contestantId");

-- Judge Comment indexes
CREATE INDEX IF NOT EXISTS "idx_judge_comments_category_id" ON "judge_comments"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_judge_comments_judge_id" ON "judge_comments"("judgeId");
CREATE INDEX IF NOT EXISTS "idx_judge_comments_contestant_id" ON "judge_comments"("contestantId");
CREATE INDEX IF NOT EXISTS "idx_judge_comments_created_at" ON "judge_comments"("createdAt");

-- Certification-related indexes
CREATE INDEX IF NOT EXISTS "idx_judge_certifications_category_id" ON "judge_certifications"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_judge_certifications_judge_id" ON "judge_certifications"("judgeId");
CREATE INDEX IF NOT EXISTS "idx_judge_certifications_certified_at" ON "judge_certifications"("certifiedAt");

CREATE INDEX IF NOT EXISTS "idx_category_certifications_category_id" ON "category_certifications"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_category_certifications_user_id" ON "category_certifications"("userId");
CREATE INDEX IF NOT EXISTS "idx_category_certifications_role" ON "category_certifications"("role");
CREATE INDEX IF NOT EXISTS "idx_category_certifications_certified_at" ON "category_certifications"("certifiedAt");

CREATE INDEX IF NOT EXISTS "idx_contest_certifications_contest_id" ON "contest_certifications"("contestId");
CREATE INDEX IF NOT EXISTS "idx_contest_certifications_user_id" ON "contest_certifications"("userId");
CREATE INDEX IF NOT EXISTS "idx_contest_certifications_role" ON "contest_certifications"("role");

CREATE INDEX IF NOT EXISTS "idx_judge_contestant_cert_category_id" ON "judge_contestant_certifications"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_judge_contestant_cert_judge_id" ON "judge_contestant_certifications"("judgeId");
CREATE INDEX IF NOT EXISTS "idx_judge_contestant_cert_contestant_id" ON "judge_contestant_certifications"("contestantId");

-- File indexes
CREATE INDEX IF NOT EXISTS "idx_files_uploaded_by" ON "files"("uploadedBy");
CREATE INDEX IF NOT EXISTS "idx_files_category" ON "files"("category");
CREATE INDEX IF NOT EXISTS "idx_files_event_id" ON "files"("eventId") WHERE "eventId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_files_contest_id" ON "files"("contestId") WHERE "contestId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_files_category_id" ON "files"("categoryId") WHERE "categoryId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_files_uploaded_at" ON "files"("uploadedAt");

-- Backup Log indexes
CREATE INDEX IF NOT EXISTS "idx_backup_logs_created_at" ON "backup_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_backup_logs_status" ON "backup_logs"("status");
CREATE INDEX IF NOT EXISTS "idx_backup_logs_type" ON "backup_logs"("backupType");
CREATE INDEX IF NOT EXISTS "idx_backup_logs_created_by" ON "backup_logs"("createdById") WHERE "createdById" IS NOT NULL;

-- Report indexes
CREATE INDEX IF NOT EXISTS "idx_reports_generated_by" ON "reports"("generatedBy");
CREATE INDEX IF NOT EXISTS "idx_reports_type" ON "reports"("type");
CREATE INDEX IF NOT EXISTS "idx_reports_status" ON "reports"("status");
CREATE INDEX IF NOT EXISTS "idx_reports_created_at" ON "reports"("createdAt");

CREATE INDEX IF NOT EXISTS "idx_report_instances_generated_by" ON "report_instances"("generatedById");
CREATE INDEX IF NOT EXISTS "idx_report_instances_template_id" ON "report_instances"("templateId") WHERE "templateId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_report_instances_generated_at" ON "report_instances"("generatedAt");
CREATE INDEX IF NOT EXISTS "idx_report_instances_type" ON "report_instances"("type");

-- Deduction Request indexes
CREATE INDEX IF NOT EXISTS "idx_deduction_requests_status" ON "deduction_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_deduction_requests_category_id" ON "deduction_requests"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_deduction_requests_contestant_id" ON "deduction_requests"("contestantId");
CREATE INDEX IF NOT EXISTS "idx_deduction_requests_requested_by" ON "deduction_requests"("requestedById");
CREATE INDEX IF NOT EXISTS "idx_deduction_requests_created_at" ON "deduction_requests"("createdAt");

-- Score Removal Request indexes
CREATE INDEX IF NOT EXISTS "idx_score_removal_requests_status" ON "score_removal_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_score_removal_requests_category_id" ON "score_removal_requests"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_score_removal_requests_judge_id" ON "score_removal_requests"("judgeId");
CREATE INDEX IF NOT EXISTS "idx_score_removal_requests_requested_by" ON "score_removal_requests"("requestedBy");
CREATE INDEX IF NOT EXISTS "idx_score_removal_requests_requested_at" ON "score_removal_requests"("requestedAt");

-- Judge Uncertification Request indexes
CREATE INDEX IF NOT EXISTS "idx_judge_uncert_requests_status" ON "judge_uncertification_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_judge_uncert_requests_category_id" ON "judge_uncertification_requests"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_judge_uncert_requests_judge_id" ON "judge_uncertification_requests"("judgeId");
CREATE INDEX IF NOT EXISTS "idx_judge_uncert_requests_requested_by" ON "judge_uncertification_requests"("requestedBy");
CREATE INDEX IF NOT EXISTS "idx_judge_uncert_requests_requested_at" ON "judge_uncertification_requests"("requestedAt");

-- System Setting indexes
CREATE INDEX IF NOT EXISTS "idx_system_settings_category" ON "system_settings"("category") WHERE "category" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_system_settings_updated_at" ON "system_settings"("updatedAt");

-- Archived Event indexes
CREATE INDEX IF NOT EXISTS "idx_archived_events_event_id" ON "archived_events"("eventId");
CREATE INDEX IF NOT EXISTS "idx_archived_events_archived_at" ON "archived_events"("archivedAt");

-- Winner Signature indexes
CREATE INDEX IF NOT EXISTS "idx_winner_signatures_category_id" ON "winner_signatures"("categoryId");
CREATE INDEX IF NOT EXISTS "idx_winner_signatures_contest_id" ON "winner_signatures"("contestId");
CREATE INDEX IF NOT EXISTS "idx_winner_signatures_event_id" ON "winner_signatures"("eventId");
CREATE INDEX IF NOT EXISTS "idx_winner_signatures_user_id" ON "winner_signatures"("userId");
CREATE INDEX IF NOT EXISTS "idx_winner_signatures_signed_at" ON "winner_signatures"("signedAt");

-- Emcee Script indexes
CREATE INDEX IF NOT EXISTS "idx_emcee_scripts_event_id" ON "emcee_scripts"("eventId") WHERE "eventId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_emcee_scripts_contest_id" ON "emcee_scripts"("contestId") WHERE "contestId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_emcee_scripts_category_id" ON "emcee_scripts"("categoryId") WHERE "categoryId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_emcee_scripts_order" ON "emcee_scripts"("order") WHERE "order" IS NOT NULL;
