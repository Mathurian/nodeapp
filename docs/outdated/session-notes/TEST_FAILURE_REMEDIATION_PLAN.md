# E2E Test Failure Remediation Plan
**Created:** December 5, 2025
**Status:** Ready for Implementation
**Total Failures:** 396 tests (0% pass rate)

---

## Executive Summary

All 396 E2E tests are failing due to **application functionality issues**, not test code problems. The test infrastructure is working correctly - authentication, database isolation, and data management all function properly. The failures indicate real bugs that need systematic resolution.

### Failure Distribution by Category
```
Comprehensive Tests: 203 failures
├── Admin:          37
├── Accordions:     29
├── Super Admin:    23
├── Contestant:     23
├── Judge:          22
├── Tally Master:   18
├── Emcee:          18
├── Board:          17
└── Auditor:        16

Role-Specific Tests: 193 failures
├── Tally Master:   35
├── Admin:          33
├── Auditor:        31
├── Scoring:        14
├── Event Mgmt:     14
├── Certification:  15
├── Contestant:     10
├── Bulk Ops:       16
├── Auth:            8
├── Reports:         6
├── Manual Fixes:    7
└── Custom:          9
```

---

## Root Cause Analysis

Based on test failure patterns and code review:

### Primary Issues (High Probability)

1. **API Response Errors** (affects ~80% of tests)
   - Frontend pages load but API calls fail/timeout
   - Data not returned in expected format
   - Missing error handling causes UI to not render
   - React Query likely showing loading state indefinitely

2. **Frontend Conditional Rendering** (affects ~60% of tests)
   - Pages render but content hidden due to empty data checks
   - Loading states not clearing properly
   - Error boundaries catching issues silently

3. **Role-Based Access Control** (affects ~40% of tests)
   - Permissions not properly checked on backend
   - Frontend not redirecting based on role
   - Some routes may not respect user roles

4. **Database Query Issues** (affects ~30% of tests)
   - Tenant isolation may not be working for all queries
   - Some endpoints might not filter by tenantId
   - Join queries missing tenant context

---

## Remediation Strategy

### Phase 1: Foundation & Quick Wins (Week 1)
**Goal:** Fix infrastructure issues and get 20-30% of tests passing

#### 1.1 API Error Diagnosis (Days 1-2)
**Priority:** CRITICAL
**Estimated Impact:** Fixes 200+ tests
**Effort:** 1-2 days

**Tasks:**
- [ ] Enable detailed API error logging in backend
- [ ] Check all `/api/admin/*` endpoints with Postman/curl
- [ ] Verify tenant context is passed to all queries
- [ ] Test with actual tenant slug from test data

**Testing Commands:**
```bash
# Test admin stats endpoint
curl -H "X-Tenant-Slug: test-tenant" \
     -H "Cookie: session=..." \
     http://localhost:3000/api/admin/stats

# Test events endpoint
curl -H "X-Tenant-Slug: test-tenant" \
     -H "Cookie: session=..." \
     http://localhost:3000/api/events
```

**Expected Issues:**
- 500 errors due to null checks
- Missing tenantId in WHERE clauses
- Prisma queries not including tenant relations

#### 1.2 Frontend Error Handling (Days 2-3)
**Priority:** CRITICAL
**Estimated Impact:** Fixes 150+ tests
**Effort:** 1 day

**Tasks:**
- [ ] Add error boundary logging to pages
- [ ] Check React Query error handling in DashboardPage
- [ ] Verify loading states clear after API failures
- [ ] Add fallback UI for empty data states

**Files to Review:**
```
frontend/src/pages/DashboardPage.tsx
frontend/src/pages/EventsPage.tsx
frontend/src/pages/ContestsPage.tsx
frontend/src/pages/UsersPage.tsx
frontend/src/pages/ResultsPage.tsx
```

**Pattern to Implement:**
```typescript
const { data, isLoading, error } = useQuery(...)

if (isLoading) return <LoadingSpinner />
if (error) return <ErrorMessage error={error} />
if (!data || data.length === 0) return <EmptyState />

return <MainContent data={data} />
```

#### 1.3 Auth Flow Verification (Days 3-4)
**Priority:** HIGH
**Estimated Impact:** Fixes 50+ tests
**Effort:** 1 day

