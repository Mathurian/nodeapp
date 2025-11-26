# Sprint 2: Database & Performance Optimization
**Duration:** Weeks 4-6 (15 working days)
**Team:** 1 Backend Developer + 1 DBA/Performance Engineer + 1 QA Engineer
**Risk Level:** Medium (requires migrations)
**Dependencies:** Sprint 1 (query analysis results)

---

## Sprint Goal

Optimize database performance through query optimization, schema standardization, and proper connection management. Eliminate N+1 queries and ensure sub-200ms response times for 95th percentile.

---

## Sprint Backlog

### Epic 1: N+1 Query Elimination (Priority: CRITICAL)
**Effort:** 3-4 days
**Assignee:** Backend Developer + DBA

#### Task 1.1: N+1 Query Identification
**Effort:** 1 day

**Tools:**
- Prisma query logging
- PostgreSQL pg_stat_statements
- Query monitoring middleware (from Sprint 1)
- Manual code review

**Hot Paths to Analyze:**
1. **Authentication Flow**
   - File: `src/middleware/auth.ts`
   - Concern: User + Judge + Contestant loading

2. **Event Listing**
   - File: `src/controllers/eventsController.ts`
   - Concern: Event → Contest → Category loading

3. **Scoring Operations**
   - File: `src/services/ScoringService.ts`
   - Concern: Score → Judge + Contestant + Category loading

4. **Results Calculation**
   - File: `src/services/ResultsService.ts`
   - Concern: Multiple score queries per contestant

5. **Assignment Views**
   - File: `src/controllers/assignmentsController.ts`
   - Concern: Assignment → Judge → Category loading

**Acceptance Criteria:**
- [ ] All N+1 queries documented with location
- [ ] Impact analysis (queries per request)
- [ ] Prioritized by frequency and impact
- [ ] Optimization strategy for each

**Deliverable:** `n-plus-one-audit.md`

#### Task 1.2: Fix Authentication N+1
**Effort:** 4 hours

**Current Issue (auth.ts:49-58):**
```typescript
user = await prisma.user.findFirst({
  where: {
    id: decoded.userId,
    tenantId: decoded.tenantId
  },
  include: {
    judge: true,
    contestant: true
  }
});
```

**Problem:** This is actually fine, but downstream usage may cause N+1

**Optimization:**
Review all usages of `req.user` to ensure no additional queries

**Acceptance Criteria:**
- [ ] User loading remains single query
- [ ] No additional queries in hot auth paths
- [ ] Performance benchmark shows no regression

#### Task 1.3: Fix Event Listing N+1
**Effort:** 1 day

**Current Issue:**
Events loaded, then for each event, contests are loaded separately

**Fix:**
```typescript
// Before (N+1)
const events = await prisma.event.findMany({
  where: { tenantId }
});
// Then for each event:
// const contests = await prisma.contest.findMany({ where: { eventId: event.id }})

// After (Optimized)
const events = await prisma.event.findMany({
  where: { tenantId },
  include: {
    contests: {
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                scores: true,
                categoryContestants: true,
                categoryJudges: true,
              }
            }
          }
        }
      }
    },
    _count: {
      select: {
        contests: true,
      }
    }
  }
});
```

**Files to Update:**
- `src/controllers/eventsController.ts`
- `src/services/EventService.ts`

**Acceptance Criteria:**
- [ ] Event listing loads in 1-2 queries
- [ ] Performance improved by >50%
- [ ] All tests passing
- [ ] No breaking changes to API response

#### Task 1.4: Fix Scoring N+1
**Effort:** 1 day

**Current Issue:**
Score operations load related entities individually

**Fix:**
```typescript
// Use Prisma's include strategically
const scores = await prisma.score.findMany({
  where: { categoryId, tenantId },
  include: {
    judge: {
      select: { id: true, name: true, email: true }
    },
    contestant: {
      select: { id: true, name: true, contestantNumber: true }
    },
    criterion: {
      select: { id: true, name: true, maxScore: true }
    },
    scoreComments: true,
  }
});
```

