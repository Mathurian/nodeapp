# Tenant Enforcement Matrix

Generated: 2026-02-19T08:00:29.382Z
Source command: `node scripts/ops/generate-tenant-enforcement-matrix.js`

## Summary

- Endpoint entries discovered (v1/direct mounts): 655
- Route modules with no active mount in routes config: 1
- DB-touching files discovered: 157
- Prisma models: 88
- Tenant-scoped required models: 64
- Tenant-scoped optional models: 12
- Global/system models: 12

## Endpoint Scope Matrix

| Method | Endpoint | Expected scope | Roles | Route file |
| --- | --- | --- | --- | --- |
| GET | `/api/admin/backups` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| POST | `/api/admin/backups/alert` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/admin/backups/files` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| POST | `/api/admin/backups/full` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/admin/backups/health` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/admin/backups/latest` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| POST | `/api/admin/backups/log` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| DELETE | `/api/admin/backups/logs/cleanup` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/admin/backups/stats` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/admin/backups/trend` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| POST | `/api/admin/backups/verify` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/admin/rate-limit-configs` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| POST | `/api/admin/rate-limit-configs` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| DELETE | `/api/admin/rate-limit-configs/:id` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| GET | `/api/admin/rate-limit-configs/:id` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| PUT | `/api/admin/rate-limit-configs/:id` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| GET | `/api/admin/rate-limit-configs/effective` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| GET | `/api/admin/rate-limit-configs/tiers` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| PUT | `/api/admin/rate-limit-configs/tiers` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| POST | `/api/admin/rate-limit-configs/tiers/reset` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| GET | `/api/docs` | PUBLIC | - | `src/routes/docs.ts` |
| GET | `/api/docs/*` | PUBLIC | - | `src/routes/docs.ts` |
| GET | `/api/docs/category/:category` | PUBLIC | - | `src/routes/docs.ts` |
| GET | `/api/docs/search` | PUBLIC | - | `src/routes/docs.ts` |
| GET | `/api/email-templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| POST | `/api/email-templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| DELETE | `/api/email-templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| GET | `/api/email-templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| PUT | `/api/email-templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| POST | `/api/email-templates/:id/clone` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| POST | `/api/email-templates/:id/preview` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| POST | `/api/email-templates/:id/send` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| GET | `/api/email-templates/type/:type` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| GET | `/api/email-templates/variables/:type` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| GET | `/api/v1/admin/active-users` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/audit-logs` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/backups` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| POST | `/api/v1/admin/backups/alert` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/v1/admin/backups/files` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| POST | `/api/v1/admin/backups/full` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/v1/admin/backups/health` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/v1/admin/backups/latest` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| POST | `/api/v1/admin/backups/log` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| DELETE | `/api/v1/admin/backups/logs/cleanup` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/v1/admin/backups/stats` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/v1/admin/backups/trend` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| POST | `/api/v1/admin/backups/verify` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupAdmin.ts` |
| GET | `/api/v1/admin/categories` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/contestant/:contestantId/scores` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/contests` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/database/tables` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/database/tables/:tableName/data` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/database/tables/:tableName/structure` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/events` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| POST | `/api/v1/admin/export-audit-logs` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/login-locations` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/logs` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/password-policy` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| PUT | `/api/v1/admin/password-policy` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/rate-limit-configs` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| POST | `/api/v1/admin/rate-limit-configs` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| DELETE | `/api/v1/admin/rate-limit-configs/:id` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| GET | `/api/v1/admin/rate-limit-configs/:id` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| PUT | `/api/v1/admin/rate-limit-configs/:id` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| GET | `/api/v1/admin/rate-limit-configs/effective` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| GET | `/api/v1/admin/rate-limit-configs/tiers` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| PUT | `/api/v1/admin/rate-limit-configs/tiers` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| POST | `/api/v1/admin/rate-limit-configs/tiers/reset` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | - | `src/routes/rateLimitConfigRoutes.ts` |
| GET | `/api/v1/admin/scores` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/settings` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| PUT | `/api/v1/admin/settings` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/settings/backup` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| PUT | `/api/v1/admin/settings/backup` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/settings/email` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| PUT | `/api/v1/admin/settings/email` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/settings/logging` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| PUT | `/api/v1/admin/settings/logging` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/settings/security` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| PUT | `/api/v1/admin/settings/security` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/stats` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| POST | `/api/v1/admin/test/:type` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/admin/users` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/adminRoutes.ts` |
| POST | `/api/v1/admin/users/:id/force-logout` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| POST | `/api/v1/admin/users/force-logout-all` | TENANT_SCOPED | - | `src/routes/adminRoutes.ts` |
| GET | `/api/v1/advanced-reporting/event` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/advancedReportingRoutes.ts` |
| GET | `/api/v1/archive` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/archiveRoutes.ts` |
| DELETE | `/api/v1/archive/event/:eventId` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/archiveRoutes.ts` |
| POST | `/api/v1/archive/event/:eventId` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/archiveRoutes.ts` |
| POST | `/api/v1/archive/event/:eventId/restore` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/archiveRoutes.ts` |
| DELETE | `/api/v1/archive/events/:eventId` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/archiveRoutes.ts` |
| POST | `/api/v1/archive/events/:eventId/restore` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/archiveRoutes.ts` |
| GET | `/api/v1/assignments` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/assignmentsRoutes.ts` |
| POST | `/api/v1/assignments` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| GET | `/api/v1/assignments/auditors` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| POST | `/api/v1/assignments/auditors` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| DELETE | `/api/v1/assignments/auditors/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| GET | `/api/v1/assignments/categories` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| DELETE | `/api/v1/assignments/category/:categoryId/contestant/:contestantId` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| GET | `/api/v1/assignments/category/:categoryId/contestants` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| GET | `/api/v1/assignments/contestants` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| POST | `/api/v1/assignments/contestants` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| GET | `/api/v1/assignments/contestants/assignments` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| POST | `/api/v1/assignments/judge` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| GET | `/api/v1/assignments/judges` | TENANT_SCOPED | - | `src/routes/assignmentsRoutes.ts` |
| PUT | `/api/v1/assignments/remove/:assignmentId` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| GET | `/api/v1/assignments/tally-masters` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| POST | `/api/v1/assignments/tally-masters` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| DELETE | `/api/v1/assignments/tally-masters/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/assignmentsRoutes.ts` |
| GET | `/api/v1/auditor/audit-history` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| POST | `/api/v1/auditor/category/:categoryId/final-certification` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| GET | `/api/v1/auditor/category/:categoryId/final-certification/status` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| POST | `/api/v1/auditor/category/:categoryId/final-certification/submit` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| POST | `/api/v1/auditor/category/:categoryId/reject` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| GET | `/api/v1/auditor/certification-workflow/:categoryId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| GET | `/api/v1/auditor/completed-audits` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| GET | `/api/v1/auditor/pending-audits` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| GET | `/api/v1/auditor/score-verification/:categoryId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| GET | `/api/v1/auditor/score-verification/:categoryId/:contestantId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| GET | `/api/v1/auditor/stats` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| POST | `/api/v1/auditor/summary-report` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| GET | `/api/v1/auditor/tally-status/:categoryId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| POST | `/api/v1/auditor/verify-score/:scoreId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/auditorRoutes.ts` |
| POST | `/api/v1/auth/complete-invitation-registration` | PUBLIC_AUTH_FLOW | - | `src/routes/authRoutes.ts` |
| POST | `/api/v1/auth/forgot-password` | PUBLIC_AUTH_FLOW | - | `src/routes/authRoutes.ts` |
| POST | `/api/v1/auth/login` | PUBLIC_AUTH_FLOW | - | `src/routes/authRoutes.ts` |
| POST | `/api/v1/auth/logout` | PUBLIC_AUTH_FLOW | - | `src/routes/authRoutes.ts` |
| POST | `/api/v1/auth/mfa/challenge` | PUBLIC_AUTH_FLOW | - | `src/routes/authRoutes.ts` |
| POST | `/api/v1/auth/mfa/complete` | PUBLIC_AUTH_FLOW | - | `src/routes/authRoutes.ts` |
| GET | `/api/v1/auth/permissions` | TENANT_SCOPED | - | `src/routes/authRoutes.ts` |
| GET | `/api/v1/auth/profile` | TENANT_SCOPED | - | `src/routes/authRoutes.ts` |
| POST | `/api/v1/auth/reset-password` | PUBLIC_AUTH_FLOW | - | `src/routes/authRoutes.ts` |
| GET | `/api/v1/backups` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| POST | `/api/v1/backups` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| DELETE | `/api/v1/backups/:id` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| POST | `/api/v1/backups/create` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| POST | `/api/v1/backups/restore` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| GET | `/api/v1/backups/schedules/active` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| GET | `/api/v1/backups/settings` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| POST | `/api/v1/backups/settings` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| DELETE | `/api/v1/backups/settings/:id` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| PUT | `/api/v1/backups/settings/:id` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| GET | `/api/v1/backups/settings/debug` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| POST | `/api/v1/backups/settings/test/run` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/backupRoutes.ts` |
| GET | `/api/v1/bios/contestants` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/bioRoutes.ts` |
| PUT | `/api/v1/bios/contestants/:contestantId` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/bioRoutes.ts` |
| GET | `/api/v1/bios/directory` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/bioRoutes.ts` |
| GET | `/api/v1/bios/files/:filename` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/bioRoutes.ts` |
| GET | `/api/v1/bios/judges` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/bioRoutes.ts` |
| PUT | `/api/v1/bios/judges/:judgeId` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/bioRoutes.ts` |
| GET | `/api/v1/board/approved-categories` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| DELETE | `/api/v1/board/category/:categoryId/certification/revoke` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| GET | `/api/v1/board/category/:categoryId/certification/status` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| POST | `/api/v1/board/category/:categoryId/certification/submit` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| GET | `/api/v1/board/certification-status` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| GET | `/api/v1/board/certifications` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| POST | `/api/v1/board/certifications/:id/approve` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| POST | `/api/v1/board/certifications/:id/reject` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| GET | `/api/v1/board/emcee-scripts` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| POST | `/api/v1/board/emcee-scripts` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| DELETE | `/api/v1/board/emcee-scripts/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| PUT | `/api/v1/board/emcee-scripts/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| GET | `/api/v1/board/pending-approvals` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| POST | `/api/v1/board/reports` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| GET | `/api/v1/board/score-removal` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| POST | `/api/v1/board/score-removal` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| GET | `/api/v1/board/score-removal-requests-old` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| POST | `/api/v1/board/score-removal-requests/:id/approve` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| POST | `/api/v1/board/score-removal-requests/:id/reject` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| GET | `/api/v1/board/score-removal/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| POST | `/api/v1/board/score-removal/:id/execute` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| POST | `/api/v1/board/score-removal/:id/sign` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| GET | `/api/v1/board/stats` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/boardRoutes.ts` |
| POST | `/api/v1/bulk-certification-reset` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/bulkCertificationResetRoutes.ts` |
| POST | `/api/v1/bulk/assignments/create` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/assignments/delete` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/assignments/reassign` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/contests/certify` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/contests/delete` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/contests/status` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/events/clone` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/events/delete` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/events/status` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/users/activate` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/users/change-role` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/users/deactivate` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/users/delete` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| GET | `/api/v1/bulk/users/export` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/bulk/users/import` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| GET | `/api/v1/bulk/users/template` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/bulkRoutes.ts` |
| POST | `/api/v1/cache/clear` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/cacheRoutes.ts` |
| POST | `/api/v1/cache/flush` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/cacheRoutes.ts` |
| DELETE | `/api/v1/cache/key/:key` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/cacheRoutes.ts` |
| GET | `/api/v1/cache/keys` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/cacheRoutes.ts` |
| DELETE | `/api/v1/cache/keys/:key` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/cacheRoutes.ts` |
| POST | `/api/v1/cache/pattern` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/cacheRoutes.ts` |
| GET | `/api/v1/cache/stats` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/cacheRoutes.ts` |
| GET | `/api/v1/cache/status` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/cacheRoutes.ts` |
| GET | `/api/v1/categories` | TENANT_SCOPED | - | `src/routes/categoriesRoutes.ts` |
| POST | `/api/v1/categories` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| GET | `/api/v1/categories/:categoryId/criteria` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| POST | `/api/v1/categories/:categoryId/criteria` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| POST | `/api/v1/categories/:categoryId/criteria/bulk-delete` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| POST | `/api/v1/categories/:categoryId/criteria/bulk-update` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| DELETE | `/api/v1/categories/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| GET | `/api/v1/categories/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| PUT | `/api/v1/categories/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| POST | `/api/v1/categories/:id/restore` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| PUT | `/api/v1/categories/:id/time-limit` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| GET | `/api/v1/categories/contest/:contestId` | TENANT_SCOPED | - | `src/routes/categoriesRoutes.ts` |
| POST | `/api/v1/categories/contest/:contestId` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| DELETE | `/api/v1/categories/criteria/:criterionId` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| PUT | `/api/v1/categories/criteria/:criterionId` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoriesRoutes.ts` |
| POST | `/api/v1/category-certifications/category/:categoryId/certify` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, TALLY_MASTER | `src/routes/categoryCertificationRoutes.ts` |
| POST | `/api/v1/category-certifications/category/:categoryId/contestant/:contestantId/certify` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, TALLY_MASTER | `src/routes/categoryCertificationRoutes.ts` |
| POST | `/api/v1/category-certifications/category/:categoryId/judge/:judgeId/certify` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, TALLY_MASTER | `src/routes/categoryCertificationRoutes.ts` |
| GET | `/api/v1/category-certifications/category/:categoryId/progress` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, TALLY_MASTER | `src/routes/categoryCertificationRoutes.ts` |
| GET | `/api/v1/category-types` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoryTypeRoutes.ts` |
| POST | `/api/v1/category-types` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/categoryTypeRoutes.ts` |
| GET | `/api/v1/certifications` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/certificationRoutes.ts` |
| POST | `/api/v1/certifications` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/certificationRoutes.ts` |
| DELETE | `/api/v1/certifications/:id` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/certificationRoutes.ts` |
| GET | `/api/v1/certifications/:id` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/certificationRoutes.ts` |
| PUT | `/api/v1/certifications/:id` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/certificationRoutes.ts` |
| POST | `/api/v1/certifications/:id/approve-board` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/certificationRoutes.ts` |
| POST | `/api/v1/certifications/:id/certify-auditor` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/certificationRoutes.ts` |
| POST | `/api/v1/certifications/:id/certify-judge` | TENANT_SCOPED | ADMIN, AUDITOR, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/certificationRoutes.ts` |
| POST | `/api/v1/certifications/:id/certify-tally` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/certificationRoutes.ts` |
| POST | `/api/v1/certifications/:id/reject` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, SUPER_ADMIN | `src/routes/certificationRoutes.ts` |
| GET | `/api/v1/certifications/overview` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/certificationRoutes.ts` |
| GET | `/api/v1/certifications/stats` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/certificationRoutes.ts` |
| POST | `/api/v1/commentary` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER | `src/routes/commentaryRoutes.ts` |
| DELETE | `/api/v1/commentary/:id` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER | `src/routes/commentaryRoutes.ts` |
| PUT | `/api/v1/commentary/:id` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER | `src/routes/commentaryRoutes.ts` |
| GET | `/api/v1/commentary/contestant/:contestantId` | TENANT_SCOPED | - | `src/routes/commentaryRoutes.ts` |
| GET | `/api/v1/commentary/score/:scoreId` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER | `src/routes/commentaryRoutes.ts` |
| POST | `/api/v1/commentary/scores` | TENANT_SCOPED | ADMIN, JUDGE | `src/routes/commentaryRoutes.ts` |
| GET | `/api/v1/contest-certifications/:contestId/progress` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, TALLY_MASTER | `src/routes/contestCertificationRoutes.ts` |
| GET | `/api/v1/contestants` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestantsRoutes.ts` |
| POST | `/api/v1/contestants` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestantsRoutes.ts` |
| DELETE | `/api/v1/contestants/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestantsRoutes.ts` |
| PUT | `/api/v1/contestants/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestantsRoutes.ts` |
| POST | `/api/v1/contestants/bulk-delete` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestantsRoutes.ts` |
| GET | `/api/v1/contests` | TENANT_SCOPED | - | `src/routes/contestsRoutes.ts` |
| DELETE | `/api/v1/contests/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestsRoutes.ts` |
| GET | `/api/v1/contests/:id` | TENANT_SCOPED | - | `src/routes/contestsRoutes.ts` |
| PUT | `/api/v1/contests/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestsRoutes.ts` |
| POST | `/api/v1/contests/:id/archive` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestsRoutes.ts` |
| GET | `/api/v1/contests/:id/minimum-winning-score` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/contestsRoutes.ts` |
| PUT | `/api/v1/contests/:id/minimum-winning-score` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestsRoutes.ts` |
| GET | `/api/v1/contests/:id/olympic-scoring-validation` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/contestsRoutes.ts` |
| POST | `/api/v1/contests/:id/reactivate` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestsRoutes.ts` |
| POST | `/api/v1/contests/:id/restore` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestsRoutes.ts` |
| GET | `/api/v1/contests/event/:eventId` | TENANT_SCOPED | - | `src/routes/contestsRoutes.ts` |
| POST | `/api/v1/contests/event/:eventId` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/contestsRoutes.ts` |
| GET | `/api/v1/custom-fields` | TENANT_SCOPED | - | `src/routes/customFieldsRoutes.ts` |
| POST | `/api/v1/custom-fields` | TENANT_SCOPED | - | `src/routes/customFieldsRoutes.ts` |
| GET | `/api/v1/custom-fields/:entityType` | TENANT_SCOPED | - | `src/routes/customFieldsRoutes.ts` |
| DELETE | `/api/v1/custom-fields/:id` | TENANT_SCOPED | - | `src/routes/customFieldsRoutes.ts` |
| PUT | `/api/v1/custom-fields/:id` | TENANT_SCOPED | - | `src/routes/customFieldsRoutes.ts` |
| GET | `/api/v1/custom-fields/field/:id` | TENANT_SCOPED | - | `src/routes/customFieldsRoutes.ts` |
| POST | `/api/v1/custom-fields/reorder` | TENANT_SCOPED | - | `src/routes/customFieldsRoutes.ts` |
| POST | `/api/v1/custom-fields/values` | TENANT_SCOPED | - | `src/routes/customFieldsRoutes.ts` |
| DELETE | `/api/v1/custom-fields/values/:customFieldId/:entityId` | TENANT_SCOPED | - | `src/routes/customFieldsRoutes.ts` |
| GET | `/api/v1/custom-fields/values/:entityId` | TENANT_SCOPED | - | `src/routes/customFieldsRoutes.ts` |
| POST | `/api/v1/custom-fields/values/bulk` | TENANT_SCOPED | - | `src/routes/customFieldsRoutes.ts` |
| POST | `/api/v1/data-wipe/all` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/dataWipeRoutes.ts` |
| POST | `/api/v1/data-wipe/event/:eventId` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/dataWipeRoutes.ts` |
| GET | `/api/v1/database-browser/history` | TENANT_SCOPED | - | `src/routes/databaseBrowserRoutes.ts` |
| POST | `/api/v1/database-browser/query` | TENANT_SCOPED | - | `src/routes/databaseBrowserRoutes.ts` |
| GET | `/api/v1/database-browser/tables` | TENANT_SCOPED | - | `src/routes/databaseBrowserRoutes.ts` |
| GET | `/api/v1/database-browser/tables/:tableName` | TENANT_SCOPED | - | `src/routes/databaseBrowserRoutes.ts` |
| GET | `/api/v1/database-browser/tables/:tableName/data` | TENANT_SCOPED | - | `src/routes/databaseBrowserRoutes.ts` |
| POST | `/api/v1/database-browser/tables/:tableName/records` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/databaseBrowserRoutes.ts` |
| DELETE | `/api/v1/database-browser/tables/:tableName/records/:recordId` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/databaseBrowserRoutes.ts` |
| GET | `/api/v1/database-browser/tables/:tableName/records/:recordId` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/databaseBrowserRoutes.ts` |
| PUT | `/api/v1/database-browser/tables/:tableName/records/:recordId` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/databaseBrowserRoutes.ts` |
| GET | `/api/v1/database-browser/tables/:tableName/schema` | TENANT_SCOPED | - | `src/routes/databaseBrowserRoutes.ts` |
| GET | `/api/v1/deductions/:id/approvals` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/deductionRoutes.ts` |
| POST | `/api/v1/deductions/:id/approve` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/deductionRoutes.ts` |
| POST | `/api/v1/deductions/:id/reject` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/deductionRoutes.ts` |
| GET | `/api/v1/deductions/history` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/deductionRoutes.ts` |
| GET | `/api/v1/deductions/pending` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/deductionRoutes.ts` |
| POST | `/api/v1/deductions/request` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/deductionRoutes.ts` |
| GET | `/api/v1/docs` | PUBLIC | - | `src/routes/docs.ts` |
| GET | `/api/v1/docs/*` | PUBLIC | - | `src/routes/docs.ts` |
| GET | `/api/v1/docs/category/:category` | PUBLIC | - | `src/routes/docs.ts` |
| GET | `/api/v1/docs/search` | PUBLIC | - | `src/routes/docs.ts` |
| POST | `/api/v1/dr/backup/execute` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| GET | `/api/v1/dr/config` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| PUT | `/api/v1/dr/config/:id` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| GET | `/api/v1/dr/dashboard` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| GET | `/api/v1/dr/metrics` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| GET | `/api/v1/dr/rto-rpo` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| GET | `/api/v1/dr/schedules` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| POST | `/api/v1/dr/schedules` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| DELETE | `/api/v1/dr/schedules/:id` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| PUT | `/api/v1/dr/schedules/:id` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| GET | `/api/v1/dr/targets` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| POST | `/api/v1/dr/targets` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| DELETE | `/api/v1/dr/targets/:id` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| PUT | `/api/v1/dr/targets/:id` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| POST | `/api/v1/dr/targets/:id/verify` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| POST | `/api/v1/dr/test/execute` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/drRoutes.ts` |
| GET | `/api/v1/email-templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| POST | `/api/v1/email-templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| DELETE | `/api/v1/email-templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| GET | `/api/v1/email-templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| PUT | `/api/v1/email-templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| POST | `/api/v1/email-templates/:id/clone` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| POST | `/api/v1/email-templates/:id/preview` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| POST | `/api/v1/email-templates/:id/send` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| GET | `/api/v1/email-templates/type/:type` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| GET | `/api/v1/email-templates/variables/:type` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailTemplateRoutes.ts` |
| GET | `/api/v1/email/campaigns` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailRoutes.ts` |
| POST | `/api/v1/email/campaigns` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailRoutes.ts` |
| GET | `/api/v1/email/logs` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailRoutes.ts` |
| POST | `/api/v1/email/send-by-role` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailRoutes.ts` |
| POST | `/api/v1/email/send-multiple` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailRoutes.ts` |
| GET | `/api/v1/email/templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailRoutes.ts` |
| POST | `/api/v1/email/templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/emailRoutes.ts` |
| GET | `/api/v1/emcee/contestant-bios` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| GET | `/api/v1/emcee/contests` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| GET | `/api/v1/emcee/contests/:contestId` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| GET | `/api/v1/emcee/events` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| GET | `/api/v1/emcee/events/:eventId` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| GET | `/api/v1/emcee/judge-bios` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| GET | `/api/v1/emcee/scripts` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| POST | `/api/v1/emcee/scripts` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| DELETE | `/api/v1/emcee/scripts/:id` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| PUT | `/api/v1/emcee/scripts/:id` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| PATCH | `/api/v1/emcee/scripts/:id/toggle` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| GET | `/api/v1/emcee/scripts/:scriptId` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| GET | `/api/v1/emcee/scripts/:scriptId/view` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| GET | `/api/v1/emcee/scripts/:scriptId/view-url` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| GET | `/api/v1/emcee/stats` | TENANT_SCOPED | ADMIN, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN | `src/routes/emceeRoutes.ts` |
| GET | `/api/v1/error-handling/statistics` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/errorHandlingRoutes.ts` |
| GET | `/api/v1/event-templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventTemplateRoutes.ts` |
| POST | `/api/v1/event-templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventTemplateRoutes.ts` |
| DELETE | `/api/v1/event-templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventTemplateRoutes.ts` |
| GET | `/api/v1/event-templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventTemplateRoutes.ts` |
| PUT | `/api/v1/event-templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventTemplateRoutes.ts` |
| POST | `/api/v1/event-templates/:id/create-event` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventTemplateRoutes.ts` |
| GET | `/api/v1/events` | TENANT_SCOPED | - | `src/routes/eventsRoutes.ts` |
| POST | `/api/v1/events` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventsRoutes.ts` |
| DELETE | `/api/v1/events/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventsRoutes.ts` |
| GET | `/api/v1/events/:id` | TENANT_SCOPED | - | `src/routes/eventsRoutes.ts` |
| PUT | `/api/v1/events/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventsRoutes.ts` |
| POST | `/api/v1/events/:id/archive` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventsRoutes.ts` |
| POST | `/api/v1/events/:id/restore` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventsRoutes.ts` |
| POST | `/api/v1/events/:id/unarchive` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/eventsRoutes.ts` |
| GET | `/api/v1/events/logs` | TENANT_SCOPED | ADMIN, AUDITOR, SUPER_ADMIN | `src/routes/eventsLogRoutes.ts` |
| GET | `/api/v1/events/logs/:id` | TENANT_SCOPED | ADMIN, AUDITOR, SUPER_ADMIN | `src/routes/eventsLogRoutes.ts` |
| GET | `/api/v1/events/logs/webhooks` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/eventsLogRoutes.ts` |
| POST | `/api/v1/events/logs/webhooks` | TENANT_SCOPED | ADMIN, AUDITOR, SUPER_ADMIN | `src/routes/eventsLogRoutes.ts` |
| DELETE | `/api/v1/events/logs/webhooks/:id` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/eventsLogRoutes.ts` |
| PUT | `/api/v1/events/logs/webhooks/:id` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/eventsLogRoutes.ts` |
| POST | `/api/v1/export/event/excel` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER | `src/routes/exportRoutes.ts` |
| GET | `/api/v1/export/history` | TENANT_SCOPED | - | `src/routes/exportRoutes.ts` |
| GET | `/api/v1/feature-flags` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/featureFlagsRoutes.ts` |
| DELETE | `/api/v1/feature-flags/:name` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/featureFlagsRoutes.ts` |
| PUT | `/api/v1/feature-flags/:name` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/featureFlagsRoutes.ts` |
| DELETE | `/api/v1/feature-flags/:name/cache` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/featureFlagsRoutes.ts` |
| GET | `/api/v1/feature-flags/:name/evaluate` | TENANT_SCOPED | - | `src/routes/featureFlagsRoutes.ts` |
| DELETE | `/api/v1/feature-flags/cache/all` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/featureFlagsRoutes.ts` |
| GET | `/api/v1/feature-flags/evaluate/all` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/featureFlagsRoutes.ts` |
| GET | `/api/v1/file-backups` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/fileBackupRoutes.ts` |
| POST | `/api/v1/file-backups/create` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/fileBackupRoutes.ts` |
| GET | `/api/v1/file-management/files` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/fileManagementRoutes.ts` |
| GET | `/api/v1/file-management/files/:fileId/integrity` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/fileManagementRoutes.ts` |
| GET | `/api/v1/file-management/files/analytics` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/fileManagementRoutes.ts` |
| POST | `/api/v1/file-management/files/integrity/bulk` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/fileManagementRoutes.ts` |
| GET | `/api/v1/file-management/files/search` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/fileManagementRoutes.ts` |
| GET | `/api/v1/files` | TENANT_SCOPED | - | `src/routes/fileRoutes.ts` |
| GET | `/api/v1/files/stats` | TENANT_SCOPED | - | `src/routes/fileRoutes.ts` |
| GET | `/api/v1/health/database` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/databaseHealthRoutes.ts` |
| GET | `/api/v1/health/database/metrics` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/databaseHealthRoutes.ts` |
| GET | `/api/v1/health/health` | PUBLIC | - | `src/routes/healthRoutes.ts` |
| GET | `/api/v1/health/health/detailed` | PUBLIC | - | `src/routes/healthRoutes.ts` |
| GET | `/api/v1/health/health/live` | PUBLIC | - | `src/routes/healthRoutes.ts` |
| GET | `/api/v1/health/health/ready` | PUBLIC | - | `src/routes/healthRoutes.ts` |
| GET | `/api/v1/judge-certifications/category/:categoryId/status` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/judgeCertificationsRoutes.ts` |
| POST | `/api/v1/judge-contestant-certifications/category/:categoryId/certify` | TENANT_SCOPED | ADMIN, JUDGE, SUPER_ADMIN | `src/routes/judgeContestantCertificationRoutes.ts` |
| POST | `/api/v1/judge-contestant-certifications/category/:categoryId/contestant/:contestantId/certify` | TENANT_SCOPED | ADMIN, JUDGE, SUPER_ADMIN | `src/routes/judgeContestantCertificationRoutes.ts` |
| GET | `/api/v1/judge-contestant-certifications/category/:categoryId/status` | TENANT_SCOPED | ADMIN, JUDGE, SUPER_ADMIN | `src/routes/judgeContestantCertificationRoutes.ts` |
| POST | `/api/v1/judge-uncertification/:id/approve` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, TALLY_MASTER | `src/routes/judgeUncertificationRoutes.ts` |
| POST | `/api/v1/judge-uncertification/:id/reject` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, TALLY_MASTER | `src/routes/judgeUncertificationRoutes.ts` |
| GET | `/api/v1/judge-uncertification/judge/requests` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, TALLY_MASTER | `src/routes/judgeUncertificationRoutes.ts` |
| POST | `/api/v1/judge-uncertification/request` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, TALLY_MASTER | `src/routes/judgeUncertificationRoutes.ts` |
| GET | `/api/v1/judge-uncertification/requests` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, TALLY_MASTER | `src/routes/judgeUncertificationRoutes.ts` |
| POST | `/api/v1/judge-uncertifications/:id/approve` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, TALLY_MASTER | `src/routes/judgeUncertificationRoutes.ts` |
| POST | `/api/v1/judge-uncertifications/:id/reject` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, TALLY_MASTER | `src/routes/judgeUncertificationRoutes.ts` |
| GET | `/api/v1/judge-uncertifications/judge/requests` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, TALLY_MASTER | `src/routes/judgeUncertificationRoutes.ts` |
| POST | `/api/v1/judge-uncertifications/request` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, TALLY_MASTER | `src/routes/judgeUncertificationRoutes.ts` |
| GET | `/api/v1/judge-uncertifications/requests` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, TALLY_MASTER | `src/routes/judgeUncertificationRoutes.ts` |
| GET | `/api/v1/judge/assignments` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/judgeRoutes.ts` |
| GET | `/api/v1/judge/certification-workflow/:categoryId` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/judgeRoutes.ts` |
| GET | `/api/v1/judge/contestant-bios/:categoryId` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/judgeRoutes.ts` |
| GET | `/api/v1/judge/contestant/:contestantNumber` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/judgeRoutes.ts` |
| GET | `/api/v1/judge/scoring/:categoryId` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/judgeRoutes.ts` |
| POST | `/api/v1/judge/scoring/submit` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/judgeRoutes.ts` |
| GET | `/api/v1/judge/stats` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/judgeRoutes.ts` |
| GET | `/api/v1/judges` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/judgesRoutes.ts` |
| POST | `/api/v1/judges` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/judgesRoutes.ts` |
| DELETE | `/api/v1/judges/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/judgesRoutes.ts` |
| PUT | `/api/v1/judges/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/judgesRoutes.ts` |
| POST | `/api/v1/judges/bulk-delete` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/judgesRoutes.ts` |
| GET | `/api/v1/logs` | TENANT_SCOPED | - | `src/routes/logFilesRoutes.ts` |
| POST | `/api/v1/logs/cleanup` | TENANT_SCOPED | - | `src/routes/logFilesRoutes.ts` |
| GET | `/api/v1/logs/files` | TENANT_SCOPED | - | `src/routes/logFilesRoutes.ts` |
| DELETE | `/api/v1/logs/files/:filename` | TENANT_SCOPED | - | `src/routes/logFilesRoutes.ts` |
| GET | `/api/v1/logs/files/:filename` | TENANT_SCOPED | - | `src/routes/logFilesRoutes.ts` |
| GET | `/api/v1/logs/files/:filename/download` | TENANT_SCOPED | - | `src/routes/logFilesRoutes.ts` |
| POST | `/api/v1/mfa/backup-codes/regenerate` | TENANT_SCOPED | - | `src/routes/mfa.ts` |
| POST | `/api/v1/mfa/disable` | TENANT_SCOPED | - | `src/routes/mfa.ts` |
| POST | `/api/v1/mfa/enable` | TENANT_SCOPED | - | `src/routes/mfa.ts` |
| POST | `/api/v1/mfa/setup` | TENANT_SCOPED | - | `src/routes/mfa.ts` |
| GET | `/api/v1/mfa/status` | TENANT_SCOPED | - | `src/routes/mfa.ts` |
| POST | `/api/v1/mfa/verify` | TENANT_SCOPED | - | `src/routes/mfa.ts` |
| POST | `/api/v1/monitoring/service-status` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/monitoringRoutes.ts` |
| GET | `/api/v1/monitoring/system-status` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/monitoringRoutes.ts` |
| POST | `/api/v1/monitoring/test-results` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/monitoringRoutes.ts` |
| POST | `/api/v1/monitoring/test-start` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/monitoringRoutes.ts` |
| GET | `/api/v1/navigation` | TENANT_SCOPED | - | `src/routes/navigationRoutes.ts` |
| GET | `/api/v1/notification-preferences` | TENANT_SCOPED | - | `src/routes/notificationPreferencesRoutes.ts` |
| PUT | `/api/v1/notification-preferences` | TENANT_SCOPED | - | `src/routes/notificationPreferencesRoutes.ts` |
| POST | `/api/v1/notification-preferences/reset` | TENANT_SCOPED | - | `src/routes/notificationPreferencesRoutes.ts` |
| GET | `/api/v1/notifications` | PUBLIC | - | `src/routes/notificationsRoutes.ts` |
| DELETE | `/api/v1/notifications/:id` | PUBLIC | - | `src/routes/notificationsRoutes.ts` |
| PUT | `/api/v1/notifications/:id/read` | PUBLIC | - | `src/routes/notificationsRoutes.ts` |
| PUT | `/api/v1/notifications/:id/restore` | PUBLIC | - | `src/routes/notificationsRoutes.ts` |
| POST | `/api/v1/notifications/broadcast` | PUBLIC | - | `src/routes/notificationsRoutes.ts` |
| GET | `/api/v1/notifications/deleted` | PUBLIC | - | `src/routes/notificationsRoutes.ts` |
| DELETE | `/api/v1/notifications/read-all` | PUBLIC | - | `src/routes/notificationsRoutes.ts` |
| PUT | `/api/v1/notifications/read-all` | PUBLIC | - | `src/routes/notificationsRoutes.ts` |
| POST | `/api/v1/notifications/send` | PUBLIC | - | `src/routes/notificationsRoutes.ts` |
| GET | `/api/v1/notifications/sent` | PUBLIC | - | `src/routes/notificationsRoutes.ts` |
| GET | `/api/v1/notifications/unread-count` | PUBLIC | - | `src/routes/notificationsRoutes.ts` |
| GET | `/api/v1/performance/dashboard` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/performanceRoutes.ts` |
| GET | `/api/v1/performance/metrics` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/performanceRoutes.ts` |
| GET | `/api/v1/performance/stats` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/performanceRoutes.ts` |
| GET | `/api/v1/permissions` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/permissionsRoutes.ts` |
| PUT | `/api/v1/permissions` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/permissionsRoutes.ts` |
| POST | `/api/v1/permissions/cache/warm` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/permissionsRoutes.ts` |
| GET | `/api/v1/permissions/export` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/permissionsRoutes.ts` |
| GET | `/api/v1/permissions/stats` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/permissionsRoutes.ts` |
| GET | `/api/v1/print/archived-contest/:id` | TENANT_SCOPED | - | `src/routes/printRoutes.ts` |
| GET | `/api/v1/print/category/:id` | TENANT_SCOPED | - | `src/routes/printRoutes.ts` |
| POST | `/api/v1/print/contest-results` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER | `src/routes/printRoutes.ts` |
| GET | `/api/v1/print/contest/:id` | TENANT_SCOPED | - | `src/routes/printRoutes.ts` |
| GET | `/api/v1/print/contestant/:id` | TENANT_SCOPED | - | `src/routes/printRoutes.ts` |
| POST | `/api/v1/print/event-report` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER | `src/routes/printRoutes.ts` |
| POST | `/api/v1/print/judge-performance` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER | `src/routes/printRoutes.ts` |
| GET | `/api/v1/print/judge/:id` | TENANT_SCOPED | - | `src/routes/printRoutes.ts` |
| GET | `/api/v1/print/templates` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/printRoutes.ts` |
| POST | `/api/v1/print/templates` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/printRoutes.ts` |
| GET | `/api/v1/rate-limits` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/rateLimitRoutes.ts` |
| GET | `/api/v1/rate-limits/:tier` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/rateLimitRoutes.ts` |
| PUT | `/api/v1/rate-limits/:tier` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/rateLimitRoutes.ts` |
| GET | `/api/v1/rate-limits/my-status` | TENANT_SCOPED | - | `src/routes/rateLimitRoutes.ts` |
| GET | `/api/v1/reports` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/reportsRoutes.ts` |
| GET | `/api/v1/reports/:id/download` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/reportsRoutes.ts` |
| POST | `/api/v1/reports/:id/export/csv` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/reportsRoutes.ts` |
| POST | `/api/v1/reports/:id/export/excel` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/reportsRoutes.ts` |
| POST | `/api/v1/reports/:id/export/pdf` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/reportsRoutes.ts` |
| POST | `/api/v1/reports/generate` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/reportsRoutes.ts` |
| GET | `/api/v1/reports/instances` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/reportsRoutes.ts` |
| DELETE | `/api/v1/reports/instances/:id` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/reportsRoutes.ts` |
| POST | `/api/v1/reports/send-email` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/reportsRoutes.ts` |
| GET | `/api/v1/reports/templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/reportsRoutes.ts` |
| POST | `/api/v1/reports/templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/reportsRoutes.ts` |
| POST | `/api/v1/restrictions/contestant-view` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/restrictionRoutes.ts` |
| GET | `/api/v1/restrictions/contestant-view/check` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/restrictionRoutes.ts` |
| POST | `/api/v1/restrictions/lock` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/restrictionRoutes.ts` |
| GET | `/api/v1/restrictions/lock/check` | TENANT_SCOPED | - | `src/routes/restrictionRoutes.ts` |
| GET | `/api/v1/results` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/resultsRoutes.ts` |
| GET | `/api/v1/results/categories` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/resultsRoutes.ts` |
| GET | `/api/v1/results/category/:categoryId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/resultsRoutes.ts` |
| GET | `/api/v1/results/contest/:contestId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/resultsRoutes.ts` |
| GET | `/api/v1/results/contestant/:contestantId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/resultsRoutes.ts` |
| GET | `/api/v1/results/event/:eventId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/resultsRoutes.ts` |
| GET | `/api/v1/role-assignments` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/roleAssignmentRoutes.ts` |
| POST | `/api/v1/role-assignments` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/roleAssignmentRoutes.ts` |
| DELETE | `/api/v1/role-assignments/:id` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/roleAssignmentRoutes.ts` |
| PUT | `/api/v1/role-assignments/:id` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/roleAssignmentRoutes.ts` |
| GET | `/api/v1/score-files` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreFileRoutes.ts` |
| POST | `/api/v1/score-files` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreFileRoutes.ts` |
| DELETE | `/api/v1/score-files/:id` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreFileRoutes.ts` |
| GET | `/api/v1/score-files/:id` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreFileRoutes.ts` |
| PATCH | `/api/v1/score-files/:id` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/scoreFileRoutes.ts` |
| GET | `/api/v1/score-files/category/:categoryId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreFileRoutes.ts` |
| GET | `/api/v1/score-files/contestant/:contestantId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreFileRoutes.ts` |
| GET | `/api/v1/score-files/download/:id` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreFileRoutes.ts` |
| GET | `/api/v1/score-files/judge/:judgeId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, CONTESTANT, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreFileRoutes.ts` |
| GET | `/api/v1/score-governance/requests` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreGovernanceRoutes.ts` |
| POST | `/api/v1/score-governance/requests` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreGovernanceRoutes.ts` |
| POST | `/api/v1/score-governance/requests/:id/approve` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreGovernanceRoutes.ts` |
| POST | `/api/v1/score-governance/requests/:id/reject` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreGovernanceRoutes.ts` |
| GET | `/api/v1/score-governance/review` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreGovernanceRoutes.ts` |
| GET | `/api/v1/score-governance/settings` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreGovernanceRoutes.ts` |
| PUT | `/api/v1/score-governance/settings` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoreGovernanceRoutes.ts` |
| DELETE | `/api/v1/scoring/:scoreId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoringRoutes.ts` |
| PUT | `/api/v1/scoring/:scoreId` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/scoringRoutes.ts` |
| POST | `/api/v1/scoring/:scoreId/certify` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoringRoutes.ts` |
| POST | `/api/v1/scoring/:scoreId/unsign` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoringRoutes.ts` |
| GET | `/api/v1/scoring/categories` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoringRoutes.ts` |
| POST | `/api/v1/scoring/category/:categoryId/certify` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoringRoutes.ts` |
| POST | `/api/v1/scoring/category/:categoryId/certify-totals` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoringRoutes.ts` |
| GET | `/api/v1/scoring/category/:categoryId/contestant/:contestantId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoringRoutes.ts` |
| POST | `/api/v1/scoring/category/:categoryId/contestant/:contestantId` | TENANT_SCOPED | ADMIN, JUDGE, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoringRoutes.ts` |
| POST | `/api/v1/scoring/category/:categoryId/final-certification` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/scoringRoutes.ts` |
| POST | `/api/v1/scoring/category/:categoryId/uncertify` | TENANT_SCOPED | ADMIN, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN | `src/routes/scoringRoutes.ts` |
| GET | `/api/v1/scoring/deductions` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoringRoutes.ts` |
| POST | `/api/v1/scoring/deductions` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/scoringRoutes.ts` |
| POST | `/api/v1/scoring/deductions/:deductionId/approve` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/scoringRoutes.ts` |
| POST | `/api/v1/scoring/deductions/:deductionId/reject` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/scoringRoutes.ts` |
| GET | `/api/v1/settings` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/alerts/scoring-workflow` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/alerts/scoring-workflow` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/alerts/scoring-workflow/candidates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/alerts/system-health` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/alerts/system-health` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/app-name` | TENANT_SCOPED | - | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/backup` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/backup` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| POST | `/api/v1/settings/backup/gcs/service-account` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/backup/google-drive/oauth/callback` | TENANT_SCOPED | - | `src/routes/settingsRoutes.ts` |
| POST | `/api/v1/settings/backup/google-drive/oauth/disconnect` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| POST | `/api/v1/settings/backup/google-drive/oauth/start` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/backup/google-drive/oauth/status` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/contestant-visibility` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/contestant-visibility` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/database-connection-info` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/email` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/email` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/field-configurations` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/field-configurations/:fieldName` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/field-configurations/:fieldName` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/field-configurations/bulk` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| POST | `/api/v1/settings/field-configurations/reset` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/general` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/jwt-config` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/jwt-config` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/logging-levels` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/logging-levels` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/password-policy` | TENANT_SCOPED | - | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/password-policy` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/public` | TENANT_SCOPED | - | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/security` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/security` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/settings` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/settings` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| POST | `/api/v1/settings/test/:type` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| GET | `/api/v1/settings/theme` | TENANT_SCOPED | - | `src/routes/settingsRoutes.ts` |
| PUT | `/api/v1/settings/theme` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| POST | `/api/v1/settings/theme/favicon` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| POST | `/api/v1/settings/theme/logo` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/settingsRoutes.ts` |
| POST | `/api/v1/sms/send` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/smsRoutes.ts` |
| GET | `/api/v1/sms/settings` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/smsRoutes.ts` |
| PUT | `/api/v1/sms/settings` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/smsRoutes.ts` |
| GET | `/api/v1/tally-master/bias-checking/:categoryId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/category/:categoryId/judges` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/certification-queue` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/certification-workflow/:categoryId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/certifications` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| POST | `/api/v1/tally-master/certify-totals` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/contest/:contestId/certifications` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/contest/:contestId/score-review` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/history` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/pending-certifications` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/score-removal-requests` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| POST | `/api/v1/tally-master/score-removal-requests` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| POST | `/api/v1/tally-master/score-removal-requests/:id/approve` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| POST | `/api/v1/tally-master/score-removal-requests/:id/reject` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/score-review/:categoryId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/scores/contestant` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/scores/judge` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| DELETE | `/api/v1/tally-master/scores/remove` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/tally-master/stats` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/tallyMasterRoutes.ts` |
| GET | `/api/v1/templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/templatesRoutes.ts` |
| POST | `/api/v1/templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/templatesRoutes.ts` |
| GET | `/api/v1/tenants` | TENANT_SCOPED | - | `src/routes/tenant.ts` |
| POST | `/api/v1/tenants` | TENANT_SCOPED | - | `src/routes/tenant.ts` |
| DELETE | `/api/v1/tenants/:id` | TENANT_SCOPED | - | `src/routes/tenant.ts` |
| GET | `/api/v1/tenants/:id` | TENANT_SCOPED | - | `src/routes/tenant.ts` |
| PUT | `/api/v1/tenants/:id` | TENANT_SCOPED | - | `src/routes/tenant.ts` |
| POST | `/api/v1/tenants/:id/activate` | TENANT_SCOPED | - | `src/routes/tenant.ts` |
| GET | `/api/v1/tenants/:id/analytics` | TENANT_SCOPED | - | `src/routes/tenant.ts` |
| POST | `/api/v1/tenants/:id/deactivate` | TENANT_SCOPED | - | `src/routes/tenant.ts` |
| POST | `/api/v1/tenants/:id/users/invite` | TENANT_SCOPED | - | `src/routes/tenant.ts` |
| GET | `/api/v1/tenants/check/:slug` | PUBLIC | - | `src/routes/publicTenantRoutes.ts` |
| GET | `/api/v1/tenants/current` | TENANT_SCOPED | - | `src/routes/tenant.ts` |
| GET | `/api/v1/tenants/slug/:slug` | PUBLIC | - | `src/routes/publicTenantRoutes.ts` |
| POST | `/api/v1/test-event-setup` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/testEventSetupRoutes.ts` |
| DELETE | `/api/v1/test-event-setup/:eventId` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/testEventSetupRoutes.ts` |
| GET | `/api/v1/test-runner/files` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/testRunnerRoutes.ts` |
| POST | `/api/v1/test-runner/run` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/testRunnerRoutes.ts` |
| DELETE | `/api/v1/test-runner/run/:runId` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/testRunnerRoutes.ts` |
| GET | `/api/v1/test-runner/run/:runId` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/testRunnerRoutes.ts` |
| GET | `/api/v1/test-runner/runs` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/testRunnerRoutes.ts` |
| DELETE | `/api/v1/test-runner/runs/cleanup` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/testRunnerRoutes.ts` |
| GET | `/api/v1/test-runner/uat-ids` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/testRunnerRoutes.ts` |
| GET | `/api/v1/tracker/certification/pending` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/trackerRoutes.ts` |
| GET | `/api/v1/tracker/certification/status` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/trackerRoutes.ts` |
| GET | `/api/v1/tracker/scoring/category/:categoryId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/trackerRoutes.ts` |
| GET | `/api/v1/tracker/scoring/contest/:contestId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/trackerRoutes.ts` |
| POST | `/api/v1/upload` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/uploadRoutes.ts` |
| GET | `/api/v1/upload/files` | TENANT_SCOPED | - | `src/routes/uploadRoutes.ts` |
| POST | `/api/v1/upload/image` | TENANT_SCOPED | ADMIN, ORGANIZER, SUPER_ADMIN | `src/routes/uploadRoutes.ts` |
| GET | `/api/v1/user-field-visibility` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/userFieldVisibilityRoutes.ts` |
| PUT | `/api/v1/user-field-visibility/:field` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/userFieldVisibilityRoutes.ts` |
| POST | `/api/v1/user-field-visibility/reset` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/userFieldVisibilityRoutes.ts` |
| GET | `/api/v1/users` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| POST | `/api/v1/users` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| DELETE | `/api/v1/users/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| GET | `/api/v1/users/:id` | TENANT_SCOPED | - | `src/routes/usersRoutes.ts` |
| PUT | `/api/v1/users/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| POST | `/api/v1/users/:id/bio-file` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| POST | `/api/v1/users/:id/change-password` | TENANT_SCOPED | - | `src/routes/usersRoutes.ts` |
| POST | `/api/v1/users/:id/image` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| PUT | `/api/v1/users/:id/last-login` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| POST | `/api/v1/users/:id/reset-password` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| PUT | `/api/v1/users/:id/role-fields` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| PUT | `/api/v1/users/:id/tenant` | SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT | SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| POST | `/api/v1/users/bulk-delete` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| POST | `/api/v1/users/bulk-remove` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| GET | `/api/v1/users/bulk-template` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| GET | `/api/v1/users/bulk-template/:userType` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| POST | `/api/v1/users/bulk-upload` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| GET | `/api/v1/users/csv-template` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| POST | `/api/v1/users/import-csv` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| PUT | `/api/v1/users/profile/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| POST | `/api/v1/users/remove-all/:role` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| GET | `/api/v1/users/role/:role` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| GET | `/api/v1/users/stats` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/usersRoutes.ts` |
| GET | `/api/v1/winners` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/winnersRoutes.ts` |
| GET | `/api/v1/winners/category/:categoryId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/winnersRoutes.ts` |
| GET | `/api/v1/winners/category/:categoryId/certification-progress` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, SUPER_ADMIN, TALLY_MASTER | `src/routes/winnersRoutes.ts` |
| GET | `/api/v1/winners/category/:categoryId/certification-status/:role` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, SUPER_ADMIN, TALLY_MASTER | `src/routes/winnersRoutes.ts` |
| POST | `/api/v1/winners/category/:categoryId/certify` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/winnersRoutes.ts` |
| POST | `/api/v1/winners/category/:categoryId/sign` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, SUPER_ADMIN, TALLY_MASTER | `src/routes/winnersRoutes.ts` |
| GET | `/api/v1/winners/category/:categoryId/signatures` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, JUDGE, SUPER_ADMIN, TALLY_MASTER | `src/routes/winnersRoutes.ts` |
| GET | `/api/v1/winners/contest/:contestId` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, EMCEE, JUDGE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/winnersRoutes.ts` |
| GET | `/api/v1/winners/contest/:contestId/publication-status` | TENANT_SCOPED | ADMIN, AUDITOR, BOARD, EMCEE, ORGANIZER, SUPER_ADMIN, TALLY_MASTER | `src/routes/winnersRoutes.ts` |
| POST | `/api/v1/winners/contest/:contestId/publish` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/winnersRoutes.ts` |
| POST | `/api/v1/winners/contest/:contestId/unpublish` | TENANT_SCOPED | ADMIN, SUPER_ADMIN | `src/routes/winnersRoutes.ts` |
| POST | `/api/v1/workflows/instances` | TENANT_SCOPED | - | `src/routes/workflowRoutes.ts` |
| GET | `/api/v1/workflows/instances/:entityType/:entityId` | TENANT_SCOPED | - | `src/routes/workflowRoutes.ts` |
| GET | `/api/v1/workflows/instances/:id` | TENANT_SCOPED | - | `src/routes/workflowRoutes.ts` |
| POST | `/api/v1/workflows/instances/:id/advance` | TENANT_SCOPED | - | `src/routes/workflowRoutes.ts` |
| GET | `/api/v1/workflows/templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/workflowRoutes.ts` |
| POST | `/api/v1/workflows/templates` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/workflowRoutes.ts` |
| DELETE | `/api/v1/workflows/templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/workflowRoutes.ts` |
| GET | `/api/v1/workflows/templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/workflowRoutes.ts` |
| PUT | `/api/v1/workflows/templates/:id` | TENANT_SCOPED | ADMIN, BOARD, ORGANIZER, SUPER_ADMIN | `src/routes/workflowRoutes.ts` |

## DB-Touching Surface Inventory

### config

- `src/config/database.ts`
- `src/config/queryMonitoring.ts`

### controllers

- `src/controllers/adminController.ts`
- `src/controllers/advancedReportingController.ts`
- `src/controllers/backupController.ts`
- `src/controllers/BaseController.ts`
- `src/controllers/bioController.ts`
- `src/controllers/cacheAdminController.ts`
- `src/controllers/categoriesController.ts`
- `src/controllers/categoryCertificationController.ts`
- `src/controllers/certificationController.ts`
- `src/controllers/contestsController.ts`
- `src/controllers/customFieldsController.ts`
- `src/controllers/databaseBrowserController.ts`
- `src/controllers/drController.ts`
- `src/controllers/emailController.ts`
- `src/controllers/EmailTemplateController.ts`
- `src/controllers/emceeController.ts`
- `src/controllers/errorHandlingController.ts`
- `src/controllers/eventsController.ts`
- `src/controllers/eventsLogController.ts`
- `src/controllers/fileBackupController.ts`
- `src/controllers/fileController.ts`
- `src/controllers/fileManagementController.ts`
- `src/controllers/judgeContestantCertificationController.ts`
- `src/controllers/judgeUncertificationController.ts`
- `src/controllers/notificationsController.ts`
- `src/controllers/permissionsController.ts`
- `src/controllers/RateLimitConfigController.ts`
- `src/controllers/reportsController.ts`
- `src/controllers/scoringController.ts`
- `src/controllers/smsController.ts`
- `src/controllers/tallyMasterController.ts`
- `src/controllers/testRunnerController.ts`
- `src/controllers/trackerController.ts`
- `src/controllers/usersController.ts`
- `src/controllers/workflowController.ts`

### event_handlers

- `src/events/handlers/AuditEventHandler.ts`
- `src/events/handlers/WebhookEventHandler.ts`

### jobs

- `src/jobs/ReportJobProcessor.ts`

### middleware

- `src/middleware/assignmentValidation.ts`
- `src/middleware/auth.ts`
- `src/middleware/enhancedRateLimiting.ts`
- `src/middleware/errorHandler.ts`
- `src/middleware/fileAccessControl.ts`
- `src/middleware/passwordValidation.ts`
- `src/middleware/prisma/softDelete.ts`
- `src/middleware/softDelete.ts`
- `src/middleware/tenantMiddleware.ts`
- `src/middleware/webhookVerification.ts`

### other

- `src/database/prismaExtension.ts`
- `src/decorators/Cacheable.ts`
- `src/server.ts`
- `src/utils/certificationPipeline.ts`
- `src/utils/ensureDefaultTenant.ts`
- `src/utils/logger.ts`
- `src/utils/olympicScoringValidation.ts`
- `src/utils/prisma.d.ts`
- `src/utils/prisma.ts`
- `src/utils/roleAssignmentCheck.ts`

### repositories

- `src/repositories/BaseRepository.ts`
- `src/repositories/CategoryRepository.ts`
- `src/repositories/ContestRepository.ts`
- `src/repositories/DeductionRepository.ts`
- `src/repositories/EventRepository.ts`
- `src/repositories/NotificationPreferenceRepository.ts`
- `src/repositories/NotificationRepository.ts`
- `src/repositories/ScoreRepository.ts`
- `src/repositories/SearchRepository.ts`
- `src/repositories/TemplateRepository.ts`

### routes

- `src/routes/healthRoutes.ts`
- `src/routes/publicTenantRoutes.ts`
- `src/routes/reportsRoutes.ts`
- `src/routes/settingsRoutes.ts`
- `src/routes/usersRoutes.ts`

### scripts

- `scripts/check-tenants.ts`
- `scripts/cleanup-database.ts`
- `scripts/deploy/preflight-tenant-segregation.sh`
- `scripts/init-production-db.js`
- `scripts/invalidate-sessions.ts`
- `scripts/migrate-permissions.ts`
- `scripts/ops/tenant-segregation-audit.sh`
- `scripts/seed-rate-limit-configs.ts`
- `scripts/validate-permissions.ts`
- `scripts/verify-deployment.ts`

### services

- `src/services/AdminService.ts`
- `src/services/AdvancedReportingService.ts`
- `src/services/ArchiveService.ts`
- `src/services/AssignmentService.ts`
- `src/services/AuditLogService.ts`
- `src/services/AuditorCertificationService.ts`
- `src/services/AuditorService.ts`
- `src/services/AuthService.ts`
- `src/services/BackupMonitoringService.ts`
- `src/services/BioService.ts`
- `src/services/BoardCertificationService.ts`
- `src/services/BoardService.ts`
- `src/services/BulkCertificationResetService.ts`
- `src/services/BulkOperationService.ts`
- `src/services/BusinessMetricsCollector.ts`
- `src/services/CategoryCertificationService.ts`
- `src/services/CategoryTypeService.ts`
- `src/services/CommentaryService.ts`
- `src/services/contestantNumberingService.ts`
- `src/services/ContestantScoreFilterService.ts`
- `src/services/ContestCertificationService.ts`
- `src/services/CustomFieldService.ts`
- `src/services/DatabaseBrowserService.ts`
- `src/services/DatabaseHealthService.ts`
- `src/services/DataWipeService.ts`
- `src/services/DeductionService.ts`
- `src/services/DRAutomationService.ts`
- `src/services/DynamicPermissionService.ts`
- `src/services/EmailDigestService.ts`
- `src/services/EmailService.ts`
- `src/services/EmailTemplateService.ts`
- `src/services/EmceeService.ts`
- `src/services/EnhancedRateLimitService.ts`
- `src/services/ErrorHandlingService.ts`
- `src/services/ErrorLogService.ts`
- `src/services/eventHandlers/AuditLogHandler.ts`
- `src/services/eventHandlers/NotificationHandler.ts`
- `src/services/eventHandlers/StatisticsHandler.ts`
- `src/services/EventTemplateService.ts`
- `src/services/ExportService.ts`
- `src/services/FeatureFlagService.ts`
- `src/services/HealthCheckService.ts`
- `src/services/JudgeContestantCertificationService.ts`
- `src/services/JudgeService.ts`
- `src/services/JudgeUncertificationService.ts`
- `src/services/MFAService.ts`
- `src/services/PerformanceService.ts`
- `src/services/PermissionAuditService.ts`
- `src/services/PrintService.ts`
- `src/services/ReportGenerationService.ts`
- `src/services/ReportInstanceService.ts`
- `src/services/ReportTemplateService.ts`
- `src/services/RestrictionService.ts`
- `src/services/ResultsService.ts`
- `src/services/RoleAssignmentService.ts`
- `src/services/scheduledBackupService.ts`
- `src/services/ScoreFileService.ts`
- `src/services/ScoreGovernanceService.ts`
- `src/services/ScoreRemovalService.ts`
- `src/services/ScoringService.ts`
- `src/services/SettingsService.ts`
- `src/services/SMSService.ts`
- `src/services/TallyMasterService.ts`
- `src/services/TenantService.ts`
- `src/services/TestEventSetupService.ts`
- `src/services/TrackerService.ts`
- `src/services/UploadService.ts`
- `src/services/UserFieldVisibilityService.ts`
- `src/services/UserService.ts`
- `src/services/WebhookDeliveryService.ts`
- `src/services/WinnerService.ts`
- `src/services/WorkflowService.ts`

## Prisma Model Classification

| Model | tenantId field | Classification |
| --- | --- | --- |
| ActivityLog | String? | TENANT_SCOPED_OPTIONAL |
| ArchivedEvent | String | TENANT_SCOPED_REQUIRED |
| Assignment | String | TENANT_SCOPED_REQUIRED |
| AuditLog | String | TENANT_SCOPED_REQUIRED |
| AuditorAssignment | String | TENANT_SCOPED_REQUIRED |
| BackupLog | String | TENANT_SCOPED_REQUIRED |
| BackupSchedule | String? | TENANT_SCOPED_OPTIONAL |
| BackupSetting | - | GLOBAL_OR_SYSTEM |
| BackupTarget | String? | TENANT_SCOPED_OPTIONAL |
| Category | String | TENANT_SCOPED_REQUIRED |
| CategoryCertification | String | TENANT_SCOPED_REQUIRED |
| CategoryContestant | String | TENANT_SCOPED_REQUIRED |
| CategoryJudge | String | TENANT_SCOPED_REQUIRED |
| CategoryTemplate | String | TENANT_SCOPED_REQUIRED |
| CategoryType | - | GLOBAL_OR_SYSTEM |
| Certification | String | TENANT_SCOPED_REQUIRED |
| Contest | String | TENANT_SCOPED_REQUIRED |
| Contestant | String | TENANT_SCOPED_REQUIRED |
| ContestCertification | String | TENANT_SCOPED_REQUIRED |
| ContestContestant | String | TENANT_SCOPED_REQUIRED |
| ContestJudge | String | TENANT_SCOPED_REQUIRED |
| Criterion | String | TENANT_SCOPED_REQUIRED |
| CustomField | String | TENANT_SCOPED_REQUIRED |
| CustomFieldValue | String | TENANT_SCOPED_REQUIRED |
| DeductionApproval | String | TENANT_SCOPED_REQUIRED |
| DeductionRequest | String | TENANT_SCOPED_REQUIRED |
| DrConfig | String? | TENANT_SCOPED_OPTIONAL |
| DrMetric | String? | TENANT_SCOPED_OPTIONAL |
| DrTestLog | String? | TENANT_SCOPED_OPTIONAL |
| EmailLog | String? | TENANT_SCOPED_OPTIONAL |
| EmailSetting | - | GLOBAL_OR_SYSTEM |
| EmailTemplate | String | TENANT_SCOPED_REQUIRED |
| EmceeScript | String | TENANT_SCOPED_REQUIRED |
| ErrorLog | String? | TENANT_SCOPED_OPTIONAL |
| Event | String | TENANT_SCOPED_REQUIRED |
| EventLog | String? | TENANT_SCOPED_OPTIONAL |
| EventTemplate | String | TENANT_SCOPED_REQUIRED |
| FeatureFlag | - | GLOBAL_OR_SYSTEM |
| File | String | TENANT_SCOPED_REQUIRED |
| Judge | String | TENANT_SCOPED_REQUIRED |
| JudgeCertification | String | TENANT_SCOPED_REQUIRED |
| JudgeComment | String | TENANT_SCOPED_REQUIRED |
| JudgeContestantCertification | String | TENANT_SCOPED_REQUIRED |
| JudgeScoreRemovalRequest | String | TENANT_SCOPED_REQUIRED |
| JudgeUncertificationRequest | String | TENANT_SCOPED_REQUIRED |
| LoggingSetting | - | GLOBAL_OR_SYSTEM |
| Notification | String | TENANT_SCOPED_REQUIRED |
| NotificationDigest | String | TENANT_SCOPED_REQUIRED |
| NotificationPreference | String | TENANT_SCOPED_REQUIRED |
| NotificationTemplate | String | TENANT_SCOPED_REQUIRED |
| OverallDeduction | String | TENANT_SCOPED_REQUIRED |
| PasswordHistory | - | GLOBAL_OR_SYSTEM |
| PasswordPolicy | - | GLOBAL_OR_SYSTEM |
| PerformanceLog | - | GLOBAL_OR_SYSTEM |
| PermissionAuditLog | String | TENANT_SCOPED_REQUIRED |
| RateLimitConfig | String? | TENANT_SCOPED_OPTIONAL |
| Report | String | TENANT_SCOPED_REQUIRED |
| ReportInstance | String | TENANT_SCOPED_REQUIRED |
| ReportTemplate | String | TENANT_SCOPED_REQUIRED |
| ReviewContestantCertification | String | TENANT_SCOPED_REQUIRED |
| ReviewJudgeScoreCertification | String | TENANT_SCOPED_REQUIRED |
| RoleAssignment | String | TENANT_SCOPED_REQUIRED |
| RolePermission | String | TENANT_SCOPED_REQUIRED |
| SavedSearch | String | TENANT_SCOPED_REQUIRED |
| Score | String | TENANT_SCOPED_REQUIRED |
| ScoreComment | String | TENANT_SCOPED_REQUIRED |
| ScoreFile | String | TENANT_SCOPED_REQUIRED |
| ScoreGovernanceApproval | String | TENANT_SCOPED_REQUIRED |
| ScoreGovernanceRequest | String | TENANT_SCOPED_REQUIRED |
| ScoreRemovalRequest | String | TENANT_SCOPED_REQUIRED |
| SearchAnalytic | - | GLOBAL_OR_SYSTEM |
| SearchHistory | String | TENANT_SCOPED_REQUIRED |
| SecuritySetting | - | GLOBAL_OR_SYSTEM |
| SystemSetting | String? | TENANT_SCOPED_OPTIONAL |
| TallyMasterAssignment | String | TENANT_SCOPED_REQUIRED |
| TemplateCriterion | String | TENANT_SCOPED_REQUIRED |
| Tenant | - | GLOBAL_OR_SYSTEM |
| ThemeSetting | String | TENANT_SCOPED_REQUIRED |
| User | String | TENANT_SCOPED_REQUIRED |
| UserFieldConfiguration | - | GLOBAL_OR_SYSTEM |
| WebhookConfig | String | TENANT_SCOPED_REQUIRED |
| WebhookDelivery | String | TENANT_SCOPED_REQUIRED |
| WinnerSignature | String | TENANT_SCOPED_REQUIRED |
| WorkflowInstance | String | TENANT_SCOPED_REQUIRED |
| WorkflowStep | String | TENANT_SCOPED_REQUIRED |
| WorkflowStepExecution | String | TENANT_SCOPED_REQUIRED |
| WorkflowTemplate | String? | TENANT_SCOPED_OPTIONAL |
| WorkflowTransition | String | TENANT_SCOPED_REQUIRED |

## Unmounted Route Modules

- `src/routes/searchRoutes.ts`

## Raw SQL Paths

- `src/repositories/BaseRepository.ts`
- `src/services/DataWipeService.ts`
- `src/services/TenantService.ts`

## Direct Global Prisma Imports

- `src/controllers/backupController.ts`
- `src/controllers/testRunnerController.ts`
- `src/jobs/ReportJobProcessor.ts`
- `src/middleware/auth.ts`
- `src/middleware/errorHandler.ts`
- `src/middleware/prisma/softDelete.ts`
- `src/middleware/softDelete.ts`
- `src/middleware/tenantMiddleware.ts`
- `src/repositories/DeductionRepository.ts`
- `src/repositories/NotificationPreferenceRepository.ts`
- `src/repositories/SearchRepository.ts`
- `src/repositories/TemplateRepository.ts`
- `src/routes/healthRoutes.ts`
- `src/routes/publicTenantRoutes.ts`
- `src/routes/settingsRoutes.ts`
- `src/services/BackupMonitoringService.ts`
- `src/services/BulkOperationService.ts`
- `src/services/CategoryTypeService.ts`
- `src/services/DatabaseHealthService.ts`
- `src/services/DeductionService.ts`
- `src/services/DRAutomationService.ts`
- `src/services/EmailDigestService.ts`
- `src/services/FeatureFlagService.ts`
- `src/services/HealthCheckService.ts`
- `src/services/TenantService.ts`
- `src/services/UserFieldVisibilityService.ts`
- `src/services/WebhookDeliveryService.ts`
- `src/services/WorkflowService.ts`
- `src/utils/ensureDefaultTenant.ts`

## Notes

- This matrix is generated from source patterns and should be reviewed when adding new routes or DB access paths.
- `SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT` means super admins may run global views or explicitly scoped tenant operations.
- `TENANT_SCOPED_OPTIONAL` models include rows that can be tenant-scoped or platform-global by design.

