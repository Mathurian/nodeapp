# Implementation Plan: Permissions System Fixes & Dynamic CRUD Permissions

**Created**: 2026-01-04
**Status**: PENDING APPROVAL
**Total Timeline**: 8-10 weeks
**Team Size**: 2-3 developers
**Risk Level**: Medium

---

## Executive Summary

This plan addresses **five critical gaps** identified in the permissions audit ([PERMISSIONS_AUDIT_REPORT.md](PERMISSIONS_AUDIT_REPORT.md)) and implements a database-driven dynamic permissions system. Implementation is organized into **4 phased releases** prioritizing critical security fixes first.

### Critical Issues to Fix
1. ❌ **Score Locking Not Enforced** - Judges can edit after certification
2. ❌ **No Board Final Approval** - Stage 4 missing from certification workflow
3. ❌ **No Winners Visibility Control** - Results immediately visible to all
4. ⚠️ **Contestant Score Visibility Incomplete** - Implementation commented out
5. 📋 **Dynamic CRUD Permissions** - Feature request for GUI-driven permissions

---

## PHASE 1: Critical Security Fixes (Weeks 1-2)
**Priority**: 🔴 CRITICAL | **Effort**: 48-60 hours | **Risk**: High if not fixed

### 1.1 Enforce Score Lock & Certification Checks
**Issue**: `updateScore()` and `deleteScore()` don't check `isLocked` or `isCertified` fields

**Files to Modify**:
- `/src/services/ScoringService.ts` (lines 360-420, 425-443)

**Implementation**:
```typescript
// Add to ScoringService.ts updateScore() method
async updateScore(scoreId: string, data: UpdateScoreDTO, _tenantId: string) {
  const existingScore = await this.scoreRepository.findById(scoreId);
  this.assertExists(existingScore, 'Score', scoreId);

  // ✅ CRITICAL FIX: Add lock/certification checks
  if (existingScore.isLocked) {
    throw new ForbiddenError('Cannot modify locked score');
  }

  if (existingScore.isCertified) {
    throw new ForbiddenError('Cannot modify certified score');
  }

  // Continue with update...
}
```

**Testing Requirements**:
- ✅ Unit test: Attempt to update locked score (expect 403)
- ✅ Unit test: Attempt to update certified score (expect 403)
- ✅ Unit test: Attempt to delete locked score (expect 403)
- ✅ Integration test: Full certification workflow prevents edits
- ✅ Load test: Concurrent updates on certified scores

**Rollback Plan**: Revert service changes, controller checks remain as fallback

**Effort**: 12-16 hours (4h dev, 8h test, 2h docs)

---

### 1.2 Implement Board Final Approval Workflow (Stage 4)
**Issue**: No Board certification workflow, Stage 4 completely missing

**New Files to Create**:
- `/src/services/BoardCertificationService.ts`
- `/src/controllers/boardCertificationController.ts`
- `/src/routes/boardCertificationRoutes.ts`

**Files to Modify**:
- `/src/services/BoardService.ts` (add certification methods)

**Implementation**:

**BoardCertificationService.ts**:
```typescript
export class BoardCertificationService extends BaseService {
  async getBoardCertificationStatus(categoryId: string, tenantId: string) {
    // Check all auditors have signed
    const auditorCerts = await this.prisma.categoryCertification.findMany({
      where: { categoryId, role: 'AUDITOR', tenantId }
    });

    const auditorAssignments = await this.prisma.auditorAssignment.findMany({
      where: { categoryId, status: 'ACTIVE', tenantId }
    });

    return {
      canCertify: auditorCerts.length >= auditorAssignments.length,
      requiredAuditors: auditorAssignments.length,
      completedAuditors: auditorCerts.length
    };
  }

  async submitBoardCertification(
    categoryId: string,
    userId: string,
    userRole: string,
    tenantId: string
  ) {
    // Validate role
    if (!['BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      throw new ForbiddenError('Only Board+ can certify');
    }

    // Check readiness
    const status = await this.getBoardCertificationStatus(categoryId, tenantId);
    if (!status.canCertify) {
      throw new ValidationError('Not all auditors have signed');
    }

    // Create certification
    return await this.prisma.categoryCertification.create({
      data: {
        categoryId,
        role: 'BOARD',
        userId,
        tenantId
      }
    });
  }
}
```

**API Endpoints**:
- `GET /api/board/certifications/:categoryId/status`
- `POST /api/board/certifications/:categoryId/certify`

**Testing**:
- ✅ Cannot certify without all auditors
- ✅ Board certification creates immutable lock
- ✅ Full workflow Stage 1→2→3→4
- ✅ UI integration test

**Effort**: 20-24 hours (8h dev, 10h test, 6h UI)

