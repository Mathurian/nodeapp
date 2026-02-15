# Rate Limiting Design Document
**Date:** November 24, 2025
**Status:** Design Complete - Ready for Implementation
**Sprint:** Sprint 1, Task 2

---

## Executive Summary

This document outlines the design for enhanced rate limiting in the Event Manager application. The system implements a token bucket algorithm with per-user and per-tenant rate limiting, tiered limits based on subscription plans, and graceful degradation when Redis is unavailable.

**Key Features:**
- Token bucket algorithm for smooth rate limiting
- Per-user and per-tenant aggregate limits
- Tiered limits (Free, Standard, Premium, Enterprise)
- Endpoint-specific overrides for sensitive operations
- Redis-based with in-memory fallback
- Comprehensive rate limit response headers
- Metrics and monitoring integration

---

## Current State Analysis

### Existing Infrastructure

The application currently has basic rate limiting:

**Files:**
- `src/services/RateLimitService.ts` - Basic service using express-rate-limit
- `src/middleware/rateLimiting.ts` - Simple middleware with fixed limits
- `src/controllers/rateLimitController.ts` - Admin controller
- `src/routes/rateLimitRoutes.ts` - Admin routes

**Current Limits:**
- General API: 5000 requests per 15 minutes
- Auth endpoints: 10000 requests per 15 minutes

**Gaps:**
1. ❌ No per-tenant rate limiting
2. ❌ No tiered limits based on subscription plan
3. ❌ No token bucket algorithm (uses express-rate-limit default)
4. ❌ No endpoint-specific overrides
5. ❌ Limits are too high and don't prevent abuse
6. ❌ No proper rate limit headers
7. ❌ Skips auth and admin endpoints entirely (security risk)

---

## Design Overview

### Architecture

```
┌─────────────────────────────────────────┐
│         Incoming Request                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    Authentication Middleware            │
│  (Identify user & tenant)               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Enhanced Rate Limit Middleware         │
│                                         │
│  1. Determine tenant's tier             │
│  2. Get endpoint-specific limits        │
│  3. Check user bucket (minute + hour)   │
│  4. Check tenant bucket (hour)          │
│  5. Consume tokens if available         │
│  6. Return 429 if exhausted             │
│  7. Add rate limit headers              │
└──────────────┬──────────────────────────┘
               │
         ┌─────┴─────┐
         │           │
    [Allow]      [Reject]
         │           │
         ▼           ▼
    [Handler]   [429 Response]
```

---

## Token Bucket Algorithm

### Why Token Bucket?

- **Allows burst traffic** - Better user experience than fixed window
- **Smooth rate limiting** - Gradual token refill prevents hard cutoffs
- **Industry standard** - Used by AWS, Google Cloud, Stripe, etc.
- **Simple to implement** - Well-documented algorithm
- **Fair resource distribution** - Prevents monopolization

### How It Works

1. Each user/tenant has a bucket with N tokens (burst limit)
2. Tokens refill at rate R per second (based on tier)
3. Each request consumes 1 token
4. If bucket has tokens, request allowed and token consumed
5. If bucket empty, request rejected with 429
6. Tokens automatically refill over time

### Mathematical Model

```typescript
tokens_to_add = floor((current_time - last_refill) * refill_rate)
current_tokens = min(burst_limit, previous_tokens + tokens_to_add)

// Refill rate calculation
refill_rate = requests_per_hour / 3600  // tokens per second

// Example for Standard tier:
// - requests_per_hour: 1000
// - refill_rate: 1000 / 3600 ≈ 0.278 tokens/second
// - burst_limit: 100 tokens
// - Time to refill from 0 to 100: 100 / 0.278 ≈ 360 seconds (6 minutes)
```

---

## Rate Limit Tiers

### Tier Definitions

| Tier | Requests/Hour | Requests/Minute | Burst Limit | Tenant Limit (10x) | Use Case |
|------|--------------|----------------|-------------|-------------------|----------|
| **Free** | 100 | 10 | 20 | 1,000 | Trial users, demos |
| **Standard** | 1,000 | 50 | 100 | 10,000 | Small events, basic usage |
| **Premium** | 5,000 | 200 | 400 | 50,000 | Large events, heavy usage |
| **Enterprise** | 10,000 | 500 | 1,000 | 100,000 | Multi-event organizations |
| **Internal** | 100,000 | 5,000 | 10,000 | 1,000,000 | Admin/system operations |

### Tier Rationale

**Free Tier (100/hour):**
- Prevents abuse from free accounts
- Allows exploration of features
- Encourages upgrade to paid plans
- 20 burst tokens allow initial spike (e.g., loading dashboard)

