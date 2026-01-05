# Permission Migration Scripts

This directory contains automated scripts for migrating from hardcoded permissions to database-driven dynamic permissions (Phase 4).

## Overview

Two production-ready scripts enable safe, automated migration of permissions:

1. **migrate-permissions.ts** - Populates database from hardcoded PERMISSIONS constant
2. **validate-permissions.ts** - Validates database matches hardcoded permissions

## Quick Start

### 1. Test Migration (Dry Run)

```bash
# Preview what will be migrated
npx tsx scripts/migrate-permissions.ts --all --dry-run
```

### 2. Migrate Single Tenant

```bash
# Migrate a test tenant first
npx tsx scripts/migrate-permissions.ts --tenant <tenant-id> --userId <admin-user-id>
```

### 3. Validate Migration

```bash
# Ensure migration was successful
npx tsx scripts/validate-permissions.ts --tenant <tenant-id>
```

### 4. Migrate All Tenants

```bash
# After successful test
npx tsx scripts/migrate-permissions.ts --all --userId <admin-user-id>
```

### 5. Validate All

```bash
# Comprehensive validation
npx tsx scripts/validate-permissions.ts --all --strict
```

### 6. Enable Dynamic Permissions

```bash
# Only after successful validation
export ENABLE_DYNAMIC_PERMISSIONS=true
pm2 restart event-manager
```

## Scripts

### migrate-permissions.ts

**Purpose**: Populates the `role_permissions` table from hardcoded PERMISSIONS constant

**Features**:
- ✅ Parses all 9 roles (SUPER_ADMIN, ADMIN, ORGANIZER, BOARD, JUDGE, CONTESTANT, EMCEE, TALLY_MASTER, AUDITOR)
- ✅ Handles wildcard permissions (`*`, `resource:*`, `resource:operation`)
- ✅ Idempotent (safe to run multiple times)
- ✅ Creates audit log entries
- ✅ Dry-run mode for preview
- ✅ Single tenant or all tenants
- ✅ Detailed progress reporting

**Usage**:
```bash
# Single tenant (dry run)
npx tsx scripts/migrate-permissions.ts --tenant <tenant-id> --dry-run

# Single tenant (live)
npx tsx scripts/migrate-permissions.ts --tenant <tenant-id> --userId <admin-user-id>

# All tenants (dry run)
npx tsx scripts/migrate-permissions.ts --all --dry-run

# All tenants (live)
npx tsx scripts/migrate-permissions.ts --all --userId <admin-user-id>
```

**Options**:
- `--tenant <id>` - Migrate specific tenant
- `--all` - Migrate all tenants
- `--userId <id>` - User ID to record as creator (default: 'system-migration')
- `--dry-run` - Preview without modifying database
- `--help` - Show help

**Example Output**:
```
================================================================================
Migrating permissions for tenant: tenant-123
Mode: LIVE
================================================================================

Processing role: JUDGE
  Permissions: scores:write, scores:read, results:read, commentary:write
  ✅ Created: scores:write
  ✅ Created: scores:read
  ⏭️  Skipped: results:read (already exists)

================================================================================
Migration Summary for tenant-123:
  ✅ Created: 45
  ⏭️  Skipped: 3
  ❌ Errors: 0
  Status: SUCCESS
================================================================================
```

### validate-permissions.ts

**Purpose**: Validates database permissions match hardcoded permissions

**Features**:
- ✅ Compares hardcoded vs database for each role
- ✅ Detects missing permissions (in hardcoded but not DB)
- ✅ Detects extra permissions (in DB but not hardcoded)
- ✅ Detects mismatched 'allowed' flags
- ✅ Standard and strict modes
- ✅ Single tenant or all tenants
- ✅ Detailed diff reporting

**Usage**:
```bash
# Single tenant (standard mode)
npx tsx scripts/validate-permissions.ts --tenant <tenant-id>

# Single tenant (strict mode)
npx tsx scripts/validate-permissions.ts --tenant <tenant-id> --strict

# All tenants (standard mode)
npx tsx scripts/validate-permissions.ts --all

# All tenants (strict mode)
npx tsx scripts/validate-permissions.ts --all --strict
```

**Options**:
- `--tenant <id>` - Validate specific tenant
- `--all` - Validate all tenants
- `--strict` - Treat extra permissions as errors (default: warnings)
- `--help` - Show help

**Validation Checks**:
1. **Missing Permissions** (ERROR): In hardcoded but not in database
2. **Extra Permissions** (WARNING/ERROR): In database but not in hardcoded
3. **Mismatched Allowed Flags** (ERROR): Permission exists but 'allowed' is false

**Modes**:
- **Standard**: Missing permissions and mismatched flags are errors; extra permissions are warnings
- **Strict**: All of the above are errors

**Example Output**:
```
================================================================================
Validating permissions for tenant: tenant-123
Mode: STANDARD
================================================================================

Validating role: JUDGE
  ✅ Valid (matches hardcoded permissions)

Validating role: CONTESTANT
  ❌ Invalid (differences detected)
    Missing in database (2):
      - results:read
      - commentary:read

================================================================================
Validation Summary for tenant-123:
  ✅ Valid roles: 8
  ❌ Invalid roles: 1
  Missing permissions: 2
  Extra permissions: 0
  Mismatched allowed flags: 0
  Total issues: 2
  Status: ❌ FAILED
================================================================================

💡 To fix issues:
   npx tsx scripts/migrate-permissions.ts --tenant tenant-123
```

## Recommended Workflow

### Phase 1: Pre-Migration

1. **Backup Database**
   ```bash
   pg_dump -h localhost -U postgres event_manager > backup_$(date +%Y%m%d).sql
   ```

