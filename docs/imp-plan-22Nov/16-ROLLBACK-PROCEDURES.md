# Rollback Procedures for Implementation Phases

**Document Purpose:** Define rollback procedures for each implementation phase
**Created:** November 22, 2025
**Version:** 1.0

---

## General Rollback Principles

### Before Making Changes

1. **Create Git Branch:** Never work directly on main
2. **Database Backup:** Always backup before schema changes
3. **Document State:** Record current version/commit
4. **Test Rollback:** Verify rollback procedure works

### Rollback Triggers

**Immediate Rollback If:**
- Production crashes or becomes unresponsive
- Data corruption detected
- Critical security vulnerability introduced
- Error rate > 5%
- Performance degradation > 50%

**Planned Rollback If:**
- Tests failing in production
- User complaints increase significantly
- Resource usage unsustainable

---

## Phase 1: Critical Fixes Rollback

### PrismaClient Singleton Rollback

**Symptoms Requiring Rollback:**
- "Too many clients" errors
- Application crashes
- Database connection failures

**Rollback Steps:**

```bash
# 1. Stop application
pm2 stop event-manager

# 2. Revert code changes
git revert HEAD  # Or specific commit
git push origin main

# 3. Rebuild
npm run build

# 4. Restart application
pm2 restart event-manager

# 5. Monitor logs
pm2 logs event-manager --lines 100
```

**Verification:**
```bash
# Check application is responding
curl http://localhost:3000/health

# Check database connections
psql event_manager -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'event_manager';"
# Should be < 10
```

**Estimated Time:** 5-10 minutes

### Duplicate Files Rollback

**Symptoms:**
- 404 errors on custom field endpoints
- Routing conflicts

**Rollback Steps:**

```bash
# Restore deleted files
git checkout HEAD~1 -- src/routes/customFieldRoutes.ts
git checkout HEAD~1 -- src/controllers/CustomFieldController.ts

# Update imports if needed
git checkout HEAD~1 -- src/server.ts

# Commit restoration
git commit -m "Rollback: Restore duplicate custom field files"
git push origin main

# Rebuild and restart
npm run build
pm2 restart event-manager
```

**Estimated Time:** 10 minutes

### Cascade Deletes Rollback

**⚠️ HIGH RISK - Data Could Be Lost**

**Symptoms:**
- Unexpected data deletions
- Foreign key constraint errors
- Orphaned records

**Rollback Steps:**

```bash
# 1. IMMEDIATELY stop application
pm2 stop event-manager

# 2. Restore database from backup (if data lost)
dropdb event_manager
createdb event_manager
pg_restore -d event_manager /backups/db/pre_cascade_20251122.sql

# 3. Revert schema changes
git checkout HEAD~1 -- prisma/schema.prisma

# 4. Generate Prisma client
npx prisma generate

# 5. Rebuild
npm run build

# 6. Restart
pm2 restart event-manager

# 7. Verify data integrity
npm run verify:data
```

**Data Verification Script:**

```typescript
// scripts/verify-data.ts
async function verifyDataIntegrity() {
  // Check for orphaned records
  const orphanedScores = await prisma.$queryRaw`
    SELECT COUNT(*) FROM "Score" s
    WHERE s."contestId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Contest" c WHERE c.id = s."contestId")
  `;

  if (orphanedScores > 0) {
    logger.error(`Found ${orphanedScores} orphaned scores`);
  }

  // Check for orphaned contests
  const orphanedContests = await prisma.$queryRaw`
    SELECT COUNT(*) FROM "Contest" c
    WHERE c."eventId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "Event" e WHERE e.id = c."eventId")
  `;

  if (orphanedContests > 0) {
    logger.error(`Found ${orphanedContests} orphaned contests`);
  }
}
```

**Estimated Time:** 30-60 minutes (including database restore)

---

## Phase 2: High Priority Rollback

### Password Libraries Rollback

**Symptoms:**
- Authentication failures
- Users unable to login
- Hash comparison errors

**Rollback Steps:**

```bash
# 1. Reinstall bcryptjs temporarily
npm install bcryptjs

# 2. Revert PasswordService
git checkout HEAD~1 -- src/utils/password.ts

# 3. Rebuild
npm run build

# 4. Restart
pm2 restart event-manager

# 5. Verify login works
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**Estimated Time:** 10 minutes

### Console Logging Rollback

**Low Risk - Minimal Rollback Needed**

**If logger issues:**

```bash
# Revert to console.log temporarily
git checkout HEAD~1 -- src/config/logger.ts

# Rebuild and restart
npm run build
pm2 restart event-manager
```

**Estimated Time:** 5 minutes

### Type Safety Rollback

**Symptoms:**
- TypeScript compilation errors
- Runtime type errors
- Application won't build

**Rollback Steps:**

```bash
# 1. Revert tsconfig.json
git checkout HEAD~1 -- tsconfig.json

