# Database Query Optimization Guide

Comprehensive guide for optimizing database queries, adding indexes, and improving performance in the Event Manager application.

**Last Updated:** 2025-11-17

---

## 🎯 Current Performance Issues

### Identified Problems:
1. **Missing Indexes** - Many foreign key and frequently queried columns lack indexes
2. **N+1 Queries** - Multiple services fetch related data inefficiently
3. **Full Table Scans** - Some queries scan entire tables without indexes
4. **Unoptimized Joins** - Complex joins without proper indexing
5. **Lack of Query Caching** - Frequently accessed data not cached

---

## 📊 Recommended Indexes

### High Priority Indexes (Immediate Impact)

#### Users Table
```sql
-- Email lookups (login, user search)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Active user queries
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users("isActive");

-- Composite for filtered user lists
CREATE INDEX IF NOT EXISTS idx_users_role_active
  ON users(role, "isActive");
```

#### Events Table
```sql
-- Status-based queries (active events, archived events)
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Date range queries (upcoming events, past events)
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events("startDate");
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events("endDate");

-- Organizer's events
CREATE INDEX IF NOT EXISTS idx_events_organizer_id
  ON events("organizerId");

-- Composite for dashboard queries
CREATE INDEX IF NOT EXISTS idx_events_status_date
  ON events(status, "startDate");
```

#### Contests Table
```sql
-- Event's contests (most common query)
CREATE INDEX IF NOT EXISTS idx_contests_event_id
  ON contests("eventId");

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status);

-- Composite for filtered lists
CREATE INDEX IF NOT EXISTS idx_contests_event_status
  ON contests("eventId", status);
```

#### Categories Table
```sql
-- Contest's categories
CREATE INDEX IF NOT EXISTS idx_categories_contest_id
  ON categories("contestId");

-- Type filtering
CREATE INDEX IF NOT EXISTS idx_categories_type
  ON categories("categoryType");

-- Composite for contest category lists
CREATE INDEX IF NOT EXISTS idx_categories_contest_type
  ON categories("contestId", "categoryType");
```

#### Scores Table
```sql
-- Judge's scores (scoring dashboard)
CREATE INDEX IF NOT EXISTS idx_scores_judge_id ON scores("judgeId");

-- Category's scores (results calculation)
CREATE INDEX IF NOT EXISTS idx_scores_category_id
  ON scores("categoryId");

-- Contestant's scores
CREATE INDEX IF NOT EXISTS idx_scores_contestant_id
  ON scores("contestantId");

-- Composite for results queries
CREATE INDEX IF NOT EXISTS idx_scores_category_contestant
  ON scores("categoryId", "contestantId");

-- Composite for judge scoring page
CREATE INDEX IF NOT EXISTS idx_scores_judge_category
  ON scores("judgeId", "categoryId");
```

#### Notifications Table
```sql
-- User's notifications (most common)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications("userId");

-- Unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_is_read
  ON notifications("isRead");

-- Composite for notification list
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications("userId", "isRead");

-- Date for sorting
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications("createdAt" DESC);
```

### Medium Priority Indexes

#### Assignments Tables
```sql
-- Judge-Category assignments
CREATE INDEX IF NOT EXISTS idx_judge_category_judge_id
  ON "JudgeCategoryAssignment"("judgeId");

CREATE INDEX IF NOT EXISTS idx_judge_category_category_id
  ON "JudgeCategoryAssignment"("categoryId");

-- Category-Contestant assignments
CREATE INDEX IF NOT EXISTS idx_category_contestant_category_id
  ON "CategoryContestant"("categoryId");

CREATE INDEX IF NOT EXISTS idx_category_contestant_contestant_id
  ON "CategoryContestant"("contestantId");
```

#### Certifications
```sql
-- Certification lookups
CREATE INDEX IF NOT EXISTS idx_certifications_category_id
  ON certifications("categoryId");

CREATE INDEX IF NOT EXISTS idx_certifications_user_id
  ON certifications("userId");

CREATE INDEX IF NOT EXISTS idx_certifications_status
  ON certifications(status);
```

---

## 🚀 N+1 Query Fixes

### Problem: Loading Events with Related Data

**Before (N+1 Query):**
```typescript
// 1 query to get events
const events = await prisma.event.findMany();

// N queries to get organizers (one per event)
for (const event of events) {
  const organizer = await prisma.user.findUnique({
    where: { id: event.organizerId }
  });
  event.organizer = organizer;
}
```

**After (Single Query with Include):**
```typescript
const events = await prisma.event.findMany({
  include: {
    organizer: {
      select: {
        id: true,
        name: true,
        email: true
      }
    },
    contests: {
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            categoryType: true
          }
        }
      }
    }
  }
});
```

### Problem: Loading Categories with Contestant Count

**Before (N+1 Query):**
```typescript
const categories = await prisma.category.findMany();

for (const category of categories) {
  const count = await prisma.categoryContestant.count({
    where: { categoryId: category.id }
  });
  category.contestantCount = count;
}
```

**After (Aggregation):**
```typescript
const categories = await prisma.category.findMany({
  include: {
    _count: {
      select: {
        categoryContestants: true
      }
    }
  }
});

// Map to add count
const categoriesWithCount = categories.map(cat => ({
  ...cat,
  contestantCount: cat._count.categoryContestants
}));
```

### Problem: Judge Scoring Dashboard

