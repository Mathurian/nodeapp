# Audit Logging

## Overview


Comprehensive audit trail for compliance.

## What's Logged
- User authentication (login/logout)
- Data modifications (create, update, delete)
- Permission changes
- System setting changes
- File uploads/downloads
- Score submissions
- Certification steps
- Failed access attempts

## Log Tables
- `activity_logs`: General activity
- `audit_logs`: Compliance-level audit trail
- `performance_logs`: Performance metrics

## Audit Log Structure
```typescript
{
  id: string
  userId: string
  action: string           // e.g., 'USER_CREATED', 'SCORE_SUBMITTED'
  entityType: string       // e.g., 'User', 'Score'
  entityId: string
  changes: string          // JSON of before/after
  ipAddress: string
  userAgent: string
  timestamp: Date
}
```

## Querying Audit Logs
```typescript
// Get user's activity
const logs = await prisma.auditLog.findMany({
  where: { userId: 'user-id' },
  orderBy: { timestamp: 'desc' }
})

// Get entity history
const history = await prisma.auditLog.findMany({
  where: {
    entityType: 'Score',
    entityId: 'score-id'
  }
})
```

## Retention Policy
Default: Indefinite (required for compliance)
Configurable via `AUDIT_LOG_RETENTION_DAYS`

## Access Control
Only ADMIN, ORGANIZER, BOARD, and AUDITOR can view audit logs.

API: GET /api/admin/audit-logs


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
