# Soft Delete Pattern - Sprint 4 Epic 3

**Date:** November 25, 2025
**Status:** Design Complete, Ready for Implementation
**Sprint:** 4 - System Resilience & Observability

---

## Overview

Soft delete is a data management pattern where records are marked as deleted rather than physically removed from the database. This provides:
- **Data Recovery:** Accidental deletions can be restored
- **Audit Trail:** Track who deleted what and when
- **Compliance:** Meet data retention requirements
- **Referential Integrity:** Maintain relationships without cascading deletes

---

## Current State Analysis

### Existing "Archived" Pattern

The system already has an `archived` field on Event and Contest models:
- `Event.archived` (Boolean)
- `Contest.archived` (Boolean)

**Key Differences:**
| Feature | Archived | Soft Delete |
|---------|----------|-------------|
| Purpose | Status flag (hide from active list) | Mark as deleted |
| Restoration | User toggles flag | Admin restore action |
| Audit Trail | No tracking of who/when | Tracks deletedBy/deletedAt |
| Query Default | Often included in queries | Excluded by default |
| Use Case | Temporary hiding | Data safety net |

**Recommendation:** Keep both patterns
- `archived`: User-controlled visibility status
- `deletedAt`/`deletedBy`: System-controlled deletion tracking

---

## Models Requiring Soft Delete

### Priority 1: Critical Data (High Value, Frequent Reference)

**Event** - Core entity, referenced by many models
- Current: Has `archived` field
- Add: `deletedAt`, `deletedBy`
- Impact: HIGH - referenced by 12+ models
- Strategy: Soft delete only, keep archived separate

**Contest** - Event sub-entity
- Current: Has `archived` field
- Add: `deletedAt`, `deletedBy`
- Impact: HIGH - referenced by 11+ models
- Strategy: Soft delete only, keep archived separate

**Category** - Contest/Contest sub-entity
- Current: No soft delete
- Add: `deletedAt`, `deletedBy`
- Impact: MEDIUM - referenced by scores, assignments
- Strategy: Soft delete

### Priority 2: Important Data (User-Created, Business Value)

**User** - System users
- Current: No soft delete
- Add: `deletedAt`, `deletedBy`
- Impact: HIGH - authentication, audit trails
- Consideration: Cascade to related records (assignments, scores)

**Contestant** - Contest participants
- Current: No soft delete
- Add: `deletedAt`, `deletedBy`
- Impact: MEDIUM - scores, assignments depend on it
- Strategy: Soft delete with cascade consideration

**Judge** - Contest judges
- Current: No soft delete
- Add: `deletedAt`, `deletedBy`
- Impact: MEDIUM - scores, assignments depend on it
- Strategy: Soft delete with cascade consideration

### Priority 3: Supporting Data (Can Be Recreated)

**Score** - Judge scores
- Current: No soft delete
- Add: `deletedAt`, `deletedBy`
- Impact: MEDIUM - business critical but can be re-entered
- Strategy: Soft delete for audit trail

**Assignment** - Judge/Category assignments
- Current: No soft delete
- Add: `deletedAt`, `deletedBy`
- Impact: LOW - configuration data
- Strategy: Soft delete for history

---

## Schema Changes

### Phase 1: Core Models (Event, Contest, Category)

```prisma
model Event {
  id          String    @id @default(cuid())
  name        String
  // ... existing fields
  archived    Boolean   @default(false)

  // S4-3: Soft delete fields
  deletedAt   DateTime?
  deletedBy   String?   // User ID who deleted

  // ... relations

  @@index([tenantId, archived])
  @@index([tenantId, deletedAt])  // S4-3: Query optimization
  @@map("events")
}

model Contest {
  id          String    @id @default(cuid())
  name        String
  eventId     String
  // ... existing fields
  archived    Boolean   @default(false)

  // S4-3: Soft delete fields
  deletedAt   DateTime?
  deletedBy   String?

  event       Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  // ... relations

  @@index([tenantId, eventId])
  @@index([tenantId, deletedAt])  // S4-3: Query optimization
  @@map("contests")
}

model Category {
  id          String    @id @default(cuid())
  name        String
  contestId   String
  // ... existing fields

  // S4-3: Soft delete fields
  deletedAt   DateTime?
  deletedBy   String?

  contest     Contest   @relation(fields: [contestId], references: [id], onDelete: Cascade)
  // ... relations

  @@index([tenantId, contestId])
  @@index([tenantId, deletedAt])  // S4-3: Query optimization
  @@map("categories")
}
```

