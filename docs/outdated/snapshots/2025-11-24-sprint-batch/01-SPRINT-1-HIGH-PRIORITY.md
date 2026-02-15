# Sprint 1: High Priority Security & Performance
**Duration:** Weeks 1-3 (15 working days)
**Team:** 2 Backend Developers + 1 QA Engineer
**Risk Level:** Low
**Dependencies:** None

---

## Sprint Goal

Address critical security completeness and implement scalability features to prevent resource monopolization and enable safe API evolution.

---

## Sprint Backlog

### Epic 1: Security TODO Resolution (Priority: CRITICAL)
**Effort:** 2-3 days
**Assignee:** Senior Backend Developer

#### Task 1.1: Audit All Security-Related TODOs
**Effort:** 4 hours

**Files to Review:**
- `src/config/env.ts`
- `src/config/monitoring.config.ts`
- `src/utils/logger.ts`
- `src/services/SecretManager.ts`
- `src/config/secrets.config.ts`
- `src/controllers/cacheAdminController.ts`
- `src/middleware/virusScanMiddleware.ts`
- `src/services/VirusScanService.ts`

**Acceptance Criteria:**
- [ ] All TODO/FIXME comments extracted to spreadsheet
- [ ] Each TODO categorized (complete, document, or remove)
- [ ] Security impact assessed for each
- [ ] Resolution plan created for each

**Deliverable:** `security-todos-audit.md`

#### Task 1.2: Resolve Critical Security TODOs
**Effort:** 1 day

**Actions:**
1. Complete any incomplete security features
2. Add proper documentation where TODOs indicate missing docs
3. Remove resolved TODOs
4. Create tickets for deferred items

**Acceptance Criteria:**
- [ ] All TODOs in security-critical files resolved or documented
- [ ] Code review completed by security lead
- [ ] No new security vulnerabilities introduced
- [ ] All tests passing

#### Task 1.3: Update Security Documentation
**Effort:** 4 hours

**Actions:**
1. Document any new security decisions
2. Update README with security features
3. Create security runbook if missing

**Acceptance Criteria:**
- [ ] Security documentation complete and reviewed
- [ ] Team trained on any new security features

---

### Epic 2: Per-User/Tenant Rate Limiting (Priority: HIGH)
**Effort:** 3-5 days
**Assignee:** Backend Developer

#### Task 2.1: Design Rate Limiting Strategy
**Effort:** 4 hours

**Design Considerations:**
- Algorithm: Token bucket or sliding window
- Storage: Redis (with in-memory fallback)
- Limits per role/plan type
- Response format for limit exceeded
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

**Tiers:**
```
Free Tier:     100 requests/hour per user
Standard Tier: 1000 requests/hour per user
Premium Tier:  5000 requests/hour per user
Per Tenant:    10x user limit aggregated
```

**Acceptance Criteria:**
- [ ] Design document approved
- [ ] Edge cases identified and documented
- [ ] Performance impact assessed

**Deliverable:** `rate-limiting-design.md`

#### Task 2.2: Implement Rate Limit Middleware
**Effort:** 2 days

**Implementation:**

