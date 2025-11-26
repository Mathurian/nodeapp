# Technical Specifications
**Date Created:** November 24, 2025
**Purpose:** Detailed technical designs for complex implementation items
**Audience:** Engineering team

---

## Table of Contents
1. [Rate Limiting Architecture](#rate-limiting-architecture)
2. [API Versioning Design](#api-versioning-design)
3. [Circuit Breaker Pattern](#circuit-breaker-pattern)
4. [Soft Delete Implementation](#soft-delete-implementation)
5. [Error Handling Architecture](#error-handling-architecture)
6. [Request Correlation System](#request-correlation-system)

---

## Rate Limiting Architecture

### Overview
Implement per-user and per-tenant rate limiting to prevent resource monopolization and ensure fair usage across all tenants.

### Algorithm: Token Bucket

**Why Token Bucket?**
- Allows burst traffic
- Smooth rate limiting
- Simple to implement
- Industry standard

**How it Works:**
1. Each user has a bucket with N tokens
2. Each request consumes 1 token
3. Tokens refill at rate R per second
4. If bucket empty, request rejected

### Architecture Diagram

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
│    Rate Limit Middleware                │
│                                         │
│  1. Check Redis for user bucket         │
│  2. Check Redis for tenant bucket       │
│  3. Consume tokens if available         │
│  4. Return 429 if exhausted             │
└──────────────┬──────────────────────────┘
               │
         ┌─────┴─────┐
         │           │
         │           │
    [Allow]      [Reject]
         │           │
         ▼           ▼
    [Handler]   [429 Response]
```

### Data Structures

**Redis Keys:**
```
rate_limit:user:{userId}:{window}
rate_limit:tenant:{tenantId}:{window}
```

**Redis Value (HASH):**
```javascript
{
  tokens: 95,              // Remaining tokens
  lastRefill: 1700000000,  // Unix timestamp
  resetAt: 1700003600      // Unix timestamp for window reset
}
```

### Rate Limit Tiers

```typescript
interface RateLimitTier {
  name: string;
  requestsPerHour: number;
  requestsPerMinute: number;
  burstLimit: number;
}

const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'Free',
    requestsPerHour: 100,
    requestsPerMinute: 10,
    burstLimit: 20,
  },
  standard: {
    name: 'Standard',
    requestsPerHour: 1000,
    requestsPerMinute: 50,
    burstLimit: 100,
  },
  premium: {
    name: 'Premium',
    requestsPerHour: 5000,
    requestsPerMinute: 200,
    burstLimit: 400,
  },
  enterprise: {
    name: 'Enterprise',
    requestsPerHour: 10000,
    requestsPerMinute: 500,
    burstLimit: 1000,
  },
};

// Tenant limit is 10x aggregate of all users
function getTenantLimit(tier: RateLimitTier): number {
  return tier.requestsPerHour * 10;
}
```

### Response Headers

**Successful Request:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 2025-11-24T15:00:00Z
X-RateLimit-Tier: standard
```

**Rate Limited Request (429):**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 45
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-11-24T15:00:00Z

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded for your plan (Standard: 1000/hour). Upgrade to Premium for higher limits.",
  "retryAfter": 45,
  "limit": 1000,
  "tier": "standard",
  "upgradeUrl": "/settings/billing"
}
```

### Edge Cases

**1. User switches tenants:**
- Each tenant has separate limit
- User limit applies per tenant

**2. Redis unavailable:**
- Fallback to in-memory rate limiting
- Log warning
- Consider more generous limits (fail open, not closed)

**3. Clock skew:**
- Use Redis TIME command for consistent timestamps
- Handle negative time differences

**4. Tenant exceeds limit but user has tokens:**
- Deny request (tenant limit is hard limit)
- Return specific error message

### Monitoring

**Metrics:**
```typescript
rate_limit_requests_total{tier, result}
rate_limit_tokens_remaining{tier}
rate_limit_429_responses_total{tier, endpoint}
rate_limit_redis_errors_total
```

**Alerts:**
- High 429 rate (>5% of requests)
- Redis unavailable
- Specific user/tenant consistently hitting limits

---

## API Versioning Design

### Strategy: URL-Based Versioning

**Rationale:**
- Clear and explicit
- Easy to route
- Cacheable
- RESTful

### URL Structure

```
/api/v1/events
/api/v1/contests/{id}
/api/v2/scoring
```

### Version Lifecycle

```
┌─────────────┐
│    v1.0     │  Initial release
└─────┬───────┘
      │
┌─────▼───────┐
│    v1.1     │  Backward compatible features
└─────┬───────┘
      │
┌─────▼───────┐
│    v2.0     │  Breaking changes
│             │  v1 still supported
└─────┬───────┘
      │
      │ (6 months deprecation period)
      │
┌─────▼───────┐
│    v2.1     │  v1 deprecated (warning headers)
└─────┬───────┘
      │
      │ (3 months sunset period)
      │
┌─────▼───────┐
│    v2.2     │  v1 removed
└─────────────┘
```

### Versioning Rules

**Major Version (v1 → v2):**
- Breaking changes to request/response format
- Removed endpoints
- Changed authentication
- Changed data types

**Minor Version (v1.1 → v1.2):**
- New endpoints
- New optional fields
- Backward compatible enhancements

**Patch Version (v1.1.0 → v1.1.1):**
- Bug fixes
- Performance improvements
- No API changes

### Deprecation Process

**Step 1: Announcement (T-6 months)**
```
X-API-Deprecation-Date: 2026-05-24
X-API-Deprecation-Info: https://docs.example.com/api/v1-deprecation
```

**Step 2: Warning Headers (T-3 months)**
```
Warning: 299 - "API version v1 is deprecated and will be removed on 2026-05-24"
X-API-Sunset: 2026-05-24
```

**Step 3: Sunset (T-0)**
```http
HTTP/1.1 410 Gone
{
  "error": "API Version Sunset",
  "message": "API v1 has been sunset. Please upgrade to v2.",
  "migrationGuide": "https://docs.example.com/api/v1-to-v2",
  "currentVersion": "v2"
}
```

### Request Routing

**nginx Configuration:**
```nginx
location /api/v1/ {
    proxy_pass http://backend_v1;
    add_header X-API-Version "v1" always;
    add_header X-API-Supported-Versions "v1, v2" always;
}

location /api/v2/ {
    proxy_pass http://backend_v2;
    add_header X-API-Version "v2" always;
    add_header X-API-Supported-Versions "v2" always;
}

# Legacy redirect
location /api/ {
    return 308 /api/v1$request_uri;
}
```

### Version Negotiation

**Header-Based (Alternative):**
```http
GET /api/events
Accept: application/vnd.eventmanager.v2+json
```

**Response:**
```http
Content-Type: application/vnd.eventmanager.v2+json
X-API-Version: v2
```

### Client SDK Versioning

```typescript
// npm install @eventmanager/api-client@2.x
import { EventManagerClient } from '@eventmanager/api-client';

const client = new EventManagerClient({
  apiUrl: 'https://api.eventmanager.com',
  version: 'v2', // Explicit version
  apiKey: 'your-api-key',
});

// Client handles versioned endpoints
const events = await client.events.list();
```

---

## Circuit Breaker Pattern

### State Machine

```
         failures++
    ┌─────────────────┐
    │                 │
    ▼                 │
┌───────┐        ┌────────┐
│CLOSED │◄───────┤  OPEN  │
└───┬───┘success └────┬───┘
    │  threshold      │
    │  exceeded       │ timeout
    │                 │ elapsed
    ▼                 ▼
┌────────────────┬────────────┐
│   HALF_OPEN    │            │
└────────────────┴────────────┘
    │success                │failure
    │threshold              │
    │met                    │
    └───────────────────────┘
```

### Configuration Matrix

| Service | Failure Threshold | Success Threshold | Timeout | Window Size | Volume Threshold |
|---------|------------------|-------------------|---------|-------------|------------------|
| Email (SMTP) | 5 | 2 | 60s | 60s | 10 |
| S3 Upload | 3 | 2 | 30s | 60s | 5 |
| Webhook | 3 | 1 | 120s | 60s | 3 |
| Redis | 10 | 3 | 10s | 30s | 20 |
| Virus Scan | 2 | 2 | 300s | 60s | 2 |

### Failure Classification

**Counted as Failure:**
- Timeout
- Connection refused
- 5xx responses
- DNS resolution failure

**NOT Counted as Failure:**
- 4xx responses (client errors)
- Successful but slow responses
- Validation errors

### Fallback Strategies

**Email Service:**
```typescript
async sendEmail(options: EmailOptions): Promise<void> {
  try {
    await circuitBreaker.execute(() => smtp.send(options));
  } catch (error) {
    if (error.message.includes('Circuit breaker')) {
      // Fallback: Queue for later
      await emailQueue.add('delayed-email', {
        ...options,
        scheduledFor: Date.now() + 300000, // 5 minutes
      });
      logger.warn('Email queued due to circuit breaker');
      return;
    }
    throw error;
  }
}
```

**File Upload:**
```typescript
async uploadFile(file: Buffer): Promise<string> {
  try {
    return await s3CircuitBreaker.execute(() => s3.upload(file));
  } catch (error) {
    if (error.message.includes('Circuit breaker')) {
      // Fallback: Store locally temporarily
      const tempPath = await saveToLocalStorage(file);
      await uploadQueue.add('retry-upload', { tempPath });
      return tempPath;
    }
    throw error;
  }
}
```

### Monitoring Dashboard

**Grafana Panels:**

1. **Circuit Breaker States**
   - Gauge showing state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
   - One panel per service
   - Color coded (green, yellow, red)

2. **Failure Rates**
   - Time series of failures per service
   - Threshold line overlaid
   - Alert when approaching threshold

3. **Request Success Rate**
   - Success rate while in HALF_OPEN state
   - Shows recovery progress

4. **Fallback Activation**
   - Counter of fallback strategy executions
   - Indicates system degradation

### Alert Configuration

**Critical:**
- Circuit OPEN for >5 minutes
- Multiple circuits OPEN simultaneously
- Circuit opening/closing rapidly (>3 times in 10 min)

**Warning:**
- Circuit OPEN
- Approaching failure threshold (80%)
- Fallback strategy activated

**Alert Message Template:**
```
Circuit Breaker Alert: {{service}} is {{state}}

Details:
- Service: {{service}}
- State: {{state}}
- Failures: {{failures}}/{{threshold}}
- Last Failure: {{lastFailureTime}}
- Duration in state: {{stateDuration}}

Runbook: https://docs.internal/runbooks/circuit-breaker-{{service}}
```

---

## Soft Delete Implementation

### Database Schema

**Add to all models requiring soft delete:**
```prisma
model Event {
  id        String    @id @default(cuid())
  name      String
  // ... other fields

  deletedAt DateTime?
  deletedBy String?

  deletedByUser User? @relation("DeletedEvents", fields: [deletedBy], references: [id])

  @@index([tenantId, deletedAt])
  @@map("events")
}
```

### Query Patterns

**Default (exclude deleted):**
```typescript
const events = await prisma.event.findMany({
  where: {
    tenantId,
    deletedAt: null, // Explicit filter
  },
});
```

**Include deleted (admin view):**
```typescript
const events = await prisma.event.findMany({
  where: { tenantId },
  // No deletedAt filter
});
```

**Only deleted:**
```typescript
const deletedEvents = await prisma.event.findMany({
  where: {
    tenantId,
    deletedAt: { not: null },
  },
});
```

### Cascade Behavior

**Option 1: Cascade Soft Delete**
When parent deleted, soft delete all children:
```typescript
async softDeleteEvent(eventId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Soft delete event
    await tx.event.update({
      where: { id: eventId },
      data: {
        deletedAt: new Date(),
        deletedBy: currentUserId,
      },
    });

    // Cascade to contests
    await tx.contest.updateMany({
      where: { eventId },
      data: {
        deletedAt: new Date(),
        deletedBy: currentUserId,
      },
    });

    // Cascade to categories
    const contests = await tx.contest.findMany({
      where: { eventId },
      select: { id: true },
    });

    await tx.category.updateMany({
      where: {
        contestId: { in: contests.map((c) => c.id) },
      },
      data: {
        deletedAt: new Date(),
        deletedBy: currentUserId,
      },
    });
  });
}
```

**Option 2: Prevent Delete if Children Exist**
```typescript
async softDeleteEvent(eventId: string): Promise<void> {
  const contestCount = await prisma.contest.count({
    where: {
      eventId,
      deletedAt: null,
    },
  });

  if (contestCount > 0) {
    throw new Error(
      'Cannot delete event with active contests. Delete contests first.'
    );
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      deletedAt: new Date(),
      deletedBy: currentUserId,
    },
  });
}
```

### Restore Workflow

**UI Flow:**
```
1. Admin views deleted items
2. Select items to restore
3. System checks for conflicts:
   - Name uniqueness
   - Parent exists and not deleted
   - Date ranges valid
