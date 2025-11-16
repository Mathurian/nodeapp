# Database Documentation

Complete database schema documentation for Event Manager, powered by Prisma ORM and PostgreSQL.

## Table of Contents

- [Overview](#overview)
- [Database Technology](#database-technology)
- [Schema Overview](#schema-overview)
- [Core Models](#core-models)
- [Multi-Tenancy Models](#multi-tenancy-models)
- [Scoring Models](#scoring-models)
- [Certification Models](#certification-models)
- [User & Authentication Models](#user--authentication-models)
- [System Models](#system-models)
- [Relationships](#relationships)
- [Indexes](#indexes)
- [Enums](#enums)
- [Migrations](#migrations)

## Overview

Event Manager uses PostgreSQL 12+ as its primary database with Prisma as the ORM layer. The schema is designed for:
- **Multi-tenancy**: Complete tenant data isolation
- **Performance**: 80+ strategic indexes
- **Scalability**: Optimized queries and connection pooling
- **Data Integrity**: Foreign keys, constraints, cascading rules
- **Flexibility**: JSONB fields for extensible data

**Database Statistics**:
- 60+ Tables
- 80+ Indexes
- 10 Enums
- Multi-tenant architecture
- Full ACID compliance

## Database Technology

### PostgreSQL

**Version**: 12.0 or higher

**Key Features Used**:
- JSONB for flexible data storage
- Partial indexes for performance
- Cascade delete for tenant isolation
- Full-text search capabilities
- Connection pooling

### Prisma ORM

**Version**: 6.18.0

**Features**:
- Type-safe database access
- Auto-generated client
- Migration system
- Query optimization
- Relation handling

**Connection String Format**:
```
postgresql://username:password@host:port/database?schema=public&connection_limit=10
```

## Schema Overview

### Database Structure

```
┌─────────────────────────────────────────────────┐
│  Multi-Tenancy Layer                            │
│  └── Tenant (root of all tenant data)          │
└─────────────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────────────┐
│  Core Contest Structure                         │
│  Event → Contest → Category                     │
│    └── Contestants, Judges, Scores             │
└─────────────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────────────┐
│  Scoring & Certification                        │
│  Score, Criterion, Certification               │
│  Deductions, Comments                          │
└─────────────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────────────┐
│  Users & Access Control                         │
│  User, Role, Permissions                       │
│  Judge, Contestant associations                │
└─────────────────────────────────────────────────┘
            ▼
┌─────────────────────────────────────────────────┐
│  Supporting Systems                             │
│  Notifications, Files, Audit, Backups          │
└─────────────────────────────────────────────────┘
```

## Core Models

### Tenant

**Purpose**: Multi-tenant organization root

**Fields**:
- `id` (String, PK) - Unique identifier (CUID)
- `name` (String) - Organization name
- `slug` (String, Unique) - URL-friendly identifier
- `domain` (String?, Unique) - Custom domain
- `isActive` (Boolean) - Tenant status
- `settings` (Json?) - Tenant-specific settings
- `planType` (String) - Subscription plan (free/pro/enterprise)
- `maxUsers` (Int?) - User limit
- `maxEvents` (Int?) - Event limit
- `createdAt`, `updatedAt` (DateTime) - Timestamps

**Relations**: Root of all tenant data

**Indexes**:
```prisma
@@index([slug])
@@index([domain])
@@index([isActive])
```

### Event

**Purpose**: Top-level event container

**Fields**:
- `id` (String, PK)
- `tenantId` (String, FK → Tenant)
- `name` (String) - Event name
- `description` (String?) - Event description
- `startDate` (DateTime) - Event start
- `endDate` (DateTime) - Event end
- `location` (String?) - Physical location
- `maxContestants` (Int?) - Maximum participants
- `contestantNumberingMode` (Enum) - Numbering strategy
- `isLocked` (Boolean) - Lock status
- `lockedAt` (DateTime?) - Lock timestamp
- `lockVerifiedBy` (String?, FK → User) - Lock verifier
- `archived` (Boolean) - Archive status
- `createdAt`, `updatedAt` (DateTime)

**Relations**:
- ONE Tenant
- MANY Contests
- MANY Certifications
- MANY Files

**Indexes**:
```prisma
@@index([tenantId])
@@index([tenantId, archived])
```

### Contest

**Purpose**: Competition within an event

**Fields**:
- `id` (String, PK)
- `tenantId` (String, FK)
- `eventId` (String, FK → Event)
- `name` (String)
- `description` (String?)
- `contestantNumberingMode` (Enum)
- `nextContestantNumber` (Int?) - Auto-increment counter
- `isLocked` (Boolean)
- `archived` (Boolean)
- `createdAt`, `updatedAt` (DateTime)

**Relations**:
- ONE Event
- MANY Categories
- MANY Contestants (via ContestContestant)
- MANY Judges (via ContestJudge)

**Indexes**:
```prisma
@@index([tenantId])
@@index([tenantId, eventId])
@@index([eventId, archived])
```

### Category

**Purpose**: Scoring category with criteria

**Fields**:
- `id` (String, PK)
- `tenantId` (String, FK)
- `contestId` (String, FK → Contest)
- `name` (String)
- `description` (String?)
- `scoreCap` (Int?) - Maximum total score
- `timeLimit` (Int?) - Time limit in minutes
- `contestantMin` (Int?) - Minimum contestants
- `contestantMax` (Int?) - Maximum contestants
- `totalsCertified` (Boolean) - Certification flag
- `createdAt`, `updatedAt` (DateTime)

**Relations**:
- ONE Contest
- MANY Criteria
- MANY Contestants (via CategoryContestant)
- MANY Judges (via CategoryJudge)
- MANY Scores
- MANY Certifications

**Indexes**:
```prisma
@@index([tenantId])
@@index([tenantId, contestId])
@@index([contestId, createdAt])
```

### Contestant

**Purpose**: Contest participant

**Fields**:
- `id` (String, PK)
- `tenantId` (String, FK)
- `name` (String)
- `email` (String?, Unique per tenant)
- `gender` (String?)
- `pronouns` (String?)
- `contestantNumber` (Int?) - Assigned number
- `bio` (String?) - Biography
- `imagePath` (String?) - Profile picture path
- `createdAt`, `updatedAt` (DateTime)

**Relations**:
- MANY Categories (via CategoryContestant)
- MANY Contests (via ContestContestant)
- MANY Scores
- MANY Users (can be associated with User)

**Indexes**:
```prisma
@@unique([tenantId, email])
@@index([tenantId])
@@index([tenantId, contestantNumber])
```

### Judge

**Purpose**: Scoring judge

**Fields**:
- `id` (String, PK)
- `tenantId` (String, FK)
- `name` (String)
- `email` (String?, Unique per tenant)
- `gender` (String?)
- `pronouns` (String?)
- `bio` (String?)
- `imagePath` (String?)
- `isHeadJudge` (Boolean) - Head judge designation
- `createdAt`, `updatedAt` (DateTime)

**Relations**:
- MANY Categories (via CategoryJudge)
- MANY Contests (via ContestJudge)
- MANY Scores
- MANY Users (can be associated with User)

**Indexes**:
```prisma
@@unique([tenantId, email])
@@index([tenantId])
```

## Scoring Models

### Criterion

**Purpose**: Individual scoring criterion

**Fields**:
- `id` (String, PK)
- `categoryId` (String, FK → Category)
- `name` (String) - Criterion name (e.g., "Technique")
- `maxScore` (Int) - Maximum score for this criterion
- `createdAt`, `updatedAt` (DateTime)

**Relations**:
- ONE Category
- MANY Scores

### Score

**Purpose**: Individual judge score for contestant/criterion

**Fields**:
- `id` (String, PK)
- `categoryId` (String, FK → Category)
- `contestantId` (String, FK → Contestant)
- `judgeId` (String, FK → Judge)
- `criterionId` (String?, FK → Criterion)
- `score` (Int?) - Numeric score
- `comment` (String?) - Score comment
- `isCertified` (Boolean) - Certification flag
- `certifiedAt` (DateTime?) - Certification time
- `certifiedBy` (String?) - Certifier ID
- `isLocked` (Boolean) - Lock status
- `allowCommentEdit` (Boolean) - Can edit comments
- `createdAt`, `updatedAt` (DateTime)

**Unique Constraint**:
```prisma
@@unique([categoryId, contestantId, judgeId, criterionId])
```

**Indexes**:
```prisma
@@index([categoryId, judgeId])
@@index([categoryId, contestantId])
@@index([isCertified, categoryId])
```

### JudgeComment

**Purpose**: General comments from judge

**Fields**:
- `id` (String, PK)
- `categoryId` (String, FK)
- `contestantId` (String, FK)
- `judgeId` (String, FK)
- `comment` (String?)
- `createdAt` (DateTime)

**Unique**: One comment per judge-contestant-category combination

### DeductionRequest

**Purpose**: Request for score deduction

**Fields**:
- `id` (String, PK)
- `contestantId` (String, FK)
- `categoryId` (String, FK)
- `amount` (Float) - Deduction amount
- `reason` (String) - Justification
- `requestedById` (String, FK → User)
- `status` (DeductionStatus Enum) - PENDING/APPROVED/REJECTED
- `createdAt` (DateTime)

**Relations**:
- MANY DeductionApprovals (approval chain)

## Certification Models

### Certification

**Purpose**: Overall certification workflow tracking

**Fields**:
- `id` (String, PK)
- `tenantId` (String, FK)
- `categoryId` (String, FK)
- `contestId` (String, FK)
- `eventId` (String, FK)
- `userId` (String?, FK)
- `status` (CertificationStatus) - PENDING/IN_PROGRESS/CERTIFIED/REJECTED
- `currentStep` (Int) - Current workflow step (1-4)
- `totalSteps` (Int) - Total steps (default: 4)
- `judgeCertified` (Boolean)
- `tallyCertified` (Boolean)
- `auditorCertified` (Boolean)
- `boardApproved` (Boolean)
- `certifiedAt` (DateTime?)
- `rejectionReason` (String?)
- `comments` (String?)
- `createdAt`, `updatedAt` (DateTime)

**Unique**:
```prisma
@@unique([tenantId, categoryId, contestId, eventId])
```

### JudgeContestantCertification

**Purpose**: Judge certifies individual contestant scores

**Fields**:
- `id` (String, PK)
- `categoryId` (String, FK)
- `judgeId` (String, FK)
- `contestantId` (String, FK)
- `certifiedAt` (DateTime)
- `comments` (String?)

**Unique**:
```prisma
@@unique([categoryId, judgeId, contestantId])
```

### JudgeCertification

**Purpose**: Judge certifies all category scores

**Fields**:
- `id` (String, PK)
- `categoryId` (String, FK)
- `judgeId` (String, FK)
- `signatureName` (String) - Digital signature
- `certifiedAt` (DateTime)

**Unique**:
```prisma
@@unique([categoryId, judgeId])
```

### CategoryCertification

**Purpose**: Role-based category certification

**Fields**:
- `id` (String, PK)
- `categoryId` (String, FK)
- `role` (String) - Certifying role (TALLY_MASTER, AUDITOR, BOARD)
- `userId` (String, FK)
- `signatureName` (String?)
- `certifiedAt` (DateTime)
- `comments` (String?)

**Unique**: One certification per category-role combination
```prisma
@@unique([categoryId, role])
```

## User & Authentication Models

### User

**Purpose**: System user with role-based access

**Fields**:
- `id` (String, PK)
- `tenantId` (String, FK)
- `name` (String)
- `preferredName` (String?)
- `email` (String, Unique per tenant)
- `password` (String) - Bcrypt hash
- `role` (UserRole Enum) - User role
- `isSuperAdmin` (Boolean) - Global admin flag
- `judgeId` (String?, FK → Judge) - Associated judge
- `contestantId` (String?, FK → Contestant) - Associated contestant
- `sessionVersion` (Int) - Session invalidation counter
- `isActive` (Boolean)
- `lastLoginAt` (DateTime?)
- `mfaEnabled` (Boolean)
- `mfaSecret` (String?) - TOTP secret
- `mfaBackupCodes` (String?) - Recovery codes
- `timezone` (String?) - User timezone
- `language` (String?) - Preferred language
- `createdAt`, `updatedAt` (DateTime)

**Unique**:
```prisma
@@unique([tenantId, email])
```

**Indexes**:
```prisma
@@index([tenantId])
@@index([tenantId, role])
@@index([tenantId, isActive])
```

### ActivityLog

**Purpose**: Audit trail for user actions

**Fields**:
- `id` (String, PK)
- `userId` (String?, FK)
- `userName` (String?)
- `userRole` (String?)
- `action` (String) - Action performed
- `resourceType` (String?)
- `resourceId` (String?)
- `ipAddress` (String?)
- `userAgent` (String?)
- `logLevel` (LogLevel Enum)
- `details` (Json?)
- `createdAt` (DateTime)

### AuditLog

**Purpose**: Comprehensive audit logging

**Fields**:
- `id` (String, PK)
- `tenantId` (String, FK)
- `userId` (String, FK)
- `action` (String) - Action type
- `entityType` (String) - Affected entity
- `entityId` (String) - Entity ID
- `changes` (String?) - JSON of changes
- `ipAddress` (String?)
- `userAgent` (String?)
- `timestamp` (DateTime)

**Indexes**:
```prisma
@@index([tenantId, userId])
@@index([tenantId, action])
@@index([entityType, entityId])
@@index([timestamp])
```

## System Models

### Notification

**Purpose**: Real-time user notifications

**Fields**:
- `id` (String, PK)
- `tenantId` (String, FK)
- `userId` (String, FK)
- `type` (NotificationType) - INFO/SUCCESS/WARNING/ERROR/SYSTEM
- `title` (String)
- `message` (String)
- `link` (String?) - Deep link
- `read` (Boolean)
- `readAt` (DateTime?)
- `metadata` (String?) - Additional JSON data
- `emailSent` (Boolean)
- `pushSent` (Boolean)
- `createdAt`, `updatedAt` (DateTime)

**Indexes**:
```prisma
@@index([tenantId, userId, read])
@@index([userId, createdAt])
```

### File

**Purpose**: File uploads and attachments

**Fields**:
- `id` (String, PK)
- `filename` (String) - Stored filename
- `originalName` (String) - Original filename
- `mimeType` (String)
- `size` (Int) - Bytes
- `path` (String) - File path
- `category` (FileCategory Enum)
- `uploadedBy` (String, FK → User)
- `uploadedAt` (DateTime)
- `isPublic` (Boolean)
- `metadata` (String?) - JSON metadata
- `checksum` (String?) - File hash
- `eventId`, `contestId`, `categoryId` (Optional FKs)

### BackupLog

**Purpose**: Backup operation tracking

**Fields**:
- `id` (String, PK)
- `tenantId` (String, FK)
- `type` (String) - Backup type
- `status` (String) - Backup status
- `startedAt` (DateTime)
- `completedAt` (DateTime?)
- `duration` (Int?) - Seconds
- `size` (BigInt?) - Bytes
- `location` (String) - Backup location
- `errorMessage` (String?)
- `metadata` (Json?)

**Indexes**:
```prisma
@@index([tenantId, type, status])
@@index([startedAt])
```

### SystemSetting

**Purpose**: Application-wide settings

**Fields**:
- `id` (String, PK)
- `key` (String, Unique)
- `value` (String)
- `description` (String?)
- `category` (String?)
- `updatedAt` (DateTime)
- `updatedBy` (String?, FK → User)

## Relationships

### One-to-Many Relationships

```
Tenant → Users
Tenant → Events
Tenant → Contests
Event → Contests
Contest → Categories
Category → Criteria
Category → Scores
Contestant → Scores
Judge → Scores
```

### Many-to-Many Relationships

```
Category ↔ Contestants (via CategoryContestant)
Category ↔ Judges (via CategoryJudge)
Contest ↔ Contestants (via ContestContestant)
Contest ↔ Judges (via ContestJudge)
```

### Complex Relationships

```
User → Judge (optional association)
User → Contestant (optional association)
Category → Certifications (multi-stage)
```

## Indexes

### Performance Indexes

**Tenant Isolation**:
Every tenant-scoped table has `@@index([tenantId])`

**Common Query Patterns**:
```prisma
// Listing with filters
@@index([tenantId, eventId])
@@index([tenantId, isActive])

// Temporal queries
@@index([userId, createdAt])
@@index([startedAt])

// Relation lookups
@@index([categoryId, judgeId])
@@index([categoryId, contestantId])

// Search and filter
@@index([isCertified, categoryId])
@@index([entityType, entityId])
```

## Enums

### UserRole
```prisma
enum UserRole {
  ADMIN
  ORGANIZER
  BOARD
  JUDGE
  CONTESTANT
  EMCEE
  TALLY_MASTER
  AUDITOR
}
```

### CertificationStatus
```prisma
enum CertificationStatus {
  PENDING
  IN_PROGRESS
  CERTIFIED
  REJECTED
}
```

### ContestantNumberingMode
```prisma
enum ContestantNumberingMode {
  MANUAL
  AUTO_INDEXED
  OPTIONAL
}
```

### DeductionStatus
```prisma
enum DeductionStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### NotificationType
```prisma
enum NotificationType {
  INFO
  SUCCESS
  WARNING
  ERROR
  SYSTEM
}
```

## Migrations

### Creating Migrations

```bash
# Development: Create and apply migration
npx prisma migrate dev --name migration_name

# Production: Apply pending migrations
npx prisma migrate deploy
```

### Migration Strategy

1. **Development**: Use `prisma migrate dev`
2. **Staging**: Test with `prisma migrate deploy`
3. **Production**: Apply with `prisma migrate deploy`

### Backup Before Migration

Always backup before running migrations:
```bash
pg_dump event_manager > backup_$(date +%Y%m%d_%H%M%S).sql
npx prisma migrate deploy
```

---

**Next**: [Frontend Documentation](06-FRONTEND.md)
