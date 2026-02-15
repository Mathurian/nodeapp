# Database Schema Documentation

## Overview

The Event Manager uses PostgreSQL 16 as its primary database, with Prisma ORM for type-safe database access. The schema is designed to support complex contest workflows, scoring, certification, and audit requirements.

## Schema Statistics

- **Total Tables**: 50+ models
- **Enums**: 10+ enum types
- **Relationships**: 100+ foreign keys
- **Indexes**: 50+ indexes for query optimization

## Core Entity Relationships

```
Event (1) ────────── (N) Contest
                          │
                          ├─── (N) Category
                          │         │
                          │         ├─── (N) Criterion
                          │         │
                          │         └─── (N) Score
                          │
                          ├─── (N) ContestContestant
                          │
                          └─── (N) ContestJudge

User (1) ────────── (0..1) Judge
User (1) ────────── (0..1) Contestant

Category (N) ──── (N) CategoryContestant
Category (N) ──── (N) CategoryJudge

Score (N) ───── (1) Judge
Score (N) ───── (1) Contestant
Score (N) ───── (1) Category
Score (N) ───── (0..1) Criterion
```

## Core Tables

### Event

**Purpose**: Top-level entity representing a contest event

| Field                        | Type      | Description                           |
|------------------------------|-----------|---------------------------------------|
| id                           | String    | Primary key (CUID)                    |
| name                         | String    | Event name                            |
| description                  | String?   | Event description                     |
| startDate                    | DateTime  | Event start date                      |
| endDate                      | DateTime  | Event end date                        |
| location                     | String?   | Event location                        |
| maxContestants               | Int?      | Maximum contestant limit              |
| contestantNumberingMode      | Enum      | Numbering mode                        |
| contestantViewRestricted     | Boolean   | Restrict contestant view              |
| contestantViewReleaseDate    | DateTime? | When to release results               |
| isLocked                     | Boolean   | Lock event from modifications         |
| lockedAt                     | DateTime? | When event was locked                 |
| lockVerifiedBy               | String?   | User ID who verified lock             |
| archived                     | Boolean   | Archived status                       |
| createdAt                    | DateTime  | Creation timestamp                    |
| updatedAt                    | DateTime  | Last update timestamp                 |

**Relationships**:
- Has many: contests, certifications, files, roleAssignments

### Contest

**Purpose**: Sub-event within an event (e.g., "Talent", "Interview")

| Field                        | Type      | Description                           |
|------------------------------|-----------|---------------------------------------|
| id                           | String    | Primary key (CUID)                    |
| eventId                      | String    | Foreign key to Event                  |
| name                         | String    | Contest name                          |
| description                  | String?   | Contest description                   |
| contestantNumberingMode      | Enum      | Numbering mode                        |
| nextContestantNumber         | Int?      | Auto-increment counter                |
| contestantViewRestricted     | Boolean   | Restrict view                         |
| contestantViewReleaseDate    | DateTime? | Release date                          |
| isLocked                     | Boolean   | Lock status                           |
| archived                     | Boolean   | Archived status                       |
| createdAt                    | DateTime  | Creation timestamp                    |
| updatedAt                    | DateTime  | Update timestamp                      |

**Relationships**:
- Belongs to: event
- Has many: categories, contestants, judges, certifications

**Indexes**:
- `eventId`
- `eventId + archived`

### Category

**Purpose**: Scoring category within a contest (e.g., "Stage Presence", "Vocals")

| Field                 | Type      | Description                           |
|----------------------|-----------|---------------------------------------|
| id                   | String    | Primary key (CUID)                    |
| contestId            | String    | Foreign key to Contest                |
| name                 | String    | Category name                         |
| description          | String?   | Category description                  |
| scoreCap             | Int?      | Maximum possible score                |
| timeLimit            | Int?      | Time limit in minutes                 |
| contestantMin        | Int?      | Minimum contestants required          |
| contestantMax        | Int?      | Maximum contestants allowed           |
| totalsCertified      | Boolean   | Whether totals are certified          |
| createdAt            | DateTime  | Creation timestamp                    |
| updatedAt            | DateTime  | Update timestamp                      |

