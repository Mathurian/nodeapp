# Phase 1: Critical - Add Cascade Delete Rules

**Priority:** 🔴 CRITICAL
**Timeline:** 48 hours
**Risk Level:** HIGH (data deletion)
**Dependencies:** Database backup required

---

## Problem Summary

**Issue:** Only 7 out of 56 relationships (12.5%) have cascade delete rules
**Impact:**
- **Orphaned Records:** Child records remain when parent deleted
- **Deletion Failures:** Foreign key constraint violations
- **Data Integrity:** Inconsistent database state
- **Manual Cleanup:** Required cleanup scripts for orphaned data

**Current State:**
- 56 total `@relation` statements in schema
- Only 7 have `onDelete: Cascade` configured
- 49 relationships (88%) lack proper deletion behavior
- Default behavior: `onDelete: SetNull` or referential integrity errors

---

## Risk Assessment

### ⚠️ CRITICAL RISKS

1. **Accidental Data Loss**
   - Adding cascades could delete more data than expected
   - Example: Deleting a contest could cascade to delete all scores

2. **Performance Impact**
   - Cascade deletes trigger multiple database operations
   - Large cascade chains could lock tables

3. **Irreversible Operations**
   - Once cascade deletes occur, data is gone
   - Requires comprehensive backups before implementation

### Mitigation Strategies

1. **Mandatory Database Backup**
   ```bash
   pg_dump event_manager > backup_before_cascade_$(date +%Y%m%d).sql
   ```

2. **Test in Staging First**
   - Apply schema changes to staging
   - Test all delete operations
   - Verify expected behavior
   - Only then apply to production

3. **Comprehensive Testing**
   - Test each delete operation
   - Verify cascade behavior
   - Check for unexpected deletions
   - Monitor deletion counts

4. **Phased Rollout**
   - Implement cascades in batches
   - Start with low-risk relationships
   - Monitor after each batch
   - Rollback capability at each phase

---

## Relationship Analysis

### Step 1: Identify All Relationships (2 hours)

**Extract all relations from schema:**

```bash
# Find all @relation statements
grep -n "@relation" prisma/schema.prisma > /tmp/relations.txt

# Count total
wc -l /tmp/relations.txt
# Expected: 56 lines
```

**Categorize by relationship type:**

1. **One-to-Many (most common)**
   - Example: Contest -> Scores
   - Delete contest → should delete all scores

2. **Many-to-Many**
   - Example: Judge -> Contest assignments
   - Delete judge → remove assignments, keep contests

3. **One-to-One**
   - Example: User -> Profile
   - Delete user → should delete profile

### Step 2: Determine Required Cascade Behavior (4 hours)

**For each relationship, decide:**

| Parent → Child | Delete Parent Should... | Cascade Rule |
|----------------|-------------------------|--------------|
| Contest → Score | Delete scores | `Cascade` |
| Event → Contest | Delete contests | `Cascade` |
| User → Score (judge) | Keep scores, null judge | `SetNull` |
| Category → Contest | Prevent if contests exist | `Restrict` |
| Tenant → Everything | Delete everything | `Cascade` |

**Cascade Delete Rules Available:**

```prisma
onDelete: Cascade    // Delete child records
onDelete: SetNull    // Set foreign key to null (requires optional field)
onDelete: Restrict   // Prevent deletion if children exist
onDelete: NoAction   // Database default (usually error)
```

---

## Schema Changes Required

### Priority 1: Tenant Relationships (MUST CASCADE)

**Reasoning:** Multi-tenant app - deleting tenant must delete all tenant data

```prisma
model User {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  //                                                                 ^^^^^^^^^^^^^^^ ADD
}

model Event {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

model Contest {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

// Apply to ALL models with tenantId
```

**Models requiring tenant cascade:**
- User
- Event
- Contest
- Category
- CategoryType
- Certification
- Score
- Assignment
- CustomField
- Setting
- EmailTemplate
- Notification
- WorkflowState
- Archive records
- All other tenant-scoped models

**Estimated Count:** ~25 tenant relationships

