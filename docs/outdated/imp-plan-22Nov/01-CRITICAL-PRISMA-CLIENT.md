# Phase 1: Critical - Fix Multiple PrismaClient Instances

**Priority:** 🔴 CRITICAL
**Timeline:** 24 hours
**Risk Level:** HIGH
**Dependencies:** None

---

## Problem Summary

**Issue:** 19 instances across 14 files creating new `PrismaClient()` instances instead of using singleton
**Impact:**
- Connection pool exhaustion under load
- Application crashes with "too many clients" errors
- Memory leaks from unclosed connections
- Degraded database performance

**Current State:**
- Two singleton implementations exist:
  - `src/config/database.ts` (exports `prisma`)
  - `src/utils/prisma.ts` (exports `prismaClient`)
- 19 instances across 14 files bypassing singletons and creating new instances

---

## Files Requiring Fix

### High Instance Count (5 instances)
1. **`src/routes/settingsRoutes.ts`** (5 instances) - WORST OFFENDER
   - Lines: Multiple throughout file
   - Impact: Settings endpoints create 5 new connections per request

### Single Instance Files (13 files)
2. **`src/routes/publicTenantRoutes.ts`** (1 instance)
3. **`src/utils/logger.ts`** (1 instance) - Note: Listed as config/logger.ts in plan but actual is utils/logger.ts
4. **`src/middleware/queryMonitoring.ts`** (1 instance)
5. **`src/controllers/CustomFieldController.ts`** (1 instance)
6. **`src/controllers/EmailTemplateController.ts`** (1 instance)
7. **`src/services/eventHandlers/AuditLogHandler.ts`** (1 instance)
8. **`src/services/eventHandlers/StatisticsHandler.ts`** (1 instance)
9. **`src/services/eventHandlers/NotificationHandler.ts`** (1 instance)
10. **`src/services/BulkOperationService.ts`** (1 instance)
11. **`src/services/BackupMonitoringService.ts`** (1 instance)
12. **`src/jobs/ReportJobProcessor.ts`** (1 instance)
13. **`src/config/database.ts`** (1 instance) - This is the singleton itself
14. **`src/utils/prisma.ts`** (2 instances) - This is the singleton itself

---

## Implementation Steps

### Step 1: Choose Singleton Standard (1 hour)

**Decision Required:** Standardize on ONE singleton implementation

**Option A: Use `src/config/database.ts`**
```typescript
// src/config/database.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

export default prisma;
```

**Option B: Use `src/utils/prisma.ts`**
```typescript
// src/utils/prisma.ts
import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  return prismaClient;
};

export const prismaClient = getPrismaClient();
```

**RECOMMENDED:** Option A (`src/config/database.ts`)
- Simpler implementation
- Follows naming convention (`database.ts` for DB config)
- Already used in most files

**Action:**
1. Verify `src/config/database.ts` exists and is properly configured
2. If not, create it with the singleton pattern above
3. Remove/deprecate `src/utils/prisma.ts`

### Step 2: Fix settingsRoutes.ts (2 hours)

**Current Code Pattern (WRONG):**
```typescript
// src/routes/settingsRoutes.ts
import { PrismaClient } from '@prisma/client';

router.get('/api/settings', async (req, res) => {
  const prisma = new PrismaClient(); // ❌ WRONG
  try {
    const settings = await prisma.setting.findMany();
    res.json(settings);
  } finally {
    await prisma.$disconnect(); // ❌ Disconnecting singleton!
  }
});
```

**Fixed Code (CORRECT):**
```typescript
// src/routes/settingsRoutes.ts
import prisma from '../config/database'; // ✅ Import singleton

router.get('/api/settings', async (req, res) => {
  // No new PrismaClient() - use imported singleton
  const settings = await prisma.setting.findMany();
  res.json(settings);
  // No $disconnect() - singleton manages its own lifecycle
});
```

**Steps:**
1. Read `src/routes/settingsRoutes.ts` completely
2. Find all instances of `new PrismaClient()`
3. Remove all PrismaClient instantiations
4. Add import: `import prisma from '../config/database';`
5. Replace all local `prisma` variables with imported singleton
6. Remove all `prisma.$disconnect()` calls
7. Test all settings endpoints

### Step 3: Fix Controllers (6 hours)

**Files to Fix:**
- adminController.ts
- archiveController.ts
- cacheController.ts
- categoriesController.ts
- contestsController.ts
- eventsController.ts
- scoringController.ts
- usersController.ts
- workflowController.ts

**Standard Fix Pattern:**

**Before:**
```typescript
// src/controllers/adminController.ts
import { PrismaClient } from '@prisma/client';

export class AdminController {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient(); // ❌ WRONG
  }

  async getUsers() {
    return await this.prisma.user.findMany();
  }
}
```