**Relationships**:
- Belongs to: contest
- Has many: criteria, scores, contestants, judges, certifications

**Indexes**:
- `contestId`
- `contestId + createdAt`

### Criterion

**Purpose**: Individual scoring criteria within a category

| Field        | Type      | Description                           |
|-------------|-----------|---------------------------------------|
| id          | String    | Primary key (CUID)                    |
| categoryId  | String    | Foreign key to Category               |
| name        | String    | Criterion name                        |
| maxScore    | Int       | Maximum score for this criterion      |
| createdAt   | DateTime  | Creation timestamp                    |
| updatedAt   | DateTime  | Update timestamp                      |

**Example**: In "Talent" category, criteria might be:
- Stage Presence (max: 20)
- Technique (max: 30)
- Creativity (max: 25)
- Overall Impact (max: 25)

### Score

**Purpose**: Individual judge's score for a contestant in a category/criterion

| Field               | Type      | Description                           |
|--------------------|-----------|---------------------------------------|
| id                 | String    | Primary key (CUID)                    |
| categoryId         | String    | Foreign key to Category               |
| contestantId       | String    | Foreign key to Contestant             |
| judgeId            | String    | Foreign key to Judge                  |
| criterionId        | String?   | Foreign key to Criterion (nullable)   |
| score              | Int?      | The actual score                      |
| comment            | String?   | Judge's comment                       |
| allowCommentEdit   | Boolean   | Can comments be edited                |
| isCertified        | Boolean   | Score certified by judge              |
| certifiedAt        | DateTime? | Certification timestamp               |
| certifiedBy        | String?   | User who certified                    |
| isLocked           | Boolean   | Lock status                           |
| lockedAt           | DateTime? | Lock timestamp                        |
| lockedBy           | String?   | User who locked                       |
| createdAt          | DateTime  | Creation timestamp                    |
| updatedAt          | DateTime  | Update timestamp                      |

**Unique Constraint**: `[categoryId, contestantId, judgeId, criterionId]`

**Indexes**:
- `categoryId + judgeId`
- `categoryId + contestantId`
- `isCertified + categoryId`

## User Management Tables

### User

**Purpose**: System users with roles and permissions

| Field                    | Type      | Description                           |
|-------------------------|-----------|---------------------------------------|
| id                      | String    | Primary key (CUID)                    |
| name                    | String    | Full name                             |
| preferredName           | String?   | Preferred name                        |
| email                   | String    | Email (unique)                        |
| password                | String    | Bcrypt hashed password                |
| role                    | Enum      | User role                             |
| judgeId                 | String?   | FK to Judge if applicable             |
| contestantId            | String?   | FK to Contestant if applicable        |
| sessionVersion          | Int       | Session invalidation counter          |
| isActive                | Boolean   | Account active status                 |
| lastLoginAt             | DateTime? | Last login timestamp                  |
| bio                     | String?   | User biography                        |
| imagePath               | String?   | Profile image path                    |
| phone                   | String?   | Phone number                          |
| timezone                | String?   | User timezone                         |
| language                | String?   | Preferred language                    |
| notificationSettings    | String?   | JSON notification preferences         |
| navigationPreferences   | Json?     | UI navigation preferences             |
| createdAt               | DateTime  | Creation timestamp                    |
| updatedAt               | DateTime  | Update timestamp                      |

**Enum UserRole**:
- ADMIN
- ORGANIZER
- BOARD
- JUDGE
- CONTESTANT
- EMCEE
- TALLY_MASTER
- AUDITOR

### Judge

**Purpose**: Judge entity (can be linked to User)

| Field        | Type      | Description                           |
|-------------|-----------|---------------------------------------|
| id          | String    | Primary key (CUID)                    |
| name        | String    | Judge name                            |
| email       | String?   | Email (unique)                        |
| bio         | String?   | Biography                             |
| imagePath   | String?   | Profile image                         |
| isHeadJudge | Boolean   | Head judge flag                       |
| createdAt   | DateTime  | Creation timestamp                    |
| updatedAt   | DateTime  | Update timestamp                      |

### Contestant

**Purpose**: Contestant entity (can be linked to User)

