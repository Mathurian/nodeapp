# Multi-Tenancy Migration Guide

## Overview
This guide provides step-by-step instructions for applying the multi-tenancy migration to your database.

**Migration File**: `prisma/migrations/add_multi_tenancy.sql`

**Impact**: Adds `tenantId` field to 45 models for complete tenant isolation.

## Prerequisites

1. **Database Backup**: Create a full database backup before proceeding
   ```bash
   pg_dump -U your_user -d your_database > backup_before_multitenancy.sql
   ```

2. **Downtime Window**: Plan for ~15-30 minutes of downtime depending on database size

3. **Default Tenant**: Ensure at least one tenant exists in the `tenants` table
   ```sql
   SELECT * FROM tenants LIMIT 1;
   ```

## Migration Steps

### Step 1: Pre-Migration Validation

```sql
-- Check for orphaned records (records without parent tenant)
SELECT COUNT(*) FROM categories WHERE "tenantId" IS NULL;
SELECT COUNT(*) FROM contests WHERE "tenantId" IS NULL;
SELECT COUNT(*) FROM events WHERE "tenantId" IS NULL;

-- Verify tenant table has records
SELECT COUNT(*) FROM tenants;
```

### Step 2: Apply Migration (Manual Method)

```bash
# Connect to your database
psql -U your_user -d your_database

# Apply migration
\i prisma/migrations/add_multi_tenancy.sql

# Verify completion
\dt
```

### Step 3: Apply Migration (Prisma Method - Recommended)

```bash
# Set DATABASE_URL in .env
export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Generate Prisma Client
npx prisma generate

# Apply migration
npx prisma db push --skip-generate

# Or use migrate deploy for production
npx prisma migrate deploy
```

### Step 4: Post-Migration Validation

```sql
-- Verify all tenantId columns are populated
SELECT
  table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE column_name = 'tenantId'
  AND table_schema = 'public';

-- Check for NULL tenantId values (should be 0)
SELECT COUNT(*) FROM criteria WHERE "tenantId" IS NULL;
SELECT COUNT(*) FROM scores WHERE "tenantId" IS NULL;
SELECT COUNT(*) FROM files WHERE "tenantId" IS NULL;

-- Verify indexes were created
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE indexname LIKE '%tenantId%'
ORDER BY tablename;
```

### Step 5: Application Deployment

After successful migration:

1. Deploy updated application code with tenant context
2. Test tenant isolation:
   ```sql
   -- Should only return records for specific tenant
   SELECT COUNT(*) FROM scores WHERE "tenantId" = 'tenant_id_here';
   ```
3. Monitor application logs for tenant-related errors
4. Run integration tests

## Rollback Procedure

If you need to rollback:

```sql
-- WARNING: This will remove all tenantId data

-- Drop indexes
DROP INDEX IF EXISTS criteria_tenantId_idx;
DROP INDEX IF EXISTS scores_tenantId_idx;
-- ... (repeat for all indexes)

-- Drop constraints
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_tenantId_categoryId_contestantId_judgeId_criterionId_key;
-- ... (repeat for all unique constraints)

-- Remove columns
ALTER TABLE criteria DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE scores DROP COLUMN IF EXISTS "tenantId";
-- ... (repeat for all 45 models)

-- Restore original constraints
ALTER TABLE scores ADD CONSTRAINT scores_categoryId_contestantId_judgeId_criterionId_key
  UNIQUE ("categoryId", "contestantId", "judgeId", "criterionId");
-- ... (repeat for all original constraints)
```

**Or restore from backup**:
```bash
psql -U your_user -d your_database < backup_before_multitenancy.sql
```

## Common Issues and Solutions

### Issue 1: NULL tenantId After Migration

**Problem**: Some records have NULL tenantId after Phase 2 population.

**Solution**:
```sql
-- Find orphaned records
SELECT id, "categoryId" FROM scores WHERE "tenantId" IS NULL;

-- Manually assign to default tenant
UPDATE scores SET "tenantId" = (SELECT id FROM tenants LIMIT 1)
WHERE "tenantId" IS NULL;
```

### Issue 2: Constraint Violations

**Problem**: Unique constraint violations after adding tenantId.

**Solution**:
```sql
-- Find duplicates
SELECT "tenantId", "categoryId", "contestantId", "judgeId", "criterionId", COUNT(*)
FROM scores
GROUP BY "tenantId", "categoryId", "contestantId", "judgeId", "criterionId"
HAVING COUNT(*) > 1;

-- Resolve duplicates before applying constraints
```

### Issue 3: Performance Degradation

**Problem**: Queries are slower after adding tenantId.

**Solution**:
```sql
-- Analyze tables to update statistics
ANALYZE criteria;
ANALYZE scores;
-- ... (all affected tables)

-- Verify indexes are being used
EXPLAIN ANALYZE SELECT * FROM scores WHERE "tenantId" = 'tenant_id';
```

### Issue 4: Missing Parent Records

**Problem**: Cannot populate tenantId because parent record is missing.

**Solution**:
```sql
-- Find orphaned child records
SELECT c.id, c."categoryId"
FROM criteria c
LEFT JOIN categories cat ON c."categoryId" = cat.id
WHERE cat.id IS NULL;

-- Either delete orphans or assign to default category
DELETE FROM criteria WHERE "categoryId" NOT IN (SELECT id FROM categories);
```

## Performance Optimization

After migration, consider these optimizations:

1. **Vacuum and Analyze**:
   ```sql
   VACUUM ANALYZE criteria;
   VACUUM ANALYZE scores;
   VACUUM ANALYZE files;
   ```

2. **Index Statistics**:
   ```sql
   -- Check index usage
   SELECT
     schemaname,
     tablename,
     indexname,
     idx_scan,
     idx_tup_read,
     idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE indexname LIKE '%tenantId%'
   ORDER BY idx_scan DESC;
   ```

3. **Query Plan Analysis**:
   ```sql
   -- Verify tenant filtering uses index
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM scores
   WHERE "tenantId" = 'your_tenant_id'
     AND "categoryId" = 'some_category';
   ```

## Testing Checklist

- [ ] All tenantId columns are NOT NULL
- [ ] All indexes created successfully
- [ ] All unique constraints updated
- [ ] No orphaned records (NULL tenantId)
- [ ] Application starts without errors
- [ ] Tenant isolation works (queries filtered by tenantId)
- [ ] Cross-tenant data access blocked
- [ ] Performance acceptable (query times similar to pre-migration)
- [ ] All integration tests pass
- [ ] User acceptance testing complete

## Data Migration Timeline

For production databases:

1. **T-7 days**: Test migration on staging environment
2. **T-3 days**: Notify users of upcoming maintenance
3. **T-1 day**: Final backup and migration rehearsal
4. **T-0**: Execute migration during low-traffic window
5. **T+1 hour**: Validation and smoke testing
6. **T+24 hours**: Monitor for issues, ready to rollback
7. **T+7 days**: Migration considered stable

## Support

For issues or questions:
- Check logs: `tail -f logs/application.log`
- Database logs: `tail -f /var/log/postgresql/postgresql-*.log`
- Review: `docs/PRISMA-MULTI-TENANCY-PLAN.md`

## Summary

This migration adds comprehensive multi-tenancy support:
- **45 models updated** with tenantId
- **65+ indexes added** for performance
- **18 unique constraints updated** for data integrity
- **Complete tenant isolation** at database level

**Estimated migration time**: 15-30 minutes (varies by database size)
**Recommended execution**: Low-traffic hours (e.g., 2-4 AM)
