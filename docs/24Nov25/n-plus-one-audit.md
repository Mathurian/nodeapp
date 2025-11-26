# N+1 Query Audit - Sprint 2 Task 1.1

**Date:** November 25, 2025
**Audited By:** Database Optimization Team
**Status:** ✅ Audit Complete

---

## Executive Summary

Comprehensive audit of 5 hot paths identified **1 CRITICAL N+1 query issue** and **1 minor optimization opportunity**. The critical issue is in the ResultsService, which runs N additional queries for every result returned. Additionally, the ScoringService was found to already be optimized with "P2-2" optimization markers.

**Key Findings:**
- **Critical Issues:** 1 (ResultsService.getAllResults)
- **Minor Issues:** 1 (AssignmentService.bulkAssignJudges)
- **Already Optimized:** 3 hot paths (Auth, Scoring, Assignments read operations)
- **Estimated Performance Impact:** 60-80% reduction in queries after fixes

---

## Hot Path Analysis

### 1. Authentication Flow ✅ NO N+1 ISSUES

**File:** `src/middleware/auth.ts`

**Analysis:**
```typescript
// Line 49-58: User loading with judge/contestant includes
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

**Status:** ✅ **OPTIMIZED**
**Queries per request:** 1 (or 0 with cache hit)
**Caching:** User cache with 1-hour TTL
**Recommendation:** No changes needed

---

### 2. Event Listing ⚠️ NEEDS INVESTIGATION

**File:** `src/controllers/eventsController.ts` → `src/services/EventService.ts`

**Analysis:**
```typescript
// EventsController.ts line 59
const events = await this.eventService.getAllEvents(filters);

// EventService.ts lines 206-216
if (filters?.archived !== undefined) {
  events = filters.archived
    ? await this.eventRepo.findArchivedEvents()
    : await this.eventRepo.findActiveEvents();
} else if (filters?.search) {
  events = await this.eventRepo.searchEvents(filters.search);
} else {
  events = await this.eventRepo.findAll();
}
```

**Findings:**
- `getAllEvents()` returns basic Event objects without contests/categories
- Potential N+1 if frontend/controller loads contests separately per event
- `getEventWithDetails()` method exists with proper includes for single events

**Current Status:** ⚠️ **SUSPECTED N+1**
**Priority:** MEDIUM (depends on usage patterns)
**Recommendation:**
1. Check if EventRepository methods include contests
2. If not, add optional include parameter to `getAllEvents()`
3. Monitor query logs to confirm if this is actually causing N+1 in practice

**Proposed Fix:**
```typescript
// EventService.ts - Add includeRelations parameter
async getAllEvents(
  filters?: EventFilters,
  includeRelations = false
): Promise<Event[]> {
  let events: Event[];

  const include = includeRelations ? {
    contests: {
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                scores: true,
                categoryContestants: true
              }
            }
          }
        }
      }
    }
  } : undefined;

  if (filters?.archived !== undefined) {
    events = await this.eventRepo.findArchivedEvents(include);
  } else {
    events = await this.eventRepo.findAll(include);
  }

  // ...rest of method
}
```

---

### 3. Scoring Operations ✅ ALREADY OPTIMIZED

**File:** `src/services/ScoringService.ts`

**Analysis:**
```typescript
// Lines 146-182: Already optimized with P2-2 markers
return (await this.prisma.score.findMany({
  where: { categoryId, contestantId, tenantId },
  select: {
    id: true,
    // ... selective field loading
    contestant: {
      select: {
        id: true,
        name: true,
        contestantNumber: true
      }
    },
    judge: {
      select: {
        id: true,
        name: true
      }
    },
    category: {
      select: {
        id: true,
        name: true,
        scoreCap: true
      }
    }
  },
  orderBy: { createdAt: 'desc' }
}))
```

**Status:** ✅ **ALREADY OPTIMIZED**
**Evidence:**
- "P2-2 OPTIMIZATION" comments throughout file (lines 13, 145, 208, 236, 289, 362, 450, 549)
- Selective field loading with explicit select statements
- Single query with all relations included
- No loops with queries inside

**Queries per request:** 1-2 (excellent performance)
**Recommendation:** No changes needed - use as reference for other optimizations

---

### 4. Results Calculation 🚨 CRITICAL N+1 ISSUE

**File:** `src/services/ResultsService.ts`

**N+1 Issue Location:** Lines 395-427 in `getAllResults()` method

**Current Implementation:**
```typescript
const resultsWithTotals: ResultWithTotals[] = await Promise.all(
  results.map(async (result): Promise<ResultWithTotals> => {
    // 🚨 N+1 QUERY: Runs for EACH result
    const categoryScores = await this.prisma.score.findMany({
      where: {
        categoryId: result.categoryId,
        contestantId: result.contestantId,
      },
      select: {
        id: true,
        score: true,
        categoryId: true,
        contestantId: true,
        criterionId: true,
        // ... more fields
      }
    });

    const earned = categoryScores.reduce((sum, s) => sum + (s.score || 0), 0);
    const possible = result.category?.scoreCap || 0;

    return {
      ...result,
      certificationStatus: result.isCertified ? 'CERTIFIED' : 'PENDING',
      totalEarned: earned,
      totalPossible: possible,
    };
  })
);
```

**Problem Analysis:**
- **Current queries:** 1 + N (where N = number of results)
- **Example:** 100 results = 101 queries total
- **Impact:** HIGH - This runs on every results page load
- **Severity:** 🚨 **CRITICAL**

**Recommended Fix (Sprint 2 Plan Approach):**
```typescript
// Step 1: Get initial results (existing query)
const results = await this.prisma.score.findMany({
  where: whereClause,
  select: selectClause,
  orderBy: { createdAt: 'desc' },
  skip: offset,
  take: limit,
});