4. If conflicts, show error
5. If valid, restore item
6. Option to restore children too
```

**Implementation:**
```typescript
async restoreEvent(
  eventId: string,
  options: { restoreChildren?: boolean } = {}
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Check if event exists and is deleted
    const event = await tx.event.findUnique({
      where: { id: eventId },
    });

    if (!event?.deletedAt) {
      throw new Error('Event is not deleted');
    }

    // Check for conflicts
    const conflicting = await tx.event.findFirst({
      where: {
        name: event.name,
        tenantId: event.tenantId,
        deletedAt: null,
      },
    });

    if (conflicting) {
      throw new Error('An event with this name already exists');
    }

    // Restore event
    await tx.event.update({
      where: { id: eventId },
      data: {
        deletedAt: null,
        deletedBy: null,
      },
    });

    // Optionally restore children
    if (options.restoreChildren) {
      await tx.contest.updateMany({
        where: { eventId },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
      });
    }
  });
}
```

### Permanent Delete

**Policy:**
- Soft deleted items kept for 90 days
- After 90 days, eligible for permanent deletion
- Cron job runs nightly to purge old deleted items
- Admin can force permanent delete

**Implementation:**
```typescript
async permanentlyDeleteOldItems(): Promise<void> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const deleted = await prisma.event.deleteMany({
    where: {
      deletedAt: {
        lt: ninetyDaysAgo,
      },
    },
  });

  logger.info('Permanently deleted old items', {
    count: deleted.count,
    cutoff: ninetyDaysAgo,
  });
}
```

---

## Error Handling Architecture

### Error Hierarchy

```
Error (JavaScript native)
  │
  └─ AppError (base operational error)
       │
       ├─ ClientError (4xx)
       │    ├─ BadRequestError (400)
       │    ├─ UnauthorizedError (401)
       │    ├─ ForbiddenError (403)
       │    ├─ NotFoundError (404)
       │    ├─ ConflictError (409)
       │    └─ ValidationError (422)
       │
       └─ ServerError (5xx)
            ├─ InternalServerError (500)
            ├─ ServiceUnavailableError (503)
            └─ GatewayTimeoutError (504)