### Phase 2: User Models (User, Judge, Contestant)

```prisma
model User {
  id          String    @id @default(cuid())
  email       String    @unique
  // ... existing fields

  // S4-3: Soft delete fields
  deletedAt   DateTime?
  deletedBy   String?   // Self-deletion or admin ID

  // ... relations

  @@index([tenantId, deletedAt])
  @@map("users")
}

model Judge {
  id          String    @id @default(cuid())
  name        String
  // ... existing fields

  // S4-3: Soft delete fields
  deletedAt   DateTime?
  deletedBy   String?

  // ... relations

  @@index([tenantId, deletedAt])
  @@map("judges")
}

model Contestant {
  id          String    @id @default(cuid())
  name        String
  // ... existing fields

  // S4-3: Soft delete fields
  deletedAt   DateTime?
  deletedBy   String?

  // ... relations

  @@index([tenantId, deletedAt])
  @@map("contestants")
}
```

### Phase 3: Supporting Models (Score, Assignment)

```prisma
model Score {
  id          String    @id @default(cuid())
  value       Float
  // ... existing fields

  // S4-3: Soft delete fields
  deletedAt   DateTime?
  deletedBy   String?

  // ... relations

  @@index([tenantId, deletedAt])
  @@map("scores")
}

model Assignment {
  id          String    @id @default(cuid())
  // ... existing fields

  // S4-3: Soft delete fields
  deletedAt   DateTime?
  deletedBy   String?

  // ... relations

  @@index([tenantId, deletedAt])
  @@map("assignments")
}
```

---

## Migration Strategy

### Migration Script

```sql
-- Sprint 4 Epic 3: Add Soft Delete Fields
-- Phase 1: Core Models

-- Events
ALTER TABLE events
  ADD COLUMN deleted_at TIMESTAMP NULL,
  ADD COLUMN deleted_by VARCHAR(255) NULL;

CREATE INDEX idx_events_soft_delete
  ON events(tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Contests
ALTER TABLE contests
  ADD COLUMN deleted_at TIMESTAMP NULL,
  ADD COLUMN deleted_by VARCHAR(255) NULL;

CREATE INDEX idx_contests_soft_delete
  ON contests(tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Categories
ALTER TABLE categories
  ADD COLUMN deleted_at TIMESTAMP NULL,
  ADD COLUMN deleted_by VARCHAR(255) NULL;

CREATE INDEX idx_categories_soft_delete
  ON categories(tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Phase 2: User Models (separate migration)
-- ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL, deleted_by VARCHAR(255) NULL;
-- ALTER TABLE judges ADD COLUMN deleted_at TIMESTAMP NULL, deleted_by VARCHAR(255) NULL;
-- ALTER TABLE contestants ADD COLUMN deleted_at TIMESTAMP NULL, deleted_by VARCHAR(255) NULL;

-- Phase 3: Supporting Models (separate migration)
-- ALTER TABLE scores ADD COLUMN deleted_at TIMESTAMP NULL, deleted_by VARCHAR(255) NULL;
-- ALTER TABLE assignments ADD COLUMN deleted_at TIMESTAMP NULL, deleted_by VARCHAR(255) NULL;
```

### Rollback Strategy

```sql
-- Rollback Phase 1
DROP INDEX IF EXISTS idx_events_soft_delete;
DROP INDEX IF EXISTS idx_contests_soft_delete;
DROP INDEX IF EXISTS idx_categories_soft_delete;

ALTER TABLE events DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE contests DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE categories DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
```

---

## Implementation Approach

### Option A: Prisma Middleware (Recommended)

**Pros:**
- Transparent to application code
- Applies globally to all queries
- Centralized logic

**Cons:**
- Can be complex to debug
- Performance overhead on every query