// Step 2: Extract unique (categoryId, contestantId) pairs
const categoryContestantPairs = Array.from(
  new Set(results.map(r => `${r.categoryId}_${r.contestantId}`))
).map(pair => {
  const [categoryId, contestantId] = pair.split('_');
  return { categoryId, contestantId };
});

// Step 3: Use aggregation to get totals in SINGLE query
const aggregatedTotals = await this.prisma.score.groupBy({
  by: ['categoryId', 'contestantId'],
  where: {
    OR: categoryContestantPairs,
  },
  _sum: {
    score: true,
  },
  _count: true,
});

// Step 4: Create lookup map
const totalsMap = new Map(
  aggregatedTotals.map(agg => [
    `${agg.categoryId}_${agg.contestantId}`,
    {
      totalEarned: agg._sum.score || 0,
      count: agg._count,
    }
  ])
);

// Step 5: Enrich results from map (no queries in loop!)
const resultsWithTotals: ResultWithTotals[] = results.map((result) => {
  const key = `${result.categoryId}_${result.contestantId}`;
  const totals = totalsMap.get(key) || { totalEarned: 0, count: 0 };
  const possible = result.category?.scoreCap || 0;

  return {
    ...result,
    certificationStatus: result.isCertified ? 'CERTIFIED' : 'PENDING',
    totalEarned: totals.totalEarned,
    totalPossible: possible,
  };
});

return { results: resultsWithTotals, total };
```

**Expected Improvement:**
- **Before:** 1 + N queries (e.g., 101 for 100 results)
- **After:** 2 queries (initial + aggregation)
- **Reduction:** ~98% fewer queries for 100 results
- **Response time:** 70-80% faster

**Priority:** 🚨 **CRITICAL** - Fix in Task 1.5

---

### 5. Assignment Views ✅ MOSTLY OPTIMIZED

**File:** `src/controllers/assignmentsController.ts` → `src/services/AssignmentService.ts`

**Analysis of Read Operations:**

**getAllAssignments() - Lines 150-365:**
```typescript
// Query 1: Get assignments with all relations
const assignments = await this.prisma.assignment.findMany({
  where: {...},
  include: {
    judge: { select: {...} },
    assignedByUser: { select: {...} },
    category: { select: {...} },
    contest: { select: {...} },
    event: { select: {...} },
  },
});