### Priority 2: Parent-Child Hierarchies (SHOULD CASCADE)

**Event → Contest:**
```prisma
model Contest {
  id      Int    @id @default(autoincrement())
  eventId Int?
  event   Event? @relation(fields: [eventId], references: [id], onDelete: Cascade)
  //                                                             ^^^^^^^^^^^^^^^^ ADD
}
```

**Contest → Score:**
```prisma
model Score {
  id        Int      @id @default(autoincrement())
  contestId Int?
  contest   Contest? @relation(fields: [contestId], references: [id], onDelete: Cascade)
}
```

**Contest → Assignment:**
```prisma
model Assignment {
  id        Int      @id @default(autoincrement())
  contestId Int?
  contest   Contest? @relation(fields: [contestId], references: [id], onDelete: Cascade)
}
```

**Category → Contestant:**
```prisma
model Contestant {
  id         Int       @id @default(autoincrement())
  categoryId Int?
  category   Category? @relation(fields: [categoryId], references: [id], onDelete: Cascade)
}
```

**Estimated Count:** ~15 hierarchical relationships

### Priority 3: Reference Relationships (SET NULL)

**User (Judge) → Score:**
```prisma
model Score {
  id      Int   @id @default(autoincrement())
  judgeId Int?  // Already optional
  judge   User? @relation("JudgeScores", fields: [judgeId], references: [id], onDelete: SetNull)
  //                                                                          ^^^^^^^^^^^^^^^^^ ADD
}
```

**Reasoning:** Deleting a judge should NOT delete scores, just remove judge reference

**User (Contestant) → various:**
```prisma
model Contestant {
  id     Int   @id @default(autoincrement())
  userId Int?  // Already optional
  user   User? @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

**Estimated Count:** ~5 reference relationships

### Priority 4: Protected Relationships (RESTRICT)

**CategoryType → Category:**
```prisma
model Category {
  id             Int           @id @default(autoincrement())
  categoryTypeId Int?
  categoryType   CategoryType? @relation(fields: [categoryTypeId], references: [id], onDelete: Restrict)
  //                                                                                 ^^^^^^^^^^^^^^^^^ ADD
}
```

**Reasoning:** Should not delete category type if categories still use it

**Estimated Count:** ~4 protected relationships

---

## Implementation Plan

### Phase 1: Pre-Implementation (4 hours)

**Step 1: Database Backup**
```bash
# Full database backup
pg_dump -h localhost -U postgres event_manager > \
  /backups/db/pre_cascade_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
pg_restore --list /backups/db/pre_cascade_*.sql | head -20

# Test restore on different database
createdb event_manager_test
pg_restore -d event_manager_test /backups/db/pre_cascade_*.sql
```

**Step 2: Document Current State**
```bash
# Count records in each table
psql event_manager -c "
SELECT
  schemaname,
  tablename,
  n_tup_ins as row_count
FROM pg_stat_user_tables
ORDER BY n_tup_ins DESC;
" > /tmp/pre_cascade_counts.txt
```

**Step 3: Create Migration File**
```bash
# Generate migration
npx prisma migrate dev --name add_cascade_deletes --create-only

# This creates: prisma/migrations/XXXXXX_add_cascade_deletes/migration.sql
```

**Step 4: Review Generated SQL**
```sql
-- Example generated migration
-- prisma/migrations/XXXXXX_add_cascade_deletes/migration.sql

-- Drop existing foreign key
ALTER TABLE "User" DROP CONSTRAINT "User_tenantId_fkey";

-- Add foreign key with cascade
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

### Phase 2: Tenant Cascades (8 hours)

**Apply to 25 models with tenantId:**

```prisma
// prisma/schema.prisma

model User {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model Event {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model Contest {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model Category {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model CategoryType {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model Certification {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model Score {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model Assignment {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model CustomField {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model Setting {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model EmailTemplate {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model Notification {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

model WorkflowState {
  id       Int     @id @default(autoincrement())
  tenantId Int?
  tenant   Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  // ... rest of model
}

// Continue for all tenant-scoped models...
```

