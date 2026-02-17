# Prisma Minimum Bootstrap/Deployment Set

This file defines the minimum Prisma files required for clean bootstrapping and repeatable deployments.

## Required Files

- `prisma/schema.prisma`
- `prisma/migrations/**/migration.sql` (all migration directories listed below)

## Required Migration Directories

The current minimum migration directory set is:

1. `20251029151842_add_archived_to_contest`
2. `20251030000000_standardize_judge_references`
3. `20251031000000_add_performance_indexes`
4. `20251109173025_add_score_files_and_restrictions`
5. `20251112_add_comprehensive_indexes`
6. `20251112_add_custom_fields`
7. `20251112_add_notification_system`
8. `20251114000000_add_multi_tenancy`
9. `20251114163303_add_dr_workflow_events_features`
10. `20251115000000_add_olympic_scoring`
11. `20251119_fix_schema_drift`
12. `20251120_add_missing_tenantid`
13. `20251120_tenant_aware_settings`
14. `20251121_add_tally_auditor_assignments`
15. `20251124231115_add_rate_limit_config`
16. `20251125000000_add_performance_indexes`
17. `20251125093000_s4_3_add_soft_delete_fields_phase1`
18. `20251126005848_add_feature_flags`
19. `20260104000000_add_board_approval_fields`
20. `20260104000001_add_winners_publication_fields`
21. `20260104100000_add_dynamic_permissions`
22. `20260105000000_fix_role_enum_type`
23. `20260213110000_add_score_governance`
24. `CATEGORY_CERTIFICATION_WORKFLOW`
25. `add_city_state_country_to_user`

## Files Explicitly Pruned

These were removed because they are not part of Prisma's migration contract for deploy/bootstrap:

- `prisma/schema.prisma.introspected`
- `prisma/seed-missing-settings.ts`
- `prisma/migrations/add_multi_tenancy.sql`
- `prisma/migrations/fix_critical_database_issues.sql`
- `prisma/migrations/CATEGORY_CERTIFICATION_WORKFLOW/migration_complete.sql`
- `prisma/migrations/CATEGORY_CERTIFICATION_WORKFLOW/migration_complete_final.sql`
- migration-local assistant notes/docs (`CLAUDE.md`, `MIGRATION_ORDERING_FIX.md`)

## Validation Notes

- Build validation after cleanup:
  - backend TypeScript build passes (`npm run build`)
  - frontend build passes (`frontend/npm run build`)
- Current production database does not contain `_prisma_migrations`, so treat filesystem migrations as the canonical bootstrap source going forward.