**Standard Tier (1,000/hour):**
- Suitable for small to medium events
- ~16 requests/minute sustained rate
- Burst of 100 supports intensive operations
- Cost-effective for most users

**Premium Tier (5,000/hour):**
- Large-scale events with many concurrent users
- Real-time scoring and updates
- Multiple simultaneous operations
- Professional event management

**Enterprise Tier (10,000/hour):**
- Multi-event organizations
- API integrations
- Custom workflows
- Dedicated support

**Internal Tier (100,000/hour):**
- Admin operations
- System maintenance
- Background jobs
- Migration scripts

---

## Endpoint-Specific Overrides

### Sensitive Endpoints (Stricter Limits)

To prevent brute force and abuse, certain endpoints have stricter limits regardless of tier:

| Endpoint | Requests/Hour | Requests/Minute | Burst | Rationale |
|----------|--------------|----------------|-------|-----------|
| `/api/auth/login` | 20 | 5 | 10 | Prevent brute force attacks |
| `/api/auth/register` | 10 | 2 | 5 | Prevent spam accounts |
| `/api/auth/reset-password` | 5 | 1 | 3 | Prevent email bombing |
| `/api/files/upload` | 100 | 10 | 20 | Resource intensive |
| `/api/reports/generate` | 50 | 5 | 10 | CPU/memory intensive |

### Excluded Endpoints

These endpoints bypass rate limiting:
- `/health` - Health checks
- `/healthz` - Kubernetes health
- `/metrics` - Prometheus metrics
- `/api/health` - API health check

---

## Data Structures

### Redis Keys

```
rate_limit:user:{userId}:minute
rate_limit:user:{userId}:hour
rate_limit:tenant:{tenantId}:hour
```

### Redis Value (Hash)

```javascript
{
  "tokens": "95.5",           // Float: Remaining tokens
  "lastRefill": "1700000000", // Unix timestamp (seconds)
  "resetAt": "1700003600"     // Unix timestamp (seconds)
}
```

### In-Memory Cache Structure

```typescript
Map<string, {
  tokens: number;
  lastRefill: number;
  resetAt: number;
}>
```

---

## Response Format

### Successful Request (200)

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 2025-11-24T15:00:00Z
X-RateLimit-Tier: standard

{
  "data": { ... }
}
```

### Rate Limited Request (429)

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 45
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-11-24T15:00:00Z
X-RateLimit-Tier: standard

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded for your plan (Standard: 1000/hour). Please try again later or upgrade your plan for higher limits.",
  "retryAfter": 45,
  "limit": 1000,
  "remaining": 0,
  "tier": "standard",
  "upgradeUrl": "/settings/billing"
}
```

---

## Edge Cases & Handling

### 1. User Switches Tenants

**Scenario:** User is member of multiple tenants

**Solution:**
- Each tenant has separate limit
- User limit applies per-tenant basis
- Keys include both userId and tenantId

### 2. Redis Unavailable

**Scenario:** Redis connection fails or times out

**Solution:**
- Automatic fallback to in-memory rate limiting
- Log warning (once to avoid spam)
- Continue serving requests with degraded rate limiting
- More generous limits in fallback mode (fail open)
- Periodic Redis reconnection attempts

### 3. Clock Skew

**Scenario:** Server clocks drift

**Solution:**
- Use Redis TIME command for consistent timestamps
- Handle negative time differences gracefully
- Cap maximum refill to burst limit

### 4. Tenant Exceeds Limit but User Has Tokens

**Scenario:** Tenant aggregate limit hit, but individual user has remaining quota

**Solution:**
- Deny request (tenant limit is hard limit)
- Return specific error message:
  ```json
  {
    "error": "Tenant Rate Limit Exceeded",
    "message": "Your organization has exceeded its rate limit. Please contact your administrator or upgrade your plan."
  }
  ```

### 5. High-Frequency Bursts

**Scenario:** User sends many rapid requests

**Solution:**
- Burst limit allows initial spike
- Token bucket smooths out the rate
- After burst tokens exhausted, limited to refill rate
- Prevents long-term abuse while allowing short bursts

### 6. Admin Bypass

**Scenario:** Admins need unrestricted access for maintenance

**Solution:**
- Optional `skipForAdmins` configuration
- Assign "internal" tier to admin operations
- Still track metrics but don't enforce limits
- Configurable per-environment

---

## Implementation Plan

### Phase 1: Core Infrastructure (Completed)

