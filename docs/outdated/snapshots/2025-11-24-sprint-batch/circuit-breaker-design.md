# Circuit Breaker Design - Sprint 4 Epic 1

**Date:** November 25, 2025
**Status:** Design Complete, Ready for Implementation
**Sprint:** 4 - System Resilience & Observability

---

## Overview

Circuit breakers protect the system from cascading failures when external services become unavailable. Instead of repeatedly calling failing services, the circuit breaker "opens" and fails fast, giving the external service time to recover.

---

## Services Requiring Circuit Breakers

### 1. Email Service (SMTP) - **HIGH PRIORITY**
**Current:** `src/services/EmailService.ts`
**Risk:** Email server downtime blocks notification workflows
**Impact:** High (affects user notifications, admin alerts)

**Configuration:**
```typescript
{
  name: 'email-service',
  failureThreshold: 5,        // Open after 5 failures
  successThreshold: 2,        // Close after 2 successes in half-open
  timeout: 60000,             // 60s before retry (half-open)
  windowSize: 60000,          // 60s sliding window
  volumeThreshold: 10,        // Minimum 10 requests before evaluation
}
```

**Fallback Strategy:**
- Log to database (ErrorLog)
- Queue for retry with exponential backoff
- Send admin alert if critical

---

### 2. Cloud Storage (S3, Azure, GCP) - **HIGH PRIORITY**
**Current:** `src/services/CloudStorageService.ts`, `src/services/FileBackupService.ts`
**Risk:** Cloud provider outage prevents file uploads/downloads
**Impact:** High (affects backups, file management)

**Configuration:**
```typescript
{
  name: 'cloud-storage',
  failureThreshold: 3,        // Open after 3 failures (stricter)
  successThreshold: 3,        // Close after 3 successes (more conservative)
  timeout: 120000,            // 2min before retry (longer recovery)
  windowSize: 60000,          // 60s sliding window
  volumeThreshold: 5,         // Minimum 5 requests
}
```

**Fallback Strategy:**
- Switch to local storage temporarily
- Queue operations for retry
- Alert operations team

---

### 3. Webhook Delivery - **MEDIUM PRIORITY**
**Current:** `src/services/WebhookDeliveryService.ts`
**Risk:** Webhook endpoints become unreachable
**Impact:** Medium (external integrations fail)

**Configuration:**
```typescript
{
  name: 'webhook-delivery',
  failureThreshold: 10,       // More tolerant (external systems)
  successThreshold: 2,        // Close after 2 successes
  timeout: 300000,            // 5min before retry (long recovery)
  windowSize: 120000,         // 2min sliding window
  volumeThreshold: 5,         // Minimum 5 requests
}
```

**Fallback Strategy:**
- Store webhook payloads in database
- Retry queue with exponential backoff
- Mark webhooks as failed after N attempts

---

### 4. Redis Cache - **MEDIUM PRIORITY**
**Current:** `src/services/CacheService.ts` (already has fallback)
**Risk:** Redis downtime affects cache reads/writes
**Impact:** Medium (degrades performance, but system functional)

**Configuration:**
```typescript
{
  name: 'redis-cache',
  failureThreshold: 3,        // Open after 3 failures
  successThreshold: 2,        // Close after 2 successes
  timeout: 30000,             // 30s before retry (fast recovery)
  windowSize: 60000,          // 60s sliding window
  volumeThreshold: 10,        // Minimum 10 requests
}
```

**Fallback Strategy:**
- Already implemented: Fall back to in-memory cache
- Enhance with circuit breaker for faster fail-fast

---

### 5. External APIs (Future) - **LOW PRIORITY**
**Current:** None yet
**Risk:** Third-party API downtime
**Impact:** Low (no critical external APIs currently)

**Configuration:** TBD when external APIs are integrated

---

## Circuit Breaker States

### CLOSED (Normal Operation)
- All requests pass through to the service
- Failures are counted within the sliding window
- If failures exceed threshold, transition to OPEN

### OPEN (Failing Fast)
- All requests fail immediately with CircuitBreakerOpenError
- No calls are made to the actual service
- After timeout period, transition to HALF_OPEN

### HALF_OPEN (Testing Recovery)
- Limited requests are allowed to test if service recovered
- If success threshold met, transition to CLOSED
- If any failure occurs, transition back to OPEN

---

## State Transition Diagram

```
┌─────────┐
│ CLOSED  │ (Normal operation)
│         │
│ Failures│ >= threshold
└────┬────┘
     │
     ▼
┌─────────┐
│  OPEN   │ (Failing fast)
│         │
│ Timeout │ expires
└────┬────┘
     │
     ▼
┌──────────┐
│ HALF_OPEN│ (Testing)
│          │
│ Success  │ >= threshold → CLOSED
│ Failure  │ → OPEN
└──────────┘
```

---

## Configuration Strategy

### Default Configuration
```typescript
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  name: 'default',
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,        // 60 seconds
  windowSize: 60000,     // 60 seconds
  volumeThreshold: 10,
};
```

### Per-Service Overrides
Services can override defaults based on their characteristics:
- **Fast recovery services:** Shorter timeout (Redis: 30s)
- **External services:** Longer timeout (Webhooks: 5min)
- **Critical services:** Lower failure threshold (Storage: 3)
- **Tolerant services:** Higher failure threshold (Webhooks: 10)