**Generate and apply migration:**
```bash
# Generate migration
npx prisma migrate dev --name add_tenant_cascades

# This will:
# 1. Create migration file
# 2. Apply to database
# 3. Regenerate Prisma Client
```

**Test tenant deletion:**
```typescript
// test/tenant-cascade.test.ts
import prisma from '../src/config/database';

describe('Tenant Cascade Deletes', () => {
  it('should cascade delete all tenant data', async () => {
    // Create test tenant with data
    const tenant = await prisma.tenant.create({
      data: { name: 'Test Tenant' }
    });

    // Create test data
    await prisma.user.create({
      data: { email: 'test@example.com', tenantId: tenant.id }
    });
    await prisma.event.create({
      data: { name: 'Test Event', tenantId: tenant.id }
    });

    // Verify data exists
    const userCount = await prisma.user.count({ where: { tenantId: tenant.id } });
    expect(userCount).toBe(1);

    // Delete tenant
    await prisma.tenant.delete({ where: { id: tenant.id } });

    // Verify cascade worked
    const remainingUsers = await prisma.user.count({ where: { tenantId: tenant.id } });
    expect(remainingUsers).toBe(0);
  });
});
```

### Phase 3: Hierarchical Cascades (4 hours)

**Event → Contest → Score chain:**

```prisma
model Contest {
  id      Int     @id @default(autoincrement())
  eventId Int?
  event   Event?  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  scores  Score[]
}

model Score {
  id        Int      @id @default(autoincrement())
  contestId Int?
  contest   Contest? @relation(fields: [contestId], references: [id], onDelete: Cascade)
}

model Assignment {
  id        Int      @id @default(autoincrement())
  contestId Int?
  contest   Contest? @relation(fields: [contestId], references: [id], onDelete: Cascade)
}
```

**Generate migration:**
```bash
npx prisma migrate dev --name add_hierarchical_cascades
```

**Test cascade chain:**
```typescript
describe('Hierarchical Cascades', () => {
  it('should cascade from Event → Contest → Scores', async () => {
    // Create hierarchy
    const event = await prisma.event.create({
      data: { name: 'Test Event' }
    });
    const contest = await prisma.contest.create({
      data: { name: 'Test Contest', eventId: event.id }
    });
    const score = await prisma.score.create({
      data: { value: 10, contestId: contest.id }
    });

    // Delete event (top level)
    await prisma.event.delete({ where: { id: event.id } });

    // Verify cascade
    const remainingContests = await prisma.contest.count({ where: { id: contest.id } });
    const remainingScores = await prisma.score.count({ where: { id: score.id } });

    expect(remainingContests).toBe(0);
    expect(remainingScores).toBe(0);
  });
});
```

### Phase 4: SetNull References (2 hours)

**Judge/User references:**

```prisma
model Score {
  id      Int   @id @default(autoincrement())
  judgeId Int?  // Must be optional
  judge   User? @relation("JudgeScores", fields: [judgeId], references: [id], onDelete: SetNull)
}

model Assignment {
  id      Int   @id @default(autoincrement())
  judgeId Int?
  judge   User? @relation("JudgeAssignments", fields: [judgeId], references: [id], onDelete: SetNull)
}
```

**Generate migration:**
```bash
npx prisma migrate dev --name add_setnull_references
```

**Test SetNull behavior:**
```typescript
describe('SetNull References', () => {
  it('should set judgeId to null when judge deleted', async () => {
    const judge = await prisma.user.create({
      data: { email: 'judge@example.com', role: 'JUDGE' }
    });
    const score = await prisma.score.create({
      data: { value: 10, judgeId: judge.id }
    });

    // Delete judge
    await prisma.user.delete({ where: { id: judge.id } });

    // Verify score remains but judgeId is null
    const updatedScore = await prisma.score.findUnique({
      where: { id: score.id }
    });
    expect(updatedScore).toBeDefined();
    expect(updatedScore.judgeId).toBeNull();
  });
});
```

### Phase 5: Restrict Protected (1 hour)

**Category type protection:**