```

### Error Response Format

**Standard Format:**
```json
{
  "error": "NotFound",
  "message": "Event not found",
  "statusCode": 404,
  "timestamp": "2025-11-24T14:30:00.000Z",
  "path": "/api/v1/events/invalid-id",
  "requestId": "req_abc123",
  "details": {
    "resource": "Event",
    "id": "invalid-id"
  }
}
```

**Validation Error:**
```json
{
  "error": "ValidationError",
  "message": "Validation failed",
  "statusCode": 422,
  "timestamp": "2025-11-24T14:30:00.000Z",
  "path": "/api/v1/events",
  "requestId": "req_abc123",
  "details": {
    "errors": [
      {
        "field": "name",
        "message": "Name is required",
        "value": null
      },
      {
        "field": "startDate",
        "message": "Must be a valid date",
        "value": "invalid-date"
      }
    ]
  }
}
```

### Error Tracking Flow

```
Error Occurs
    │
    ├─ Operational Error? (AppError)
    │   ├─ Log at appropriate level
    │   ├─ Format error response
    │   └─ Send to client
    │
    └─ Unknown/Programming Error
        ├─ Log at ERROR level
        ├─ Report to Sentry
        ├─ Send generic 500
        └─ Alert team
```

### Sentry Integration

**Error Enrichment:**
```typescript
Sentry.captureException(error, {
  tags: {
    endpoint: req.path,
    method: req.method,
    statusCode: statusCode,
  },
  user: {
    id: req.user?.id,
    email: req.user?.email,
    tenant: req.tenantId,
  },
  contexts: {
    request: {
      requestId: req.id,
      correlationId: req.correlationId,
      userAgent: req.headers['user-agent'],
    },
  },
  extra: {
    body: req.body,
    query: req.query,
    params: req.params,
  },
});
```

---

## Request Correlation System

### Request ID vs Correlation ID

**Request ID:**
- Unique per HTTP request
- Generated at API gateway/first entry point
- Used to track single request through system

**Correlation ID:**
- Spans multiple requests
- Tracks related operations (user workflow)
- Propagated across services
- Originates from client or first request

### Header Propagation

```
Client Request
    │
    ├─ Generate Request ID: req_abc123
    ├─ Extract/Generate Correlation ID: corr_xyz789
    │
    ▼