2. **Test Dry Run**
   ```bash
   npx tsx scripts/migrate-permissions.ts --all --dry-run
   ```

### Phase 2: Test Tenant Migration

1. **Migrate Test Tenant**
   ```bash
   npx tsx scripts/migrate-permissions.ts --tenant test-tenant-001 --userId admin-001
   ```

2. **Validate Test Tenant**
   ```bash
   npx tsx scripts/validate-permissions.ts --tenant test-tenant-001 --strict
   ```

3. **Test with Feature Flag**
   ```bash
   # Enable for test tenant only
   export ENABLE_DYNAMIC_PERMISSIONS=true
   # Test all functionality
   # Check logs for errors
   ```

### Phase 3: Production Migration

1. **Migrate All Tenants**
   ```bash
   npx tsx scripts/migrate-permissions.ts --all --userId admin-001
   ```

2. **Validate All Tenants**
   ```bash
   npx tsx scripts/validate-permissions.ts --all --strict
   ```

3. **Enable Feature Flag Gradually**
   ```bash
   # Week 1: Test tenants only
   # Week 2: 10% of production tenants
   # Week 3: 50% of production tenants
   # Week 4: 100% of production tenants
   ```

### Phase 4: Monitoring

1. **Check Cache Hit Rate**
   ```bash
   # Should be >80%
   # Monitor: permissions.cache.hit_rate
   ```

2. **Monitor Permission Denials**
   ```bash
   # Should not increase after migration
   # Monitor: permissions.check.denials_per_minute
   ```

3. **Check Performance**
   ```bash
   # Should be <5ms P99
   # Monitor: permissions.check.latency_ms
   ```

## Permission Format

### Hardcoded Format

```typescript
PERMISSIONS = {
  JUDGE: [
    "scores:write",   // Specific permission
    "events:*",       // Wildcard operation
    "*"               // All permissions
  ]
}
```

### Database Format

| role  | resource | operation | allowed | tenantId |
|-------|----------|-----------|---------|----------|
| JUDGE | scores   | write     | true    | tenant-1 |
| JUDGE | events   | *         | true    | tenant-1 |
| JUDGE | *        | *         | true    | tenant-1 |

### Permission Parsing

```typescript
// Script parses permissions as:
"*" => { resource: "*", operation: "*" }
"events:*" => { resource: "events", operation: "*" }
"scores:read" => { resource: "scores", operation: "read" }
```

## Safety Features

### Idempotency

- Migration script checks if permission exists before creating
- Safe to run multiple times
- Skips existing permissions with ⏭️ indicator

### Transaction Safety

- Each permission creation is atomic
- Includes RolePermission + PermissionAuditLog in transaction
- Rollback on error

### Audit Trail

- All migrations create audit log entries
- Reason: "Migration from hardcoded permissions"
- Changed by: User ID provided via --userId

### Rollback

If migration causes issues:

1. **Quick Rollback** (Recommended)
   ```bash
   export ENABLE_DYNAMIC_PERMISSIONS=false
   pm2 restart event-manager
   ```
   - Instant rollback to hardcoded permissions
   - No data loss
   - Dynamic permissions persist in database

2. **Database Rollback** (Nuclear Option)
   ```bash
   # Only if necessary
   DELETE FROM permission_audit_logs WHERE reason = 'Migration from hardcoded permissions';
   DELETE FROM role_permissions WHERE "createdBy" = 'system-migration';
   ```

## Troubleshooting

### Issue: Validation fails with missing permissions

**Solution**: Run migration script
```bash
npx tsx scripts/migrate-permissions.ts --tenant <tenant-id> --userId admin-001
```

### Issue: Validation fails with extra permissions

**Cause**: Custom permissions were added to database

**Solution**: Either:
1. Remove extra permissions manually
2. Accept them (only ERROR in strict mode)

### Issue: Migration fails with database errors

**Cause**: Database connection or schema issues

**Solution**:
1. Check database connection
2. Verify schema is up to date: `npx prisma migrate status`
3. Apply migrations if needed: `npx prisma migrate deploy`

### Issue: Permission checks fail after migration

**Cause**: Cache not warmed or feature flag configuration

**Solution**:
1. Warm cache: Use PermissionCacheService.warmCache()
2. Verify feature flag: `echo $ENABLE_DYNAMIC_PERMISSIONS`
3. Check logs for fallback messages

## Performance

### Expected Performance

- **Migration**: ~50-100ms per role (all 9 roles in <1 second)
- **Validation**: ~100-200ms per tenant
- **Database Impact**: Minimal (one-time operation)

### Migration Time Estimates

| Tenants | Estimated Time |
|---------|----------------|
| 1       | <1 second      |
| 10      | <10 seconds    |
| 100     | <2 minutes     |
| 1,000   | <20 minutes    |

## Files

```
scripts/
├── migrate-permissions.ts    # Migration script (465 lines)
├── validate-permissions.ts   # Validation script (490 lines)
└── README.md                 # This file
```

## References

- [Phase 4 Complete Documentation](../docs/PHASE4_COMPLETE.md)
- [Implementation Plan](../docs/IMPLEMENTATION_PLAN_PERMISSIONS_FIXES.md)
- [Permissions Middleware](../src/middleware/permissions.ts)
- [DynamicPermissionService](../src/services/DynamicPermissionService.ts)

## Support

For issues or questions:
1. Check [PHASE4_COMPLETE.md](../docs/PHASE4_COMPLETE.md) for detailed implementation info
2. Review test cases in [DynamicPermissionService.test.ts](../tests/unit/services/DynamicPermissionService.test.ts)
3. Check application logs for migration errors

---

**Last Updated**: 2026-01-04
**Phase**: 4 - Dynamic CRUD Permissions System
**Status**: ✅ Production Ready