**Files to Update:**
- `src/services/ScoringService.ts`
- `src/repositories/ScoreRepository.ts`

**Acceptance Criteria:**
- [ ] Score queries reduced from N+1 to 1-2
- [ ] Performance benchmark shows 60%+ improvement
- [ ] Scoring operations remain transactional

#### Task 1.5: Fix Results Calculation N+1
**Effort:** 1 day

**Current Issue:**
Results service calculates scores per contestant in separate queries

**Fix:**
Use aggregation and grouping in single query:
```typescript
const results = await prisma.score.groupBy({
  by: ['contestantId', 'categoryId'],
  where: {
    categoryId,
    tenantId,
    isCertified: true,
  },
  _sum: {
    score: true,
  },
  _avg: {
    score: true,
  },
  _count: true,
});

// Then enrich with contestant details in single query
const contestantIds = results.map(r => r.contestantId);
const contestants = await prisma.contestant.findMany({
  where: { id: { in: contestantIds } },
});
```

**Files to Update:**
- `src/services/ResultsService.ts`

**Acceptance Criteria:**
- [ ] Results calculation uses 2-3 queries total
- [ ] Performance improved by 70%+
- [ ] Accuracy maintained (validate with existing results)

---

### Epic 2: Database Field Naming Standardization (Priority: HIGH)
**Effort:** 3-5 days
**Assignee:** DBA + Backend Developer

#### Task 2.1: Field Naming Audit
**Effort:** 4 hours

**Current Inconsistencies:**
```prisma
// Mixed naming conventions
model EmceeScript {
  file_path  String?  // snake_case
  filePath   String?  // camelCase (elsewhere)
}
```

**Audit Process:**
1. Extract all field names from schema
2. Identify snake_case fields
3. Map to camelCase equivalents
4. Check for conflicts

**Acceptance Criteria:**
- [ ] Complete list of fields to rename
- [ ] No naming conflicts
- [ ] Migration impact assessed

**Deliverable:** `field-naming-migration-plan.md`

#### Task 2.2: Create Migration Scripts
**Effort:** 1 day

**Strategy:**
1. Add new camelCase columns
2. Copy data from snake_case to camelCase
3. Update application code
4. Remove snake_case columns (after testing)

**Example Migration:**
```sql
-- Step 1: Add new column
ALTER TABLE emcee_scripts ADD COLUMN "filePath" TEXT;

-- Step 2: Copy data
UPDATE emcee_scripts SET "filePath" = file_path;

-- Step 3: Make non-nullable if original was
ALTER TABLE emcee_scripts ALTER COLUMN "filePath" SET NOT NULL;

-- Step 4: Remove old column (deferred to next sprint)
-- ALTER TABLE emcee_scripts DROP COLUMN file_path;
```

**Acceptance Criteria:**
- [ ] All migrations tested in dev environment
- [ ] Rollback scripts prepared
- [ ] Data integrity verified
- [ ] Zero downtime deployment possible

#### Task 2.3: Update Prisma Schema
**Effort:** 4 hours

**File:** `prisma/schema.prisma`

**Changes:**
```prisma
model EmceeScript {
  id         String   @id @default(cuid())
  eventId    String?
  contestId  String?
  categoryId String?
  title      String
  content    String
  order      Int?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  filePath   String?  // Changed from file_path
  tenantId   String

  event    Event?    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  contest  Contest?  @relation(fields: [contestId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([tenantId, eventId])
  @@index([tenantId, contestId])
  @@index([tenantId, categoryId])
  @@index([eventId])
  @@index([contestId])
  @@index([categoryId])
  @@map("emcee_scripts")
}
```

**Acceptance Criteria:**
- [ ] All field names use camelCase
- [ ] Table names remain snake_case (via @@map)
- [ ] Prisma client regenerated
- [ ] TypeScript types updated