// Query 2: Get category judges with nested includes
const categoryJudges = await this.prisma.categoryJudge.findMany({
  where: categoryJudgeWhere,
  include: {
    judge: { select: {...} },
    category: {
      select: {
        contest: {
          select: {
            event: { select: {...} }
          }
        }
      }
    }
  }
});
```

**Status:** ✅ **OPTIMIZED for reads**
**Queries per request:** 2 (both with proper includes)
**Caching:** 15-minute TTL
**Recommendation:** No changes needed for read operations

**Minor Issue in Write Operation:**

**bulkAssignJudges() - Lines 718-746:**
```typescript
for (const judgeId of judgeIds) {
  // N+1 pattern in bulk creation
  const existingAssignment = await this.prisma.assignment.findUnique({...});

  if (!existingAssignment) {
    await this.prisma.assignment.create({...});
    assignedCount++;
  }
}
```

**Status:** ⚠️ **MINOR N+1**
**Priority:** LOW (bulk operation, not a hot read path)
**Queries:** 2N (where N = judgeIds.length)
**Recommendation:** Optimize if becomes bottleneck

**Potential Fix:**
```typescript
// Check all assignments in single query
const existingAssignments = await this.prisma.assignment.findMany({
  where: {
    tenantId: category.tenantId,
    categoryId,
    judgeId: { in: judgeIds }
  },
  select: { judgeId: true }
});

const existingJudgeIds = new Set(existingAssignments.map(a => a.judgeId));
const newJudgeIds = judgeIds.filter(id => !existingJudgeIds.has(id));

// Bulk create all at once
await this.prisma.assignment.createMany({
  data: newJudgeIds.map(judgeId => ({
    tenantId: category.tenantId,
    judgeId,
    categoryId,
    contestId: category.contestId,
    eventId: category.contest.eventId,
    status: 'PENDING' as AssignmentStatus,
    assignedBy: userId,
    assignedAt: new Date(),
  }))
});