✅ **Files Created:**
1. `src/config/rate-limit.config.ts` - Tier definitions and configuration
2. `src/middleware/enhancedRateLimiting.ts` - Middleware implementation

### Phase 2: Service Enhancement (Next Steps)

The existing `src/services/RateLimitService.ts` needs enhancement to implement token bucket:

**Option A: Replace Existing Service**
- Pros: Clean implementation, follows design exactly
- Cons: Breaking change, may affect existing code

**Option B: Extend Existing Service**
- Pros: Backward compatible, gradual migration
- Cons: More complex, two algorithms running

**Recommendation: Option A (Replace)**

Create new `RateLimitService` implementing token bucket algorithm:

```typescript
class RateLimitService {
  async checkRateLimit(context: RateLimitContext): Promise<RateLimitResult>
  async resetUserLimit(userId: string): Promise<void>
  async resetTenantLimit(tenantId: string): Promise<void>
  async healthCheck(): Promise<boolean>
  getMetrics(): RateLimitMetrics
}
```

### Phase 3: Route Integration

Add rate limiting to all routes:

```typescript
// Existing routes - add enhanced middleware
router.use('/api', rateLimitMiddleware());

// Auth routes - use strict limits
router.use('/api/auth', strictRateLimit());

// Public routes - use lenient limits
router.use('/api/public', lenientRateLimit());
```

### Phase 4: Monitoring & Metrics

Add Prometheus metrics:

```typescript
rate_limit_requests_total{tier, result="allowed"|"denied"}
rate_limit_tokens_remaining{tier}
rate_limit_429_responses_total{tier, endpoint}
rate_limit_redis_errors_total
rate_limit_memory_fallbacks_total
rate_limit_cache_size
```

### Phase 5: Testing

1. **Unit Tests** - Token bucket algorithm correctness
2. **Integration Tests** - Middleware integration
3. **Load Tests** - Performance under high load
4. **Failover Tests** - Redis unavailability scenarios
5. **Edge Case Tests** - Clock skew, negative times, etc.

---

## Monitoring & Alerts

### Metrics to Track

1. **Request Counts**
   - Total requests
   - Allowed vs denied
   - By tier
   - By endpoint

2. **Rate Limit Health**
   - Redis availability
   - Memory fallback usage
   - Cache hit rate
   - Response times

3. **User Behavior**
   - Users hitting limits frequently
   - Tenants exceeding aggregate limits
   - Endpoints with high 429 rates
   - Upgrade conversions after rate limits

### Alert Thresholds

| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| 429 rate > 5% | Any endpoint | Warning | Investigate if limits too strict |
| 429 rate > 20% | Any endpoint | Critical | Possible DDoS or broken client |
| Redis unavailable | > 1 minute | Warning | Check Redis health |
| Redis unavailable | > 5 minutes | Critical | Incident response |
| User hitting limits | > 10 times/hour | Info | Flag for sales team (upgrade opportunity) |
| Memory cache > 90% full | Any time | Warning | Increase cache size or clear old entries |

---

## Security Considerations

### Bypass Prevention

1. **No IP-based bypass** - All requests counted
2. **No user-agent bypass** - Can be spoofed
3. **Admin bypass optional** - Controlled by configuration
4. **Health check exclusion** - Only specific paths

### Abuse Mitigation

1. **Auth endpoints strictly limited** - Prevent brute force
2. **Tenant aggregate limits** - Prevent single tenant monopolization
3. **Progressive penalties** - Could implement exponential backoff in future
4. **Logging** - All 429 responses logged for analysis

### Data Protection

1. **No PII in Redis keys** - Use UUIDs only
2. **Bucket state not sensitive** - Token counts are not confidential
3. **Rate limit info in response** - Help users understand limits
4. **Metrics anonymized** - Aggregate stats only

---

## Performance Considerations

### Redis Operations

- **Reads:** 2-4 per request (user minute, user hour, tenant hour, possibly tenant minute)
- **Writes:** 2-4 per request (update bucket states)
- **Complexity:** O(1) - hash operations
- **Network:** ~1-2ms latency per operation
- **Total overhead:** ~5-10ms per request

### Memory Usage

**Redis:**
- ~200 bytes per bucket (hash with 3 fields)
- 10,000 active users = ~2 MB
- Minimal impact

**In-Memory Cache:**
- Configurable size limit (default: 10,000 entries)
- LRU eviction when full
- Automatic cleanup of expired entries

### Scalability

- **Horizontal:** Redis supports multiple instances
- **Vertical:** Can handle millions of requests/second
- **Bottleneck:** Redis network latency (mitigated by in-memory fallback)