# 2. Revert type changes
git checkout HEAD~1 -- src/types/

# 3. Rebuild
npm run build

# If build fails, revert more files incrementally
git checkout HEAD~1 -- src/controllers/
npm run build
```

**Estimated Time:** 15-30 minutes

### Environment Variables Rollback

**Symptoms:**
- Application won't start
- Environment validation errors

**Rollback Steps:**

```bash
# 1. Revert env.ts
git checkout HEAD~1 -- src/config/env.ts

# 2. Restore direct process.env usage (if needed)
git checkout HEAD~1 -- src/server.ts
git checkout HEAD~1 -- src/config/database.ts

# 3. Remove zod if not used elsewhere
npm uninstall zod

# 4. Rebuild
npm run build

# 5. Restart
pm2 restart event-manager
```

**Estimated Time:** 10 minutes

---

## Phase 3: Medium Priority Rollback

### Database Optimizations Rollback

**Symptoms:**
- Slower queries after index addition
- Deadlocks
- Index bloat

**Rollback Steps:**

```bash
# 1. Revert schema changes
git checkout HEAD~1 -- prisma/schema.prisma

# 2. Drop indexes manually if needed
psql event_manager <<EOF
DROP INDEX IF EXISTS "User_tenantId_idx";
DROP INDEX IF EXISTS "Event_tenantId_startDate_idx";
-- Drop other indexes as needed
EOF

# 3. Regenerate Prisma client
npx prisma generate

# 4. Rebuild and restart
npm run build
pm2 restart event-manager
```

**Estimated Time:** 15 minutes

### Security Improvements Rollback

**Generally should NOT rollback security fixes**

**If must rollback (e.g., false positives blocking legitimate use):**

```bash
# Revert specific security middleware
git checkout HEAD~1 -- src/middleware/rateLimit.ts
git checkout HEAD~1 -- src/middleware/validation.ts

# Rebuild
npm run build
pm2 restart event-manager
```

**Estimated Time:** 10 minutes

### Performance Optimizations Rollback

**Symptoms:**
- Redis connection errors
- Cache inconsistencies
- Background job failures

**Rollback Steps:**

```bash
# 1. Stop background workers
pm2 stop worker

# 2. Revert caching changes
git checkout HEAD~1 -- src/config/redis.ts
git checkout HEAD~1 -- src/utils/cache.ts

# 3. Revert queue changes
git checkout HEAD~1 -- src/config/queue.ts

# 4. Rebuild and restart
npm run build
pm2 restart event-manager
```

**Estimated Time:** 15 minutes

---

## Phase 4: Code Quality Rollback

**Low Risk - These changes rarely require rollback**

### If Documentation Changes Cause Issues

```bash
# Revert Swagger config
git checkout HEAD~1 -- src/config/swagger.ts

# Rebuild
npm run build
pm2 restart event-manager
```

---

## Emergency Rollback Procedure

**For catastrophic failures:**

### 1. Immediate Actions (< 2 minutes)

```bash
# Stop all services
pm2 stop all

# Switch to last known good version
git reset --hard <last-good-commit>

# Rebuild
npm run build

# Restart
pm2 restart all
```

### 2. Database Recovery (if needed)

```bash
# Restore from latest backup
dropdb event_manager
createdb event_manager
pg_restore -d event_manager /backups/db/latest.sql
```

### 3. Verify System

```bash
# Health check
curl http://localhost:3000/health

# Check logs
tail -f logs/error.log

# Monitor errors
pm2 logs --err
```

### 4. Communication

```bash
# Notify team
# Send status update to users
# Document incident
```

---

## Rollback Testing

**Before each phase, test rollback procedure:**

```bash
# 1. Create test environment
# 2. Apply changes
# 3. Perform rollback
# 4. Verify system restored
```

---

## Post-Rollback Actions

**After any rollback:**

1. **Document Incident:**
   - What caused rollback
   - Steps taken
   - Data lost (if any)
   - Lessons learned

2. **Root Cause Analysis:**
   - Why did the change fail
   - What testing was missed
   - How to prevent in future

3. **Recovery Plan:**
   - When to retry implementation
   - What additional testing needed
   - What safeguards to add

---

## Rollback Decision Matrix

| Issue Severity | Response Time | Action |
|----------------|---------------|--------|
| Critical (site down) | Immediate | Emergency rollback |
| High (major feature broken) | < 1 hour | Planned rollback |
| Medium (minor issues) | < 4 hours | Fix forward or rollback |
| Low (cosmetic) | Next deploy | Fix forward |

---

**Review Frequency:** Before each phase implementation
**Owner:** DevOps + Development Team
**Emergency Contact:** On-call engineer (24/7)