#### Task 2.4: Update Application Code
**Effort:** 1-2 days

**Files to Update:**
Search for all references to renamed fields and update

**Testing Strategy:**
- Run full test suite after each batch of changes
- Update tests that directly reference field names
- Verify API responses unchanged

**Acceptance Criteria:**
- [ ] All code references updated
- [ ] All tests passing
- [ ] No breaking API changes
- [ ] Backward compatibility maintained

#### Task 2.5: Deploy Migration
**Effort:** 4 hours

**Deployment Plan:**
1. Deploy application with dual support (old and new names)
2. Run migration to add new columns
3. Verify data copied correctly
4. Monitor for 48 hours
5. If stable, schedule old column removal for next sprint

**Acceptance Criteria:**
- [ ] Migration executed successfully
- [ ] No data loss
- [ ] Application functioning normally
- [ ] Rollback plan tested

---

### Epic 3: Connection Pool & Query Optimization (Priority: HIGH)
**Effort:** 2-3 days
**Assignee:** DBA

#### Task 3.1: Configure Connection Pooling
**Effort:** 4 hours

**Current State:**
Default Prisma connection pooling (may not be optimized)

**Optimization:**

**File:** `src/config/database.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

// Connection pool configuration via DATABASE_URL
// postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
```

**Recommended Settings:**
```env
# Development
DATABASE_URL="postgresql://user:pass@localhost:5432/eventmanager?connection_limit=10&pool_timeout=20"

# Production
DATABASE_URL="postgresql://user:pass@host:5432/eventmanager?connection_limit=50&pool_timeout=10&connect_timeout=10"
```

**Connection Pool Sizing:**
- **Development:** 10 connections
- **Production:** 50 connections (adjust based on load testing)
- **Formula:** connections = ((core_count * 2) + effective_spindle_count)

**Acceptance Criteria:**
- [ ] Connection pool configured
- [ ] Pool size appropriate for server capacity
- [ ] Connection leaks monitored
- [ ] Pool exhaustion alerts configured

#### Task 3.2: Add Query Timeouts
**Effort:** 4 hours

**Implementation:**

**File:** `src/config/database.ts`
```typescript
import { PrismaClient } from '@prisma/client';

// Query timeout middleware
const prisma = new PrismaClient().$extends({
  query: {
    $allOperations({ operation, model, args, query }) {
      const timeout = 5000; // 5 seconds

      return Promise.race([
        query(args),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Query timeout after ${timeout}ms: ${model}.${operation}`)),
            timeout
          )
        ),
      ]);
    },
  },
});
```

**Timeout Tiers:**
- Simple queries: 1 second
- Complex queries: 5 seconds
- Reports/exports: 30 seconds

**Acceptance Criteria:**
- [ ] Query timeouts enforced
- [ ] Timeout errors handled gracefully
- [ ] Logs include timeout information
- [ ] Alerts for frequent timeouts

#### Task 3.3: Add Missing Database Indexes
**Effort:** 1 day

**Based on Query Analysis from Sprint 1:**

**Indexes to Add:**
```sql
-- Composite index for score queries
CREATE INDEX idx_scores_category_contestant_judge
  ON scores(category_id, contestant_id, judge_id)
  WHERE tenant_id IS NOT NULL;

-- Index for certification queries
CREATE INDEX idx_scores_certified_category
  ON scores(is_certified, category_id, tenant_id);

-- Index for timestamp-based queries
CREATE INDEX idx_activity_logs_timestamp
  ON activity_logs(created_at DESC, tenant_id);

-- Partial index for active users
CREATE INDEX idx_users_active
  ON users(tenant_id, role)
  WHERE is_active = true;
