# Migration Ordering Fix

## Date: 2026-02-09

## Problem

Several migrations had incorrect timestamps that caused them to run before the tables they depend on exist. This would cause failures when running migrations on a fresh database.

## Migrations Fixed

### 1. `standardize_judge_references`
- **Original**: `20250101000000_standardize_judge_references` (January 1, 2025)
- **New**: `20251030000000_standardize_judge_references` (October 30, 2025)
- **Reason**: This migration INSERTs into `judges` table and ALTERs `assignments` and `score_removal_requests` tables. It must run after the base schema exists.

### 2. `add_performance_indexes`
- **Original**: `20250120000000_add_performance_indexes` (January 20, 2025)
- **New**: `20251031000000_add_performance_indexes` (October 31, 2025)
- **Reason**: This migration creates indexes on `scores`, `role_assignments`, and `assignments` tables which must exist first.

### 3. `add_olympic_scoring`
- **Original**: `20250129212000_add_olympic_scoring` (January 29, 2025)
- **New**: `20251115000000_add_olympic_scoring` (November 15, 2025)
- **Reason**: This migration modifies the `tenants` table which is created by `20251114000000_add_multi_tenancy`.

### 4. Removed Duplicate
- **Deleted**: `20251029150102_standardize_judge_references` (placeholder migration with just `SELECT 1;`)
- **Reason**: This was a placeholder that is now redundant since we've properly renamed the actual migration.

## Migration Order After Fix

1. `20251029151842_add_archived_to_contest` - Adds archived field to contests
2. `20251030000000_standardize_judge_references` - Standardizes judge references (FIXED)
3. `20251031000000_add_performance_indexes` - Adds performance indexes (FIXED)
4. `20251109173025_add_score_files_and_restrictions` - Adds score files
5. `20251112_*` - Various additions (indexes, custom fields, notifications)
6. `20251114000000_add_multi_tenancy` - Adds multi-tenancy support (creates tenants table)
7. `20251114163303_add_dr_workflow_events_features` - DR and workflow features
8. `20251115000000_add_olympic_scoring` - Adds olympic scoring type (FIXED)
9. Subsequent migrations...

## Impact on Existing Databases

- **No impact**: These changes only affect migration ordering, not the SQL content.
- Databases that have already run these migrations will not be affected.
- The `_prisma_migrations` table tracks which migrations have been applied by name, and Prisma will recognize the renamed migrations as new migrations.

## Recommendation for Existing Production Databases

If you have a production database that has already run the original migrations, you may need to manually insert records into the `_prisma_migrations` table to mark the renamed migrations as already applied:

```sql
-- Only run this if your database already has these migrations applied under the old names
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
SELECT gen_random_uuid(), checksum, finished_at, '20251030000000_standardize_judge_references', logs, rolled_back_at, started_at, applied_steps_count
FROM _prisma_migrations WHERE migration_name = '20250101000000_standardize_judge_references';

-- Delete the old record
DELETE FROM _prisma_migrations WHERE migration_name = '20250101000000_standardize_judge_references';

-- Repeat for other renamed migrations as needed
```

## Testing

To verify the fix works on a fresh database:
1. Create a new empty PostgreSQL database
2. Run `npx prisma db push` to create the base schema
3. Run `npx prisma migrate deploy` to apply all migrations
4. Verify no errors occur