---

### 1.3 Implement Winners Publication Control
**Issue**: Winners immediately visible to all users with access

**Database Migration**:
```sql
-- Migration: add_winners_publication.sql
ALTER TABLE contests
  ADD COLUMN winners_published BOOLEAN DEFAULT false,
  ADD COLUMN published_at TIMESTAMPTZ,
  ADD COLUMN published_by VARCHAR(255);

ALTER TABLE categories
  ADD COLUMN winners_published BOOLEAN DEFAULT false,
  ADD COLUMN published_at TIMESTAMPTZ,
  ADD COLUMN published_by VARCHAR(255);

CREATE INDEX idx_contests_winners_published ON contests(winners_published);
CREATE INDEX idx_categories_winners_published ON categories(winners_published);
```

**Schema Update** (`prisma/schema.prisma`):
```prisma
model Contest {
  // ... existing fields
  winnersPublished  Boolean   @default(false)
  publishedAt       DateTime?
  publishedBy       String?
}

model Category {
  // ... existing fields
  winnersPublished  Boolean   @default(false)
  publishedAt       DateTime?
  publishedBy       String?
}
```

**New Files**:
- `/src/services/WinnerPublicationService.ts`
- `/src/controllers/winnerPublicationController.ts`

**Files to Modify**:
- `/src/services/WinnerService.ts` (add visibility checks)

**Implementation**:
```typescript
export class WinnerPublicationService extends BaseService {
  async canPublishWinners(contestId: string, tenantId: string) {
    const categories = await this.prisma.category.findMany({
      where: { contestId, tenantId },
      include: {
        categoryCertifications: { where: { role: 'BOARD' } }
      }
    });

    return {
      canPublish: categories.every(c => c.categoryCertifications.length > 0),
      totalCategories: categories.length,
      approvedCategories: categories.filter(c => c.categoryCertifications.length > 0).length
    };
  }

  async publishWinners(contestId: string, userId: string, userRole: string, tenantId: string) {
    if (!['BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      throw new ForbiddenError('Only Board+ can publish');
    }

    const status = await this.canPublishWinners(contestId, tenantId);
    if (!status.canPublish) {
      throw new ValidationError('Not all categories have Board approval');
    }

    return await this.prisma.contest.update({
      where: { id: contestId },
      data: {
        winnersPublished: true,
        publishedAt: new Date(),
        publishedBy: userId
      }
    });
  }
}

// Update WinnerService.ts
async getWinnersByContest(contestId: string, userRole: string) {
  const contest = await this.prisma.contest.findUnique({
    where: { id: contestId }
  });

  const canViewUnpublished = ['BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);

  if (!contest.winnersPublished && !canViewUnpublished) {
    throw new ForbiddenError('Winners not yet published');
  }

  // Continue...
}
```

**Testing**:
- ✅ Unpublished winners only visible to Board+
- ✅ Cannot publish without all Board certifications
- ✅ Publication event logged
- ✅ Unpublish feature works

**Migration Strategy**:
1. Run during low-traffic window
2. Default all existing contests to `winnersPublished = false`
3. Board must manually publish

**Rollback**:
1. Down migration removes columns
2. Revert service changes
3. Default: All winners visible (current behavior)

**Effort**: 16-20 hours (6h dev, 8h test, 6h UI)

---

## PHASE 2: High-Priority Features (Weeks 3-4)
**Priority**: 🟡 HIGH | **Effort**: 50-60 hours

### 2.1 Complete Contestant Score Visibility Enforcement
**Issue**: Fields exist but implementation commented out

**Files to Modify**:
- `/src/services/RestrictionService.ts` (uncomment lines 83-84, 93-94)
- `/src/controllers/scoringController.ts` (add filtering)

**New Files**:
- `/src/services/ContestantScoreFilterService.ts`

**Implementation**:

**1. Uncomment RestrictionService.ts**:
```typescript
// Line 80 - BEFORE:
data: {
  // contestantViewRestricted: dto.restricted,
  // contestantViewReleaseDate: dto.releaseDate || null
}

// Line 80 - AFTER:
data: {
  contestantViewRestricted: dto.restricted,
  contestantViewReleaseDate: dto.releaseDate || null
}
```

