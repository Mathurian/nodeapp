# Advanced Features Guide

**Last Updated:** January 27, 2026

Comprehensive documentation for advanced and enterprise features available in Event Manager.

## Table of Contents

- [Feature Flags System](#feature-flags-system)
- [Dynamic CRUD Permissions](#dynamic-crud-permissions)
- [Soft Delete Support](#soft-delete-support)
- [Backup & Disaster Recovery](#backup--disaster-recovery)
- [Performance Monitoring](#performance-monitoring)
- [Cache Management](#cache-management)
- [Activity Logging System](#activity-logging-system)
- [Email System](#email-system)
- [Workflow Management](#workflow-management)
- [Custom Fields System](#custom-fields-system)
- [File Management System](#file-management-system)
- [Search Functionality](#search-functionality)
- [Emcee Script Management](#emcee-script-management)
- [Rate Limiting Configuration](#rate-limiting-configuration)
- [Theme System](#theme-system)
- [SMS Notifications](#sms-notifications)
- [Webhook System](#webhook-system)

---

## Feature Flags System

### Overview
The Feature Flags system enables controlled feature rollouts, A/B testing, and gradual deployments without code changes.

### Strategies
1. **ON** - Feature enabled for all users
2. **OFF** - Feature disabled for all users
3. **PERCENTAGE** - Enable for a percentage of users
4. **USER_LIST** - Enable for specific user IDs
5. **TENANT_LIST** - Enable for specific tenants
6. **GRADUAL** - Gradual rollout with percentage increase over time

### Database Schema
```prisma
model FeatureFlag {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  strategy    String   // ON, OFF, PERCENTAGE, USER_LIST, TENANT_LIST, GRADUAL
  config      Json?    // Strategy-specific configuration
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Usage Example
```typescript
// Check if feature is enabled for user
const isEnabled = await featureFlagService.isEnabled('new-scoring-ui', {
  userId: user.id,
  tenantId: user.tenantId
});

if (isEnabled) {
  // Show new scoring interface
}
```

### Configuration
- **Access Level:** SUPER_ADMIN, ADMIN
- **Location:** `/settings/feature-flags` (Admin UI)
- **API Endpoint:** `POST /api/feature-flags`

### Use Cases
- Rolling out new features gradually
- A/B testing different UI approaches
- Tenant-specific feature enablement
- Emergency feature disablement

---

## Dynamic CRUD Permissions

### Overview
Database-driven permission system that allows runtime configuration of Create, Read, Update, Delete permissions without code deployments.

### Features
- Toggle between hardcoded and dynamic permissions
- Per-role permission configuration
- Per-resource permission control
- Runtime permission changes
- Audit trail for permission changes

### Database Schema
```prisma
model Permission {
  id         String   @id @default(cuid())
  resource   String   // events, contests, scores, etc.
  action     String   // create, read, update, delete
  role       String   // ADMIN, ORGANIZER, JUDGE, etc.
  allowed    Boolean  @default(true)
  conditions Json?    // Additional permission conditions
  tenantId   String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### Configuration
- **Access Level:** SUPER_ADMIN only
- **Location:** `/settings/permissions` (Admin UI)
- **API Endpoint:** `GET/POST/PUT /api/permissions`

### Implementation
```typescript
// Check dynamic permission
const hasPermission = await permissionService.check({
  userId: user.id,
  resource: 'events',
  action: 'delete',
  tenantId: user.tenantId
});
```

### Use Cases
- Customizing permissions per tenant
- Temporarily restricting dangerous operations
- Granting special access to specific roles
- Implementing custom permission rules

---

## Soft Delete Support

### Overview
Records are marked as deleted rather than permanently removed, enabling data recovery and audit trail preservation.

### Supported Entities
- Events
- Contests
- Categories
- Contestants
- Scores (with certification implications)

### Implementation
All soft-deletable entities include:
```prisma
model Event {
  // ... other fields
  deletedAt DateTime?
  deletedBy String?   // User ID who deleted
}
```

### Query Behavior
```typescript
// By default, soft-deleted records are excluded
const events = await prisma.event.findMany({
  where: { deletedAt: null }
});

// Include deleted records
const allEvents = await prisma.event.findMany({
  where: {} // No filter
});

// Only deleted records
const deletedEvents = await prisma.event.findMany({
  where: { deletedAt: { not: null } }
});
```

### Restoration
```typescript
// Restore a soft-deleted record
await prisma.event.update({
  where: { id: eventId },
  data: {
    deletedAt: null,
    deletedBy: null
  }
});
```

### Configuration
- **Access Level:** ADMIN, ORGANIZER (delete), SUPER_ADMIN (restore)
- **Retention Period:** Configurable per tenant (default: 90 days)
- **Permanent Deletion:** Automated cleanup job or manual trigger

---

## Backup & Disaster Recovery

### Overview
Comprehensive backup and disaster recovery system with automated backups, point-in-time recovery, and disaster recovery procedures.

### Features
- **Automated Backups:** Scheduled daily/weekly/monthly backups
- **Manual Backups:** On-demand backup creation
- **Point-in-Time Recovery:** Restore to specific timestamp
- **Backup Verification:** Automated integrity checks
- **Disaster Recovery Plans:** Pre-configured recovery procedures

### Pages
- **BackupManagementPage** - `/admin/backups`
- **DisasterRecoveryPage** - `/admin/disaster-recovery`

### Backup Types
1. **Full Backup:** Complete database snapshot
2. **Incremental Backup:** Changes since last backup
3. **Transaction Log Backup:** Point-in-time recovery capability

### Configuration
```typescript
interface BackupConfig {
  schedule: 'daily' | 'weekly' | 'monthly';
  retention: number; // Days to retain backups
  location: string; // S3, Azure Blob, Local
  encryption: boolean;
  compression: boolean;
}
```

### Recovery Process
1. Navigate to `/admin/disaster-recovery`
2. Select backup to restore
3. Choose recovery point
4. Confirm restoration
5. System automatically restores and validates

### Access Level
- **SUPER_ADMIN:** Full backup management
- **ADMIN:** View backups, trigger manual backups

---

## Performance Monitoring

### Overview
Real-time performance metrics, monitoring dashboards, and business intelligence for system health and usage analytics.

### Components
- **PerformancePage** - `/admin/performance`
- **MetricsService** - Real-time metrics collection
- **BusinessMetricsCollector** - Business KPI tracking

### Metrics Tracked
1. **System Metrics:**
   - Response times (avg, p50, p95, p99)
   - Request throughput (req/sec)
   - Error rates
   - Database query performance
   - Cache hit rates
   - Memory and CPU usage

2. **Business Metrics:**
   - Active users (DAU, MAU)
   - Events created per day
   - Scores submitted
   - Certification completion rates
   - User engagement metrics

3. **Security Metrics:**
   - Failed login attempts
   - Rate limit hits
   - Permission denials
   - Suspicious activity alerts

### Prometheus Integration
```typescript
// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Dashboards
- **Overview Dashboard:** High-level system health
- **Performance Dashboard:** Detailed performance metrics
- **Business Dashboard:** Usage and engagement analytics
- **Security Dashboard:** Security events and alerts

### Alerting
Configure alerts for:
- Response time > 2 seconds
- Error rate > 5%
- Database connections exhausted
- Disk space < 10%

### Access Level
- **SUPER_ADMIN, ADMIN:** Full access
- **ORGANIZER:** Business metrics only

---

## Cache Management

### Overview
Redis-based caching system with management UI for cache inspection, invalidation, and performance optimization.

### Features
- **CacheManagementPage** - `/admin/cache`
- Cache key inspection
- Manual cache invalidation
- Cache statistics and hit rates
- TTL management

### Cache Strategies
1. **Time-Based Expiration (TTL)**
   ```typescript
   await cache.set('key', value, 3600); // 1 hour TTL
   ```

2. **Tag-Based Invalidation**
   ```typescript
   await cache.setWithTags('event:123', data, ['events', 'tenant:abc']);
   await cache.invalidateTag('events'); // Invalidates all event caches
   ```

3. **Dependency-Based Invalidation**
   ```typescript
   // Automatically invalidate related caches
   await eventService.update(eventId, data); // Also invalidates contest, category caches
   ```

### Cached Entities
- User sessions
- User permissions
- Event data
- Contest and category data
- Leaderboards and rankings
- Notification preferences
- Feature flags

### Cache Keys Pattern
```
{tenant}:{resource}:{id}:{version}
Example: tenant_abc:event:123:v2
```

### Management Operations
- **View All Keys:** Browse cache contents
- **Inspect Key:** View value and metadata
- **Delete Key:** Remove specific cache entry
- **Flush Pattern:** Remove all keys matching pattern
- **View Statistics:** Hit rate, miss rate, memory usage

### Access Level
- **SUPER_ADMIN, ADMIN:** Full cache management

---

## Activity Logging System

### Overview
Comprehensive activity and audit logging system that tracks all user actions, system events, and security-relevant activities.

### Database Schema
```prisma
model ActivityLog {
  id          String   @id @default(cuid())
  tenantId    String?
  userId      String?
  action      String   // login, create_event, delete_score, etc.
  resource    String?  // events, scores, users, etc.
  resourceId  String?  // ID of affected resource
  severity    String   // INFO, WARNING, ERROR, CRITICAL
  message     String
  metadata    Json?    // Additional context
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  user        User?    @relation(fields: [userId], references: [id])
  tenant      Tenant?  @relation(fields: [tenantId], references: [id])
}
```

### Severity Levels
- **INFO:** Normal operations (login, create, update)
- **WARNING:** Potentially suspicious activity
- **ERROR:** Failed operations, validation errors
- **CRITICAL:** Security breaches, data loss, system failures

### Logged Actions
1. **Authentication:**
   - Login attempts (success/failure)
   - Logout
   - Password changes
   - MFA setup/disable

2. **Data Operations:**
   - Create, Read, Update, Delete operations
   - Bulk operations
   - Import/Export operations

3. **Permission Changes:**
   - Role assignments
   - Permission grants/revokes
   - Feature flag changes

4. **Security Events:**
   - Failed permission checks
   - Rate limit violations
   - Suspicious patterns

### Querying Logs
```typescript
// Get recent activity for user
const logs = await activityLogService.findByUser(userId, {
  limit: 100,
  severity: ['WARNING', 'ERROR', 'CRITICAL']
});

// Search logs by action
const loginAttempts = await activityLogService.search({
  action: 'login',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-27')
});
```

### UI Access
- **Page:** `/admin/activity-logs`
- **Filters:** User, action, severity, date range, resource
- **Export:** CSV, JSON formats

### Retention Policy
- INFO logs: 90 days
- WARNING logs: 180 days
- ERROR/CRITICAL logs: 1 year
- Configurable per tenant

### Access Level
- **SUPER_ADMIN, ADMIN:** Full access
- **AUDITOR:** Read-only access
- **BOARD:** Read access to critical events

---

## Email System

### Overview
Comprehensive email delivery system with templates, scheduling, and delivery tracking.

### Features
- Email template management
- Variable substitution
- HTML and plain text support
- Email scheduling
- Delivery status tracking
- Email digests (daily/weekly summaries)

### Email Templates
```typescript
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[]; // Available template variables
  category: 'transactional' | 'notification' | 'marketing';
}
```

### Common Email Types
1. **Transactional:**
   - Account verification
   - Password reset
   - MFA setup confirmation

2. **Notifications:**
   - Score submitted
   - Contest certified
   - Event reminder
   - Results published

3. **Digests:**
   - Daily activity summary
   - Weekly performance report
   - Monthly analytics

### Sending Emails
```typescript
await emailService.send({
  to: user.email,
  template: 'score-submitted',
  variables: {
    userName: user.name,
    eventName: event.name,
    score: score.total
  }
});
```

### Delivery Tracking
```prisma
model EmailDelivery {
  id           String   @id @default(cuid())
  to           String
  subject      String
  template     String?
  status       String   // PENDING, SENT, DELIVERED, FAILED, BOUNCED
  sentAt       DateTime?
  deliveredAt  DateTime?
  openedAt     DateTime?
  clickedAt    DateTime?
  error        String?
  metadata     Json?
}
```

### Configuration
- **SMTP Settings:** Host, port, credentials
- **From Address:** Default sender
- **Reply-To Address:** Support email
- **Rate Limiting:** Prevent spam
- **Unsubscribe Handling:** Respect user preferences

### Access Level
- **ADMIN:** Configure email settings
- **ORGANIZER:** Send event-related emails
- All users: Receive emails based on preferences

---

## Workflow Management

### Overview
Customizable workflow system for automating multi-step processes like certification, approval chains, and event lifecycle management.

### Database Schema
```prisma
model WorkflowTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  steps       Json     // Array of workflow steps
  tenantId    String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model WorkflowInstance {
  id           String   @id @default(cuid())
  templateId   String
  resourceType String   // Event, Contest, Score, etc.
  resourceId   String
  currentStep  Int      @default(0)
  status       String   // PENDING, IN_PROGRESS, COMPLETED, FAILED
  data         Json?    // Workflow execution data
  completedAt  DateTime?
  createdAt    DateTime @default(now())
}
```

### Workflow Step Types
1. **Approval Step:** Requires user approval
2. **Automation Step:** Executes automatically
3. **Notification Step:** Sends notifications
4. **Conditional Step:** Branches based on conditions
5. **Integration Step:** Calls external APIs

### Example: Certification Workflow
```json
{
  "name": "Score Certification Workflow",
  "steps": [
    {
      "type": "approval",
      "name": "Judge Certification",
      "approver": "JUDGE",
      "timeout": "24h"
    },
    {
      "type": "approval",
      "name": "Tally Master Verification",
      "approver": "TALLY_MASTER",
      "timeout": "12h"
    },
    {
      "type": "approval",
      "name": "Auditor Review",
      "approver": "AUDITOR",
      "timeout": "12h"
    },
    {
      "type": "approval",
      "name": "Board Approval",
      "approver": "BOARD",
      "timeout": "48h"
    },
    {
      "type": "notification",
      "name": "Notify Completion",
      "recipients": ["ALL_PARTICIPANTS"]
    }
  ]
}
```

### Usage
```typescript
// Create workflow instance
const workflow = await workflowService.start({
  templateId: 'certification-workflow',
  resourceType: 'Score',
  resourceId: scoreId
});

// Advance workflow
await workflowService.completeStep(workflow.id, {
  approved: true,
  comments: 'Looks good'
});
```

### Access Level
- **ADMIN:** Create and manage workflow templates
- **ORGANIZER:** View and monitor workflows
- Role-specific: Approve workflow steps

---

## Custom Fields System

### Overview
Extensible custom fields system that allows tenants to add additional fields to core entities without schema changes.

### Field Types
1. **TEXT** - Single-line text input
2. **TEXTAREA** - Multi-line text input
3. **NUMBER** - Numeric input
4. **DATE** - Date picker
5. **DATETIME** - Date and time picker
6. **BOOLEAN** - Checkbox
7. **SELECT** - Dropdown selection
8. **MULTI_SELECT** - Multiple selections
9. **URL** - URL input with validation
10. **EMAIL** - Email input with validation

### Database Schema
```prisma
model CustomField {
  id          String   @id @default(cuid())
  entityType  String   // Event, Contest, Contestant, Judge, etc.
  name        String
  label       String
  fieldType   String
  options     Json?    // For SELECT, MULTI_SELECT
  validation  Json?    // Validation rules
  required    Boolean  @default(false)
  order       Int      @default(0)
  tenantId    String
  isActive    Boolean  @default(true)
}

model CustomFieldValue {
  id            String   @id @default(cuid())
  customFieldId String
  entityId      String   // ID of Event, Contest, etc.
  value         String
  customField   CustomField @relation(fields: [customFieldId], references: [id])
}
```

### Validation Rules
```json
{
  "min": 0,
  "max": 100,
  "pattern": "^[A-Z0-9]+$",
  "minLength": 3,
  "maxLength": 50,
  "required": true
}
```

### Example Usage
```typescript
// Define custom field for contestants
await customFieldService.create({
  entityType: 'Contestant',
  name: 'schoolName',
  label: 'School Name',
  fieldType: 'TEXT',
  required: true,
  tenantId: tenant.id
});

// Set custom field value
await customFieldService.setValue({
  customFieldId: field.id,
  entityId: contestant.id,
  value: 'Springfield High School'
});
```

### UI Integration
- Dynamically renders custom fields in forms
- Validates custom field values
- Includes in exports and reports
- Searchable and filterable

### Access Level
- **ADMIN:** Create and manage custom field definitions
- **ORGANIZER:** View and use custom fields
- All roles: View custom field values (based on entity permissions)

---

## File Management System

### Overview
Secure file upload and management system with virus scanning, access control, and multiple storage backends.

### Features
- File upload with drag-and-drop
- Virus scanning (ClamAV integration)
- Access control middleware
- Multiple file categories
- Storage backends (Local, S3, Azure Blob)
- Image optimization and thumbnails
- PDF preview generation

### File Categories
- **AVATAR** - User profile pictures
- **CONTESTANT_BIO** - Contestant photos and bios
- **JUDGE_BIO** - Judge photos and credentials
- **EVENT_ASSET** - Event logos, banners
- **SCORE_ATTACHMENT** - Score-related documents
- **BACKUP** - System backups
- **EXPORT** - Report exports
- **IMPORT** - Bulk import files

### Database Schema
```prisma
model FileUpload {
  id           String   @id @default(cuid())
  filename     String
  originalName String
  mimeType     String
  size         Int
  path         String
  category     String
  tenantId     String?
  userId       String
  scanned      Boolean  @default(false)
  scanResult   String?  // CLEAN, INFECTED, ERROR
  metadata     Json?
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id])
}
```

### Upload Process
1. User selects file
2. Client-side validation (size, type)
3. Upload to server
4. Virus scan (async)
5. Store in configured backend
6. Generate thumbnails (images)
7. Update database record

### Access Control
```typescript
// Check file access permission
const canAccess = await fileService.checkAccess(fileId, userId);

// Download file with access check
router.get('/files/:id/download', authenticate, async (req, res) => {
  const file = await fileService.download(req.params.id, req.user.id);
  res.download(file.path, file.originalName);
});
```

### Configuration
- **Max File Size:** 10MB default (configurable)
- **Allowed Types:** Images, PDFs, documents, spreadsheets
- **Virus Scanning:** Optional but recommended for production
- **Storage Location:** Configurable (local, S3, Azure)
- **Retention Policy:** Auto-delete old files

### API Endpoints
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id` - Get file metadata
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file
- `GET /api/files` - List files (filtered)

### Access Level
- All authenticated users can upload files (with quotas)
- File access based on category and ownership
- ADMIN can view and manage all files

---

## Search Functionality

### Overview
Full-text search across all major entities with saved searches, search history, and advanced filtering.

### Features
- **SearchPage** - `/search` - Global search interface
- **SavedSearch** - Save frequent searches
- **SearchHistory** - Track and reuse past searches
- Full-text search across multiple entities
- Advanced filters and faceting
- Real-time search suggestions

### Searchable Entities
- Events
- Contests
- Categories
- Contestants
- Judges
- Users
- Scores
- Notifications

### Database Schema
```prisma
model SavedSearch {
  id          String   @id @default(cuid())
  userId      String
  name        String
  query       String
  filters     Json?
  isPublic    Boolean  @default(false)
  tenantId    String
  createdAt   DateTime @default(now())
}

model SearchHistory {
  id        String   @id @default(cuid())
  userId    String
  query     String
  filters   Json?
  resultCount Int?
  createdAt DateTime @default(now())
}
```

### Search Query Format
```typescript
interface SearchQuery {
  q: string;                    // Search text
  entities?: string[];          // Filter by entity types
  tenantId?: string;            // Filter by tenant
  dateFrom?: Date;              // Date range start
  dateTo?: Date;                // Date range end
  filters?: Record<string, any>; // Additional filters
  limit?: number;               // Results per page
  offset?: number;              // Pagination offset
}
```

### Example Usage
```typescript
// Global search
const results = await searchService.search({
  q: 'John Smith',
  entities: ['contestants', 'judges', 'users'],
  tenantId: tenant.id,
  limit: 20
});

// Save search
await searchService.saveSearch({
  userId: user.id,
  name: 'My Contestants',
  query: 'contestant status:active',
  filters: { role: 'CONTESTANT' }
});
```

### Search Syntax
- `"exact phrase"` - Exact match
- `john OR jane` - Either term
- `john AND smith` - Both terms
- `-excluded` - Exclude term
- `field:value` - Field-specific search

### Access Level
- All authenticated users can search
- Results filtered by user permissions
- Saved searches are per-user
- ADMIN can view all saved searches

---

## Emcee Script Management

### Overview
Script management system for emcees to prepare and deliver event presentations, announcements, and contestant introductions.

### Database Schema
```prisma
model EmceeScript {
  id          String   @id @default(cuid())
  tenantId    String
  eventId     String?
  contestId   String?
  categoryId  String?
  title       String
  content     String   // Rich text script
  type        String   // OPENING, CONTESTANT_INTRO, AWARD, CLOSING
  order       Int      @default(0)
  metadata    Json?
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  event       Event?   @relation(fields: [eventId], references: [id])
  contest     Contest? @relation(fields: [contestId], references: [id])
  category    Category? @relation(fields: [categoryId], references: [id])
}
```

### Script Types
1. **OPENING** - Event/contest opening remarks
2. **CONTESTANT_INTRO** - Individual contestant introduction
3. **CATEGORY_INTRO** - Category presentation
4. **AWARD** - Award presentation script
5. **CLOSING** - Event closing remarks
6. **TRANSITION** - Between-category transitions

### Template Variables
Scripts support variable substitution:
- `{{contestant.name}}` - Contestant name
- `{{contestant.bio}}` - Contestant bio
- `{{contestant.number}}` - Contestant number
- `{{category.name}}` - Category name
- `{{event.name}}` - Event name
- `{{current_time}}` - Current time
- `{{score.total}}` - Score (for award presentations)

### Example Script
```
Good evening everyone! Please welcome contestant number {{contestant.number}},
{{contestant.name}}, performing in the {{category.name}} category.

{{contestant.bio}}

Let's give them a warm round of applause!
```

### Features
- Rich text editor with formatting
- Template variable insertion
- Script templates library
- Print-friendly view
- Teleprompter mode
- Script timing estimates

### UI Access
- **Page:** `/emcee/scripts`
- **Contestant View:** `/emcee/contestants` (with bios)
- **Live Mode:** Full-screen teleprompter view

### Access Level
- **EMCEE:** Full access to scripts
- **ORGANIZER, ADMIN:** Create and manage scripts
- **JUDGE:** View contestant scripts during judging

---

## Rate Limiting Configuration

### Overview
Configurable rate limiting system to prevent abuse, ensure fair usage, and protect system resources.

### Features
- **RateLimitConfigPage** - `/admin/rate-limits`
- Per-tenant configuration
- Per-endpoint rate limits
- Per-user rate limits
- Tiered rate limiting
- Dynamic rate limit adjustment
- Rate limit bypass for trusted IPs

### Configuration Options
```typescript
interface RateLimitConfig {
  endpoint: string;         // API endpoint pattern
  windowMs: number;         // Time window in milliseconds
  maxRequests: number;      // Max requests in window
  tier: 'FREE' | 'PRO' | 'ENTERPRISE' | 'UNLIMITED';
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  bypassIPs?: string[];     // Trusted IPs
}
```

### Default Limits
| Tier | API Requests | Uploads | Login Attempts |
|------|-------------|---------|----------------|
| FREE | 100/hour | 10/day | 5/15min |
| PRO | 1000/hour | 100/day | 10/15min |
| ENTERPRISE | 10000/hour | Unlimited | 20/15min |
| UNLIMITED | No limit | No limit | 50/15min |

### Per-Endpoint Configuration
```typescript
const rateLimits = {
  'POST /api/scores': {
    windowMs: 60000,      // 1 minute
    maxRequests: 60       // 60 requests per minute
  },
  'POST /api/auth/login': {
    windowMs: 900000,     // 15 minutes
    maxRequests: 5        // 5 attempts per 15 minutes
  },
  'GET /api/*': {
    windowMs: 60000,      // 1 minute
    maxRequests: 100      // 100 requests per minute
  }
};
```

### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706400000
Retry-After: 60
```

### Bypass Conditions
- Trusted IP addresses (CDN, monitoring services)
- Internal service-to-service calls
- Emergency override (SUPER_ADMIN)
- Webhook callbacks

### Monitoring
- Real-time rate limit hits
- Top rate-limited users
- Endpoint usage statistics
- Abuse pattern detection

### Access Level
- **SUPER_ADMIN:** Configure all rate limits
- **ADMIN:** View rate limit statistics
- All users: Subject to rate limits

---

## Theme System

### Overview
Comprehensive theming system for customizing the application's look and feel, including dark/light mode and custom branding.

### Database Schema
```prisma
model ThemeSetting {
  id              String   @id @default(cuid())
  tenantId        String   @unique
  primaryColor    String   @default("#3B82F6")
  secondaryColor  String   @default("#10B981")
  accentColor     String   @default("#F59E0B")
  logoUrl         String?
  faviconUrl      String?
  fontFamily      String   @default("Inter")
  darkMode        Boolean  @default(false)
  customCSS       String?
  customJS        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant          Tenant   @relation(fields: [tenantId], references: [id])
}
```

### Theme Options
1. **Colors:**
   - Primary color (buttons, links)
   - Secondary color (accents, highlights)
   - Background colors
   - Text colors
   - Border colors

2. **Typography:**
   - Font family
   - Font sizes
   - Font weights
   - Line heights

3. **Branding:**
   - Logo upload
   - Favicon upload
   - Custom watermarks
   - Email branding

4. **Dark Mode:**
   - Auto-detect system preference
   - Manual toggle
   - Per-user preference
   - Scheduled dark mode (night hours)

### Custom CSS
Tenants can inject custom CSS for advanced customization:
```css
/* Example custom CSS */
.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
}

.navbar {
  backdrop-filter: blur(10px);
}
```

### Theme Preview
- Live preview before applying
- A/B testing different themes
- Rollback to previous theme
- Export/import theme configurations

### UI Access
- **Page:** `/settings/theme`
- **Preview Mode:** See changes before saving
- **Reset:** Restore default theme

### Access Level
- **ADMIN:** Full theme customization
- **ORGANIZER:** View theme settings
- All users: Use tenant's theme

---

## SMS Notifications

### Overview
SMS notification system for sending time-critical alerts and reminders to users.

### Features
- SMS template management
- Delivery status tracking
- International phone number support
- SMS scheduling
- Bulk SMS sending
- SMS/Email fallback

### Database Schema
```prisma
model SMSDelivery {
  id          String   @id @default(cuid())
  to          String   // Phone number
  message     String
  status      String   // PENDING, SENT, DELIVERED, FAILED
  provider    String   // Twilio, AWS SNS, etc.
  providerId  String?  // Provider message ID
  sentAt      DateTime?
  deliveredAt DateTime?
  error       String?
  cost        Float?   // SMS cost in cents
  createdAt   DateTime @default(now())
}
```

### Use Cases
1. **Time-Critical Notifications:**
   - Judge assignment reminders
   - Contest starting soon
   - Certification required
   - Emergency alerts

2. **MFA/Authentication:**
   - SMS verification codes
   - Two-factor authentication
   - Password reset codes

3. **Event Reminders:**
   - 24-hour event reminder
   - 1-hour pre-event notification
   - Results published notification

### SMS Templates
```typescript
const smsTemplates = {
  'judge-reminder': 'Hi {{name}}, reminder: You\'re judging {{category}} in {{time}}.',
  'mfa-code': 'Your verification code is: {{code}}. Valid for 10 minutes.',
  'event-starting': '{{event}} starts in 1 hour at {{location}}.'
};
```

### Configuration
- **Provider:** Twilio, AWS SNS, or custom
- **Sender ID:** Custom sender name/number
- **Rate Limiting:** Prevent spam
- **Cost Management:** Budget limits per tenant
- **Opt-Out:** Honor unsubscribe requests

### Sending SMS
```typescript
await smsService.send({
  to: user.phone,
  template: 'judge-reminder',
  variables: {
    name: user.name,
    category: category.name,
    time: '30 minutes'
  }
});
```

### Access Level
- **ADMIN:** Configure SMS settings
- **ORGANIZER:** Send event-related SMS
- System: Automated SMS for notifications

---

## Webhook System

### Overview
Webhook system for real-time event notifications to external systems and integrations.

### Database Schema
```prisma
model WebhookConfig {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  url         String
  events      String[] // Array of event types
  secret      String   // HMAC signature secret
  isActive    Boolean  @default(true)
  headers     Json?    // Custom headers
  retryPolicy Json?    // Retry configuration
  createdAt   DateTime @default(now())

  deliveries  WebhookDelivery[]
}

model WebhookDelivery {
  id          String   @id @default(cuid())
  webhookId   String
  event       String
  payload     Json
  status      String   // PENDING, SUCCESS, FAILED
  httpStatus  Int?
  response    String?
  attempt     Int      @default(1)
  deliveredAt DateTime?
  createdAt   DateTime @default(now())

  webhook     WebhookConfig @relation(fields: [webhookId], references: [id])
}
```

### Supported Events
- `event.created`
- `event.updated`
- `event.deleted`
- `contest.created`
- `score.submitted`
- `score.certified`
- `certification.completed`
- `user.created`
- `notification.sent`

### Webhook Payload
```json
{
  "event": "score.submitted",
  "timestamp": "2026-01-27T10:30:00Z",
  "data": {
    "scoreId": "clx123abc",
    "contestantId": "clx456def",
    "judgeId": "clx789ghi",
    "total": 95.5,
    "categoryId": "clx012jkl"
  },
  "tenant": {
    "id": "tenant123",
    "name": "Springfield Events"
  }
}
```

### Security
- **HMAC Signature:** Verify webhook authenticity
- **TLS/HTTPS Only:** Secure delivery
- **Secret Rotation:** Regular secret updates
- **IP Whitelisting:** Optional IP restrictions

### Retry Policy
```typescript
const retryPolicy = {
  maxAttempts: 3,
  backoff: 'exponential', // linear, exponential, fixed
  initialDelay: 1000,     // 1 second
  maxDelay: 60000         // 1 minute
};
```

### UI Management
- **Page:** `/settings/webhooks`
- View delivery history
- Test webhook delivery
- Replay failed deliveries
- View delivery logs

### Access Level
- **ADMIN:** Create and manage webhooks
- **ORGANIZER:** View webhook logs
- System: Automatically deliver webhooks

---

## Feature Comparison Matrix

| Feature | Free | Pro | Enterprise |
|---------|------|-----|-----------|
| Feature Flags | ❌ | ✅ | ✅ |
| Dynamic Permissions | ❌ | ❌ | ✅ |
| Soft Delete | ✅ | ✅ | ✅ |
| Automated Backups | Manual | Daily | Hourly |
| Performance Monitoring | Basic | Advanced | Custom |
| Cache Management | ❌ | ✅ | ✅ |
| Activity Logging | 30 days | 90 days | Unlimited |
| Email System | 100/day | 1000/day | Unlimited |
| Custom Workflows | ❌ | 3 | Unlimited |
| Custom Fields | 5 | 20 | Unlimited |
| File Storage | 1GB | 50GB | Unlimited |
| Search History | 7 days | 30 days | Unlimited |
| Emcee Scripts | ✅ | ✅ | ✅ |
| Rate Limiting | Basic | Custom | Custom |
| Custom Theme | ❌ | ✅ | ✅ |
| SMS Notifications | ❌ | 100/month | Unlimited |
| Webhooks | ❌ | 5 | Unlimited |

---

## Configuration Summary

### SUPER_ADMIN Only
- Feature Flags
- Dynamic Permissions
- Rate Limiting Configuration
- System-wide settings

### ADMIN Access
- Backup & Disaster Recovery
- Performance Monitoring
- Cache Management
- Activity Logs
- Email Configuration
- Workflow Templates
- Custom Fields
- File Management
- Theme System
- Webhook Configuration

### ORGANIZER Access
- Emcee Scripts
- Search and Saved Searches
- Email sending (event-related)
- View-only access to most admin features

---

## Getting Started with Advanced Features

### 1. Enable Feature Flags
```bash
# Access feature flags page
Navigate to: /admin/feature-flags

# Create a new flag
Name: new-scoring-ui
Strategy: PERCENTAGE
Config: { "percentage": 10 }
```

### 2. Configure Backups
```bash
# Access backup settings
Navigate to: /admin/backups

# Configure schedule
Schedule: Daily at 2:00 AM
Retention: 30 days
Location: S3
```

### 3. Set Up Webhooks
```bash
# Access webhook configuration
Navigate to: /settings/webhooks

# Add webhook
URL: https://your-api.com/webhooks/event-manager
Events: score.certified, certification.completed
Secret: [auto-generated]
```

### 4. Customize Theme
```bash
# Access theme settings
Navigate to: /settings/theme

# Upload logo and set colors
Primary Color: #3B82F6
Upload Logo: company-logo.png
Enable Dark Mode: Yes
```

---

## API Documentation

For detailed API documentation on these advanced features, see:
- [API Reference](04-API-REFERENCE.md)
- [Webhook API](04-API-REFERENCE.md#webhooks)
- [File Upload API](04-API-REFERENCE.md#file-uploads)
- [Search API](04-API-REFERENCE.md#search)

---

## Support and Resources

- **Documentation:** `/docs/14-ADVANCED-FEATURES.md`
- **Admin Guide:** [13-ADMIN-GUIDE.md](13-ADMIN-GUIDE.md)
- **Architecture:** [01-ARCHITECTURE.md](01-ARCHITECTURE.md)
- **Security:** [07-SECURITY.md](07-SECURITY.md)

---

**Last Updated:** January 27, 2026
**Version:** 1.0.0
**Status:** Production Ready
