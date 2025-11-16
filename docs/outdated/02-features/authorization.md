# Authorization and Role-Based Access Control

## Overview

The Event Manager implements a comprehensive Role-Based Access Control (RBAC) system that governs access to features and data based on user roles. The authorization system works in conjunction with authentication to ensure secure and appropriate access to system resources.

## User Roles

### Role Hierarchy

```
ADMIN (Full System Access)
  ├── ORGANIZER (Event Management)
  ├── BOARD (Approval Authority)
  ├── TALLY_MASTER (Score Aggregation)
  ├── AUDITOR (Verification)
  ├── JUDGE (Score Submission)
  ├── EMCEE (Script Management)
  └── CONTESTANT (Limited View)
```

### Role Definitions

#### ADMIN
**Purpose**: System administrators with full access

**Capabilities**:
- Full user management (create, update, delete, activate/deactivate)
- System settings configuration
- Backup and restore operations
- Security settings management
- Access to all features and data
- Audit log viewing
- Database management
- Secret management

**Use Cases**:
- System setup and configuration
- User account management
- Security monitoring
- System maintenance

#### ORGANIZER
**Purpose**: Event organizers who manage contests and categories

**Capabilities**:
- Create and manage events
- Create and manage contests
- Create and manage categories
- Assign judges to categories
- Manage contestants
- View all scores and results
- Generate reports
- Manage event settings
- Archive events

**Use Cases**:
- Event planning and setup
- Judge assignment
- Contest organization
- Results review

#### BOARD
**Purpose**: Board members with final approval authority

**Capabilities**:
- View all scores and results
- Final certification approval
- Review certification workflows
- Access audit logs
- Generate official reports
- Winner signature authority

**Use Cases**:
- Final score approval
- Results certification
- Official record signing

#### JUDGE
**Purpose**: Judges who score contestants

**Capabilities**:
- View assigned categories
- Submit scores for contestants
- Add commentary/feedback
- Certify own scores
- View own scoring history
- Access judge materials
- View contestant bios (if permitted)

**Restrictions**:
- Cannot view other judges' scores (until certified)
- Cannot modify scores after certification
- Limited to assigned categories only

**Use Cases**:
- Score submission
- Contestant evaluation
- Score certification

#### TALLY_MASTER
**Purpose**: Aggregates and verifies scores

**Capabilities**:
- View all scores
- Calculate totals and rankings
- Tally certification step
- Request score corrections
- Generate tally sheets
- Review judge certifications
- Manage deductions

**Use Cases**:
- Score aggregation
- Tally verification
- Results calculation

#### AUDITOR
**Purpose**: Audits and verifies scoring accuracy

**Capabilities**:
- View all scores and calculations
- Auditor certification step
- Request uncertification
- Generate audit reports
- Review certification trail
- Access complete audit logs

**Use Cases**:
- Score verification
- Accuracy checking
- Compliance auditing

#### EMCEE
**Purpose**: Manages emcee scripts and announcements

**Capabilities**:
- Create and manage emcee scripts
- View event schedule
- Access contestant information
- Generate announcement scripts
- View results (when released)

**Use Cases**:
- Script preparation
- Event hosting
- Result announcements

#### CONTESTANT
**Purpose**: Contest participants

**Capabilities**:
- View own profile
- Update own information
- View own scores (when released)
- View event information
- Receive notifications

**Restrictions**:
- Cannot view other contestants' scores
- Cannot view scores until release date
- Cannot modify scores
- Limited system access

**Use Cases**:
- Profile management
- Score viewing
- Event information

## Permission Matrix

### Feature Permissions