**2. Create ContestantScoreFilterService.ts**:
```typescript
export class ContestantScoreFilterService extends BaseService {
  async canContestantViewScores(
    contestId: string,
    contestantId: string,
    userId: string,
    userRole: string,
    tenantId: string
  ): Promise<{ canView: boolean; reason?: string }> {
    // Admin+ can always view
    if (['ADMIN', 'ORGANIZER', 'BOARD', 'SUPER_ADMIN'].includes(userRole)) {
      return { canView: true };
    }

    // Get contest restrictions
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: { event: true }
    });

    // Check event-level restriction
    if (contest.event.contestantViewRestricted) {
      if (!contest.event.contestantViewReleaseDate ||
          new Date() < contest.event.contestantViewReleaseDate) {
        return { canView: false, reason: 'Event scores are restricted' };
      }
    }

    // Check contest-level restriction
    if (contest.contestantViewRestricted) {
      if (!contest.contestantViewReleaseDate ||
          new Date() < contest.contestantViewReleaseDate) {
        return { canView: false, reason: 'Contest scores are restricted' };
      }
    }

    // Verify user owns this contestant
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { contestantId: true }
    });

    if (user.contestantId !== contestantId) {
      return { canView: false, reason: 'Can only view your own scores' };
    }

    return { canView: true };
  }

  async filterScoresForContestant(
    scores: Score[],
    contestantId: string,
    userRole: string
  ): Promise<Score[]> {
    // Admin+ see all
    if (['ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE', 'TALLY_MASTER', 'AUDITOR'].includes(userRole)) {
      return scores;
    }

    // Contestants only see own
    return scores.filter(s => s.contestantId === contestantId);
  }
}
```

**3. Update ScoringController.ts**:
```typescript
getScores = async (req: Request, res: Response) => {
  const categoryId = req.params['categoryId'];
  const contestantId = req.query['contestantId'] as string;
  const userRole = req.user?.role;
  const userId = req.user?.id;

  let scores = await this.scoringService.getScoresByCategory(categoryId, tenantId);

  // Apply contestant filtering
  if (userRole === 'CONTESTANT' && contestantId) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { contestId: true }
    });

    const filterService = container.resolve(ContestantScoreFilterService);
    const canView = await filterService.canContestantViewScores(
      category.contestId, contestantId, userId, userRole, tenantId
    );

    if (!canView.canView) {
      return sendError(res, canView.reason || 'Access denied', 403);
    }

    scores = await filterService.filterScoresForContestant(scores, contestantId, userRole);
  }

  sendSuccess(res, scores);
};
```

**Testing**:
- ✅ Contestants cannot view others' scores
- ✅ Restrictions enforced at API level
- ✅ Release dates work correctly
- ✅ Admin+ bypass restrictions
- ✅ Performance <100ms for filtered queries

**Effort**: 24-28 hours (10h dev, 12h test, 6h UI)

---

### 2.2 Add Permission Audit Trail
**Issue**: No tracking of permission changes

**New Files**:
- `/src/services/PermissionAuditService.ts`

**Implementation**:
```typescript
export class PermissionAuditService extends BaseService {
  async logPermissionChange(
    resource: string,
    operation: string,
    granted: boolean,
    role: string,
    changedBy: string,
    reason: string,
    tenantId: string
  ) {
    await this.prisma.activityLog.create({
      data: {
        action: `permission.${granted ? 'granted' : 'revoked'}`,
        resourceType: 'Permission',
        resourceId: `${resource}:${operation}`,
        userId: changedBy,
        logLevel: 'INFO',
        details: {
          resource,
          operation,
          granted,
          role,
          reason
        },
        tenantId
      }
    });
  }

  async getPermissionHistory(
    role?: string,
    resource?: string,
    limit: number = 100
  ) {
    return await this.prisma.activityLog.findMany({
      where: {
        action: { startsWith: 'permission.' },
        ...(role && { 'details.role': role }),
        ...(resource && { 'details.resource': resource })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
```

**Integration**: Update all permission-changing operations to log changes

**Effort**: 8-10 hours

---

## PHASE 3: Medium Priority (Weeks 5-6)
**Priority**: 🟢 MEDIUM | **Effort**: 40-50 hours

### 3.1 Enhance Certification UI/UX

**New Pages**:
1. **Certification Dashboard** (`/frontend/src/pages/CertificationDashboardPage.tsx`)
   - Visual workflow tracker (Stage 1→2→3→4)
   - Real-time status per category
   - Pending approvals list
   - Progress indicators

2. **Board Certification Page** (`/frontend/src/pages/BoardCertificationPage.tsx`)
   - Category-by-category approval
   - Bulk approval for qualified categories
   - Rejection with reason tracking
   - Digital signature capture

**Components**:
- `<CertificationWorkflowTracker />` - Visual stage indicator
- `<PendingCertificationsList />` - Action items
- `<CertificationHistoryTimeline />` - Audit trail

**Effort**: 30-40 hours (20h dev, 10h test, 10h UX)

---

## PHASE 4: Dynamic CRUD Permissions System (Weeks 7-8)
**Priority**: 📋 FEATURE REQUEST | **Effort**: 60-70 hours | **Risk**: Medium