```

**Process:**
1. Identify missing indexes from slow query log
2. Calculate index size and impact
3. Create indexes with CONCURRENTLY (no downtime)
4. Monitor query performance improvement

**Acceptance Criteria:**
- [ ] All recommended indexes added
- [ ] Query performance improved by 40%+
- [ ] Index bloat monitored
- [ ] No production downtime

#### Task 3.4: Optimize Large JSON Fields
**Effort:** 1 day

**Current Issue:**
Many models have JSON fields that could be queried but aren't indexed

**Models with JSON:**
- SystemSetting.settings
- EventTemplate.contests, categories
- WorkflowStep.conditions, actions
- WebhookConfig.events, headers

**Options:**
1. **GIN Indexes** (for JSONB columns)
2. **Normalize frequently queried fields**
3. **Computed columns** for common queries

**Example Optimization:**
```sql
-- Add GIN index for JSONB queries
CREATE INDEX idx_system_settings_value_gin
  ON system_settings USING gin(value jsonb_path_ops);

-- Example query that benefits:
SELECT * FROM system_settings
WHERE value @> '{"feature": "enabled"}';
```

**Acceptance Criteria:**
- [ ] JSON fields analyzed for query patterns
- [ ] GIN indexes added where appropriate
- [ ] Frequently accessed fields normalized
- [ ] Performance benchmarks show improvement

---

### Epic 4: Query Performance Monitoring (Priority: MEDIUM)
**Effort:** 2 days
**Assignee:** Backend Developer

#### Task 4.1: Enhanced Prisma Logging
**Effort:** 4 hours

**File:** `src/config/database.ts`
```typescript
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

const queryLogger = createLogger('database');

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log slow queries
prisma.$on('query', (e) => {
  const duration = e.duration;

  if (duration > 100) {
    queryLogger.warn('Slow query detected', {
      query: e.query,
      params: e.params,
      duration: `${duration}ms`,
      target: e.target,
    });
  }

  // Track metrics
  queryDurationHistogram.observe(duration / 1000);
});

prisma.$on('error', (e) => {
  queryLogger.error('Database error', {
    message: e.message,
    target: e.target,
  });
});
```

**Acceptance Criteria:**
- [ ] All queries logged with duration
- [ ] Slow queries (>100ms) flagged
- [ ] Errors logged with context
- [ ] Metrics exported to Prometheus

#### Task 4.2: PostgreSQL Performance Extensions
**Effort:** 4 hours

**Install pg_stat_statements:**
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Configure in postgresql.conf
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
pg_stat_statements.max = 10000
```

**Query to Find Slow Queries:**
```sql
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Acceptance Criteria:**
- [ ] pg_stat_statements enabled
- [ ] Dashboard created for query stats
- [ ] Alerts for new slow queries
- [ ] Weekly review process established

#### Task 4.3: Database Health Monitoring
**Effort:** 1 day

**Metrics to Monitor:**
1. Connection pool usage
2. Query response times (P50, P95, P99)
3. Lock contention
4. Index usage
5. Table bloat
6. Cache hit ratio

**Implementation:**

**File:** `src/services/DatabaseHealthService.ts`
```typescript
import { prisma } from '../config/database';
import { createLogger } from '../utils/logger';

const logger = createLogger('db-health');

export class DatabaseHealthService {
  async checkHealth(): Promise<DatabaseHealth> {
    // Connection pool stats
    const poolStats = await this.getPoolStats();

    // Table sizes
    const tableSizes = await this.getTableSizes();

    // Index usage
    const indexUsage = await this.getIndexUsage();

    // Cache hit ratio
    const cacheHitRatio = await this.getCacheHitRatio();

    return {
      poolStats,
      tableSizes,
      indexUsage,
      cacheHitRatio,
      healthy: this.isHealthy({ poolStats, cacheHitRatio }),
    };
  }

  private async getCacheHitRatio(): Promise<number> {
    const result = await prisma.$queryRaw`
      SELECT
        sum(blks_hit) / (sum(blks_hit) + sum(blks_read)) as cache_hit_ratio
      FROM pg_stat_database
      WHERE datname = current_database();
    `;
    return result[0].cache_hit_ratio;
  }