**Tasks:**
- [ ] Run auth.e2e.test.ts individually with --headed flag
- [ ] Observe what happens after login
- [ ] Check if session cookies are set correctly
- [ ] Verify redirect after login works

**Test Command:**
```bash
cd /var/www/event-manager
FRONTEND_URL=http://localhost:3002 SKIP_WEB_SERVER=true \
npx playwright test tests/e2e/auth.e2e.test.ts --headed --workers=1
```

**Expected Issues:**
- Login succeeds but redirect fails
- Session cookie not being sent on subsequent requests
- Protected routes not checking authentication properly

#### 1.4 Database Queries - Tenant Isolation (Days 4-5)
**Priority:** CRITICAL
**Estimated Impact:** Fixes 100+ tests
**Effort:** 1 day

**Tasks:**
- [ ] Audit all Prisma queries in controllers
- [ ] Ensure every query includes `tenantId: req.user.tenantId`
- [ ] Add middleware to validate tenant context
- [ ] Test queries with multiple tenants in database

**Files to Audit:**
```
src/controllers/eventsController.ts
src/controllers/contestsController.ts
src/controllers/usersController.ts
src/controllers/categoriesController.ts
src/controllers/scoringController.ts
```

**Pattern to Fix:**
```typescript
// BEFORE (WRONG)
const events = await prisma.event.findMany({})

// AFTER (CORRECT)
const events = await prisma.event.findMany({
  where: { tenantId: req.user.tenantId }
})
```

---

### Phase 2: Core Functionality (Week 2)
**Goal:** Get 50-60% of tests passing

#### 2.1 Admin Dashboard (Days 6-7)
**Priority:** HIGH
**Estimated Impact:** Fixes 70+ tests
**Effort:** 2 days

**Tasks:**
- [ ] Fix `/api/admin/stats` endpoint
- [ ] Verify stats calculation includes all tenants data
- [ ] Test activity logs endpoint
- [ ] Fix dashboard UI rendering issues

**Test Focus:**
```bash
npx playwright test tests/e2e/admin.e2e.test.ts --grep "dashboard" --headed
npx playwright test tests/e2e/comprehensive/admin.e2e.test.ts --grep "Dashboard" --headed
```

#### 2.2 Events Management (Days 8-9)
**Priority:** HIGH
**Estimated Impact:** Fixes 60+ tests
**Effort:** 2 days

**Tasks:**
- [ ] Fix event listing page
- [ ] Verify event creation works
- [ ] Test event editing
- [ ] Validate event deletion

**API Endpoints to Fix:**
```
GET    /api/events
POST   /api/events
PUT    /api/events/:id
DELETE /api/events/:id
```

#### 2.3 Contest & Category Management (Days 10-12)
**Priority:** MEDIUM
**Estimated Impact:** Fixes 50+ tests
**Effort:** 3 days

**Tasks:**
- [ ] Fix contest CRUD operations
- [ ] Fix category CRUD operations
- [ ] Verify contest-event relationships
- [ ] Test category-contest relationships

---

### Phase 3: Role-Specific Features (Week 3)
**Goal:** Get 70-80% of tests passing

#### 3.1 Judge Functionality (Days 13-14)
**Priority:** HIGH
**Estimated Impact:** Fixes 40+ tests
**Effort:** 2 days

**Tasks:**
- [ ] Fix scoring page for judges
- [ ] Verify score submission works
- [ ] Test score editing
- [ ] Validate judge assignments

#### 3.2 Tally Master Features (Days 15-16)
**Priority:** MEDIUM
**Estimated Impact:** Fixes 35+ tests
**Effort:** 2 days

**Tasks:**
- [ ] Fix tally verification page
- [ ] Test score aggregation
- [ ] Verify certification workflow
- [ ] Test results calculation

#### 3.3 Auditor Workflows (Days 17-18)
**Priority:** MEDIUM
**Estimated Impact:** Fixes 30+ tests
**Effort:** 2 days

**Tasks:**
- [ ] Fix audit dashboard
- [ ] Test score verification
- [ ] Verify final certification
- [ ] Test audit log access

---

### Phase 4: Advanced Features (Week 4)
**Goal:** Get 90%+ of tests passing