| Field              | Type      | Description                           |
|-------------------|-----------|---------------------------------------|
| id                | String    | Primary key (CUID)                    |
| name              | String    | Contestant name                       |
| email             | String?   | Email (unique)                        |
| contestantNumber  | Int?      | Contestant number                     |
| bio               | String?   | Biography                             |
| imagePath         | String?   | Profile image                         |
| createdAt         | DateTime  | Creation timestamp                    |
| updatedAt         | DateTime  | Update timestamp                      |

**Index**: `contestantNumber`

## Junction Tables (Many-to-Many)

### ContestContestant

**Purpose**: Link contests and contestants

| Field         | Type   | Description                    |
|--------------|--------|--------------------------------|
| contestId    | String | FK to Contest (PK part 1)      |
| contestantId | String | FK to Contestant (PK part 2)   |

**Primary Key**: `[contestId, contestantId]`

### ContestJudge

**Purpose**: Link contests and judges

| Field     | Type   | Description                |
|----------|--------|----------------------------|
| contestId | String | FK to Contest (PK part 1)  |
| judgeId   | String | FK to Judge (PK part 2)    |

**Primary Key**: `[contestId, judgeId]`

### CategoryContestant

**Purpose**: Link categories and contestants

| Field         | Type   | Description                      |
|--------------|--------|----------------------------------|
| categoryId   | String | FK to Category (PK part 1)       |
| contestantId | String | FK to Contestant (PK part 2)     |

**Primary Key**: `[categoryId, contestantId]`

### CategoryJudge

**Purpose**: Link categories and judges

| Field      | Type   | Description                  |
|-----------|--------|------------------------------|
| categoryId | String | FK to Category (PK part 1)   |
| judgeId    | String | FK to Judge (PK part 2)      |

**Primary Key**: `[categoryId, judgeId]`

## Certification Tables

### Certification

**Purpose**: Track certification workflow for categories

| Field             | Type      | Description                           |
|------------------|-----------|---------------------------------------|
| id               | String    | Primary key (CUID)                    |
| categoryId       | String    | FK to Category                        |
| contestId        | String    | FK to Contest                         |
| eventId          | String    | FK to Event                           |
| status           | Enum      | Certification status                  |
| currentStep      | Int       | Current step (1-4)                    |
| totalSteps       | Int       | Total steps (default: 4)              |
| judgeCertified   | Boolean   | Judge certification complete          |
| tallyCertified   | Boolean   | Tally certification complete          |
| auditorCertified | Boolean   | Auditor certification complete        |
| boardApproved    | Boolean   | Board approval complete               |
| certifiedAt      | DateTime? | Completion timestamp                  |
| rejectionReason  | String?   | Reason if rejected                    |
| comments         | String?   | Additional comments                   |
| createdAt        | DateTime  | Creation timestamp                    |
| updatedAt        | DateTime  | Update timestamp                      |

**Enum CertificationStatus**:
- PENDING
- IN_PROGRESS
- CERTIFIED
- REJECTED

**Unique Constraint**: `[categoryId, contestId, eventId]`

### JudgeCertification

**Purpose**: Judge certifies their scores for a category

| Field          | Type      | Description                  |
|---------------|-----------|------------------------------|
| id            | String    | Primary key (CUID)           |
| categoryId    | String    | FK to Category               |
| judgeId       | String    | FK to Judge                  |
| signatureName | String    | Judge's signature            |
| certifiedAt   | DateTime  | Certification timestamp      |

**Unique Constraint**: `[categoryId, judgeId]`

### CategoryCertification

**Purpose**: Role-based certification for category results

| Field          | Type      | Description                  |
|---------------|-----------|------------------------------|
| id            | String    | Primary key (CUID)           |
| categoryId    | String    | FK to Category               |
| role          | String    | Certifier role               |
| userId        | String    | FK to User                   |
| signatureName | String?   | Certifier signature          |
| certifiedAt   | DateTime  | Certification timestamp      |
| comments      | String?   | Comments                     |

**Unique Constraint**: `[categoryId, role]`

## Assignment Tables

### Assignment

**Purpose**: Assign judges to categories/contests