```typescript
// src/config/softDelete.middleware.ts
import { Prisma } from '@prisma/client';
import { getRequestContext } from '../middleware/correlationId';

const SOFT_DELETE_MODELS = ['Event', 'Contest', 'Category', 'User', 'Judge', 'Contestant', 'Score', 'Assignment'];

export function softDeleteMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    // Only apply to models with soft delete
    if (!SOFT_DELETE_MODELS.includes(params.model || '')) {
      return next(params);
    }

    // Intercept delete operations
    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = {
        deletedAt: new Date(),
        deletedBy: getRequestContext()?.userId || 'system',
      };
    }

    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      params.args.data = {
        deletedAt: new Date(),
        deletedBy: getRequestContext()?.userId || 'system',
      };
    }

    // Auto-filter soft deleted records
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        deletedAt: null,
      };
    }

    if (params.action === 'findMany') {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};

      // Allow explicit includeDeleted option
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null;
      }
    }

    if (params.action === 'count') {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};

      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null;
      }
    }

    return next(params);
  };
}
```

### Option B: Custom Repository Methods

**Pros:**
- Explicit control
- Easy to understand
- No hidden behavior

**Cons:**
- Must remember to use custom methods
- Code duplication
- Easy to forget

```typescript
// src/repositories/BaseRepository.ts
export abstract class BaseRepository<T> {
  protected model: any;

  async softDelete(where: any): Promise<T> {
    const context = getRequestContext();
    return await this.model.update({
      where,
      data: {
        deletedAt: new Date(),
        deletedBy: context?.userId || 'system',
      },
    });
  }

  async restore(where: any): Promise<T> {
    return await this.model.update({
      where,
      data: {
        deletedAt: null,
        deletedBy: null,
      },
    });
  }

  async findManyActive(args: any): Promise<T[]> {
    return await this.model.findMany({
      ...args,
      where: {
        ...args?.where,
        deletedAt: null,
      },
    });
  }

  async findWithDeleted(args: any): Promise<T[]> {
    return await this.model.findMany(args);
  }
}
```

### Option C: Prisma Client Extension (Most Modern)

**Pros:**
- Type-safe
- Composable
- Modern Prisma feature

**Cons:**
- Requires Prisma 4.7+
- Less documentation
- More setup

```typescript
// src/config/softDelete.extension.ts
import { Prisma } from '@prisma/client';
import { getRequestContext } from '../middleware/correlationId';

export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    $allModels: {
      async softDelete<T, A>(
        this: T,
        args: Prisma.Exact<A, Prisma.Args<T, 'update'>>
      ): Promise<Prisma.Result<T, A, 'update'>> {
        const context = Prisma.getExtensionContext(this);
        const context RequestContext = getRequestContext();

        return (context as any).update({
          ...args,
          data: {
            ...(args as any).data,
            deletedAt: new Date(),
            deletedBy: requestContext?.userId || 'system',
          },
        });
      },

      async restore<T, A>(
        this: T,
        args: Prisma.Exact<A, Prisma.Args<T, 'update'>>
      ): Promise<Prisma.Result<T, A, 'update'>> {
        const context = Prisma.getExtensionContext(this);

        return (context as any).update({
          ...args,
          data: {
            ...(args as any).data,
            deletedAt: null,
            deletedBy: null,
          },
        });
      },

      async findManyActive<T, A>(
        this: T,
        args?: Prisma.Exact<A, Prisma.Args<T, 'findMany'>>
      ): Promise<Prisma.Result<T, A, 'findMany'>> {
        const context = Prisma.getExtensionContext(this);

        return (context as any).findMany({
          ...args,
          where: {
            ...(args as any)?.where,
            deletedAt: null,
          },
        });
      },
    },
  },
});

// Usage
const prisma = new PrismaClient().$extends(softDeleteExtension);

// Now you can use:
await prisma.event.softDelete({ where: { id: 'event-1' } });
await prisma.event.restore({ where: { id: 'event-1' } });
await prisma.event.findManyActive({ where: { tenantId: 'tenant-1' } });
```

---

## Recommended Approach

**Hybrid: Middleware + Extension**

1. **Middleware:** Auto-filter deleted records in findMany/findFirst
2. **Extension:** Provide explicit softDelete/restore methods
3. **Best of Both:** Transparent + Explicit control

```typescript
// src/config/database.ts
import { PrismaClient } from '@prisma/client';
import { softDeleteMiddleware } from './softDelete.middleware';
import { softDeleteExtension } from './softDelete.extension';

const prisma = new PrismaClient()
  .$use(softDeleteMiddleware())
  .$extends(softDeleteExtension);

export default prisma;
```