### 4.1 Database Schema for Dynamic Permissions

**Migration** (`migrations/add_dynamic_permissions.sql`):
```sql
CREATE TABLE role_permissions (
  id VARCHAR(255) PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  operation VARCHAR(50) NOT NULL,
  allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  tenant_id VARCHAR(255) NOT NULL,

  CONSTRAINT uq_role_permission UNIQUE (tenant_id, role, resource, operation)
);

CREATE INDEX idx_role_permissions_tenant_role ON role_permissions(tenant_id, role);
CREATE INDEX idx_role_permissions_resource ON role_permissions(resource);

CREATE TABLE permission_audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  operation VARCHAR(50) NOT NULL,
  previous_val BOOLEAN,
  new_val BOOLEAN NOT NULL,
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  tenant_id VARCHAR(255) NOT NULL
);

CREATE INDEX idx_permission_audit_tenant_time ON permission_audit_logs(tenant_id, changed_at DESC);
```

**Prisma Schema**:
```prisma
model RolePermission {
  id         String   @id @default(cuid())
  role       UserRole
  resource   String
  operation  String
  allowed    Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  createdBy  String
  tenantId   String

  @@unique([tenantId, role, resource, operation])
  @@index([tenantId, role])
  @@map("role_permissions")
}

model PermissionAuditLog {
  id          String   @id @default(cuid())
  role        UserRole
  resource    String
  operation   String
  previousVal Boolean?
  newVal      Boolean
  changedBy   String
  changedAt   DateTime @default(now())
  reason      String?
  tenantId    String

  @@index([tenantId, changedAt])
  @@map("permission_audit_logs")
}
```

**Effort**: 8 hours

---

### 4.2 Dynamic Permission Service

**New File**: `/src/services/DynamicPermissionService.ts`

```typescript
@injectable()
export class DynamicPermissionService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('CacheService') private cacheService: CacheService
  ) {
    super();
  }

  /**
   * Get permissions for a role (with caching)
   */
  async getPermissions(role: UserRole, tenantId: string): Promise<string[]> {
    const cacheKey = `permissions:${tenantId}:${role}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Load from database
    const perms = await this.prisma.rolePermission.findMany({
      where: { role, tenantId, allowed: true }
    });

    const permissions = perms.map(p =>
      p.operation === '*' ? `${p.resource}:*` : `${p.resource}:${p.operation}`
    );

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, JSON.stringify(permissions), 300);

    return permissions;
  }

  /**
   * Update permission with validation
   */
  async updatePermission(
    role: UserRole,
    resource: string,
    operation: string,
    allowed: boolean,
    userId: string,
    userRole: UserRole,
    tenantId: string,
    reason?: string
  ) {
    // SECURITY: Only SUPER_ADMIN/ADMIN/ORGANIZER can modify
    if (!['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'].includes(userRole)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    // SECURITY: Cannot remove own admin permissions
    if (role === userRole && !allowed && (resource === '*' || resource === 'users')) {
      throw new ForbiddenError('Cannot remove your own admin permissions');
    }

    // SECURITY: Cannot grant SUPER_ADMIN unless you are one
    if (allowed && role === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Cannot grant SUPER_ADMIN permissions');
    }

    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        tenantId_role_resource_operation: { tenantId, role, resource, operation }
      }
    });

    await this.prisma.$transaction([
      // Upsert permission
      this.prisma.rolePermission.upsert({
        where: {
          tenantId_role_resource_operation: { tenantId, role, resource, operation }
        },
        create: { role, resource, operation, allowed, tenantId, createdBy: userId },
        update: { allowed, updatedAt: new Date() }
      }),

      // Audit log
      this.prisma.permissionAuditLog.create({
        data: {
          role,
          resource,
          operation,
          previousVal: existing?.allowed,
          newVal: allowed,
          changedBy: userId,
          tenantId,
          reason
        }
      })
    ]);

    // Invalidate cache
    await this.cacheService.del(`permissions:${tenantId}:${role}`);
  }

  /**
   * Migrate hardcoded permissions to database
   */
  async migrateHardcodedPermissions(tenantId: string) {
    const hardcoded = PERMISSIONS; // From permissions.ts

    for (const [role, perms] of Object.entries(hardcoded)) {
      for (const perm of perms) {
        const [resource, operation] = perm.split(':');

        await this.prisma.rolePermission.upsert({
          where: {
            tenantId_role_resource_operation: {
              tenantId,
              role: role as UserRole,
              resource: resource || '*',
              operation: operation || '*'
            }
          },
          create: {
            role: role as UserRole,
            resource: resource || '*',
            operation: operation || '*',
            allowed: true,
            tenantId,
            createdBy: 'system'
          },
          update: {}
        });
      }
    }
  }
}
```

**Effort**: 20-24 hours

---

### 4.3 Update Middleware for Dynamic Permissions

**File to Modify**: `/src/middleware/permissions.ts`

```typescript
import { container } from 'tsyringe';
import { DynamicPermissionService } from '../services/DynamicPermissionService';