#### 4.1 Certification Workflows (Days 19-20)
**Priority:** MEDIUM
**Estimated Impact:** Fixes 25+ tests

**Tasks:**
- [ ] Fix multi-step certification
- [ ] Test judge certification
- [ ] Test tally master certification
- [ ] Test auditor final certification
- [ ] Verify board approval

#### 4.2 Accordion Components (Days 21-22)
**Priority:** LOW
**Estimated Impact:** Fixes 29+ tests

**Tasks:**
- [ ] Audit all accordion implementations
- [ ] Fix expand/collapse functionality
- [ ] Verify keyboard navigation
- [ ] Test accessibility

#### 4.3 Results & Reports (Days 23-24)
**Priority:** MEDIUM
**Estimated Impact:** Fixes 20+ tests

**Tasks:**
- [ ] Fix results page filtering
- [ ] Test export functionality
- [ ] Verify winner calculations
- [ ] Test report generation

#### 4.4 Bulk Operations (Days 25-26)
**Priority:** LOW
**Estimated Impact:** Fixes 16+ tests

**Tasks:**
- [ ] Implement bulk user import
- [ ] Test bulk event creation
- [ ] Verify bulk assignment operations
- [ ] Test bulk update/delete

---

## Implementation Approach

### Daily Workflow

1. **Morning: Pick a Phase Task**
   ```bash
   # Select one test file to fix
   cd /var/www/event-manager

   # Run tests in headed mode to see failures
   FRONTEND_URL=http://localhost:3002 SKIP_WEB_SERVER=true \
   npx playwright test tests/e2e/auth.e2e.test.ts --headed --workers=1
   ```

2. **Identify Root Cause**
   - Watch the browser - what fails?
   - Check browser console for errors
   - Check network tab for API failures
   - Look at backend logs

3. **Fix the Issue**
   - Fix backend API endpoint
   - Fix frontend error handling
   - Fix database query
   - Fix UI rendering logic

4. **Verify Fix**
   ```bash
   # Re-run specific test
   npx playwright test tests/e2e/auth.e2e.test.ts

   # If passing, run related tests
   npx playwright test tests/e2e --grep "auth"
   ```

5. **Document Progress**
   - Update this plan with fixes applied
   - Note any new issues discovered
   - Track passing test count

### Debugging Tools

```bash
# Run single test with debug
npx playwright test tests/e2e/admin.e2e.test.ts:64 --debug

# Run with UI mode (interactive)
npx playwright test --ui

# Generate trace for failed test
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### API Testing Tools

```bash
# Quick API test script
cat > /tmp/test-api.sh << 'EOF'
#!/bin/bash
TENANT="test-tenant-slug"
COOKIE="session=your-session-cookie"

# Test admin stats
curl -H "X-Tenant-Slug: $TENANT" \
     -H "Cookie: $COOKIE" \
     http://localhost:3000/api/admin/stats | jq

# Test events
curl -H "X-Tenant-Slug: $TENANT" \
     -H "Cookie: $COOKIE" \
     http://localhost:3000/api/events | jq
EOF

chmod +x /tmp/test-api.sh
/tmp/test-api.sh
```

---

## Success Metrics

### Week 1 Target: 30% Pass Rate (119 passing)
- [ ] Auth tests: 6/8 passing (75%)
- [ ] Admin dashboard loads correctly
- [ ] Basic navigation works
- [ ] API errors properly logged

### Week 2 Target: 60% Pass Rate (238 passing)
- [ ] Admin tests: 25/33 passing (75%)
- [ ] Events CRUD working
- [ ] Contests CRUD working
- [ ] User management working

### Week 3 Target: 80% Pass Rate (317 passing)
- [ ] Judge tests: 18/22 passing (82%)
- [ ] Tally master tests: 28/35 passing (80%)
- [ ] Auditor tests: 25/31 passing (81%)
- [ ] Scoring functional

### Week 4 Target: 95% Pass Rate (376 passing)
- [ ] All role-specific tests passing
- [ ] Advanced features working
- [ ] Edge cases handled

---

## Risk Mitigation

### If Progress Stalls

**Symptom:** Can't get tests passing after 2 days on same issue

**Actions:**
1. Create minimal reproduction outside tests
2. Test API endpoints directly with curl/Postman
3. Check if issue is frontend or backend
4. Add extensive logging to pinpoint failure
5. Seek help with specific error messages

### If New Issues Discovered

**Pattern:** Fixing one area breaks another

**Actions:**
1. Run full test suite daily (overnight)
2. Track regression carefully
3. Implement fixes in feature branches
4. Test integration before merging

### If Timeline Slips

**Mitigation:**
1. Focus on high-impact issues first
2. Skip low-priority features (accordions, bulk ops)
3. Accept 80% pass rate as success threshold
4. Document remaining issues for backlog

---

## Monitoring Progress

### Daily Check

```bash
# Run full suite (overnight or during breaks)
cd /var/www/event-manager
FRONTEND_URL=http://localhost:3002 SKIP_WEB_SERVER=true \
npx playwright test --timeout=120000 --workers=1

