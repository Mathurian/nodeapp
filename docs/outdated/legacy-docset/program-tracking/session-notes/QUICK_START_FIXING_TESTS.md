# Quick Start: Fixing E2E Test Failures

**Goal:** Get your first 10 tests passing today

---

## Step 1: Run Tests with Browser Visible (5 minutes)

```bash
cd /var/www/event-manager

# Start the backend (if not running)
npm run dev:backend &

# Start the frontend (if not running)
cd frontend && npm run dev &

# Wait for both to start, then run a simple test with browser visible
cd /var/www/event-manager
FRONTEND_URL=http://localhost:3002 SKIP_WEB_SERVER=true \
npx playwright test tests/e2e/auth.e2e.test.ts:59 --headed --workers=1
```

**Watch what happens:**
- Does the page load?
- Are there console errors (F12)?
- Does the login form appear?
- What's the actual error?

---

## Step 2: Check Backend Logs (2 minutes)

```bash
# In another terminal, tail backend logs
cd /var/www/event-manager
npm run dev:backend

# Watch for errors when tests run
# Look for:
# - 500 Internal Server Error
# - Uncaught exceptions
# - Database query errors
# - "Cannot read property X of undefined"
```

---

## Step 3: Test One API Endpoint Manually (5 minutes)

### 3a. Get a Session Cookie

```bash
# Run this test to create a session
FRONTEND_URL=http://localhost:3002 SKIP_WEB_SERVER=true \
npx playwright test tests/e2e/auth.e2e.test.ts:78 --headed

# The test will log in - grab the session cookie from browser DevTools:
# 1. Open DevTools (F12)
# 2. Go to Application tab → Cookies
# 3. Copy the session cookie value
```

### 3b. Test Admin Stats API

```bash
# Replace YOUR_SESSION and YOUR_TENANT_SLUG with actual values
curl -v \
  -H "X-Tenant-Slug: YOUR_TENANT_SLUG" \
  -H "Cookie: session=YOUR_SESSION" \
  http://localhost:3000/api/admin/stats

# Look for:
# ✅ 200 OK response
# ❌ 500 error (server problem)
# ❌ 401/403 (auth problem)
# ❌ 404 (route problem)
```

---

## Step 4: Fix Your First Bug (30-60 minutes)

Based on what you found above, pick the most obvious issue:

### Issue Type A: API Returns 500 Error

**Likely Cause:** Missing tenant filter in database query

**Fix:**
```typescript
// Find the controller file (e.g., src/controllers/adminController.ts)
// Look for the failing endpoint

// BEFORE:
export const getStats = async (req, res) => {
  const events = await prisma.event.count()
  // ...
}

// AFTER:
export const getStats = async (req, res) => {
  const tenantId = req.user.tenantId
  const events = await prisma.event.count({
    where: { tenantId }
  })
  // ...
}
```

**Test the fix:**
```bash
# Restart backend
npm run dev:backend

# Re-run the test
npx playwright test tests/e2e/admin.e2e.test.ts:64 --headed
```

### Issue Type B: Frontend Shows Loading Forever

**Likely Cause:** API call fails but error not handled

**Fix:**
```typescript
// Find the page file (e.g., frontend/src/pages/DashboardPage.tsx)

// BEFORE:
const { data, isLoading } = useQuery('stats', fetchStats)

if (isLoading) return <div>Loading...</div>
return <div>{data.totalEvents}</div>

// AFTER:
const { data, isLoading, error } = useQuery('stats', fetchStats, {
  retry: 1,
  onError: (err) => console.error('Stats failed:', err)
})

if (isLoading) return <div>Loading...</div>
if (error) return <div>Error: {error.message}</div>
if (!data) return <div>No data available</div>

return <div>{data.totalEvents}</div>
```

**Test the fix:**
```bash
# Frontend auto-reloads on save
# Re-run the test
npx playwright test tests/e2e/admin.e2e.test.ts:64 --headed
```

### Issue Type C: UI Element Not Found

**Likely Cause:** Page structure changed or element has different text

**Check:**
```bash
# Look at the test expectation
cat tests/e2e/admin.e2e.test.ts | grep -A5 "line 64"

# Example:
# await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()

# Check if Dashboard page has h1 with text "Dashboard"
grep -n "<h1" frontend/src/pages/DashboardPage.tsx
```

**Fix:** Either update the page to have the expected element, or update the test if the page changed intentionally.

---

## Step 5: Verify Fix and Move to Next (10 minutes)

```bash
# Run the specific test that was failing
npx playwright test tests/e2e/admin.e2e.test.ts:64

# If it passes, run all admin tests
npx playwright test tests/e2e/admin.e2e.test.ts

# Count how many pass
npx playwright test tests/e2e/admin.e2e.test.ts | grep "passed"

# Document your progress
echo "$(date): Fixed admin dashboard - 1 test passing" >> fixes.log
```

---

## Common Issues & Fixes

### Issue: "Tenant not found"

**Fix:** Ensure `X-Tenant-Slug` header is set and tenant exists in database

```sql
-- Check tenants in database
SELECT slug FROM "Tenant";

-- If none exist, create one
INSERT INTO "Tenant" (id, name, slug, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Test Tenant', 'test-tenant', NOW(), NOW());
```

### Issue: "req.user is undefined"

**Fix:** Ensure authentication middleware runs before route handlers

```typescript
// src/routes/adminRoutes.ts
router.get('/stats',
  authenticate,           // ADD THIS
  requireRole(['ADMIN']), // ADD THIS
  getStats
)
```

### Issue: "Cannot read property 'tenantId' of null"

**Fix:** Add null checks

```typescript
// BEFORE:
const tenantId = req.user.tenantId

// AFTER:
if (!req.user || !req.user.tenantId) {
  return res.status(401).json({ error: 'Unauthorized' })
}
const tenantId = req.user.tenantId
```

---

## Daily Goal

**Morning:** Pick 3 failing tests
**Afternoon:** Fix them
**Evening:** Verify and document

Repeat until tests pass!

---

## Progress Tracking

```bash
# Create a simple progress tracker
cat > track-progress.sh << 'EOF'
#!/bin/bash
FAILURES=$(find test-results -name "test-failed-*.png" 2>/dev/null | wc -l)
TOTAL=396
PASSING=$((TOTAL - FAILURES))
PERCENT=$((PASSING * 100 / TOTAL))

echo "$(date '+%Y-%m-%d %H:%M'): $PASSING/$TOTAL passing ($PERCENT%)" | tee -a progress.log
EOF

chmod +x track-progress.sh

# Run after each fix
./track-progress.sh
```

---

## Need Help?

1. **Test fails immediately:** Check authentication/setup
2. **Test times out:** Check API endpoint exists and responds
3. **Element not found:** Use `--headed` to see what's actually on page
4. **Stuck:** Read full remediation plan in `TEST_FAILURE_REMEDIATION_PLAN.md`

---

## Next Steps

Once you fix your first 10 tests:
- Review the full remediation plan
- Tackle Phase 1.1: API Error Diagnosis
- Set up daily progress tracking
- Plan Week 1 work (target: 30% pass rate)

**You can do this!** Start with Step 1 above and work through methodically.
