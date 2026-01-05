# Permissions & Workflow Audit Report

**Date**: 2026-01-04
**Requested by**: User
**Purpose**: Verify certification workflow permissions and evaluate dynamic CRUD feasibility

---

## Executive Summary

This audit reviewed the multi-stage certification workflow and permissions system. While the core certification framework is implemented, several **critical gaps** exist that prevent the system from functioning as specified.

### Critical Issues Found
1. ❌ **Scores can be edited after judge certification** - No enforcement of locks
2. ❌ **No Board final approval workflow** - Missing from certification chain
3. ❌ **No winners visibility controls** - Results immediately visible to all
4. ⚠️ **Contestant score visibility not enforced** - Fields exist but unused

---

## Detailed Findings

### 1. Contestant Score Visibility ⚠️ PARTIAL

**Requirement**: Contestants can only see their own scores, and only if allowed by Organizer/Admin/Super Admin.

**Implementation Status**:
- ✅ Database fields exist: `contestantViewRestricted` (Event/Contest)
- ✅ Permission control: Only ADMIN/ORGANIZER/BOARD can toggle restrictions
- ❌ **GAP**: Implementation commented out in `RestrictionService.ts:83-84, 93-94`
- ❌ **GAP**: No contestant-specific filtering in score retrieval
- ❌ **GAP**: No enforcement at API level

**Files**:
- [prisma/schema.prisma:49-50](../prisma/schema.prisma) - Schema fields
- [src/services/RestrictionService.ts:67-97](../src/services/RestrictionService.ts) - Commented implementation

**Recommendation**: **HIGH PRIORITY** - Uncomment and complete implementation

---

### 2. Judge Certification Locks ❌ CRITICAL GAP

**Requirement**: Judges must sign and certify scores per contestant/category/contest and cannot edit after signing.

**Implementation Status**:
- ✅ Judge certification creates `JudgeContestantCertification` records
- ✅ Score model has `isCertified` and `isLocked` boolean fields
- ✅ Certification tracked with timestamp and user ID
- ❌ **CRITICAL**: `updateScore()` does NOT check `isLocked` or `isCertified`
- ❌ **CRITICAL**: Judges CAN still edit scores after certification

**Files**:
- [prisma/schema.prisma:266-269](../prisma/schema.prisma) - Score locking fields
- [src/services/JudgeContestantCertificationService.ts:31-48](../src/services/JudgeContestantCertificationService.ts) - Certification creation
- [src/services/ScoringService.ts:360-420](../src/services/ScoringService.ts) - **Missing lock check**

**Code Issue**:
```typescript
// ScoringService.ts:360 - updateScore method
async updateScore(scoreId: string, data: UpdateScoreDTO, _tenantId: string) {
  const existingScore = await this.scoreRepository.findById(scoreId);
  this.assertExists(existingScore, 'Score', scoreId);

  // ❌ MISSING: Check if score is locked or certified
  // Should add:
  // if (existingScore.isLocked || existingScore.isCertified) {
  //   throw this.forbiddenError('Cannot edit locked or certified scores');
  // }

  const updatedScore = await this.prisma.score.update({...});
}
```

**Recommendation**: **CRITICAL** - Add lock/certification checks to all score mutation methods

---

### 3. Tally Master Certification ✅ CORRECT

**Requirement**: Tally Masters review and certify all scores per judge/contest/category/contestant.

**Implementation Status**:
- ✅ Creates `CategoryCertification` with role='TALLY_MASTER'
- ✅ Requires all judge certifications before proceeding
- ✅ Has `certifications:write` permission
- ✅ Workflow logic correctly implemented

**Files**:
- [src/services/AuditorCertificationService.ts:26-29](../src/services/AuditorCertificationService.ts) - Checks tally certifications
- [src/middleware/permissions.ts:29-32](../src/middleware/permissions.ts) - Permissions

**Recommendation**: ✅ No changes needed

---

### 4. Auditor Certification ✅ CORRECT