# Count failures
find test-results -name "test-failed-*.png" | wc -l

# Track progress
echo "$(date): $(find test-results -name 'test-failed-*.png' | wc -l) failures remaining" >> progress.log
```

### Weekly Review

```bash
# Generate progress chart
cat progress.log

# Expected progression:
# Week 1: 396 → 280 failures (116 fixed, 30% pass rate)
# Week 2: 280 → 160 failures (238 passing, 60% pass rate)
# Week 3: 160 → 80 failures (316 passing, 80% pass rate)
# Week 4: 80 → 20 failures (376 passing, 95% pass rate)
```

---

## Quick Reference: Common Fixes

### Fix 1: API Returns Empty Array
```typescript
// Controller
export const getEvents = async (req, res) => {
  const events = await prisma.event.findMany({
    where: { tenantId: req.user.tenantId }, // ADD THIS
  })
  res.json(events)
}
```

### Fix 2: Frontend Doesn't Render Data
```typescript
// Page Component
if (!data || data.length === 0) {
  return <EmptyState message="No events found" />
}

return (
  <div>
    {data.map(item => <ItemCard key={item.id} {...item} />)}
  </div>
)
```

### Fix 3: Loading State Stuck
```typescript
// Use proper React Query config
const { data, isLoading, error } = useQuery(
  ['events'],
  fetchEvents,
  {
    retry: 1, // Don't retry forever
    retryDelay: 1000,
    onError: (err) => console.error('Events fetch failed:', err),
  }
)
```

### Fix 4: Tenant Context Missing
```typescript
// Middleware
export const attachTenantContext = async (req, res, next) => {
  const tenantSlug = req.headers['x-tenant-slug']
  if (!tenantSlug) {
    return res.status(400).json({ error: 'Tenant slug required' })
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug }
  })

  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' })
  }

  req.tenant = tenant
  next()
}
```

---

## Resources

### Documentation Locations
- Test Results: `/var/www/event-manager/logs/e2e-tests/2025-12-05_084517/`
- Test Code: `/var/www/event-manager/tests/e2e/`
- Frontend Pages: `/var/www/event-manager/frontend/src/pages/`
- Backend Controllers: `/var/www/event-manager/src/controllers/`
- API Routes: `/var/www/event-manager/src/routes/`

### Useful Commands
```bash
# Run specific test file
npx playwright test tests/e2e/admin.e2e.test.ts

# Run specific test by line number
npx playwright test tests/e2e/admin.e2e.test.ts:64

# Run tests matching pattern
npx playwright test --grep "dashboard"

# Run with browser visible
npx playwright test --headed

# Debug mode
npx playwright test --debug

# UI mode (interactive)
npx playwright test --ui
```

---

## Next Steps

1. **Assign Owner** - Designate team member to lead remediation
2. **Set Up Tracking** - Create Jira/GitHub issues for each phase
3. **Daily Standups** - 15-min check-in on progress
4. **Start Phase 1.1** - Begin with API error diagnosis
5. **Track Daily** - Record passing test count each day

---

## Contact & Support

For questions about:
- **Test Infrastructure:** Tests are working correctly, no support needed
- **Application Bugs:** Review this plan and test failure screenshots
- **Playwright Usage:** https://playwright.dev/docs/intro
- **Debugging:** Use `--headed` and `--debug` flags

---

**Status:** Ready to implement
**Last Updated:** January 27, 2026
**Next Review:** End of Week 1 (check 30% pass rate achieved)