const dynamicPermissionService = container.resolve(DynamicPermissionService);

export const requirePermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { role, tenantId } = req.user;

    // Load dynamic permissions (with caching)
    const permissions = await dynamicPermissionService.getPermissions(role, tenantId);

    // Check permission
    const hasAccess = checkPermission(permissions, requiredPermission);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

function checkPermission(userPermissions: string[], required: string): boolean {
  // Wildcard check
  if (userPermissions.includes('*')) return true;

  // Exact match
  if (userPermissions.includes(required)) return true;

  // Resource wildcard (e.g., "events:*" matches "events:create")
  const [resource, operation] = required.split(':');
  if (userPermissions.includes(`${resource}:*`)) return true;

  return false;
}
```

**Effort**: 12-16 hours (8h dev, 4h test)

---

### 4.4 Permission Management UI

**New Page**: `/frontend/src/pages/PermissionsManagementPage.tsx`

**Features**:

1. **Permission Matrix Table**
   - Rows: Resources (events, contests, scores, users, etc.)
   - Columns: Operations (create, read, update, delete, *)
   - Cells: Toggle switches for each permission
   - Color coding:
     - 🟢 Green = Allowed
     - 🔴 Red = Denied
     - ⚪ Gray = Inherited from wildcard

2. **Role Selector**
   - Dropdown to select role
   - Quick filters: "Admin Roles", "Working Roles", "Viewers"
   - Role comparison mode (side-by-side)

3. **Bulk Operations**
   - "Grant All" / "Revoke All" for entire resource
   - "Clone from Role" template
   - Permission presets (e.g., "Read-Only Template")

4. **Audit Log Viewer**
   - Recent permission changes
   - Filter by role/resource/user/date
   - Rollback functionality (with confirmation)

5. **Safety Features**
   - Confirmation dialog for dangerous changes
   - "Preview Impact" before saving
   - Warning badges for self-permission changes
   - "Undo Last Change" button (5 min window)

**Component Structure**:
```tsx
<PermissionsManagementPage>
  <RoleSelector onChange={setSelectedRole} />

  <PermissionMatrix
    role={selectedRole}
    onToggle={handlePermissionToggle}
    pendingChanges={pendingChanges}
  />

  <BulkOperationsToolbar
    onGrantAll={handleGrantAll}
    onRevokeAll={handleRevokeAll}
    onClone={handleCloneRole}
  />

  <PermissionAuditLog
    filter={{ role: selectedRole }}
    onRollback={handleRollback}
  />
</PermissionsManagementPage>
```

**API Endpoints Needed**:
- `GET /api/permissions/roles/:role`
- `PUT /api/permissions/roles/:role`
- `POST /api/permissions/bulk-update`
- `GET /api/permissions/audit-log`
- `POST /api/permissions/rollback/:logId`

**Effort**: 30-40 hours (16h UI, 12h API, 12h test)

---

### 4.5 Permission Caching Strategy

**New File**: `/src/services/PermissionCacheService.ts`

```typescript
export class PermissionCacheService {
  private TTL = 300; // 5 minutes

  constructor(
    @inject('CacheService') private cacheService: CacheService,
    @inject('DynamicPermissionService') private dynamicPermissionService: DynamicPermissionService
  ) {}

  /**
   * Warm cache for all roles (on startup)
   */
  async warmCache(tenantId: string) {
    const roles = Object.keys(PERMISSIONS) as UserRole[];

    for (const role of roles) {
      const perms = await this.dynamicPermissionService.getPermissions(role, tenantId);
      await this.cacheService.set(
        `permissions:${tenantId}:${role}`,
        JSON.stringify(perms),
        this.TTL
      );
    }
  }

  /**
   * Invalidate all permission caches for tenant
   */
  async invalidateAll(tenantId: string) {
    await this.cacheService.invalidatePattern(`permissions:${tenantId}:*`);
  }

