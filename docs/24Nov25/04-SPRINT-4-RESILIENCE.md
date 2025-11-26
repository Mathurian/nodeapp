# Sprint 4: System Resilience & Observability
**Duration:** Weeks 10-12 (15 working days)
**Team:** 2 Backend Developers + 0.5 DevOps Engineer + 1 QA Engineer
**Risk Level:** Low-Medium
**Dependencies:** Sprint 3 (for request ID middleware)

---

## Sprint Goal

Enhance system resilience through circuit breakers, comprehensive request tracing, soft delete patterns, and improved observability. Ensure the system can gracefully handle external service failures and maintain data recoverability.

---

## Sprint Backlog

### Epic 1: Circuit Breaker Implementation (Priority: HIGH)
**Effort:** 3-4 days
**Assignee:** Backend Developer

#### Task 1.1: Design Circuit Breaker Strategy
**Effort:** 4 hours

**Services Requiring Circuit Breakers:**
1. **Email Service** (SMTP)
2. **Cloud Storage** (S3, Azure, GCP)
3. **Webhook Delivery**
4. **External APIs** (if any)
5. **Redis** (already has fallback, enhance with circuit breaker)

**Circuit Breaker States:**
- **Closed:** Normal operation, requests pass through
- **Open:** Failure threshold exceeded, fail fast
- **Half-Open:** Test if service recovered

**Configuration:**
```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;     // Failures before opening (default: 5)
  successThreshold: number;     // Successes to close (default: 2)
  timeout: number;              // ms in open state (default: 60000)
  windowSize: number;           // Time window for failure count (default: 60000)
  volumeThreshold: number;      // Min requests before evaluating (default: 10)
}
```

**Acceptance Criteria:**
- [ ] Circuit breaker strategy documented
- [ ] Configuration per service defined
- [ ] Monitoring plan created
- [ ] Alerting thresholds defined

**Deliverable:** `circuit-breaker-design.md`

#### Task 1.2: Implement Circuit Breaker Utility
**Effort:** 1 day

**File:** `src/utils/circuitBreaker.ts`
```typescript
import { createLogger } from './logger';
import EventEmitter from 'events';

const logger = createLogger('circuit-breaker');

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  windowSize: number;
  volumeThreshold: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttempt: number = Date.now();
  private windowStart: number = Date.now();

  constructor(private config: CircuitBreakerConfig) {
    super();
    logger.info('Circuit breaker created', { name: config.name });
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // Check if window expired, reset counters
    if (Date.now() - this.windowStart > this.config.windowSize) {
      this.resetWindow();
    }

    // If circuit is open, fail fast
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        logger.warn('Circuit breaker open, failing fast', {
          name: this.config.name,
        });
        throw new Error(`Circuit breaker ${this.config.name} is OPEN`);
      }
      // Transition to half-open
      this.state = CircuitState.HALF_OPEN;
      this.emit('stateChange', CircuitState.HALF_OPEN);
      logger.info('Circuit breaker transitioning to HALF_OPEN', {
        name: this.config.name,
      });
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();
    this.failures = 0; // Reset failures on success

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.emit('stateChange', CircuitState.CLOSED);
        logger.info('Circuit breaker closed', {
          name: this.config.name,
          successes: this.successes,
        });
      }
    }
  }

  private onFailure(error: any): void {
    this.failures++;
    this.lastFailureTime = new Date();

    logger.warn('Circuit breaker failure', {
      name: this.config.name,
      failures: this.failures,
      error: error.message,
    });

    // Only evaluate if we have enough volume
    if (this.totalRequests < this.config.volumeThreshold) {
      return;
    }

    // Open circuit if threshold exceeded
    if (
      this.state === CircuitState.CLOSED &&
      this.failures >= this.config.failureThreshold
    ) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      this.emit('stateChange', CircuitState.OPEN);
      logger.error('Circuit breaker opened', {
        name: this.config.name,
        failures: this.failures,
        threshold: this.config.failureThreshold,
      });
    }

    // Re-open circuit if half-open and failed
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      this.emit('stateChange', CircuitState.OPEN);
      logger.error('Circuit breaker reopened from HALF_OPEN', {
        name: this.config.name,
      });
    }
  }

  private resetWindow(): void {
    this.windowStart = Date.now();
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
    };
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    logger.info('Circuit breaker manually reset', {
      name: this.config.name,
    });
  }
}
```