| Field       | Type      | Description                           |
|------------|-----------|---------------------------------------|
| id         | String    | Primary key (CUID)                    |
| judgeId    | String    | FK to Judge                           |
| categoryId | String?   | FK to Category (nullable)             |
| contestId  | String    | FK to Contest                         |
| eventId    | String    | FK to Event                           |
| status     | Enum      | Assignment status                     |
| assignedAt | DateTime  | Assignment timestamp                  |
| assignedBy | String    | FK to User who assigned               |
| notes      | String?   | Assignment notes                      |
| priority   | Int       | Assignment priority                   |

**Enum AssignmentStatus**:
- PENDING
- ACTIVE
- COMPLETED
- CANCELLED

**Unique Constraint**: `[judgeId, categoryId]`

**Indexes**:
- `judgeId + status`
- `contestId + categoryId`

### RoleAssignment

**Purpose**: Assign roles to users for specific events/contests/categories

| Field       | Type      | Description                      |
|------------|-----------|----------------------------------|
| id         | String    | Primary key (CUID)               |
| userId     | String    | FK to User                       |
| role       | String    | Assigned role                    |
| contestId  | String?   | FK to Contest (nullable)         |
| eventId    | String?   | FK to Event (nullable)           |
| categoryId | String?   | FK to Category (nullable)        |
| assignedAt | DateTime  | Assignment timestamp             |
| assignedBy | String    | FK to User who assigned          |
| isActive   | Boolean   | Active status                    |

**Unique Constraint**: `[userId, role, contestId, eventId, categoryId]`

**Indexes**:
- `userId + role + isActive`
- `categoryId + role + isActive`

## Audit and Logging Tables

### ActivityLog

**Purpose**: Track all user activities

| Field        | Type      | Description                     |
|-------------|-----------|--------------------------------|
| id          | String    | Primary key (CUID)             |
| userId      | String?   | FK to User (nullable)          |
| userName    | String?   | User name snapshot             |
| userRole    | String?   | User role snapshot             |
| action      | String    | Action performed               |
| resourceType| String?   | Resource type                  |
| resourceId  | String?   | Resource ID                    |
| ipAddress   | String?   | Client IP address              |
| userAgent   | String?   | Client user agent              |
| logLevel    | Enum      | Log level                      |
| details     | Json?     | Additional details             |
| createdAt   | DateTime  | Log timestamp                  |

**Enum LogLevel**:
- ERROR
- WARN
- INFO
- DEBUG

### AuditLog

**Purpose**: Detailed audit trail for compliance

| Field       | Type      | Description                     |
|-----------|-----------|--------------------------------|
| id        | String    | Primary key (CUID)             |
| userId    | String    | FK to User                     |
| action    | String    | Action type                    |
| entityType| String    | Entity type                    |
| entityId  | String    | Entity ID                      |
| changes   | String?   | JSON string of changes         |
| ipAddress | String?   | Client IP                      |
| userAgent | String?   | Client user agent              |
| timestamp | DateTime  | Audit timestamp                |

**Indexes**:
- `userId`
- `action`
- `entityType + entityId`
- `timestamp`

### PerformanceLog

**Purpose**: Track API performance metrics

| Field        | Type      | Description                     |
|------------|-----------|--------------------------------|
| id         | String    | Primary key (CUID)             |
| endpoint   | String    | API endpoint                   |
| method     | String    | HTTP method                    |
| responseTime| Int      | Response time (ms)             |
| statusCode | Int       | HTTP status code               |
| userId     | String?   | FK to User (nullable)          |
| ipAddress  | String?   | Client IP                      |
| userAgent  | String?   | Client user agent              |
| createdAt  | DateTime  | Log timestamp                  |

## File Management Tables

### File

**Purpose**: Manage uploaded files