  /**
   * Get cache statistics
   */
  async getStats(tenantId: string) {
    const roles = Object.keys(PERMISSIONS) as UserRole[];
    let hits = 0;

    for (const role of roles) {
      const exists = await this.cacheService.exists(`permissions:${tenantId}:${role}`);
      if (exists) hits++;
    }

    return {
      total: roles.length,
      cached: hits,
      hitRate: (hits / roles.length) * 100
    };
  }
}
```

**Redis Configuration**:
- TTL: 5 minutes (300 seconds)
- Invalidation: On any permission change
- Warm-up: On server startup
- Monitoring: Track hit rate (target >95%)

**Effort**: 8-10 hours

---

## Testing Strategy

### Unit Tests (Total: ~120 tests)

**Phase 1** (40 tests):
- Lock enforcement (10 tests)
  - Update locked score → 403
  - Delete locked score → 403
  - Update certified score → 403
  - Delete certified score → 403
  - Concurrent update attempts

- Board certification (15 tests)
  - Status check with/without auditors
  - Certification validation
  - Permission checks
  - Workflow progression

- Winners publication (15 tests)
  - Visibility checks by role
  - Publication validation
  - Unpublication
  - Audit logging

**Phase 2** (30 tests):
- Contestant filtering (15 tests)
  - Restriction enforcement
  - Release date logic
  - Own scores only
  - Admin bypass

- Audit logging (15 tests)
  - Log creation
  - History retrieval
  - Filtering

**Phase 4** (50 tests):
- Dynamic permissions CRUD (20 tests)
  - Create/read/update/delete
  - Validation rules
  - Security checks

- Permission checking (15 tests)
  - Exact match
  - Wildcard matching
  - Fallback logic

- Caching (15 tests)
  - Cache hit/miss
  - Invalidation
  - Warm-up

### Integration Tests (Per Phase)
- Phase 1: End-to-end certification workflow (Stage 1→4)
- Phase 2: Contestant score visibility across API
- Phase 4: Permission changes reflected in API

### Load Tests
- 1000 concurrent permission checks (target: <5ms p99)
- Cache performance under load (target: >95% hit rate)
- Database query optimization

### Security Tests
- Attempt to modify locked scores
- Bypass permission checks
- Privilege escalation attempts
- SQL injection in permission queries
- Self-permission removal protection

---

## Migration Strategy

### Phase 1: Critical Fixes
- **Schema Changes**: None
- **Deployment**: Service updates only
- **Downtime**: Zero
- **Rollback**: Revert service code

### Phase 2: Winners Publication
- **Schema Changes**: Add columns to Contest/Category
- **Migration Window**: Low-traffic (2-4 AM)
- **Backfill**: Set `winnersPublished = false` for all existing
- **Validation**: Verify column added to all tables
- **Rollback**: Down migration removes columns

### Phase 4: Dynamic Permissions

**Migration Phases**:

1. **Week 1: Dual-Mode Setup**
   - Deploy new tables
   - Migrate hardcoded → database (per tenant)
   - Feature flag: `ENABLE_DYNAMIC_PERMISSIONS=false`
   - Monitor database performance

2. **Week 2: Gradual Rollout**
   - Enable for 10% of tenants
   - Compare hardcoded vs dynamic (should match 100%)
   - Monitor cache hit rate
   - Alert on mismatches

3. **Week 3: Full Cutover**
   - Enable for all tenants
   - Remove hardcoded fallback
   - Database becomes source of truth

**Migration Script**:
```bash
# Migrate single tenant
npm run migrate:permissions -- --tenant=<tenantId>

# Migrate all tenants
npm run migrate:permissions -- --all

# Validate migration
npm run validate:permissions -- --tenant=<tenantId>
```

**Validation Script**:
```typescript
// Compare hardcoded vs dynamic
async function validateMigration(tenantId: string) {
  const roles = Object.keys(PERMISSIONS) as UserRole[];
  const mismatches = [];

  for (const role of roles) {
    const hardcoded = PERMISSIONS[role];
    const dynamic = await dynamicPermissionService.getPermissions(role, tenantId);

    const diff = hardcoded.filter(p => !dynamic.includes(p));
    if (diff.length > 0) {
      mismatches.push({ role, missing: diff });
    }
  }

  if (mismatches.length > 0) {
    console.error('Migration validation failed:', mismatches);
    return false;
  }

  console.log('✅ Migration validated successfully');
  return true;
}
```

---

## Rollback Procedures

### Phase 1: Score Locking
**Rollback Time**: 5 minutes
1. Revert `ScoringService.ts` changes
2. Controller checks remain as fallback
3. No data loss
4. Risk: Low

### Phase 2: Winners Publication
**Rollback Time**: 15 minutes
1. Run down migration (removes columns)
2. Revert service/controller changes
3. Winners visible to all (original behavior)
4. Risk: Medium (published state lost if rollback)

### Phase 4: Dynamic Permissions
**Rollback Time**: 5 minutes
1. Set feature flag: `ENABLE_DYNAMIC_PERMISSIONS=false`
2. System falls back to hardcoded permissions
3. Database tables remain (can re-migrate)
4. Risk: Medium (manual permission changes lost)

**Emergency Rollback** (if critical issue):
```bash
# Disable dynamic permissions immediately
npm run feature-flag:disable dynamic-permissions