| Feature                          | ADMIN | ORG | BOARD | JUDGE | TALLY | AUDIT | EMCEE | CONT |
|----------------------------------|-------|-----|-------|-------|-------|-------|-------|------|
| **User Management**              |       |     |       |       |       |       |       |      |
| Create Users                     | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Edit Users                       | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Delete Users                     | ✓     | ✗   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Activate/Deactivate Users        | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Assign Roles                     | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| **Event Management**             |       |     |       |       |       |       |       |      |
| Create Events                    | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Edit Events                      | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Delete Events                    | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Archive Events                   | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Lock Events                      | ✓     | ✓   | ✓     | ✗     | ✗     | ✗     | ✗     | ✗    |
| **Contest Management**           |       |     |       |       |       |       |       |      |
| Create Contests                  | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Edit Contests                    | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Delete Contests                  | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Lock Contests                    | ✓     | ✓   | ✓     | ✗     | ✗     | ✗     | ✗     | ✗    |
| **Category Management**          |       |     |       |       |       |       |       |      |
| Create Categories                | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Edit Categories                  | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Delete Categories                | ✓     | ✓   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| **Scoring**                      |       |     |       |       |       |       |       |      |
| Submit Scores                    | ✓     | ✓   | ✗     | ✓     | ✗     | ✗     | ✗     | ✗    |
| Edit Own Scores                  | ✓     | ✓   | ✗     | ✓*    | ✗     | ✗     | ✗     | ✗    |
| View All Scores                  | ✓     | ✓   | ✓     | ✗     | ✓     | ✓     | ✗     | ✗    |
| View Own Scores                  | ✓     | ✓   | ✓     | ✓     | ✓     | ✓     | ✗     | ✓**  |
| Delete Scores                    | ✓     | ✗   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| **Certification**                |       |     |       |       |       |       |       |      |
| Judge Certification              | ✓     | ✓   | ✗     | ✓     | ✗     | ✗     | ✗     | ✗    |
| Tally Certification              | ✓     | ✓   | ✗     | ✗     | ✓     | ✗     | ✗     | ✗    |
| Auditor Certification            | ✓     | ✓   | ✗     | ✗     | ✗     | ✓     | ✗     | ✗    |
| Board Approval                   | ✓     | ✓   | ✓     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Request Uncertification          | ✓     | ✓   | ✗     | ✗     | ✓     | ✓     | ✗     | ✗    |
| **System Administration**        |       |     |       |       |       |       |       |      |
| System Settings                  | ✓     | ✗   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Security Settings                | ✓     | ✗   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| Backup/Restore                   | ✓     | ✗   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |
| View Audit Logs                  | ✓     | ✓   | ✓     | ✗     | ✗     | ✓     | ✗     | ✗    |
| Database Browser                 | ✓     | ✗   | ✗     | ✗     | ✗     | ✗     | ✗     | ✗    |

*Before certification only
**After release date only

## Authorization Implementation

### Middleware-Based Authorization

```typescript
// Role-based middleware
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    next()
  }
}

// Usage in routes
router.post('/events', 
  authenticate, 
  requireRole('ADMIN', 'ORGANIZER'),
  createEvent
)
```

### Resource-Level Authorization

```typescript
// Check if judge is assigned to category
const checkJudgeAssignment = async (userId: string, categoryId: string): Promise<boolean> => {
  const assignment = await prisma.assignment.findFirst({
    where: {
      judgeId: userId,
      categoryId: categoryId,
      status: 'ACTIVE'
    }
  })

  return !!assignment
}

// Enforce in controller
export const submitScore = async (req: Request, res: Response) => {
  const { categoryId } = req.body

  if (req.user.role === 'JUDGE') {
    const isAssigned = await checkJudgeAssignment(req.user.id, categoryId)
    if (!isAssigned) {
      return res.status(403).json({ error: 'Not assigned to this category' })
    }
  }

  // Proceed with score submission
}
```

### Dynamic Role Assignments

Users can have different roles for different events/contests/categories:

```typescript
// Check role assignment for specific context
const hasRoleForCategory = async (
  userId: string,
  role: string,
  categoryId: string
): Promise<boolean> => {
  const assignment = await prisma.roleAssignment.findFirst({
    where: {
      userId,
      role,
      categoryId,
      isActive: true
    }
  })

  return !!assignment
}
```

## Frontend Authorization

### Route Protection

```typescript
// Protected route component
const ProtectedRoute = () => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" />
  }

  return <Outlet />
}

// Role-based route protection
const RoleProtectedRoute = ({ allowedRoles }: { allowedRoles: UserRole[] }) => {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />
  }

  return <Outlet />
}

// Usage
<Route element={<ProtectedRoute />}>
  <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
    <Route path="/admin" element={<AdminPage />} />
  </Route>
</Route>
```

### UI Element Visibility

```typescript
// Conditional rendering based on role
const hasPermission = (user: User, permission: string): boolean => {
  const permissions = {
    ADMIN: ['*'], // All permissions
    ORGANIZER: ['events.manage', 'contests.manage', 'categories.manage'],
    JUDGE: ['scores.submit', 'scores.certify'],
    // ... other roles
  }

  const userPermissions = permissions[user.role] || []
  return userPermissions.includes('*') || userPermissions.includes(permission)
}

// In component
{hasPermission(user, 'events.manage') && (
  <button onClick={createEvent}>Create Event</button>
)}
```

## Permission Helpers

### Utility Functions