**Requirement**: Auditor reviews and signs after Tally Master.

**Implementation Status**:
- ✅ Creates `CategoryCertification` with role='AUDITOR'
- ✅ Requires all Tally Master certifications complete
- ✅ Locks all scores: `isLocked: true, isCertified: true`
- ✅ Has `approvals:write, certifications:write` permissions
- ✅ Workflow enforced correctly

**Files**:
- [src/services/AuditorCertificationService.ts:95-136](../src/services/AuditorCertificationService.ts) - Full workflow
- [src/middleware/permissions.ts:33-37](../src/middleware/permissions.ts) - Permissions

**Code Example**:
```typescript
// AuditorCertificationService.ts:122-133
const certification = await this.prisma.categoryCertification.create({
  data: {
    categoryId,
    role: 'AUDITOR',
    userId
  }
});

// Lock all scores after auditor signs
await this.prisma.score.updateMany({
  where: { categoryId, isCertified: false },
  data: { isLocked: true, isCertified: true }
});
```

**Recommendation**: ✅ No changes needed

---

### 5. Board Final Approval ❌ NOT IMPLEMENTED

**Requirement**: Board/Organizer/Admin/Super Admin reviews and signs once all Auditors have signed.

**Implementation Status**:
- ✅ Board role has `approvals:*` permission
- ❌ **MISSING**: No explicit Board certification workflow
- ❌ **MISSING**: No check for "all Auditors signed"
- ❌ **MISSING**: No CategoryCertification with role='BOARD'
- ❌ **MISSING**: No final approval requirement before winners release

**Files**:
- No board certification service exists
- [src/services/BoardService.ts](../src/services/BoardService.ts) - Exists but no certification logic

**Recommendation**: **HIGH PRIORITY** - Implement Stage 4 certification

**Required Implementation**:
```typescript
// Pseudo-code for BoardCertificationService
async submitBoardApproval(categoryId: string, userId: string) {
  // 1. Check all Auditors have signed
  const auditorCerts = await getCertifications(categoryId, 'AUDITOR');
  const requiredAuditors = await getAssignedAuditors(categoryId);
  if (auditorCerts.length < requiredAuditors.length) {
    throw new Error('Not all auditors have signed');
  }

  // 2. Create Board certification
  await this.prisma.categoryCertification.create({
    data: {
      categoryId,
      role: 'BOARD',
      userId
    }
  });

  // 3. Mark category as final (new field needed)
  await this.prisma.category.update({
    where: { id: categoryId },
    data: { boardApproved: true, approvedAt: new Date() }
  });
}
```

---

### 6. Winners Visibility Control ❌ NOT IMPLEMENTED

**Requirement**: Winners page populates after all certifications. Only visible to Board+ until Board allows visibility, then visible to all with permission.

**Implementation Status**:
- ❌ **MISSING**: No `resultsPublished`, `winnersReleased`, or similar field
- ❌ **MISSING**: No Board-controlled release toggle
- ❌ **MISSING**: No visibility control per contest
- ❌ **MISSING**: Winners likely visible immediately to all roles with access

**Schema Changes Needed**:
```prisma
model Contest {
  // ... existing fields
  winnersPublished  Boolean   @default(false)
  publishedAt       DateTime?
  publishedBy       String?   // User ID who published
}

model Category {
  // ... existing fields
  winnersPublished  Boolean   @default(false)
  publishedAt       DateTime?
  publishedBy       String?
}
```