**Before (Multiple Queries):**
```typescript
// Get judge
const judge = await prisma.user.findUnique({ where: { id: judgeId } });

// Get assigned categories
const assignments = await prisma.judgeCategoryAssignment.findMany({
  where: { judgeId }
});

// Get each category (N queries)
for (const assignment of assignments) {
  const category = await prisma.category.findUnique({
    where: { id: assignment.categoryId }
  });
  // Get contestants for each category (N more queries)
  const contestants = await prisma.categoryContestant.findMany({
    where: { categoryId: category.id }
  });
  // Get scores for each contestant (N * M queries)
  for (const contestant of contestants) {
    const scores = await prisma.score.findMany({
      where: {
        judgeId,
        contestantId: contestant.contestantId,
        categoryId: category.id
      }
    });
  }
}
```

**After (Single Query):**
```typescript
const judge = await prisma.user.findUnique({
  where: { id: judgeId },
  include: {
    judgeCategoryAssignments: {
      include: {
        category: {
          include: {
            categoryContestants: {
              include: {
                contestant: {
                  select: {
                    id: true,
                    name: true,
                    number: true
                  }
                },
                scores: {
                  where: {
                    judgeId: judgeId
                  }
                }
              }
            }
          }
        }
      }
    }
  }
});
```

---

## 🔍 Query Performance Analysis

### Enable Query Logging

Add to `prisma.ts`:
```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' }
  ]
});

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`);
  console.log(`Duration: ${e.duration}ms`);
});
```

### Analyze Slow Queries

PostgreSQL query analysis:
```sql
-- Enable query statistics
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
SELECT pg_reload_conf();

-- Find slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100  -- queries averaging > 100ms
ORDER BY mean_time DESC
LIMIT 20;

-- Find missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100  -- high cardinality
  AND correlation < 0.1;  -- poor sequential correlation
```

---

## 📈 Query Optimization Patterns

### 1. Use Select to Limit Fields
```typescript
// Bad: Returns all fields (slower, more memory)
const users = await prisma.user.findMany();

// Good: Only return needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true
  }
});
```

### 2. Pagination for Large Datasets
```typescript
// Bad: Load all records
const events = await prisma.event.findMany();

// Good: Paginate
const events = await prisma.event.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
});
```

### 3. Use Transactions for Consistency
```typescript
// Atomic operations
await prisma.$transaction(async (tx) => {
  const score = await tx.score.create({ data: scoreData });
  await tx.notification.create({
    data: {
      userId: score.contestantId,
      message: 'New score submitted'
    }
  });
});
```

### 4. Batch Operations
```typescript
// Bad: Loop with individual creates
for (const contestant of contestants) {
  await prisma.score.create({ data: { contestantId: contestant.id } });
}

// Good: Single batch operation
await prisma.score.createMany({
  data: contestants.map(c => ({ contestantId: c.id }))
});
```

### 5. Use Database-Level Aggregations
```typescript
// Bad: Fetch all and count in JavaScript
const scores = await prisma.score.findMany({ where: { categoryId } });
const average = scores.reduce((sum, s) => sum + s.value, 0) / scores.length;

// Good: Use database aggregation
const result = await prisma.score.aggregate({
  where: { categoryId },
  _avg: { value: true },
  _count: true
});
```

---

## 🎯 Implementation Checklist

### Phase 1: Critical Indexes (Week 1)
- [ ] Add indexes to Users table (email, role, isActive)
- [ ] Add indexes to Events table (status, dates, organizerId)
- [ ] Add indexes to Scores table (judgeId, categoryId, contestantId)
- [ ] Add indexes to Notifications table (userId, isRead, createdAt)

### Phase 2: N+1 Query Fixes (Week 2)
- [ ] Fix EventService.getAllEvents() - add proper includes
- [ ] Fix ScoringService.getJudgeDashboard() - single query
- [ ] Fix ResultsService.getCategoryResults() - optimize aggregations
- [ ] Fix NotificationService.getUserNotifications() - add pagination

### Phase 3: Query Optimization (Week 3)
- [ ] Add select statements to limit fields
- [ ] Implement pagination across all list endpoints
- [ ] Replace loops with batch operations (createMany, updateMany)
- [ ] Move calculations to database aggregations

### Phase 4: Monitoring (Week 4)
- [ ] Enable Prisma query logging in production
- [ ] Set up pg_stat_statements for PostgreSQL
- [ ] Create dashboard for slow query monitoring
- [ ] Set up alerts for queries > 500ms

---

## 📝 Migration Script Example

Create migration for all indexes:
```bash
npx prisma migrate dev --name add_performance_indexes
```

```sql
-- Migration: add_performance_indexes
-- Add all recommended indexes for performance

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users("isActive");
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, "isActive");

-- Events
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events("startDate");
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events("endDate");
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events("organizerId");
CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, "startDate");

-- Add all other indexes...
```

---

## 🔧 Tools & Resources

### Query Performance Tools:
- **Prisma Studio** - Visual query builder and data browser
- **pgAdmin** - PostgreSQL management and query analysis
- **DataGrip** - Database IDE with query optimization hints
- **EXPLAIN ANALYZE** - PostgreSQL query execution plans

### Monitoring Tools:
- **pg_stat_statements** - PostgreSQL extension for query statistics
- **Datadog** - APM with database query tracking
- **New Relic** - Database performance monitoring
- **Prometheus + Grafana** - Custom metrics and dashboards

---

**Expected Performance Improvements:**
- 50-70% reduction in query execution time
- 80% reduction in database round trips (N+1 fixes)
- 90% reduction in memory usage (select optimization)
- 95% cache hit rate for frequently accessed data

**Next Steps:** Implement Phase 1 indexes immediately for quick wins.