```typescript
// Check if user can modify score
export const canModifyScore = (
  user: User,
  score: Score
): boolean => {
  // Admins can always modify
  if (user.role === 'ADMIN') return true

  // Organizers can modify before certification
  if (user.role === 'ORGANIZER' && !score.isCertified) return true

  // Judges can modify their own scores before certification
  if (user.role === 'JUDGE' && score.judgeId === user.id && !score.isCertified) return true

  return false
}

// Check if user can view scores
export const canViewScores = (
  user: User,
  categoryId: string
): boolean => {
  const allowedRoles = ['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']

  if (allowedRoles.includes(user.role)) return true

  // Judges can view scores for assigned categories
  if (user.role === 'JUDGE') {
    return checkJudgeAssignment(user.id, categoryId)
  }

  return false
}

// Check if user can certify
export const canCertify = (
  user: User,
  step: CertificationStep
): boolean => {
  const roleStepMap = {
    JUDGE_CERTIFICATION: ['ADMIN', 'ORGANIZER', 'JUDGE'],
    TALLY_CERTIFICATION: ['ADMIN', 'ORGANIZER', 'TALLY_MASTER'],
    AUDITOR_CERTIFICATION: ['ADMIN', 'ORGANIZER', 'AUDITOR'],
    BOARD_APPROVAL: ['ADMIN', 'ORGANIZER', 'BOARD']
  }

  return roleStepMap[step]?.includes(user.role) || false
}
```

## Assignment System

### Judge Assignment

Judges are assigned to specific categories:

```typescript
interface Assignment {
  id: string
  judgeId: string
  categoryId: string
  contestId: string
  eventId: string
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  assignedAt: Date
  assignedBy: string
  priority: number
  notes?: string
}

// Create assignment
const assignJudgeToCategory = async (
  judgeId: string,
  categoryId: string,
  assignedBy: string
) => {
  return await prisma.assignment.create({
    data: {
      judgeId,
      categoryId,
      assignedBy,
      status: 'ACTIVE'
    }
  })
}
```

### Role Assignment

Users can have different roles for different contexts:

```typescript
interface RoleAssignment {
  id: string
  userId: string
  role: string
  eventId?: string
  contestId?: string
  categoryId?: string
  assignedAt: Date
  assignedBy: string
  isActive: boolean
}

// Assign role for specific event
const assignEventRole = async (
  userId: string,
  role: string,
  eventId: string
) => {
  return await prisma.roleAssignment.create({
    data: {
      userId,
      role,
      eventId,
      assignedBy: req.user.id,
      isActive: true
    }
  })
}
```

## Data Visibility Rules

### Score Visibility

1. **Before Judge Certification**:
   - Judges: Own scores only
   - Admins/Organizers: All scores
   - Others: No access

2. **After Judge Certification**:
   - Judges: Own scores only
   - Tally/Auditor: All scores
   - Admins/Organizers: All scores
   - Others: No access

3. **After Full Certification**:
   - All authorized roles: Full access
   - Contestants: Own scores (after release date)

### Contestant Score Access

Controlled by release settings:

```typescript
const canContestantViewScores = async (
  contestId: string,
  categoryId: string
): Promise<boolean> => {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: { event: true }
  })

  const category = await prisma.category.findUnique({
    where: { id: categoryId }
  })

  // Check if viewing is restricted
  const isRestricted = contest.contestantViewRestricted || 
                       contest.event.contestantViewRestricted

  if (!isRestricted) return true

  // Check if release date has passed
  const releaseDate = category.releaseDate || 
                     contest.contestantViewReleaseDate || 
                     contest.event.contestantViewReleaseDate

  if (!releaseDate) return false

  return new Date() >= releaseDate
}
```

## Security Considerations

### Session-Based Permissions

Permissions are checked on every request:

```typescript
// Verify user is still active
const user = await prisma.user.findUnique({
  where: { id: req.user.id }
})

if (!user || !user.isActive) {
  return res.status(401).json({ error: 'User account is inactive' })
}

// Verify session version matches (enables instant logout)
if (user.sessionVersion !== req.user.sessionVersion) {
  return res.status(401).json({ error: 'Session expired' })
}
```

### Permission Caching

Permissions can be cached for performance:

```typescript
// Cache permission check results
const permissionCache = new Map<string, boolean>()

const checkPermissionCached = async (
  userId: string,
  permission: string
): Promise<boolean> => {
  const cacheKey = `${userId}:${permission}`
  
  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey)!
  }

  const hasPermission = await checkPermission(userId, permission)
  permissionCache.set(cacheKey, hasPermission)

  // Cache for 5 minutes
  setTimeout(() => permissionCache.delete(cacheKey), 5 * 60 * 1000)

  return hasPermission
}
```

## Audit Logging

All authorization checks are logged:

```typescript
await prisma.activityLog.create({
  data: {
    userId: req.user.id,
    action: 'AUTHORIZATION_CHECK',
    resourceType: 'Score',
    resourceId: scoreId,
    details: {
      permission: 'scores.submit',
      granted: true,
      reason: 'User is assigned judge'
    },
    ipAddress: req.ip
  }
})
```

## Related Documentation

- [Security Model](../01-architecture/security-model.md)
- [Authentication Feature](./authentication.md)
- [User Management](../03-administration/user-management.md)
- [API Authentication](../07-api/authentication.md)