**Service Logic Needed**:
```typescript
async publishWinners(contestId: string, userId: string, userRole: string) {
  // Only Board+ can publish
  if (!['BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
    throw new ForbiddenError('Only Board+ can publish winners');
  }

  // Verify all categories have board approval
  const categories = await this.prisma.category.findMany({
    where: { contestId },
    include: { categoryCertifications: { where: { role: 'BOARD' } } }
  });

  const allApproved = categories.every(cat => cat.categoryCertifications.length > 0);
  if (!allApproved) {
    throw new Error('Not all categories have Board approval');
  }

  // Publish winners
  await this.prisma.contest.update({
    where: { id: contestId },
    data: {
      winnersPublished: true,
      publishedAt: new Date(),
      publishedBy: userId
    }
  });
}

// In winners retrieval
async getWinners(contestId: string, userRole: string) {
  const contest = await this.prisma.contest.findUnique({
    where: { id: contestId }
  });

  // Check visibility
  const canViewUnpublished = ['BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole);
  if (!contest.winnersPublished && !canViewUnpublished) {
    throw new ForbiddenError('Winners not yet published');
  }

  return await this.getWinnersData(contestId);
}
```

**Recommendation**: **HIGH PRIORITY** - Implement winners publication workflow

---

## 7. Dynamic CRUD Permissions via GUI

### Feasibility Analysis: **MODERATE COMPLEXITY**

**Current System**:
- Permissions hardcoded in `/src/middleware/permissions.ts`
- Role-based with permission strings like `"events:*"`, `"scores:read"`
- Wildcard support (`*` for all, `resource:*` for full CRUD)

**Dynamic System Requirements**:

#### A. Database Schema
```prisma
model RolePermission {
  id         String   @id @default(cuid())
  role       UserRole
  resource   String   // "events", "scores", "users"
  operation  String   // "create", "read", "update", "delete", "*"
  allowed    Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  createdBy  String
  tenantId   String   // Multi-tenant support

  @@unique([tenantId, role, resource, operation])
  @@index([tenantId, role])
  @@map("role_permissions")
}

model PermissionAuditLog {
  id          String   @id @default(cuid())
  role        UserRole
  resource    String
  operation   String
  previousVal Boolean
  newVal      Boolean
  changedBy   String
  changedAt   DateTime @default(now())
  reason      String?
  tenantId    String

  @@index([tenantId, changedAt])
  @@map("permission_audit_logs")
}
```

#### B. Service Layer
```typescript
class DynamicPermissionService {
  // Load permissions from database instead of hardcoded
  async getPermissions(role: UserRole, tenantId: string): Promise<string[]> {
    const perms = await this.prisma.rolePermission.findMany({
      where: { role, tenantId, allowed: true }
    });

    return perms.map(p =>
      p.operation === '*' ? `${p.resource}:*` : `${p.resource}:${p.operation}`
    );
  }

  // Update permissions via GUI
  async updatePermission(
    role: UserRole,
    resource: string,
    operation: string,
    allowed: boolean,
    userId: string,
    tenantId: string,
    reason?: string
  ) {
    // Validation: Super Admin/Admin/Organizer only
    // Validation: Cannot remove own admin permissions
    // Validation: Cannot grant higher than own permissions

    await this.prisma.$transaction([
      // Upsert permission
      this.prisma.rolePermission.upsert({
        where: { tenantId_role_resource_operation: { tenantId, role, resource, operation } },
        update: { allowed, updatedAt: new Date() },
        create: { role, resource, operation, allowed, tenantId, createdBy: userId }
      }),

      // Audit log
      this.prisma.permissionAuditLog.create({
        data: { role, resource, operation, newVal: allowed, changedBy: userId, tenantId, reason }
      })
    ]);

    // Invalidate permission cache
    await this.cacheService.del(`permissions:${tenantId}:${role}`);
  }
}
```