---

## Controller Updates

### Before (Hard Delete)

```typescript
async deleteEvent(req: Request, res: Response) {
  const { id } = req.params;

  await prisma.event.delete({
    where: { id, tenantId: req.tenantId },
  });

  res.status(204).send();
}
```

### After (Soft Delete)

```typescript
async deleteEvent(req: Request, res: Response) {
  const { id } = req.params;

  // S4-3: Use soft delete instead of hard delete
  await prisma.event.softDelete({
    where: { id, tenantId: req.tenantId },
  });

  res.status(204).send();
}

// S4-3: New restore endpoint
async restoreEvent(req: Request, res: Response) {
  const { id } = req.params;

  const event = await prisma.event.restore({
    where: { id, tenantId: req.tenantId },
  });

  res.json({
    success: true,
    data: event,
    message: 'Event restored successfully',
  });
}

// S4-3: Admin endpoint to view deleted items
async listDeletedEvents(req: Request, res: Response) {
  const events = await prisma.event.findMany({
    where: {
      tenantId: req.tenantId,
      deletedAt: { not: null },
    },
    orderBy: { deletedAt: 'desc' },
  });

  res.json({
    success: true,
    data: events,
  });
}
```

---

## Service Layer Updates

### EventService Example

```typescript
export class EventService extends BaseService {
  // S4-3: Soft delete instead of hard delete
  async deleteEvent(id: string, tenantId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id, tenantId },
    });

    if (!event) {
      throw this.notFoundError('Event not found');
    }

    if (event.deletedAt) {
      throw this.badRequestError('Event already deleted');
    }

    await prisma.event.softDelete({
      where: { id, tenantId },
    });

    // S4-3: Emit event for tracking
    await eventBus.publish(AppEventType.EVENT_DELETED, {
      eventId: id,
      tenantId,
      deletedAt: new Date(),
    });
  }

  // S4-3: Restore deleted event
  async restoreEvent(id: string, tenantId: string): Promise<Event> {
    const event = await prisma.event.findUnique({
      where: { id, tenantId },
    });

    if (!event) {
      throw this.notFoundError('Event not found');
    }

    if (!event.deletedAt) {
      throw this.badRequestError('Event is not deleted');
    }

    const restored = await prisma.event.restore({
      where: { id, tenantId },
    });

    // S4-3: Emit event for tracking
    await eventBus.publish(AppEventType.EVENT_RESTORED, {
      eventId: id,
      tenantId,
      restoredAt: new Date(),
    });

    return restored;
  }

  // S4-3: List with optional deleted filter
  async listEvents(
    tenantId: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<Event[]> {
    if (options.includeDeleted) {
      return await prisma.event.findMany({
        where: { tenantId },
      });
    }

    // Middleware auto-filters deleted, but explicit is better
    return await prisma.event.findManyActive({
      where: { tenantId },
    });
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Soft Delete', () => {
  it('should soft delete event', async () => {
    const event = await prisma.event.create({
      data: { name: 'Test Event', tenantId: 'test' },
    });

    await prisma.event.softDelete({
      where: { id: event.id },
    });

    const deleted = await prisma.event.findUnique({
      where: { id: event.id },
    });

    expect(deleted).toBeNull(); // Filtered by middleware
  });

  it('should restore deleted event', async () => {
    const event = await prisma.event.create({
      data: { name: 'Test Event', tenantId: 'test' },
    });

    await prisma.event.softDelete({
      where: { id: event.id },
    });

    await prisma.event.restore({
      where: { id: event.id },
    });

    const restored = await prisma.event.findUnique({
      where: { id: event.id },
    });

    expect(restored).not.toBeNull();
    expect(restored?.deletedAt).toBeNull();
  });

  it('should not return deleted records in findMany', async () => {
    await prisma.event.create({
      data: { name: 'Active Event', tenantId: 'test' },
    });

    const deleted = await prisma.event.create({
      data: { name: 'Deleted Event', tenantId: 'test' },
    });

    await prisma.event.softDelete({
      where: { id: deleted.id },
    });

    const events = await prisma.event.findMany({
      where: { tenantId: 'test' },
    });

    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('Active Event');
  });
});
```

---

## Cascade Behavior

### Problem: Related Records