**After:**
```typescript
// src/controllers/adminController.ts
import prisma from '../config/database'; // ✅ Import singleton

export class AdminController {
  // Remove private prisma property

  async getUsers() {
    return await prisma.user.findMany(); // ✅ Use singleton
  }
}
```

**For Each Controller:**
1. Remove `import { PrismaClient }` if no longer needed
2. Add `import prisma from '../config/database';`
3. Remove `private prisma: PrismaClient;` property
4. Remove `this.prisma = new PrismaClient()` from constructor
5. Replace all `this.prisma.` with `prisma.`
6. Remove any `$disconnect()` calls
7. Run controller unit tests

### Step 4: Fix Services (4 hours)

**Service files likely affected:**
- AdminService.ts
- ArchiveService.ts
- AuthService.ts
- CacheService.ts
- CategoryCertificationService.ts
- ContestService.ts
- EventService.ts
- ScoringService.ts
- SettingsService.ts
- UserService.ts
- WorkflowService.ts

**Standard Fix Pattern:**

**Before:**
```typescript
// src/services/AdminService.ts
import { PrismaClient } from '@prisma/client';

export class AdminService {
  private db: PrismaClient;

  constructor() {
    this.db = new PrismaClient(); // ❌ WRONG
  }
}
```

**After:**
```typescript
// src/services/AdminService.ts
import prisma from '../config/database'; // ✅ Import singleton

export class AdminService {
  // Remove db property, use imported prisma directly

  async someMethod() {
    return await prisma.user.findMany(); // ✅ Direct usage
  }
}
```

### Step 5: Fix Middleware (1 hour)

**Files:**
- `src/middleware/queryMonitoring.ts`
- Any other middleware with Prisma access

**Fix Pattern:**
```typescript
// Before
const prisma = new PrismaClient(); // ❌

// After
import prisma from '../config/database'; // ✅
```

### Step 6: Fix Utility Files (1 hour)

**Files:**
- `src/config/logger.ts`
- Any utils that access database

**Fix Pattern:**
```typescript
// src/config/logger.ts
// Before
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient(); // ❌

// After
import prisma from './database'; // ✅ Same directory
```

### Step 7: Remove Deprecated Singleton (30 minutes)

**If standardizing on `src/config/database.ts`:**

1. Search for all imports of `src/utils/prisma.ts`:
   ```bash
   grep -r "from.*utils/prisma" src/
   ```

2. Replace with `src/config/database`:
   ```typescript
   // Before
   import { prismaClient } from '../utils/prisma';

   // After
   import prisma from '../config/database';
   ```

3. Delete `src/utils/prisma.ts` when no longer referenced

---

## Testing Plan

### Unit Tests (2 hours)

**For each fixed file, verify:**

1. **Import Check:**
   ```bash
   # Should find NO instances
   grep -n "new PrismaClient()" src/routes/settingsRoutes.ts

   # Should find ONE import
   grep -n "from.*config/database" src/routes/settingsRoutes.ts
   ```

2. **Disconnect Check:**
   ```bash
   # Should find NO instances (singleton manages lifecycle)
   grep -n "\$disconnect" src/routes/settingsRoutes.ts
   ```

3. **Controller Tests:**
   ```bash
   npm test -- adminController.test.ts
   npm test -- archiveController.test.ts
   # ... etc for all controllers
   ```

### Integration Tests (2 hours)

1. **Connection Pool Test:**
   ```typescript
   // test/integration/prisma-singleton.test.ts
   import prisma from '../src/config/database';

   describe('Prisma Singleton', () => {
     it('should use single instance across imports', () => {
       const instance1 = require('../src/config/database').default;
       const instance2 = require('../src/config/database').default;
       expect(instance1).toBe(instance2);
     });
   });
   ```

2. **Concurrent Request Test:**
   ```bash
   # Use Apache Bench to simulate load
   ab -n 1000 -c 50 http://localhost:3000/api/settings

   # Should NOT see "too many clients" errors
   # Check logs for connection pool metrics
   ```

3. **Memory Leak Test:**
   ```bash
   # Run app with Node memory profiling
   node --inspect dist/server.js

   # Make 1000 requests
   # Check that memory usage stabilizes (no leak)
   ```

### Manual Testing (1 hour)

1. Start application: `npm run dev`
2. Test each endpoint that was modified:
   - GET /api/settings (5 instances fixed here)
   - Admin endpoints
   - Archive endpoints
   - Category endpoints
   - Contest endpoints
   - Event endpoints
   - Scoring endpoints
   - User endpoints
   - Workflow endpoints
3. Monitor connection pool:
   ```sql
   -- In PostgreSQL
   SELECT count(*) FROM pg_stat_activity
   WHERE datname = 'event_manager';
   ```
4. Verify count stays low (< 10 connections)

---

## Validation Criteria

### Success Metrics