**Acceptance Criteria:**
- [ ] Circuit breaker class implemented
- [ ] All three states supported
- [ ] Event emitter for monitoring
- [ ] Statistics tracking
- [ ] Unit tests with 90%+ coverage

#### Task 1.3: Add Circuit Breakers to Services
**Effort:** 2 days

**Email Service Circuit Breaker:**

**File:** `src/services/EmailService.ts`
```typescript
import { CircuitBreaker } from '../utils/circuitBreaker';

class EmailService {
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      name: 'email-service',
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,        // 1 minute
      windowSize: 60000,     // 1 minute
      volumeThreshold: 10,
    });

    // Monitor circuit breaker state changes
    this.circuitBreaker.on('stateChange', (state) => {
      logger.warn('Email service circuit breaker state changed', { state });
      // Could trigger alerts here
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        return await this.transporter.sendMail(options);
      });
    } catch (error) {
      logger.error('Failed to send email', {
        error: error.message,
        circuitState: this.circuitBreaker.getStats().state,
      });

      // Fallback: queue for retry or use alternative service
      await this.queueEmailForRetry(options);

      throw error;
    }
  }
}
```

**Other Services to Update:**
1. `src/services/FileBackupService.ts` - S3/Azure/GCP uploads
2. `src/services/WebhookDeliveryService.ts` - Webhook calls
3. `src/services/SMSService.ts` - SMS sending
4. `src/services/VirusScanService.ts` - External virus scan API

**Acceptance Criteria:**
- [ ] All external service calls wrapped with circuit breakers
- [ ] Appropriate configurations for each service
- [ ] Fallback behavior defined
- [ ] Metrics exposed

---

### Epic 2: Request Correlation IDs (Priority: HIGH)
**Effort:** 1-2 days
**Assignee:** Backend Developer

#### Task 2.1: Implement Request ID Middleware
**Effort:** 4 hours

**File:** `src/middleware/requestId.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id: string;
      correlationId?: string;
    }
  }
}

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate or use existing request ID
  const requestId = req.headers['x-request-id'] as string || uuidv4();

  // Correlation ID for tracing across services
  const correlationId = req.headers['x-correlation-id'] as string || requestId;

  // Attach to request
  req.id = requestId;
  req.correlationId = correlationId;

  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};
```

**Acceptance Criteria:**
- [ ] Request ID generated for every request
- [ ] Correlation ID propagated
- [ ] Headers included in responses
- [ ] TypeScript types updated

#### Task 2.2: Update Logging to Include Request IDs
**Effort:** 4 hours

**File:** `src/utils/logger.ts`
```typescript
import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

// Store request context
export const requestContext = new AsyncLocalStorage<{
  requestId: string;
  correlationId: string;
  userId?: string;
  tenantId?: string;
}>();

export const createLogger = (module: string) => {
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      winston.format.printf((info) => {
        const context = requestContext.getStore();
        return JSON.stringify({
          ...info,
          module,
          requestId: context?.requestId,
          correlationId: context?.correlationId,
          userId: context?.userId,
          tenantId: context?.tenantId,
        });
      })
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'logs/app.log' }),
    ],
  });
};
```

**Middleware to Set Context:**
```typescript
export const contextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  requestContext.run(
    {
      requestId: req.id,
      correlationId: req.correlationId!,
      userId: req.user?.id,
      tenantId: req.tenantId,
    },
    () => next()
  );
};
```

**Acceptance Criteria:**
- [ ] All logs include request ID
- [ ] All logs include correlation ID
- [ ] Context preserved across async operations
- [ ] Log aggregation can trace requests

#### Task 2.3: Propagate Correlation IDs to External Services
**Effort:** 4 hours

**Update HTTP clients:**
```typescript
// axios interceptor
axios.interceptors.request.use((config) => {
  const context = requestContext.getStore();
  if (context?.correlationId) {
    config.headers['X-Correlation-ID'] = context.correlationId;
  }
  return config;
});
```