---

## Monitoring & Alerting

### Metrics to Track
1. **Circuit breaker state changes** (CLOSED → OPEN → HALF_OPEN → CLOSED)
2. **Failure rate per service**
3. **Success rate in HALF_OPEN state**
4. **Time spent in each state**
5. **Total requests vs. failed-fast requests**

### Events Emitted
```typescript
circuitBreaker.on('stateChange', (newState: CircuitState) => {
  logger.info('Circuit breaker state changed', {
    name: config.name,
    newState,
    timestamp: new Date(),
  });

  // Send to monitoring system
  metrics.increment('circuit_breaker.state_change', {
    service: config.name,
    state: newState,
  });
});

circuitBreaker.on('failure', (error: Error) => {
  logger.warn('Circuit breaker recorded failure', {
    name: config.name,
    error: error.message,
  });
});

circuitBreaker.on('success', () => {
  logger.debug('Circuit breaker recorded success', {
    name: config.name,
  });
});
```

### Alerting Thresholds
- **Critical Alert:** Circuit OPEN for > 5 minutes
- **Warning Alert:** Circuit opened 3+ times in 1 hour
- **Info Alert:** Circuit state change notification

---

## Error Handling

### CircuitBreakerOpenError
```typescript
export class CircuitBreakerOpenError extends BaseAppError {
  constructor(serviceName: string) {
    super(
      `Circuit breaker for ${serviceName} is OPEN`,
      ErrorCode.SERVICE_UNAVAILABLE,
      503,
      { serviceName }
    );
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "SERVICE_UNAVAILABLE",
  "message": "Circuit breaker for email-service is OPEN",
  "timestamp": "2025-11-25T10:00:00.000Z",
  "details": {
    "serviceName": "email-service"
  }
}
```

---

## Testing Strategy

### Unit Tests
1. **State transitions:** Test all valid state changes
2. **Failure counting:** Verify threshold enforcement
3. **Timeout behavior:** Test transition to HALF_OPEN
4. **Window reset:** Verify sliding window logic
5. **Event emission:** Test all events are emitted

### Integration Tests
1. **Email service with circuit breaker:** Simulate SMTP failure
2. **Storage service with circuit breaker:** Simulate S3 outage
3. **Webhook delivery with circuit breaker:** Simulate endpoint down
4. **Redis with circuit breaker:** Simulate Redis connection failure

### Load Tests
1. **High volume with circuit open:** Verify fail-fast performance
2. **Recovery scenario:** Test HALF_OPEN → CLOSED transition
3. **Cascading failures:** Ensure circuit breaker prevents cascades

---

## Implementation Plan

### Phase 1: Core Utility (1 day)
- [ ] Implement CircuitBreaker class
- [ ] Add event emitter functionality
- [ ] Add statistics tracking
- [ ] Unit tests (90%+ coverage)

### Phase 2: Email Service (0.5 days)
- [ ] Add circuit breaker to EmailService
- [ ] Implement fallback strategy (queue + log)
- [ ] Integration tests

### Phase 3: Cloud Storage (0.5 days)
- [ ] Add circuit breaker to CloudStorageService
- [ ] Add circuit breaker to FileBackupService
- [ ] Implement fallback (local storage)
- [ ] Integration tests

### Phase 4: Webhook Delivery (0.5 days)
- [ ] Add circuit breaker to WebhookDeliveryService
- [ ] Implement retry queue
- [ ] Integration tests

### Phase 5: Redis Enhancement (0.5 days)
- [ ] Add circuit breaker to CacheService
- [ ] Enhance existing fallback
- [ ] Integration tests

### Phase 6: Monitoring & Docs (0.5 days)
- [ ] Add circuit breaker metrics to dashboards
- [ ] Configure alerts
- [ ] Update operations documentation

**Total Estimated Time:** 3-4 days

---

## Success Criteria

- [x] Circuit breaker strategy documented
- [x] Configuration per service defined
- [x] Monitoring plan created
- [x] Alerting thresholds defined
- [ ] Circuit breaker utility implemented
- [ ] All targeted services protected
- [ ] Integration tests passing
- [ ] Monitoring dashboards updated

---

## Risk Assessment

**Implementation Risk:** LOW
- Circuit breaker is a well-known pattern
- Additive change (doesn't modify existing behavior when CLOSED)
- Can be feature-flagged per service

**Operational Risk:** LOW-MEDIUM
- Incorrect thresholds could cause false positives
- Mitigation: Start conservative, tune based on metrics
- Mitigation: Manual override capability (reset circuit)

**Performance Risk:** VERY LOW
- Circuit breaker adds minimal overhead (<1ms)
- Actually improves performance during failures (fail-fast)

---

## Future Enhancements

1. **Dashboard:** Real-time circuit breaker status visualization
2. **Dynamic Thresholds:** Adjust based on traffic patterns
3. **Circuit Breaker Health Endpoint:** `/api/health/circuit-breakers`
4. **Automatic Recovery Testing:** Periodic health checks in OPEN state
5. **Circuit Breaker Middleware:** HTTP client-level protection

---

**Status:** ✅ Design complete, ready for implementation
**Next Step:** Implement CircuitBreaker utility class
**Reference:** Sprint 4 Epic 1 Task 1.2