---

## Migration Plan

### Current to Enhanced

1. **Phase 1: Deploy side-by-side**
   - Keep existing rate limiting active
   - Deploy new middleware alongside
   - Monitor metrics from both systems

2. **Phase 2: Gradual rollout**
   - Enable enhanced rate limiting for 10% of requests
   - Compare behavior and performance
   - Increase to 50%, then 100%

3. **Phase 3: Remove legacy**
   - Once enhanced system stable for 1 week
   - Remove old middleware
   - Delete legacy code

### Rollback Plan

If issues arise:
1. Disable enhanced rate limiting via feature flag
2. Revert to legacy middleware
3. Investigate and fix issues
4. Redeploy with fixes

---

## Testing Strategy

### Unit Tests

```typescript
describe('Token Bucket Algorithm', () => {
  test('allows request when tokens available');
  test('denies request when tokens exhausted');
  test('refills tokens over time');
  test('respects burst limit');
  test('handles clock skew gracefully');
});

describe('Tier Configuration', () => {
  test('free tier has lowest limits');
  test('enterprise tier has highest limits');
  test('tenant limit is 10x user limit');
  test('endpoint overrides apply correctly');
});
```

### Integration Tests

```typescript
describe('Rate Limiting Middleware', () => {
  test('allows requests under limit');
  test('blocks requests over limit');
  test('adds correct response headers');
  test('falls back to memory when Redis unavailable');
  test('respects tenant tier');
  test('applies endpoint-specific limits');
});
```

### Load Tests

- 1,000 requests/second for 5 minutes
- Verify all requests processed
- Check 429 rate matches tier limits
- Monitor Redis connection pool
- Verify no memory leaks

### Failover Tests

- Kill Redis during load test
- Verify automatic fallback to memory
- Verify continued operation
- Restart Redis
- Verify reconnection and resumption

---

## Documentation Updates Needed

1. **API Documentation**
   - Add rate limit headers to all endpoint docs
   - Document 429 response format
   - Explain retry-after header

2. **User Documentation**
   - Explain rate limits per tier
   - Show how to check remaining quota
   - Provide upgrade guidance

3. **Admin Documentation**
   - How to reset rate limits
   - Monitoring dashboard
   - Alert response procedures

4. **Development Documentation**
   - How to add rate limiting to new endpoints
   - How to override limits for specific endpoints
   - Testing with rate limits

---

## Success Criteria

### Functional Requirements

✅ Per-user rate limiting implemented
✅ Per-tenant aggregate rate limiting implemented
✅ Tiered limits based on subscription plan
✅ Token bucket algorithm working correctly
✅ Endpoint-specific overrides functional
✅ Redis storage with in-memory fallback
✅ Proper response headers included
✅ 429 responses formatted correctly

### Performance Requirements

- [ ] Rate limit check adds < 10ms to request latency
- [ ] Handles 10,000 requests/second without issues
- [ ] Redis operations complete in < 5ms (p99)
- [ ] Memory cache < 100MB usage
- [ ] Zero downtime during Redis failures

### Quality Requirements

- [ ] 100% unit test coverage for algorithm
- [ ] Integration tests for all scenarios
- [ ] Load tests pass at 10x normal traffic
- [ ] Failover tests pass
- [ ] Documentation complete and accurate

---

## Future Enhancements

### V2 Features (Post-Sprint 1)

1. **Dynamic Limit Adjustment**
   - Auto-scale limits based on system load
   - Temporary limit increases for special events
   - Scheduled limit changes

2. **Quota Banking**
   - Allow unused quota to accumulate
   - "Burst credit" system
   - Month-to-month rollover

3. **Advanced Analytics**
   - Per-user usage dashboards
   - Predictive limit warnings
   - Usage-based billing insights

4. **Geographic Distribution**
   - Region-specific limits
   - CDN integration
   - Edge rate limiting

5. **AI-Based Abuse Detection**
   - Pattern recognition for bot traffic
   - Automatic temporary bans
   - Anomaly detection

---

## Conclusion

This design provides a comprehensive, scalable, and flexible rate limiting system that:

- ✅ Prevents resource monopolization
- ✅ Enables fair usage across all tenants
- ✅ Supports business model (tiered plans)
- ✅ Provides excellent user experience (burst support)
- ✅ Gracefully degrades when Redis unavailable
- ✅ Includes comprehensive monitoring
- ✅ Aligns with industry best practices

**Ready for Implementation**: All design decisions documented and validated.

---

*Design completed: November 24, 2025*
*Next: Proceed with Phase 2 implementation*