| Field        | Type      | Description                     |
|------------|-----------|--------------------------------|
| id         | String    | Primary key (CUID)             |
| filename   | String    | Stored filename                |
| originalName| String   | Original filename              |
| mimeType   | String    | MIME type                      |
| size       | Int       | File size (bytes)              |
| path       | String    | File path                      |
| category   | Enum      | File category                  |
| uploadedBy | String    | FK to User                     |
| uploadedAt | DateTime  | Upload timestamp               |
| isPublic   | Boolean   | Public access flag             |
| checksum   | String?   | File checksum                  |
| eventId    | String?   | FK to Event (nullable)         |
| contestId  | String?   | FK to Contest (nullable)       |
| categoryId | String?   | FK to Category (nullable)      |

**Enum FileCategory**:
- CONTESTANT_IMAGE
- JUDGE_IMAGE
- DOCUMENT
- TEMPLATE
- REPORT
- BACKUP
- OTHER

### ScoreFile

**Purpose**: Uploaded score sheets

| Field        | Type      | Description                     |
|------------|-----------|--------------------------------|
| id         | String    | Primary key (CUID)             |
| categoryId | String    | FK to Category                 |
| judgeId    | String    | FK to Judge                    |
| contestantId| String?  | FK to Contestant (nullable)    |
| fileName   | String    | File name                      |
| fileType   | String    | File type                      |
| filePath   | String    | Storage path                   |
| fileSize   | Int       | File size (bytes)              |
| uploadedById| String   | FK to User                     |
| status     | String    | Approval status                |
| notes      | String?   | Notes                          |
| createdAt  | DateTime  | Upload timestamp               |
| updatedAt  | DateTime  | Update timestamp               |

**Indexes**:
- `categoryId`
- `judgeId`
- `contestantId`
- `status`

## Settings Tables

### SystemSetting

**Purpose**: Application-wide settings

| Field       | Type      | Description                     |
|-----------|-----------|--------------------------------|
| id        | String    | Primary key (CUID)             |
| key       | String    | Setting key (unique)           |
| value     | String    | Setting value                  |
| description| String?  | Setting description            |
| category  | String?   | Setting category               |
| updatedAt | DateTime  | Update timestamp               |
| updatedBy | String?   | FK to User who updated         |

**Example Settings**:
- `app.name` - Application name
- `app.timezone` - Default timezone
- `scoring.allowNegative` - Allow negative scores

### SecuritySetting

**Purpose**: Security-related settings

| Field                       | Type      | Default | Description                    |
|---------------------------|-----------|---------|--------------------------------|
| passwordMinLength         | Int       | 8       | Minimum password length        |
| passwordRequireUppercase  | Boolean   | true    | Require uppercase              |
| passwordRequireLowercase  | Boolean   | true    | Require lowercase              |
| passwordRequireNumbers    | Boolean   | true    | Require numbers                |
| passwordRequireSymbols    | Boolean   | false   | Require symbols                |
| maxLoginAttempts          | Int       | 5       | Max failed login attempts      |
| lockoutDurationMinutes    | Int       | 30      | Account lockout duration       |
| sessionTimeoutMinutes     | Int       | 480     | Session timeout                |

### ThemeSetting

**Purpose**: Theme customization

| Field          | Type      | Default    | Description              |
|---------------|-----------|------------|--------------------------|
| primaryColor  | String    | #2563eb    | Primary brand color      |
| secondaryColor| String    | #1e40af    | Secondary brand color    |
| logoPath      | String?   | null       | Logo image path          |
| faviconPath   | String?   | null       | Favicon path             |

## Template Tables

### CategoryTemplate

**Purpose**: Reusable category templates

| Field       | Type      | Description                     |
|-----------|-----------|--------------------------------|
| id        | String    | Primary key (CUID)             |
| name      | String    | Template name                  |
| description| String?  | Template description           |
| createdAt | DateTime  | Creation timestamp             |
| updatedAt | DateTime  | Update timestamp               |

### TemplateCriterion

**Purpose**: Criteria within a category template

| Field      | Type      | Description                     |
|----------|-----------|--------------------------------|
| id       | String    | Primary key (CUID)             |
| templateId| String   | FK to CategoryTemplate         |
| name     | String    | Criterion name                 |
| maxScore | Int       | Maximum score                  |

## Notification Tables

### Notification

**Purpose**: User notifications