  private isHealthy(stats: any): boolean {
    // Cache hit ratio should be >0.99
    if (stats.cacheHitRatio < 0.99) {
      logger.warn('Low cache hit ratio', { ratio: stats.cacheHitRatio });
      return false;
    }

    return true;
  }
}
```

**Acceptance Criteria:**
- [ ] Health check endpoint returns database metrics
- [ ] Grafana dashboard created
- [ ] Alerts configured for unhealthy states
- [ ] Runbook created for common issues

---

## Testing Requirements

### Unit Tests
- [ ] Query optimization doesn't break business logic
- [ ] Connection pool configuration
- [ ] Query timeout handling

**Coverage Target:** 85%+

### Integration Tests
- [ ] N+1 queries eliminated (verify with query counter)
- [ ] Field naming changes don't break APIs
- [ ] Connection pool under load
- [ ] Query timeouts trigger correctly

### Performance Tests
- [ ] Load test before and after optimizations
- [ ] 95th percentile < 200ms
- [ ] Queries per request reduced by 60%+
- [ ] Database CPU usage reduced

**Benchmarking:**
```bash
# Before optimization
npm run load:test

# After optimization
npm run load:test

# Compare results
node scripts/compare-benchmarks.js before.json after.json
```

### Migration Tests
- [ ] Migration runs successfully in test environment
- [ ] Data integrity verified
- [ ] Rollback tested
- [ ] Zero downtime deployment validated

---

## Deployment Plan

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Migrations tested in staging
- [ ] Rollback scripts ready
- [ ] Database backup completed
- [ ] Performance baseline recorded
- [ ] Team briefed on changes

### Deployment Steps

**Phase 1: Code Deployment (Week 4)**
- Deploy N+1 query fixes
- Deploy query monitoring enhancements
- No database changes yet

**Phase 2: Index Creation (Week 5)**
- Add new indexes using CONCURRENTLY
- Monitor index creation progress
- Verify query performance improvement

**Phase 3: Field Naming Migration (Week 6)**
- Add new camelCase columns
- Deploy dual-support code
- Copy data
- Monitor for 48 hours
- Schedule old column removal for Sprint 3

**Downtime Required:** None (all changes are online)

### Rollback Strategy

**Code Rollback:**
- Git revert
- Redeploy previous version
- < 10 minutes

**Index Rollback:**
- Drop new indexes
- < 1 minute per index

**Migration Rollback:**
- Code still supports old field names
- Can rollback data copy
- < 5 minutes

---

## Monitoring & Success Criteria

### Key Metrics

**Performance:**
- ✓ P95 response time < 200ms (down from ~250ms)
- ✓ Queries per request reduced by 60%
- ✓ Database CPU usage reduced by 30%
- ✓ Zero N+1 queries in hot paths

**Database Health:**
- ✓ Connection pool utilization < 70%
- ✓ Cache hit ratio > 99%
- ✓ Query timeout rate < 0.01%
- ✓ Lock wait time < 10ms P95

**Schema:**
- ✓ All fields use camelCase
- ✓ Zero data loss during migration
- ✓ API responses unchanged

### Dashboards

**Query Performance:**
- Query duration histogram
- Slow query count
- N+1 query detections
- Queries per request

**Database Health:**
- Connection pool usage
- Cache hit ratio
- Table sizes
- Index usage statistics

---

## Dependencies for Sprint 3

The following items from Sprint 2 feed into Sprint 3:
- Performance baseline established
- Query patterns documented
- Database health monitoring

---

## References

- **Sprint 1:** `01-SPRINT-1-HIGH-PRIORITY.md` (query analysis results)
- **Prisma Docs:** https://www.prisma.io/docs/concepts/components/prisma-client/query-optimization
- **PostgreSQL Performance:** https://www.postgresql.org/docs/current/performance-tips.html

---

*Sprint planning completed: November 24, 2025*