**Update Background Jobs:**
```typescript
// BullMQ job data includes correlation ID
await emailQueue.add('send-email', {
  ...emailData,
  correlationId: req.correlationId,
});
```

**Acceptance Criteria:**
- [ ] Correlation IDs in all outbound requests
- [ ] Background jobs tracked with correlation IDs
- [ ] Webhook deliveries include correlation IDs
- [ ] Email logs include correlation IDs

---

### Epic 3: Soft Delete Pattern (Priority: MEDIUM)
**Effort:** 3-4 days
**Assignee:** Backend Developer + DBA

#### Task 3.1: Design Soft Delete Strategy
**Effort:** 4 hours

**Entities to Soft Delete:**
1. **Critical:** Events, Contests, Categories
2. **Important:** Users, Judges, Contestants
3. **Supporting:** Scores, Assignments

**Schema Changes:**
```prisma
model Event {
  // ... existing fields
  deletedAt  DateTime?
  deletedBy  String?

  @@index([tenantId, deletedAt])
}
```

**Query Changes:**
- All queries filter `WHERE deletedAt IS NULL` by default
- Add `includeDeleted` option for admin views
- Restore functionality for undelete

**Acceptance Criteria:**
- [ ] Entities prioritized for soft delete
- [ ] Migration plan created
- [ ] Query patterns documented
- [ ] Restore workflow designed

**Deliverable:** `soft-delete-implementation-plan.md`

#### Task 3.2: Create Prisma Extension for Soft Delete
**Effort:** 1 day

**File:** `src/config/softDelete.extension.ts`
```typescript
import { Prisma } from '@prisma/client';

export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    $allModels: {
      // Soft delete method
      async softDelete<T>(
        this: T,
        where: any
      ): Promise<any> {
        const context = Prisma.getExtensionContext(this);

        return (context as any).update({
          where,
          data: {
            deletedAt: new Date(),
            deletedBy: requestContext.getStore()?.userId,
          },
        });
      },

      // Restore method
      async restore<T>(
        this: T,
        where: any
      ): Promise<any> {
        const context = Prisma.getExtensionContext(this);

        return (context as any).update({
          where,
          data: {
            deletedAt: null,
            deletedBy: null,
          },
        });
      },

      // Find excluding soft deleted
      async findManyActive<T>(
        this: T,
        args: any
      ): Promise<any[]> {
        const context = Prisma.getExtensionContext(this);

        return (context as any).findMany({
          ...args,
          where: {
            ...args?.where,
            deletedAt: null,
          },
        });
      },
    },
  },
});

// Usage
const prisma = new PrismaClient().$extends(softDeleteExtension);
```

**Acceptance Criteria:**
- [ ] Soft delete extension created
- [ ] Methods for delete, restore, findActive
- [ ] TypeScript types preserved
- [ ] Unit tests for all methods

#### Task 3.3: Add Soft Delete Fields to Models
**Effort:** 1 day

**Migration:**
```sql
-- Add soft delete fields
ALTER TABLE events ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE events ADD COLUMN deleted_by VARCHAR(255) NULL;

ALTER TABLE contests ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE contests ADD COLUMN deleted_by VARCHAR(255) NULL;

ALTER TABLE categories ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE categories ADD COLUMN deleted_by VARCHAR(255) NULL;

-- Add indexes
CREATE INDEX idx_events_deleted_at ON events(tenant_id, deleted_at);
CREATE INDEX idx_contests_deleted_at ON contests(tenant_id, deleted_at);
CREATE INDEX idx_categories_deleted_at ON categories(tenant_id, deleted_at);
```

**Update Prisma Schema:**
```prisma
model Event {
  id         String    @id @default(cuid())
  name       String
  // ... other fields
  deletedAt  DateTime?
  deletedBy  String?

  @@index([tenantId, deletedAt])
  @@map("events")
}
```

**Acceptance Criteria:**
- [ ] Fields added to priority models
- [ ] Indexes created
- [ ] Prisma schema updated
- [ ] No data loss during migration