# Verify fallback working
npm run test:permissions:hardcoded
```

---

## Monitoring & Validation

### Key Metrics

**Security Metrics**:
- `security.locked_score_modification_attempts` (alert if >0)
- `security.permission_denials_rate` (baseline + 20% alert)
- `security.failed_auth_events` (spike detection)

**Performance Metrics**:
- `permissions.check_latency_ms` (p50, p95, p99 - target <5ms)
- `permissions.cache_hit_rate` (target >95%)
- `permissions.db_query_time_ms` (target <50ms)

**Business Metrics**:
- `certification.stage1_completion_rate`
- `certification.stage2_completion_rate`
- `certification.stage3_completion_rate`
- `certification.stage4_completion_rate`
- `certification.avg_time_stage1_to_4` (hours)
- `winners.publication_lag_hours` (from final cert to publish)

### Alerts

**Critical** (PagerDuty):
- ANY locked score modification attempt
- Permission cache hit rate < 80%
- Permission check latency > 100ms (p99)

**Warning** (Slack):
- Cache hit rate < 90%
- Certification workflow stalled > 24h
- Failed board certification attempts > 5/hour

**Info** (Email daily digest):
- Permission changes summary
- Certification completion stats
- Winners publication activity

### Dashboards

**1. Security Dashboard**
- Real-time permission denial graph
- Lock enforcement violations (should be 0)
- Failed authentication attempts
- Permission audit log stream

**2. Certification Dashboard**
- Workflow funnel (Stage 1→4 conversion rates)
- Average time per stage
- Pending certifications by role
- Bottleneck identification

**3. Performance Dashboard**
- Permission check latency histogram
- Cache hit/miss rates
- Database query performance
- API response times

**4. Business Dashboard**
- Winners publication timeline
- Certification completion trends
- User activity by role
- System health score

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| Lock enforcement breaks workflow | Medium | High | Extensive testing, staged rollout | Backend Lead |
| Dynamic permissions slow API | Low | Medium | Aggressive caching, load testing | DevOps |
| Migration data loss | Low | Critical | Backup before migration, validation scripts | DBA |
| Permission escalation vuln | Low | Critical | Security audit, pen testing | Security |
| Cache invalidation race | Medium | Medium | Distributed lock, isolation | Backend |
| Board members unavailable | Medium | Low | Automated reminders, delegation | Product |

---

## Success Criteria

### Phase 1 ✅
- [ ] Zero locked/certified scores modified in production (30 days)
- [ ] All categories require Board approval before winners visible
- [ ] 100% audit trail coverage for certification events
- [ ] <1% false positive rate on lock enforcement

### Phase 2 ✅
- [ ] Contestants cannot view others' scores (0 violations)
- [ ] Release dates enforce correctly (verified via E2E tests)
- [ ] Performance <100ms for filtered score queries (p95)
- [ ] Admin bypass works without delays

### Phase 4 ✅
- [ ] Permission changes take effect within 5 minutes
- [ ] Cache hit rate >95% (7-day average)
- [ ] Zero unauthorized permission grants (audit verified)
- [ ] UI permission matrix loads <2 seconds (p95)
- [ ] Rollback completes in <5 minutes without data loss
- [ ] Migration validation 100% match hardcoded→dynamic

---

## Dependencies & Prerequisites

### External Dependencies
- ✅ Redis (for caching) - Currently in use
- ✅ PostgreSQL 14+ (for JSONB) - Currently v14.5
- ✅ Node 18+ (for async/await) - Currently v18.17

### Code Prerequisites
- ✅ Certification workflow exists (Stages 1-3)
- ✅ Permission middleware functional
- ✅ Multi-tenant isolation working
- ⚠️ Board role exists but no certification logic

### Infrastructure
- Redis cache configured (elasticache or local)
- Database backup strategy in place
- Feature flag system (environment variables)
- Monitoring tools (Prometheus/Grafana)

---

## Team Structure & Ownership

### Recommended Team

| Role | Allocation | Responsibilities |
|------|-----------|------------------|
| **Tech Lead** | 50% (20h/week) | Architecture decisions, code review, Phase 4 design |
| **Backend Dev 1** | 100% (40h/week) | Phase 1 implementation, testing, Phase 4 service layer |
| **Backend Dev 2** | 100% (40h/week) | Phase 2 implementation, migration scripts |
| **Frontend Dev** | 60% (24h/week) | UI for Phase 2 & 4, component library |
| **QA Engineer** | 40% (16h/week) | Test strategy, automation, security testing |
| **DevOps** | 20% (8h/week) | Deployment, monitoring, rollback procedures |

### Ownership Matrix

| Phase | Owner | Backup | Reviewer |
|-------|-------|--------|----------|
| Phase 1.1 | Backend Dev 1 | Backend Dev 2 | Tech Lead |
| Phase 1.2 | Backend Dev 2 | Backend Dev 1 | Tech Lead |
| Phase 1.3 | Backend Dev 1 | Backend Dev 2 | Tech Lead |
| Phase 2 | Backend Dev 2 | Backend Dev 1 | Tech Lead |
| Phase 3 | Frontend Dev | Backend Dev 1 | Tech Lead |
| Phase 4 | Tech Lead + Backend Dev 1 | Backend Dev 2 | External Security |

---

## Timeline & Milestones

### Week 1-2: Phase 1 (Critical Security)
- **Week 1**:
  - Day 1-2: Task 1.1 (Score locking)
  - Day 3-5: Task 1.2 (Board certification)
- **Week 2**:
  - Day 1-3: Task 1.3 (Winners publication)
  - Day 4-5: Integration testing, deployment
- **Milestone**: ✅ Critical security issues resolved

### Week 3-4: Phase 2 (High Priority)
- **Week 3**:
  - Day 1-3: Task 2.1 (Contestant visibility)
  - Day 4-5: Task 2.2 (Audit trail)
- **Week 4**:
  - Day 1-2: Integration testing
  - Day 3-5: UI implementation
- **Milestone**: ✅ High-priority features complete

### Week 5-6: Phase 3 (Medium Priority)
- **Week 5-6**:
  - UI/UX enhancements
  - Board certification interface
  - Certification dashboard
- **Milestone**: ✅ User experience improved

### Week 7-8: Phase 4 (Dynamic Permissions)
- **Week 7**:
  - Day 1-2: Database schema & migration
  - Day 3-5: Service layer implementation
- **Week 8**:
  - Day 1-2: Middleware integration
  - Day 3-5: UI development, testing
- **Milestone**: ✅ Dynamic permissions live

### Buffer: Week 9-10
- Bug fixes
- Performance tuning
- Documentation
- Training materials

---

## Critical Files Reference

Based on analysis, these are the **5 most critical files** for implementation:

1. **`/src/services/ScoringService.ts`**
   - Lines 360-420: Add lock/certification checks to `updateScore()`
   - Lines 425-443: Add checks to `deleteScore()`
   - Criticality: ⚠️ HIGHEST - Core security issue

2. **`/src/middleware/permissions.ts`**
   - Update to load permissions from database (Phase 4)
   - Add async permission loading
   - Criticality: 🔴 HIGH - Affects all API calls

3. **`/prisma/schema.prisma`**
   - Add RolePermission model (Phase 4)
   - Add PermissionAuditLog model (Phase 4)
   - Add winnersPublished fields (Phase 1.3)
   - Criticality: 🔴 HIGH - Foundation for all changes

4. **`/src/services/RestrictionService.ts`**
   - Lines 83-84, 93-94: Uncomment implementation
   - Integrate with API layer
   - Criticality: 🟡 MEDIUM - Partial implementation exists

5. **`/src/controllers/scoringController.ts`**
   - Lines 143-164, 237-257: Pattern to follow
   - Add contestant filtering
   - Criticality: 🟡 MEDIUM - Already has some checks

---

## Next Steps

### Immediate Actions (This Week)
1. [ ] **Obtain approval for this plan** from stakeholders
2. [ ] **Allocate resources** (2-3 developers)
3. [ ] **Set up monitoring** (Grafana dashboards)
4. [ ] **Create feature flags** for Phase 4
5. [ ] **Backup production database** before any changes

### Pre-Implementation Checklist
- [ ] Redis cache operational
- [ ] Database backup strategy verified
- [ ] Test environment mirrors production
- [ ] CI/CD pipeline includes rollback procedures
- [ ] Monitoring alerts configured
- [ ] Team members assigned and briefed

### Communication Plan
- **Week 0**: Stakeholder approval & kickoff
- **Weekly**: Progress updates to stakeholders
- **Each Phase**: Demo to product team
- **Each Milestone**: Release notes to users

---

**Plan Status**: 🟡 AWAITING APPROVAL
**Next Review Date**: TBD
**Document Version**: 1.0
**Last Updated**: 2026-01-04

---

*This plan was generated based on the comprehensive audit report ([PERMISSIONS_AUDIT_REPORT.md](PERMISSIONS_AUDIT_REPORT.md)) and follows industry best practices for secure, phased implementation of critical security fixes and features.*