**File:** `src/middleware/userRateLimiting.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { redisClient } from '../config/redis.config';
import { createLogger } from '../utils/logger';

const logger = createLogger('rate-limit');

// Rate limits by plan type
const RATE_LIMITS = {
  free: { points: 100, duration: 3600 },      // 100/hour
  standard: { points: 1000, duration: 3600 }, // 1000/hour
  premium: { points: 5000, duration: 3600 },  // 5000/hour
};

// Initialize rate limiters
export const createUserRateLimiter = (planType: string) => {
  const config = RATE_LIMITS[planType] || RATE_LIMITS.free;

  return new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: `rate_limit_user_${planType}`,
    points: config.points,
    duration: config.duration,
    blockDuration: 60, // Block for 1 minute after limit exceeded
  });
};

// Middleware
export const userRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip for health checks and public endpoints
  if (req.path === '/health' || req.path === '/metrics') {
    return next();
  }

  // Require authentication
  if (!req.user) {
    return next();
  }

  const userId = req.user.id;
  const tenantId = req.tenantId;
  const planType = req.user.tenant?.planType || 'free';

  try {
    // Check user-level limit
    const userLimiter = createUserRateLimiter(planType);
    const userRateLimitRes = await userLimiter.consume(userId, 1);

    // Check tenant-level limit
    const tenantLimiter = createUserRateLimiter(planType);
    const tenantRateLimitRes = await tenantLimiter.consume(tenantId, 1);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMITS[planType].points);
    res.setHeader('X-RateLimit-Remaining', userRateLimitRes.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + userRateLimitRes.msBeforeNext).toISOString());

    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'RateLimiterRes') {
      logger.warn('Rate limit exceeded', {
        userId,
        tenantId,
        planType,
        path: req.path,
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please try again later.`,
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
      });
      return;
    }

    // On Redis failure, fall back to in-memory limiter
    logger.error('Rate limiter error', { error });
    next();
  }
};
```

**Acceptance Criteria:**
- [ ] Middleware implemented with Redis backend
- [ ] Fallback to in-memory if Redis unavailable
- [ ] Rate limit headers included in responses
- [ ] Different limits per plan type
- [ ] Both user and tenant limits enforced
- [ ] Unit tests with 85%+ coverage
- [ ] Integration tests for all scenarios

#### Task 2.3: Add Rate Limiting to Routes
**Effort:** 4 hours

**Changes:**
- Update `src/server.ts` to include new middleware
- Apply after authentication but before route handlers
- Document in API docs

**File:** `src/server.ts` (after line 190)
```typescript
// User-level rate limiting
app.use('/api', userRateLimit);
```

**Acceptance Criteria:**
- [ ] Middleware applied to all API routes
- [ ] Swagger docs updated with rate limit info
- [ ] Health and metrics endpoints excluded

#### Task 2.4: Add Rate Limiting Monitoring
**Effort:** 4 hours

**Metrics to Track:**
- Rate limit hits per user
- Rate limit hits per tenant
- Top rate-limited users
- Rate limit by endpoint

**Acceptance Criteria:**
- [ ] Prometheus metrics exposed
- [ ] Grafana dashboard created
- [ ] Alerts configured for unusual patterns

#### Task 2.5: Update Documentation
**Effort:** 2 hours

**Updates:**
- API documentation with rate limits
- Client SDK documentation
- Error handling guide

**Acceptance Criteria:**
- [ ] All documentation updated
- [ ] Examples provided for handling 429 responses

---

### Epic 3: API Versioning Strategy (Priority: HIGH)
**Effort:** 1-2 days
**Assignee:** Backend Developer

#### Task 3.1: Design API Versioning Approach
**Effort:** 4 hours

**Decision Points:**
1. **URL-based versioning** (Recommended)
   - `/api/v1/events`
   - `/api/v2/events`

2. **Header-based versioning** (Alternative)
   - `Accept: application/vnd.api+json;version=1`

3. **Deprecation strategy**
   - Support N-1 versions
   - 6-month deprecation notice
   - Warning headers for deprecated endpoints

**Recommendation:** URL-based with `/api/v1/` as current version

**Acceptance Criteria:**
- [ ] Versioning strategy documented
- [ ] Migration path defined
- [ ] Deprecation policy established

**Deliverable:** `api-versioning-strategy.md`

#### Task 3.2: Implement Version Routing
**Effort:** 1 day

**Implementation:**

**File:** `src/config/routes.config.ts`
```typescript
import { Application } from 'express';

export const registerRoutes = (app: Application): void => {
  // API v1 (current implementation)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/events', eventsRoutes);
  app.use('/api/v1/contests', contestsRoutes);
  // ... all other routes

  // Legacy routes redirect to v1 (backward compatibility)
  app.use('/api/auth', (req, res) => {
    res.redirect(308, `/api/v1${req.path}`);
  });
  app.use('/api/events', (req, res) => {
    res.redirect(308, `/api/v1${req.path}`);
  });
  // ... all other legacy routes

  // Version negotiation fallback
  app.use('/api', (req, res) => {
    res.status(400).json({
      error: 'API Version Required',
      message: 'Please specify API version (e.g., /api/v1/)',
      currentVersion: 'v1',
      supportedVersions: ['v1'],
    });
  });
};
```

**Acceptance Criteria:**
- [ ] All routes prefixed with `/api/v1/`
- [ ] Legacy `/api/` routes redirect to `/api/v1/`
- [ ] Version in response headers
- [ ] Swagger UI updated with version selector
- [ ] All tests updated to use versioned endpoints

#### Task 3.3: Add Version Middleware
**Effort:** 2 hours

**File:** `src/middleware/apiVersion.ts`
```typescript
import { Request, Response, NextFunction } from 'express';