```prisma
model Category {
  id             Int           @id @default(autoincrement())
  categoryTypeId Int?
  categoryType   CategoryType? @relation(fields: [categoryTypeId], references: [id], onDelete: Restrict)
}
```

**Generate migration:**
```bash
npx prisma migrate dev --name add_restrict_protection
```

**Test Restrict behavior:**
```typescript
describe('Restrict Protection', () => {
  it('should prevent deletion of category type with categories', async () => {
    const categoryType = await prisma.categoryType.create({
      data: { name: 'Dance' }
    });
    await prisma.category.create({
      data: { name: 'Ballet', categoryTypeId: categoryType.id }
    });

    // Attempt to delete category type
    await expect(
      prisma.categoryType.delete({ where: { id: categoryType.id } })
    ).rejects.toThrow(); // Foreign key constraint violation
  });

  it('should allow deletion when no categories exist', async () => {
    const categoryType = await prisma.categoryType.create({
      data: { name: 'Drama' }
    });

    // Should succeed
    await prisma.categoryType.delete({ where: { id: categoryType.id } });
  });
});
```

---

## Testing Strategy

### Unit Tests (4 hours)

**Test each cascade type:**

1. **Cascade Delete Tests**
   - Create parent with children
   - Delete parent
   - Verify children deleted
   - Test for each cascade relationship

2. **SetNull Tests**
   - Create relationship
   - Delete parent
   - Verify child remains with null foreign key

3. **Restrict Tests**
   - Create protected relationship
   - Attempt delete (should fail)
   - Remove children
   - Retry delete (should succeed)

### Integration Tests (4 hours)

**Test complex scenarios:**

```typescript
describe('Cascade Integration Tests', () => {
  it('should handle multi-level cascades correctly', async () => {
    // Event → Contest → Score → ScoreDetail
    const event = await prisma.event.create({ data: { name: 'Competition' } });
    const contest = await prisma.contest.create({
      data: { name: 'Prelim', eventId: event.id }
    });
    const score = await prisma.score.create({
      data: { value: 10, contestId: contest.id }
    });

    // Delete at top level
    await prisma.event.delete({ where: { id: event.id } });

    // Verify entire cascade chain
    expect(await prisma.contest.count({ where: { id: contest.id } })).toBe(0);
    expect(await prisma.score.count({ where: { id: score.id } })).toBe(0);
  });

  it('should handle mixed cascade behaviors', async () => {
    // Contest cascades to scores but sets judge to null
    const judge = await prisma.user.create({
      data: { email: 'judge@test.com' }
    });
    const contest = await prisma.contest.create({
      data: { name: 'Finals' }
    });
    const score = await prisma.score.create({
      data: { value: 10, contestId: contest.id, judgeId: judge.id }
    });

    // Delete judge
    await prisma.user.delete({ where: { id: judge.id } });
    let updatedScore = await prisma.score.findUnique({ where: { id: score.id } });
    expect(updatedScore.judgeId).toBeNull();
    expect(updatedScore.contestId).toBe(contest.id);

    // Delete contest
    await prisma.contest.delete({ where: { id: contest.id } });
    const deletedScore = await prisma.score.findUnique({ where: { id: score.id } });
    expect(deletedScore).toBeNull();
  });
});
```

### Performance Tests (2 hours)

**Test large cascade operations:**

```typescript
describe('Cascade Performance', () => {
  it('should handle cascading 1000+ records', async () => {
    const tenant = await prisma.tenant.create({ data: { name: 'Large Tenant' } });

    // Create 1000 users
    await Promise.all(
      Array.from({ length: 1000 }, (_, i) =>
        prisma.user.create({
          data: { email: `user${i}@test.com`, tenantId: tenant.id }
        })
      )
    );

    const startTime = Date.now();
    await prisma.tenant.delete({ where: { id: tenant.id } });
    const duration = Date.now() - startTime;

    // Should complete in reasonable time (< 5 seconds)
    expect(duration).toBeLessThan(5000);

    // Verify all deleted
    const remaining = await prisma.user.count({ where: { tenantId: tenant.id } });
    expect(remaining).toBe(0);
  });
});
```