Express Server
    │
    ├─ Add to request object
    ├─ Add to response headers
    ├─ Store in AsyncLocalStorage
    │
    ▼
Business Logic
    │
    ├─ All logs include IDs
    ├─ Database queries tagged
    ├─ Background jobs tagged
    │
    ▼
External Service Calls
    │
    ├─ Propagate in headers:
    │   X-Request-ID: req_abc123
    │   X-Correlation-ID: corr_xyz789
    │
    └─ Track in logs
```

### Database Correlation

**Add to transaction context:**
```typescript
await prisma.$executeRaw`
  SELECT set_config('app.request_id', ${requestId}, true),
         set_config('app.correlation_id', ${correlationId}, true)
`;

// Now all queries in this transaction are tagged
// Can query pg_stat_activity to see request context
```

### Log Aggregation Query

**Loki Query:**
```
{app="event-manager"} |= "correlationId:corr_xyz789" | json
```

**Result:**
```
[14:30:00] [auth] User authenticated (correlationId:corr_xyz789, requestId:req_abc123)
[14:30:01] [events] Fetching events (correlationId:corr_xyz789, requestId:req_abc123)
[14:30:01] [database] Query executed (correlationId:corr_xyz789, requestId:req_abc123, duration:45ms)
[14:30:02] [email] Queued welcome email (correlationId:corr_xyz789, requestId:req_def456)
[14:30:05] [email-worker] Sending email (correlationId:corr_xyz789, jobId:job_789)
```

---

## Implementation Checklist

### Sprint 1
- [ ] Rate limiting middleware
- [ ] API versioning routes
- [ ] Security TODOs resolved
- [ ] Query monitoring enhanced

### Sprint 2
- [ ] N+1 queries fixed
- [ ] Field naming standardized
- [ ] Connection pool configured
- [ ] Query timeouts added

### Sprint 3
- [ ] Base controller created
- [ ] Error factory implemented
- [ ] Dependencies cleaned up
- [ ] Validation centralized

### Sprint 4
- [ ] Circuit breakers added
- [ ] Request correlation IDs
- [ ] Soft delete implemented
- [ ] Monitoring dashboards updated

---

*Technical specifications document created: November 24, 2025*
*Version: 1.0*