export const apiVersionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Extract version from URL
  const versionMatch = req.path.match(/^\/api\/(v\d+)\//);
  const version = versionMatch ? versionMatch[1] : null;

  // Add version to request
  req.apiVersion = version;

  // Add version to response headers
  res.setHeader('X-API-Version', version || 'unknown');
  res.setHeader('X-API-Supported-Versions', 'v1');

  next();
};
```

**Acceptance Criteria:**
- [ ] Version extracted from URL
- [ ] Version available in req.apiVersion
- [ ] Version headers in all responses

#### Task 3.4: Update Frontend API Client
**Effort:** 2 hours

**File:** `frontend/src/services/api.ts`
```typescript
const API_VERSION = 'v1';
const API_BASE_URL = `${process.env.VITE_API_URL}/api/${API_VERSION}`;
```

**Acceptance Criteria:**
- [ ] All API calls use versioned endpoints
- [ ] Version configurable via environment variable
- [ ] Frontend tests passing

---

### Epic 4: Database Query Analysis (Priority: HIGH)
**Effort:** 2 days
**Assignee:** Backend Developer

#### Task 4.1: Install Query Monitoring
**Effort:** 4 hours

**Tools:**
- Prisma query logging
- PostgreSQL pg_stat_statements
- Custom query monitoring middleware

**File:** `src/middleware/queryMonitoring.ts` (already exists - enhance)

**Acceptance Criteria:**
- [ ] All queries logged with duration
- [ ] Slow queries (>100ms) flagged
- [ ] N+1 queries detected
- [ ] Dashboard for query analysis

#### Task 4.2: Analyze Hot Paths
**Effort:** 1 day

**Paths to Analyze:**
- User authentication flow
- Score retrieval by category
- Results calculation
- Event listing with contests
- Assignment queries

**Acceptance Criteria:**
- [ ] Top 20 slowest queries identified
- [ ] N+1 queries documented
- [ ] Missing indexes identified
- [ ] Optimization plan created

**Deliverable:** `query-optimization-analysis.md`

#### Task 4.3: Quick Wins Implementation
**Effort:** 4 hours

**Actions:**
- Add missing includes to prevent N+1
- Add database indexes for identified queries
- Implement query result caching for hot paths

**Acceptance Criteria:**
- [ ] Top 5 slow queries optimized
- [ ] Performance improvement measured
- [ ] No regressions in functionality

---

## Testing Requirements

### Unit Tests
- [ ] Rate limiting middleware (all scenarios)
- [ ] API version middleware
- [ ] Security fixes

**Coverage Target:** 85%+

### Integration Tests
- [ ] Rate limiting per user
- [ ] Rate limiting per tenant
- [ ] Rate limit exceeded responses
- [ ] API versioning routes
- [ ] Legacy route redirects

### Load Tests
- [ ] Rate limiting under load
- [ ] Performance with new middleware
- [ ] API versioning overhead

**Performance Target:** <5ms overhead per request

### Security Tests
- [ ] Rate limit bypass attempts
- [ ] Version header manipulation
- [ ] All security TODO resolutions validated

---

## Deployment Plan

### Pre-Deployment Checklist
- [ ] All tests passing (unit, integration, E2E)
- [ ] Load tests completed successfully
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Staging environment tested
- [ ] Rollback plan documented

### Deployment Steps

**Step 1: Deploy to Staging**
- Deploy code changes
- Run full test suite
- Monitor for 24 hours
- Performance testing

**Step 2: Deploy to Production (Blue-Green)**
- Deploy during low-traffic window (2 AM UTC Sunday)
- Enable rate limiting with generous limits initially
- Monitor error rates and performance
- Gradually tighten rate limits over 1 week

**Step 3: Post-Deployment Monitoring**
- Monitor rate limit metrics
- Check for false positives
- Adjust limits based on data
- Gather user feedback

### Rollback Triggers
- Error rate increase >5%
- Performance degradation >20%
- Rate limit false positives >1%
- Security vulnerability discovered

### Rollback Procedure
1. **Rate Limiting:** Feature flag to disable (< 1 minute)
2. **API Versioning:** Redirect all v1 to legacy (< 5 minutes)
3. **Code Rollback:** Git revert + deploy (< 15 minutes)

---

## Monitoring & Success Criteria

### Key Metrics

**Security:**
- ✓ Zero TODO/FIXME in security files
- ✓ Zero security vulnerabilities introduced
- ✓ Security audit passed

**Rate Limiting:**
- ✓ Rate limiting active for all users
- ✓ <1% false positive rate
- ✓ Resource usage fair across tenants
- ✓ 429 responses < 0.1% of requests

**API Versioning:**
- ✓ All endpoints versioned
- ✓ Legacy redirects working
- ✓ <5ms version routing overhead
- ✓ Zero breaking changes for existing clients

**Performance:**
- ✓ P95 response time < 200ms (maintained)
- ✓ Top 5 queries optimized
- ✓ N+1 queries reduced by 50%

### Monitoring Dashboards

**Rate Limiting Dashboard:**
- Requests per user/tenant
- Rate limit hits
- 429 responses over time
- Top rate-limited users

**API Version Dashboard:**
- Requests by version
- Legacy redirect count
- Version adoption rate

**Query Performance Dashboard:**
- Slow query count
- Query duration percentiles
- N+1 query detections

---

## Sprint Retrospective (End of Week 3)

### Review Questions
1. Were all sprint goals achieved?
2. What blockers did we encounter?
3. What went well?
4. What could be improved?
5. Lessons learned for Sprint 2?

### Artifacts to Produce
- Sprint completion report
- Updated metrics baseline
- Lessons learned document
- Sprint 2 adjustments

---

## Dependencies for Sprint 2

The following items from Sprint 1 feed into Sprint 2:
- Query analysis results (Task 4.2)
- Performance baseline metrics
- Rate limiting infrastructure

---

## References

- **Code Review:** `/home/mat/Documents/Claude_Review_24Nov25.md`
- **Overall Roadmap:** `00-IMPLEMENTATION-ROADMAP.md`
- **Technical Specs:** `06-TECHNICAL-SPECS.md` (for detailed designs)
- **Rate Limiter Library:** https://github.com/animir/node-rate-limiter-flexible

---

## Daily Standup Template

**What I did yesterday:**
**What I'm doing today:**
**Blockers:**
**Progress:** X% complete

---

*Sprint planning completed: November 24, 2025*
*Sprint start date: [TBD]*
*Sprint end date: [TBD]*