---

## Monitoring and Validation

### Post-Migration Checks

**Verify foreign key constraints:**
```sql
-- Check all foreign keys have cascade rules
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;
```

**Expected delete_rule values:**
- `CASCADE` - for most relationships
- `SET NULL` - for optional references
- `RESTRICT` - for protected relationships

**Verify counts match pre-migration:**
```sql
SELECT
  tablename,
  n_tup_ins as row_count
FROM pg_stat_user_tables
ORDER BY tablename;
```

Compare with `/tmp/pre_cascade_counts.txt`

### Production Monitoring (First Week)

**Daily Checks:**

1. **Orphaned Record Query:**
```sql
-- Check for orphaned scores (should be 0)
SELECT COUNT(*) FROM "Score" s
WHERE s."contestId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Contest" c WHERE c.id = s."contestId"
  );

-- Check for orphaned contests
SELECT COUNT(*) FROM "Contest" c
WHERE c."eventId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Event" e WHERE e.id = c."eventId"
  );
```

2. **Deletion Audit:**
```sql
-- Log all deletes for first week
CREATE TABLE deletion_audit (
  id SERIAL PRIMARY KEY,
  table_name TEXT,
  record_id INTEGER,
  deleted_at TIMESTAMP DEFAULT NOW(),
  cascade_count INTEGER
);

-- Trigger on tenant deletion
CREATE OR REPLACE FUNCTION log_tenant_cascade()
RETURNS TRIGGER AS $$
DECLARE
  cascade_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cascade_count
  FROM "User" WHERE "tenantId" = OLD.id;

  INSERT INTO deletion_audit (table_name, record_id, cascade_count)
  VALUES ('Tenant', OLD.id, cascade_count);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

---

## Rollback Plan

### Emergency Rollback

**If cascade deletions cause issues:**

```bash
# 1. Stop application
pm2 stop event-manager

# 2. Restore database from backup
dropdb event_manager
createdb event_manager
pg_restore -d event_manager /backups/db/pre_cascade_YYYYMMDD_HHMMSS.sql

# 3. Revert Prisma schema
git checkout HEAD~1 -- prisma/schema.prisma

# 4. Regenerate Prisma Client
npx prisma generate

# 5. Rebuild application
npm run build

# 6. Restart
pm2 restart event-manager
```

### Partial Rollback

**If only certain cascades are problematic:**

```prisma
// Revert specific relationship
model Score {
  contestId Int?
  contest   Contest? @relation(fields: [contestId], references: [id], onDelete: NoAction)
  //                                                                   ^^^^^^^^^^^^^^^^ Revert
}
```

```bash
# Generate new migration reverting change
npx prisma migrate dev --name revert_score_cascade

# Apply to database
npx prisma migrate deploy
```

---

## Estimated Effort

| Task | Time | Developer |
|------|------|-----------|
| Relationship analysis | 4 hours | Backend Dev + DBA |
| Schema modifications | 8 hours | Backend Dev |
| Migration creation | 4 hours | DBA |
| Testing (all types) | 10 hours | QA Engineer |
| Production deployment | 2 hours | DevOps |
| Monitoring (first week) | 4 hours | DevOps |
| Documentation | 2 hours | Backend Dev |
| Code review | 3 hours | Senior Dev + DBA |
| **Total** | **37 hours** | **5 days** |

---

## Success Criteria

✅ **All 49 missing cascades added**
✅ **Zero orphaned records after deletion operations**
✅ **All tests passing (unit + integration + performance)**
✅ **Database backup created and tested**
✅ **Cascade behavior documented for each relationship**
✅ **No unexpected data loss in production**
✅ **Performance metrics acceptable (< 5s for large cascades)**

---

**Status:** READY TO IMPLEMENT
**Critical Requirement:** Database backup MUST be taken before starting
**Next Steps:** Create detailed relationship analysis document
**Owner:** Backend Development + DBA Team
**Review Date:** After schema analysis complete