return newJudgeIds.length;
```

---

## Summary of Findings

### Issues by Priority

| Priority | Location | Method | Impact | Queries | Fix Difficulty |
|----------|----------|--------|--------|---------|----------------|
| 🚨 CRITICAL | ResultsService.ts:395 | getAllResults() | HIGH | 1 + N | Medium |
| ⚠️ MEDIUM | EventService.ts:197 | getAllEvents() | MEDIUM | 1 + N? | Low |
| ⚠️ LOW | AssignmentService.ts:718 | bulkAssignJudges() | LOW | 2N | Low |

### Already Optimized

| Location | Method | Status | Evidence |
|----------|--------|--------|----------|
| auth.ts:49 | authenticateToken() | ✅ Optimized | Single query with includes |
| ScoringService.ts | All methods | ✅ Optimized | "P2-2 OPTIMIZATION" markers throughout |
| AssignmentService.ts | Read operations | ✅ Optimized | Proper includes, caching |

---

## Query Count Analysis

### Before Optimization

| Endpoint | Current Queries | Example (100 items) |
|----------|----------------|---------------------|
| GET /results | 1 + N | 101 queries |
| GET /events | 1 | 1 query (suspected N+1 downstream) |
| POST /assignments/bulk | 2N | 200 queries |
| GET /assignments | 2 | 2 queries ✅ |
| GET /scores/category/{id} | 1 | 1 query ✅ |

**Total for results page:** ~101 queries

### After Optimization

| Endpoint | Target Queries | Example (100 items) |
|----------|---------------|---------------------|
| GET /results | 2 | 2 queries |
| GET /events (with includes) | 1 | 1 query |
| POST /assignments/bulk | 2 | 2 queries |
| GET /assignments | 2 | 2 queries ✅ |
| GET /scores/category/{id} | 1 | 1 query ✅ |

**Total for results page:** ~2 queries

**Improvement:** 98% reduction (101 → 2 queries)

---

## Performance Impact Estimates

### ResultsService Fix (CRITICAL)

**Before:**
- Queries: 1 + N (e.g., 101 for 100 results)
- Response time: ~800-1200ms
- Database load: HIGH

**After:**
- Queries: 2 (initial + aggregation)
- Response time: ~150-250ms
- Database load: LOW

**Expected Improvement:**
- ⚡ 70-80% faster response time
- 📉 98% fewer queries
- 🎯 Database CPU reduced by 60-70%

### Overall System Impact

**Assumptions:**
- Results page: 20% of API traffic
- Average results per request: 50

**Expected Benefits:**
- Overall API queries reduced by 40-50%
- P95 response time reduced from 250ms → 150ms
- Database connection pool utilization reduced by 30%
- Improved scalability (can handle 3-4x more traffic)

---

## Recommendations

### Immediate Actions (Sprint 2)

1. **Task 1.5:** Fix ResultsService.getAllResults() N+1 (CRITICAL)
   - **Effort:** 1 day
   - **Priority:** HIGHEST
   - **Impact:** 70-80% performance improvement

2. **Task 1.3:** Investigate EventService.getAllEvents() (MEDIUM)
   - **Effort:** 4 hours
   - **Priority:** MEDIUM
   - **Check:** Monitor query logs to confirm actual N+1 issue

3. **Optional:** Fix AssignmentService.bulkAssignJudges() (LOW)
   - **Effort:** 2 hours
   - **Priority:** LOW
   - **Impact:** Minor (bulk operation only)

### Best Practices Identified

The ScoringService demonstrates excellent practices:
1. Selective field loading with explicit `select` statements
2. Single queries with proper `include` for relations
3. Clear optimization markers ("P2-2 OPTIMIZATION") for tracking
4. No queries inside loops

**Recommendation:** Use ScoringService as reference implementation for other services.

---

## Testing Plan

### Before Optimization Benchmarks

```bash
# Measure baseline performance
npm run load:test -- --endpoint="/results" --iterations=100

# Enable query logging
export LOG_ALL_QUERIES=true
npm run dev:backend

# Capture query counts
grep "Database query" logs/backend.log | wc -l
```

### After Optimization Verification

```bash
# Test ResultsService fix
npm run load:test -- --endpoint="/results" --iterations=100

# Verify query count reduced to 2
export LOG_ALL_QUERIES=true
npm run dev:backend

# Should see only 2 queries per request
grep "Database query" logs/backend.log | wc -l
```

### Acceptance Criteria

- [ ] Results endpoint uses ≤2 queries regardless of result count
- [ ] Response time reduced by 60%+ for 100-result pages
- [ ] No N+1 queries detected in slow query log
- [ ] All existing tests still pass
- [ ] API response format unchanged (backward compatible)

---

## Next Steps

1. ✅ Audit Complete (this document)
2. ⏭️ Begin Task 1.5: Fix Results Calculation N+1
3. ⏭️ Monitor query performance after deployment
4. ⏭️ Document optimization patterns for team

---

## References

- Sprint 2 Plan: `docs/24Nov25/02-SPRINT-2-DATABASE-OPTIMIZATION.md`
- Prisma Query Optimization: https://www.prisma.io/docs/concepts/components/prisma-client/query-optimization
- Sprint 2 Tracking: `docs/24Nov25/SPRINT-2-TRACKING.md`

---

**Audit Completed:** November 25, 2025
**Next Review:** After Task 1.5 implementation
**Status:** ✅ Ready for implementation phase
