# Phase 3: Medium Priority - Database Optimizations

**Priority:** 🟡 MEDIUM
**Timeline:** Week 2
**Risk Level:** MEDIUM
**Dependencies:** Phase 1 complete (cascade deletes)

---

## Problem Summary

**Issues:**
- Missing indexes on frequently queried columns
- N+1 query problems
- Inefficient query patterns
- No query performance monitoring
- Large result sets without pagination

**Impact:**
- Slow page loads
- High database CPU usage
- Poor user experience under load
- Scalability issues

---

## Optimization Areas

### 1. Add Missing Indexes (4 hours)

**Identify slow queries:**

```sql
-- Enable slow query logging
ALTER DATABASE event_manager SET log_min_duration_statement = 100;

-- Monitor slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Add indexes based on common queries:**

```prisma
// prisma/schema.prisma

model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  tenantId Int?

  @@index([tenantId])           // NEW
  @@index([email, tenantId])    // NEW - composite for login
}

model Event {
  id        Int      @id @default(autoincrement())
  tenantId  Int?
  startDate DateTime
  endDate   DateTime?

  @@index([tenantId])                    // NEW
  @@index([tenantId, startDate])         // NEW - for date range queries
  @@index([startDate, endDate])          // NEW
}

model Contest {
  id       Int  @id @default(autoincrement())
  eventId  Int?
  tenantId Int?

  @@index([eventId])            // NEW
  @@index([tenantId])           // NEW
  @@index([tenantId, eventId])  // NEW - composite
}

model Score {
  id         Int  @id @default(autoincrement())
  contestId  Int?
  judgeId    Int?
  tenantId   Int?
  createdAt  DateTime @default(now())

  @@index([contestId])                   // NEW
  @@index([judgeId])                     // NEW
  @@index([tenantId])                    // NEW
  @@index([contestId, judgeId])          // NEW - for judge scores
  @@index([createdAt])                   // NEW - for time-based queries
}

model Assignment {
  id        Int  @id @default(autoincrement())
  contestId Int?
  judgeId   Int?
  tenantId  Int?

  @@index([contestId])          // NEW
  @@index([judgeId])            // NEW
  @@index([tenantId])           // NEW
}
```

**Generate migration:**

```bash
npx prisma migrate dev --name add_performance_indexes
```

### 2. Fix N+1 Queries (6 hours)

**Problem Pattern:**

```typescript
// BAD: N+1 query problem
const events = await prisma.event.findMany();
for (const event of events) {
  // Separate query for each event!
  event.contests = await prisma.contest.findMany({
    where: { eventId: event.id },
  });
}
```

**Solution:**

```typescript
// GOOD: Single query with include
const events = await prisma.event.findMany({
  include: {
    contests: true,
  },
});
```

**Update services to use includes:**

```typescript
// src/services/EventService.ts
async findAll(options: QueryOptions): Promise<Event[]> {
  return await prisma.event.findMany({
    where: options.where,
    include: {
      contests: {
        include: {
          scores: true,    // Include nested if needed
        },
      },
      _count: {
        select: { contests: true },  // Just count if full data not needed
      },
    },
  });
}
```

### 3. Implement Pagination Everywhere (4 hours)

**Standard pagination pattern:**

```typescript
// src/utils/pagination.ts
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function paginate<T>(
  model: any,
  options: {
    where?: any;
    orderBy?: any;
    include?: any;
    page?: number;
    limit?: number;
  }
): Promise<PaginatedResult<T>> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 10, 100); // Max 100 per page
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      where: options.where,
      orderBy: options.orderBy,
      include: options.include,
      skip,
      take: limit,
    }),
    model.count({ where: options.where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

**Use in services:**

```typescript
import { paginate } from '../utils/pagination';

async getAllEvents(params: PaginationParams) {
  return await paginate(prisma.event, {
    page: params.page,
    limit: params.limit,
    where: { tenantId: params.tenantId },
    orderBy: { startDate: 'desc' },
  });
}
```

### 4. Add Query Monitoring (2 hours)

**Log slow queries:**

```typescript
// src/middleware/queryMonitoring.ts
import { logger } from '../config/logger';

const SLOW_QUERY_THRESHOLD = 1000; // 1 second

export function setupQueryMonitoring(prisma: PrismaClient) {
  prisma.$use(async (params, next) => {
    const before = Date.now();

    const result = await next(params);

    const after = Date.now();
    const duration = after - before;

    if (duration > SLOW_QUERY_THRESHOLD) {
      logger.warn('Slow query detected', {
        model: params.model,
        action: params.action,
        duration,
        args: params.args,
      });
    }

    return result;
  });
}
```

### 5. Optimize Large Queries (3 hours)

**Use select to limit fields:**

```typescript
// Only select needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    // Don't include password, metadata, etc.
  },
});
```

**Use cursors for large datasets:**

```typescript
// For exports or large data processing
async function* getAllScoresGenerator(contestId: number) {
  let cursor: number | undefined;

  while (true) {
    const scores = await prisma.score.findMany({
      where: { contestId },
      take: 1000,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
    });

    if (scores.length === 0) break;

    yield scores;

    cursor = scores[scores.length - 1].id;
  }
}
```

---

## Testing & Validation

```bash
# Verify indexes created
npx prisma db execute --stdin <<EOF
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
EOF

# Check query performance improvement
# Run before and after, compare execution times
```

---

## Estimated Effort

| Task | Time |
|------|------|
| Add indexes | 4 hours |
| Fix N+1 queries | 6 hours |
| Implement pagination | 4 hours |
| Query monitoring | 2 hours |
| Optimize queries | 3 hours |
| **Total** | **19 hours** |

---

**Status:** READY TO IMPLEMENT
**Owner:** Backend Dev + DBA