When an Event is soft deleted, what happens to:
- Contests?
- Categories?
- Scores?
- Assignments?

### Option 1: Cascade Soft Delete (Recommended)

```typescript
async softDeleteEvent(id: string, tenantId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Soft delete event
    await tx.event.softDelete({
      where: { id, tenantId },
    });

    // Cascade to contests
    const contests = await tx.contest.findMany({
      where: { eventId: id, deletedAt: null },
    });

    for (const contest of contests) {
      await tx.contest.softDelete({
        where: { id: contest.id },
      });

      // Cascade to categories
      await tx.category.updateMany({
        where: { contestId: contest.id, deletedAt: null },
        data: {
          deletedAt: new Date(),
          deletedBy: getRequestContext()?.userId,
        },
      });
    }
  });
}
```

### Option 2: Mark as Orphaned

```typescript
// Keep related records but mark parent as deleted
// UI shows "Parent event deleted" instead of hiding
```

### Option 3: Block Deletion

```typescript
// Prevent deletion if related records exist
if (await hasRelatedRecords(eventId)) {
  throw new Error('Cannot delete event with related records');
}
```

---

## Admin UI Considerations

### Deleted Items View

```typescript
// New admin route
GET /api/admin/events/deleted
GET /api/admin/contests/deleted
GET /api/admin/categories/deleted

// Response
{
  "success": true,
  "data": [
    {
      "id": "event-1",
      "name": "Deleted Event",
      "deletedAt": "2025-11-25T10:00:00.000Z",
      "deletedBy": "user-123",
      "deletedByUser": {
        "name": "John Admin",
        "email": "john@example.com"
      }
    }
  ]
}
```

### Restore Action

```typescript
POST /api/admin/events/:id/restore

// Response
{
  "success": true,
  "message": "Event restored successfully",
  "data": {
    "id": "event-1",
    "name": "Restored Event",
    "deletedAt": null,
    "deletedBy": null
  }
}
```

---

## Performance Considerations

### Index Strategy

```sql
-- Partial index (only non-deleted records)
CREATE INDEX idx_events_active
  ON events(tenant_id, created_at)
  WHERE deleted_at IS NULL;

-- Full index (for admin views showing deleted)
CREATE INDEX idx_events_deleted_at
  ON events(tenant_id, deleted_at);
```

### Query Performance

**Before:** `WHERE tenant_id = ?`
**After:** `WHERE tenant_id = ? AND deleted_at IS NULL`

**Impact:** +1 condition per query, negligible with proper indexes

---

## Rollout Strategy

### Phase 1: Core Models (Week 1)
- Add fields to Event, Contest, Category
- Deploy middleware
- Test extensively
- Monitor for issues

### Phase 2: User Models (Week 2)
- Add fields to User, Judge, Contestant
- Update authentication logic
- Test user deletion/restoration

### Phase 3: Supporting Models (Week 3)
- Add fields to Score, Assignment
- Complete coverage
- Performance optimization

---

## Success Criteria

- ✅ Schema changes applied without data loss
- ✅ All delete operations use soft delete
- ✅ Middleware auto-filters deleted records
- ✅ Restore functionality works
- ✅ Admin UI shows deleted items
- ✅ Cascade behavior documented and tested
- ✅ Performance impact < 5%
- ✅ Zero breaking changes to existing APIs

---

## Risk Assessment

**Implementation Risk:** MEDIUM
- Requires careful testing
- Potential for data inconsistency if not handled correctly
- Cascade behavior needs thorough testing

**Performance Risk:** LOW
- Indexes minimize impact
- Additional WHERE clause negligible

**Operational Risk:** LOW
- Reversible (can rollback migration)
- Transparent to existing code (middleware handles it)
- Improves data safety

---

## Future Enhancements

1. **Auto-Purge:** Permanently delete records after N days
2. **Bulk Operations:** Soft delete multiple records at once
3. **Audit Log:** Track all soft delete/restore operations
4. **User Notifications:** Alert users when their data is deleted
5. **Advanced Filters:** Search/sort by deletion date, deleted by user

---

**Status:** ✅ Design complete, ready for implementation
**Next Step:** Decide on implementation approach and create migration
**Reference:** Sprint 4 Epic 3 Task 3.1
**Estimated Implementation Time:** 3-4 days for full rollout