#### Task 3.4: Update Application Logic
**Effort:** 1-2 days

**Controllers Update:**
```typescript
// Soft delete instead of hard delete
async deleteEvent(req: Request, res: Response) {
  const { id } = req.params;

  await prisma.event.softDelete({
    where: { id, tenantId: req.tenantId },
  });

  res.status(204).send();
}

// New restore endpoint
async restoreEvent(req: Request, res: Response) {
  const { id } = req.params;

  const event = await prisma.event.restore({
    where: { id, tenantId: req.tenantId },
  });

  res.json(event);
}

// List with deleted items (admin only)
async listEventsAdmin(req: Request, res: Response) {
  const includeDeleted = req.query.includeDeleted === 'true';

  const events = includeDeleted
    ? await prisma.event.findMany({ where: { tenantId: req.tenantId } })
    : await prisma.event.findManyActive({ where: { tenantId: req.tenantId } });

  res.json(events);
}
```

**Acceptance Criteria:**
- [ ] All delete operations use soft delete
- [ ] Restore endpoints added
- [ ] Admin views can show deleted items
- [ ] All queries exclude soft deleted by default
- [ ] Cascade behavior handled correctly

---

### Epic 4: Enhanced Monitoring & Observability (Priority: MEDIUM)
**Effort:** 2 days
**Assignee:** Backend Developer + DevOps

#### Task 4.1: Circuit Breaker Metrics
**Effort:** 4 hours

**Prometheus Metrics:**
```typescript
import { register, Counter, Gauge } from 'prom-client';

// Circuit breaker state
export const circuitBreakerStateGauge = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
  labelNames: ['service'],
});

// Circuit breaker failures
export const circuitBreakerFailuresCounter = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total circuit breaker failures',
  labelNames: ['service'],
});

// Update in circuit breaker
circuitBreaker.on('stateChange', (state) => {
  const stateValue = { CLOSED: 0, HALF_OPEN: 1, OPEN: 2 }[state];
  circuitBreakerStateGauge.set({ service: this.config.name }, stateValue);
});
```

**Acceptance Criteria:**
- [ ] Metrics for all circuit breakers
- [ ] Grafana dashboard created
- [ ] Alerts configured
- [ ] Runbook updated

#### Task 4.2: Request Tracing Dashboard
**Effort:** 1 day

**Grafana Dashboard for:**
- Request ID search
- Correlation ID tracing
- Error rate by correlation ID
- Request duration by path

**Log Query Examples:**
```
# Find all logs for a request
{app="event-manager"} |= "requestId:abc123"

# Trace correlation ID across requests
{app="event-manager"} |= "correlationId:xyz789"
```

**Acceptance Criteria:**
- [ ] Dashboard created
- [ ] Search by request/correlation ID
- [ ] Distributed trace visualization
- [ ] Documentation for use

---

## Testing Requirements

### Unit Tests
- [ ] Circuit breaker all states
- [ ] Request ID generation
- [ ] Soft delete extension
- [ ] Restore functionality

**Coverage Target:** 85%+

### Integration Tests
- [ ] Circuit breaker opens on failures
- [ ] Circuit breaker closes after recovery
- [ ] Request IDs in all logs
- [ ] Soft delete cascades correctly
- [ ] Restore with constraints

### Resilience Tests
- [ ] Simulate external service failures
- [ ] Verify circuit breakers prevent cascading failures
- [ ] Verify fallback behavior
- [ ] Stress test with circuit breakers open

---

## Deployment Plan

**Risk:** Low-Medium (circuit breakers could affect external integrations)

**Strategy:**
1. Deploy circuit breakers in monitoring-only mode
2. Observe for 48 hours
3. Enable fail-fast behavior
4. Deploy soft delete (backward compatible)

**Rollback:** Feature flags to disable circuit breakers

---

## Success Criteria

- ✓ Circuit breakers on all external services
- ✓ Request correlation IDs in all logs
- ✓ Soft delete for critical entities
- ✓ Zero cascading failures during external service outages
- ✓ 100% request traceability
- ✓ Data recovery possible for soft deleted items

---

*Sprint planning completed: November 24, 2025*