✅ **Zero new PrismaClient instances in src/:**
```bash
# This should return ZERO results (only package definition)
grep -r "new PrismaClient()" src/
```

✅ **Single import pattern everywhere:**
```bash
# Count should match number of files using Prisma
grep -r "from.*config/database" src/ | wc -l
```

✅ **No $disconnect calls in routes/controllers:**
```bash
# Should return ZERO (lifecycle managed by singleton)
grep -r "\$disconnect" src/routes/ src/controllers/
```

✅ **Connection pool stable under load:**
- Max connections: < 10 under 50 concurrent users
- No "too many clients" errors in logs
- Memory usage stable over time

✅ **All tests passing:**
```bash
npm test
# 100% pass rate on affected tests
```

---

## Rollback Plan

**If issues arise after deployment:**

### Immediate Rollback (< 5 minutes)

```bash
# Revert to previous git commit
git revert HEAD
git push origin main

# Restart application
pm2 restart event-manager
```

### Partial Rollback (if only some files have issues)

1. Identify problematic file(s) from error logs
2. Revert specific file:
   ```bash
   git checkout HEAD~1 -- src/routes/settingsRoutes.ts
   git commit -m "Rollback settingsRoutes prisma changes"
   ```
3. Restart application

### Emergency Hotfix

If singleton has issues, temporarily allow multiple instances:

```typescript
// src/config/database.ts
import { PrismaClient } from '@prisma/client';

// Temporary: Allow multiple instances
export const createPrismaClient = () => new PrismaClient({
  log: ['query', 'error', 'warn'],
});

export default createPrismaClient();
```

---

## Post-Implementation Monitoring

### Week 1: Intensive Monitoring

**Metrics to Track:**
1. **Database Connection Count:**
   ```sql
   SELECT count(*), state FROM pg_stat_activity
   WHERE datname = 'event_manager'
   GROUP BY state;
   ```
   - Alert if > 20 connections
   - Expected: 5-10 connections

2. **Application Memory:**
   ```bash
   pm2 monit
   ```
   - Alert if memory grows > 500MB
   - Expected: Stable around 200-300MB

3. **Response Times:**
   - Alert if P95 > 500ms
   - Expected: < 200ms for most endpoints

4. **Error Rates:**
   - Alert on any "too many clients" errors
   - Alert on connection pool errors
   - Expected: Zero connection errors

**Daily Checks (Days 1-7):**
- Review error logs: `tail -f logs/error.log | grep -i "prisma\|connection"`
- Check connection pool metrics
- Review response time graphs
- Verify no memory leaks

### Week 2-4: Standard Monitoring

- Weekly connection pool review
- Weekly memory usage review
- Alert-based monitoring only

---

## Dependencies and Blockers

### Prerequisites
- ✅ Git branch created for changes
- ✅ Database backup taken
- ✅ Test environment available
- ✅ Rollback plan documented

### Potential Blockers
1. **Tests failing after changes**
   - Mitigation: Fix tests file-by-file
   - Fallback: Revert individual files

2. **Performance degradation**
   - Mitigation: Review singleton configuration
   - Fallback: Increase connection pool size

3. **Third-party code using PrismaClient**
   - Mitigation: Wrap third-party in adapter
   - Fallback: Document exception

---

## Estimated Effort

| Task | Time | Developer |
|------|------|-----------|
| Choose singleton standard | 1 hour | Backend Dev |
| Fix settingsRoutes.ts (5 instances) | 3 hours | Backend Dev |
| Fix routes (publicTenantRoutes.ts) | 1 hour | Backend Dev |
| Fix controllers (2 files) | 2 hours | Backend Dev |
| Fix services (3 files) | 3 hours | Backend Dev |
| Fix event handlers (3 files) | 2 hours | Backend Dev |
| Fix middleware/utils (2 files) | 2 hours | Backend Dev |
| Fix jobs (1 file) | 1 hour | Backend Dev |
| Unit testing | 2 hours | Backend Dev + QA |
| Integration testing | 2 hours | QA |
| Manual testing | 1 hour | QA |
| Code review | 2 hours | Senior Dev |
| **Total** | **21 hours** | **~3 days** |

---

## Code Review Checklist

**Before Merging, Verify:**

- [ ] Zero `new PrismaClient()` in src/ directory
- [ ] All imports use `import prisma from '../config/database'`
- [ ] No `$disconnect()` calls in application code
- [ ] All tests passing (unit + integration)
- [ ] Connection pool metrics look healthy
- [ ] No memory leaks detected
- [ ] Code review approved by senior developer
- [ ] Documentation updated
- [ ] Rollback plan tested
- [ ] Monitoring configured

---

**Status:** READY TO IMPLEMENT
**Next Steps:** Begin with Step 1 (Choose Singleton Standard)
**Owner:** Backend Development Team
**Review Date:** After implementation