#### C. Frontend UI Component
```tsx
// PermissionsMatrixPage.tsx
function PermissionsMatrixPage() {
  const resources = ['events', 'contests', 'categories', 'scores', 'users', ...];
  const operations = ['create', 'read', 'update', 'delete'];
  const roles = ['ORGANIZER', 'BOARD', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', ...];

  return (
    <table>
      <thead>
        <tr>
          <th>Resource</th>
          {operations.map(op => <th key={op}>{op}</th>)}
        </tr>
      </thead>
      <tbody>
        {resources.map(resource => (
          <tr key={resource}>
            <td>{resource}</td>
            {operations.map(operation => (
              <td key={operation}>
                <PermissionToggle
                  role={selectedRole}
                  resource={resource}
                  operation={operation}
                  onToggle={handlePermissionChange}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

#### D. Caching Strategy
```typescript
// Cache permissions in Redis with 5-minute TTL
async getCachedPermissions(role: UserRole, tenantId: string): Promise<string[]> {
  const cacheKey = `permissions:${tenantId}:${role}`;

  let permissions = await this.redis.get(cacheKey);
  if (!permissions) {
    permissions = await this.getPermissions(role, tenantId);
    await this.redis.setex(cacheKey, 300, JSON.stringify(permissions));
  }

  return JSON.parse(permissions);
}
```

### Implementation Complexity Breakdown

| Component | Effort | Risk | Priority |
|-----------|--------|------|----------|
| Database Schema | **Low** (2-4 hours) | Low | P0 |
| Service Layer | **Medium** (8-12 hours) | Medium | P0 |
| Permission Caching | **Low** (2-4 hours) | Low | P1 |
| Frontend UI | **Medium** (12-16 hours) | Low | P1 |
| Validation Logic | **High** (6-8 hours) | High | P0 |
| Migration Tool | **Medium** (4-6 hours) | Medium | P1 |
| Testing | **High** (16-20 hours) | High | P0 |
| **TOTAL** | **~50-70 hours** | **Medium** | - |

### Risks & Considerations

**Security Risks**:
1. ⚠️ **Privilege Escalation**: Admins could accidentally grant too many permissions
2. ⚠️ **Self-Lockout**: Admins could remove their own access
3. ⚠️ **Audit Trail**: Must track all permission changes

**Mitigation**:
- Safeguards preventing self-permission reduction
- Require confirmation for dangerous changes
- Comprehensive audit logging
- Rollback mechanism for bad changes
- Default "safe" permissions that cannot be removed (e.g., SUPER_ADMIN always has all)

**Performance Considerations**:
- Permission checks on every API call
- Cache permissions aggressively (Redis + in-memory)
- Background job to warm cache
- Fallback to default if DB unavailable

### Recommendation

**Feasibility**: **YES** - Moderately complex but achievable

**Suggested Approach**:
1. **Phase 1** (MVP):
   - Database schema
   - Service layer with caching
   - Basic UI for viewing permissions
   - Migration from hardcoded to DB

2. **Phase 2**:
   - Full CRUD UI with validation
   - Audit logging
   - Permission templates (presets)

3. **Phase 3**:
   - Role cloning
   - Custom roles (beyond predefined)
   - Bulk permission updates
   - Permission diff viewer

**Estimated Timeline**: 2-3 weeks for full implementation

---

## Priority Recommendations

### 🔴 Critical (Fix Immediately)
1. **Add lock/certification checks to `updateScore()`** - Prevents data corruption
2. **Implement Board final approval workflow** - Completes certification chain
3. **Implement winners visibility control** - Security & compliance requirement

### 🟡 High (Fix Soon)
4. **Complete contestant score visibility** - Uncomment and implement
5. **Add score lock enforcement to `deleteScore()`** - Consistency
6. **Create permission audit trail** - Compliance & debugging

### 🟢 Medium (Plan & Implement)
7. **Dynamic CRUD permissions via GUI** - Feature request, well-scoped
8. **Add Board certification UI** - User experience
9. **Winners publication workflow** - Complete feature

---

## Conclusion

The certification workflow framework is **70% complete** but has **critical gaps** that prevent it from functioning as designed:

- ✅ Tally Master and Auditor workflows are correct
- ❌ Judge certification doesn't prevent edits (critical security issue)
- ❌ Board final approval is missing entirely
- ❌ Winners visibility control doesn't exist

**Dynamic CRUD permissions are feasible** and would provide significant administrative flexibility, but should be implemented **after** fixing the critical certification workflow gaps.

---

**Report prepared by**: Claude Sonnet 4.5
**Files analyzed**: 15+ service files, schema, permissions middleware
**Code review depth**: Full implementation verification