| Field     | Type      | Description                     |
|---------|-----------|--------------------------------|
| id      | String    | Primary key (CUID)             |
| userId  | String    | FK to User                     |
| type    | Enum      | Notification type              |
| title   | String    | Notification title             |
| message | String    | Notification message           |
| link    | String?   | Link URL                       |
| read    | Boolean   | Read status                    |
| readAt  | DateTime? | Read timestamp                 |
| metadata| String?   | Additional metadata            |
| createdAt| DateTime | Creation timestamp             |

**Enum NotificationType**:
- INFO
- SUCCESS
- WARNING
- ERROR
- SYSTEM

**Indexes**:
- `userId + read`
- `userId + createdAt`

## Backup Tables

### BackupLog

**Purpose**: Track backup operations

| Field        | Type      | Description                     |
|------------|-----------|--------------------------------|
| id         | String    | Primary key (CUID)             |
| type       | String    | Backup type                    |
| status     | String    | Backup status                  |
| startedAt  | DateTime  | Start timestamp                |
| completedAt| DateTime? | Completion timestamp           |
| duration   | Int?      | Duration (seconds)             |
| size       | BigInt?   | Backup size (bytes)            |
| location   | String    | Backup location                |
| errorMessage| String?  | Error message if failed        |
| metadata   | Json?     | Additional metadata            |

**Indexes**:
- `type + status`
- `startedAt`

## Custom Fields (Extensibility)

### CustomField

**Purpose**: Define custom fields for entities

| Field        | Type      | Description                     |
|------------|-----------|--------------------------------|
| id         | String    | Primary key (CUID)             |
| name       | String    | Field name                     |
| key        | String    | Unique field key               |
| type       | Enum      | Field type                     |
| entityType | String    | Target entity type             |
| required   | Boolean   | Required flag                  |
| defaultValue| String?  | Default value                  |
| options    | Json?     | Options for select types       |
| validation | Json?     | Validation rules               |
| order      | Int       | Display order                  |
| active     | Boolean   | Active status                  |

**Enum CustomFieldType**:
- TEXT
- TEXT_AREA
- NUMBER
- DATE
- BOOLEAN
- SELECT
- MULTI_SELECT
- EMAIL
- URL
- PHONE

**Unique Constraint**: `[key, entityType]`

### CustomFieldValue

**Purpose**: Store custom field values

| Field         | Type      | Description                     |
|-------------|-----------|--------------------------------|
| id          | String    | Primary key (CUID)             |
| customFieldId| String   | FK to CustomField              |
| entityId    | String    | Entity ID                      |
| value       | String?   | Field value                    |

**Unique Constraint**: `[customFieldId, entityId]`

## Database Optimization

### Indexes

Strategic indexes are placed on:
- Foreign keys
- Frequently queried fields
- Composite keys for common queries
- Unique constraints

### Connection Pooling

```
DATABASE_URL="postgresql://user:password@host:5432/db?connection_limit=10&pool_timeout=10&connect_timeout=5"
```

**Recommended Pool Sizes**:
- Development: 5-10
- Production (small): 10-20
- Production (large): 20-50

### Query Optimization

1. **Eager Loading**: Use Prisma `include` for related data
2. **Select Fields**: Only fetch required fields
3. **Pagination**: Use `skip` and `take` for large datasets
4. **Transactions**: Use for multi-step operations

## Migrations

Prisma manages migrations automatically:

```bash
# Generate migration
npx prisma migrate dev --name add_custom_fields

# Apply migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

## Data Integrity

### Referential Integrity

- `onDelete: Cascade` - Delete related records
- `onDelete: SetNull` - Set foreign key to null
- `onDelete: Restrict` - Prevent deletion

### Constraints

- **Unique constraints** prevent duplicates
- **Check constraints** enforce business rules
- **NOT NULL** ensures required data

## Backup Strategy

1. **Full backups**: Daily at 2 AM
2. **Incremental backups**: Every 4 hours
3. **Retention**: 30 days
4. **Location**: `/backups/` directory

## Related Documentation

- [System Architecture](./overview.md)
- [Backend Architecture](./backend-architecture.md)
- [Database Optimization](../09-performance/database-optimization.md)
- [Backup Procedures](../03-administration/backup-restore.md)
