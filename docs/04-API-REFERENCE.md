# API Reference

Complete REST API and WebSocket reference for Event Manager.

## Table of Contents

- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Pagination](#pagination)
- [Authentication Endpoints](#authentication-endpoints)
- [Event Management](#event-management)
- [Contest Management](#contest-management)
- [Category Management](#category-management)
- [Scoring Endpoints](#scoring-endpoints)
- [Certification Endpoints](#certification-endpoints)
- [User Management](#user-management)
- [Reporting Endpoints](#reporting-endpoints)
- [WebSocket Events](#websocket-events)

## API Overview

### Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

### API Documentation

Interactive API documentation available at `/api-docs` (Swagger UI)

### Content Type

All requests and responses use `application/json` unless otherwise specified.

### Request Format

```http
POST /api/resource
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
X-CSRF-Token: <CSRF_TOKEN>

{
  "field": "value"
}
```

### Response Format

**Success Response**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Authentication

### JWT Token

All protected endpoints require JWT authentication.

**Header Format**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### CSRF Protection

Mutating requests (POST, PUT, PATCH, DELETE) require CSRF token.

**Get CSRF Token**:
```http
GET /api/csrf-token
```

**Include in Request**:
```http
X-CSRF-Token: <token>
```

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `AUTH_ERROR` | Authentication failed |
| `TOKEN_EXPIRED` | JWT token expired |
| `INVALID_TOKEN` | Invalid JWT token |
| `SESSION_VERSION_MISMATCH` | Session invalidated |
| `INSUFFICIENT_PERMISSIONS` | Lacking required permissions |
| `VALIDATION_ERROR` | Input validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `DUPLICATE_ENTRY` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

## Pagination

### Query Parameters

```http
GET /api/resource?page=1&limit=50&sortBy=createdAt&sortOrder=desc
```

**Parameters**:
- `page` (default: 1) - Page number
- `limit` (default: 50, max: 100) - Items per page
- `sortBy` - Field to sort by
- `sortOrder` - `asc` or `desc`

### Response Format

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "totalPages": 5,
    "hasMore": true
  }
}
```

## Authentication Endpoints

### POST /api/auth/login

Login and receive JWT token.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clx123...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "ADMIN",
      "tenantId": "cly456..."
    }
  }
}
```

### GET /api/auth/profile

Get current user profile.

**Headers**: Requires `Authorization: Bearer <token>`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "clx123...",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "ADMIN",
    "tenantId": "cly456...",
    "mfaEnabled": true,
    "lastLoginAt": "2024-11-14T10:00:00Z"
  }
}
```

### POST /api/auth/forgot-password

Request password reset.

**Request**:
```json
{
  "email": "user@example.com"
}
```

### POST /api/auth/reset-password

Reset password with token.

**Request**:
```json
{
  "token": "reset_token_here",
  "newPassword": "NewSecurePassword123!"
}
```

### POST /api/auth/logout

Logout and invalidate session.

**Headers**: Requires `Authorization: Bearer <token>`

## Event Management

### GET /api/events

List all events for current tenant.

**Query Parameters**:
- `page`, `limit` - Pagination
- `archived` - Filter by archive status (true/false)
- `search` - Search by name/description

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "event123",
      "name": "Annual Competition 2024",
      "description": "Annual contest event",
      "startDate": "2024-12-01T00:00:00Z",
      "endDate": "2024-12-03T00:00:00Z",
      "location": "Convention Center",
      "archived": false,
      "isLocked": false,
      "createdAt": "2024-10-01T00:00:00Z"
    }
  ]
}
```

### POST /api/events

Create new event.

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "name": "Annual Competition 2024",
  "description": "Annual contest event",
  "startDate": "2024-12-01T00:00:00Z",
  "endDate": "2024-12-03T00:00:00Z",
  "location": "Convention Center",
  "maxContestants": 100,
  "contestantNumberingMode": "AUTO_INDEXED"
}
```

### GET /api/events/:id

Get single event by ID.

**Response**: Single event object

### PUT /api/events/:id

Update event.

**Roles**: ADMIN, ORGANIZER

**Request**: Partial event object

### DELETE /api/events/:id

Delete event.

**Roles**: ADMIN, ORGANIZER

### POST /api/events/:id/lock

Lock event to prevent modifications.

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "verificationSignature": "John Doe"
}
```

## Contest Management

### GET /api/contests

List contests (with event filter).

**Query Parameters**:
- `eventId` - Filter by event
- Other pagination params

### POST /api/contests

Create new contest.

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "eventId": "event123",
  "name": "Talent Competition",
  "description": "Showcase various talents",
  "contestantNumberingMode": "MANUAL"
}
```

### GET /api/contests/:id

Get contest details.

### PUT /api/contests/:id

Update contest.

### DELETE /api/contests/:id

Delete contest.

### GET /api/contests/:id/categories

Get categories for contest.

## Category Management

### GET /api/categories

List categories.

**Query Parameters**:
- `contestId` - Filter by contest

### POST /api/categories

Create category.

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "contestId": "contest123",
  "name": "Vocal Performance",
  "description": "Solo vocal performance",
  "scoreCap": 100,
  "timeLimit": 5,
  "contestantMin": 3,
  "contestantMax": 20
}
```

### POST /api/categories/:id/criteria

Add scoring criteria.

**Request**:
```json
{
  "name": "Technique",
  "maxScore": 50
}
```

### PUT /api/categories/:id/criteria/:criterionId

Update criterion.

### DELETE /api/categories/:id/criteria/:criterionId

Delete criterion.

## Scoring Endpoints

### POST /api/scoring/scores

Submit scores.

**Roles**: JUDGE, ADMIN, ORGANIZER

**Request**:
```json
{
  "categoryId": "cat123",
  "contestantId": "contestant456",
  "scores": [
    {
      "criterionId": "crit1",
      "score": 45
    },
    {
      "criterionId": "crit2",
      "score": 38
    }
  ],
  "comment": "Excellent performance"
}
```

### GET /api/scoring/categories/:categoryId/scores

Get all scores for category.

**Roles**: ADMIN, ORGANIZER, TALLY_MASTER, AUDITOR, BOARD

### PUT /api/scoring/scores/:scoreId

Update individual score.

**Roles**: JUDGE (own scores), ADMIN, ORGANIZER

### GET /api/scoring/judges/:judgeId/assignments

Get judge's assigned categories.

### POST /api/deductions

Request deduction.

**Roles**: JUDGE, TALLY_MASTER, ADMIN

**Request**:
```json
{
  "categoryId": "cat123",
  "contestantId": "contestant456",
  "amount": 5.0,
  "reason": "Time violation"
}
```

### GET /api/deductions/requests

List deduction requests.

### PUT /api/deductions/:id/approve

Approve deduction.

**Roles**: Head Judge, TALLY_MASTER, BOARD

## Certification Endpoints

### POST /api/judge-contestant-certifications

Certify contestant scores (Judge).

**Roles**: JUDGE

**Request**:
```json
{
  "categoryId": "cat123",
  "contestantId": "contestant456",
  "comments": "Scores verified"
}
```

### POST /api/category-certifications

Certify category (Tally Master).

**Roles**: TALLY_MASTER

**Request**:
```json
{
  "categoryId": "cat123",
  "signatureName": "Jane Smith",
  "comments": "Calculations verified"
}
```

### POST /api/auditor/certify-category

Audit and certify (Auditor).

**Roles**: AUDITOR

**Request**:
```json
{
  "categoryId": "cat123",
  "signatureName": "Auditor Name"
}
```

### POST /api/board/approve

Final board approval.

**Roles**: BOARD

**Request**:
```json
{
  "categoryId": "cat123",
  "signatureName": "Board Member"
}
```

### GET /api/certifications/status/:categoryId

Get certification status.

**Response**:
```json
{
  "success": true,
  "data": {
    "categoryId": "cat123",
    "judgeCertified": true,
    "tallyCertified": true,
    "auditorCertified": true,
    "boardApproved": false,
    "currentStep": 4,
    "totalSteps": 4
  }
}
```

## User Management

### GET /api/users

List users.

**Roles**: ADMIN, ORGANIZER

**Query Parameters**:
- `role` - Filter by role
- `isActive` - Filter by active status

### POST /api/users

Create user.

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "role": "JUDGE",
  "isActive": true
}
```

### GET /api/users/:id

Get user details.

### PUT /api/users/:id

Update user.

### DELETE /api/users/:id

Delete user (soft delete).

### POST /api/users/bulk-import

Bulk import users from CSV.

**Request**: `multipart/form-data` with CSV file

## Reporting Endpoints

### GET /api/reports/category/:categoryId

Generate category report.

**Query Parameters**:
- `format` - `pdf`, `excel`, `csv`
- `includeScores` - Include detailed scores
- `includeCertifications` - Include cert. status

### GET /api/reports/contest/:contestId

Generate contest report.

### GET /api/reports/event/:eventId

Generate event report.

### GET /api/reports/audit/:categoryId

Generate audit report.

**Roles**: AUDITOR, BOARD, ADMIN

### POST /api/export/scores

Export scores.

**Request**:
```json
{
  "categoryId": "cat123",
  "format": "excel",
  "includeComments": true
}
```

## Workflow Endpoints

### GET /api/workflows/templates

List all workflow templates.

**Roles**: ADMIN, ORGANIZER

**Query Parameters**:
- `page`, `limit` - Pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "wf_template_123",
      "name": "Category Certification Workflow",
      "description": "Standard 4-stage certification process",
      "steps": [...],
      "createdAt": "2024-11-01T00:00:00Z"
    }
  ]
}
```

### POST /api/workflows/templates

Create a new workflow template.

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "name": "Custom Workflow",
  "description": "Custom certification process",
  "steps": [
    {
      "name": "Initial Review",
      "order": 1,
      "requiredRole": "JUDGE",
      "autoAdvance": false
    }
  ]
}
```

**Response**: Created workflow template object

**Error Codes**:
- `400` - Invalid workflow configuration
- `401` - Not authenticated
- `403` - Insufficient permissions
- `500` - Server error

### GET /api/workflows/templates/:id

Get a single workflow template by ID.

**Response**: Single workflow template object

### PUT /api/workflows/templates/:id

Update a workflow template.

**Roles**: ADMIN, ORGANIZER

**Request**: Partial workflow template object

### DELETE /api/workflows/templates/:id

Delete a workflow template.

**Roles**: ADMIN

**Error Codes**:
- `400` - Template is in use
- `404` - Template not found

### POST /api/workflows/instances

Create a workflow instance from a template.

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "templateId": "wf_template_123",
  "entityType": "CATEGORY",
  "entityId": "cat123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "wf_instance_456",
    "currentStep": 1,
    "status": "IN_PROGRESS",
    "steps": [...]
  }
}
```

### GET /api/workflows/instances/:id

Get workflow instance details.

**Response**: Complete workflow instance with step history

### POST /api/workflows/instances/:id/advance

Advance workflow to the next step.

**Roles**: User with appropriate role for current step

**Request**:
```json
{
  "comment": "Review completed successfully",
  "signatureName": "John Doe"
}
```

**Response**: Updated workflow instance

### GET /api/workflows/instances/:entityType/:entityId

Get workflow instance for a specific entity.

**Path Parameters**:
- `entityType` - CATEGORY, CONTEST, EVENT
- `entityId` - Entity identifier

**Response**: Workflow instance or null if none exists

### GET /api/workflows/steps/:id

Get a specific workflow step.

**Response**: Step details with completion status

### PUT /api/workflows/steps/:id

Update a workflow step.

**Roles**: ADMIN, ORGANIZER

### DELETE /api/workflows/steps/:id

Delete a workflow step.

**Roles**: ADMIN

### GET /api/workflows/transitions

List all workflow transitions.

**Query Parameters**:
- `instanceId` - Filter by workflow instance

### POST /api/workflows/transitions

Create a workflow transition (manual step change).

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "instanceId": "wf_instance_456",
  "fromStep": 2,
  "toStep": 1,
  "reason": "Error correction needed"
}
```

### DELETE /api/workflows/transitions/:id

Delete a workflow transition.

**Roles**: ADMIN

## Custom Fields Endpoints

### GET /api/custom-fields/:entityType

List all custom fields for an entity type.

**Path Parameters**:
- `entityType` - user, event, contest, category, contestant, judge

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cf_123",
      "name": "Shirt Size",
      "fieldType": "SELECT",
      "options": ["S", "M", "L", "XL"],
      "required": false,
      "defaultValue": "M"
    }
  ]
}
```

### POST /api/custom-fields/:entityType

Create a custom field.

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "name": "Dietary Restrictions",
  "fieldType": "TEXT",
  "required": false,
  "helpText": "Any allergies or dietary needs"
}
```

**Field Types**: TEXT, TEXTAREA, NUMBER, DATE, SELECT, MULTI_SELECT, CHECKBOX, URL, EMAIL, PHONE

**Error Codes**:
- `400` - Invalid field configuration
- `409` - Field name already exists

### GET /api/custom-fields/:entityType/:id

Get a specific custom field.

**Response**: Custom field object

### PUT /api/custom-fields/:entityType/:id

Update a custom field.

**Roles**: ADMIN, ORGANIZER

**Request**: Partial custom field object

### DELETE /api/custom-fields/:entityType/:id

Delete a custom field.

**Roles**: ADMIN

**Note**: Deletes all associated field values

### POST /api/custom-fields/:entityType/bulk

Bulk create/update custom fields.

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "fields": [
    {
      "name": "Field 1",
      "fieldType": "TEXT"
    },
    {
      "name": "Field 2",
      "fieldType": "SELECT",
      "options": ["A", "B", "C"]
    }
  ]
}
```

### GET /api/custom-fields/:entityType/:entityId/values

Get custom field values for a specific entity.

**Response**:
```json
{
  "success": true,
  "data": {
    "cf_123": "Large",
    "cf_456": "Vegetarian"
  }
}
```

### PUT /api/custom-fields/:entityType/:entityId/values

Update custom field values for an entity.

**Request**:
```json
{
  "cf_123": "Medium",
  "cf_456": "Vegan"
}
```

## Event Logs Endpoints

### GET /api/events/logs

List all event logs (audit trail).

**Roles**: ADMIN, ORGANIZER, AUDITOR

**Query Parameters**:
- `page`, `limit` - Pagination
- `eventType` - Filter by event type
- `userId` - Filter by user
- `startDate`, `endDate` - Date range
- `entityType` - Filter by entity type
- `entityId` - Filter by entity ID

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "log_123",
      "eventType": "SCORE_UPDATED",
      "userId": "user_456",
      "userName": "Jane Smith",
      "entityType": "SCORE",
      "entityId": "score_789",
      "changes": {
        "before": { "value": 85 },
        "after": { "value": 90 }
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-11-14T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

### GET /api/events/logs/:id

Get a specific log entry.

**Response**: Complete log entry with full details

### GET /api/events/logs/export

Export event logs.

**Query Parameters**:
- Same filters as GET /api/events/logs
- `format` - csv, excel, json

**Response**: File download

### GET /api/events/logs/stats

Get event log statistics.

**Query Parameters**:
- `startDate`, `endDate` - Date range

**Response**:
```json
{
  "success": true,
  "data": {
    "totalEvents": 1543,
    "eventsByType": {
      "SCORE_UPDATED": 423,
      "USER_LOGIN": 156,
      "CATEGORY_CERTIFIED": 45
    },
    "activeUsers": 23,
    "peakActivityHour": 14
  }
}
```

### POST /api/events/logs/filter

Advanced log filtering with complex criteria.

**Request**:
```json
{
  "filters": {
    "eventTypes": ["SCORE_UPDATED", "SCORE_DELETED"],
    "userIds": ["user_123", "user_456"],
    "dateRange": {
      "start": "2024-11-01T00:00:00Z",
      "end": "2024-11-14T23:59:59Z"
    }
  },
  "page": 1,
  "limit": 50
}
```

### GET /api/events/logs/webhooks

List configured log webhooks.

**Roles**: ADMIN

**Response**: Array of webhook configurations

### POST /api/events/logs/webhooks

Create a webhook for event notifications.

**Roles**: ADMIN

**Request**:
```json
{
  "url": "https://example.com/webhook",
  "events": ["SCORE_CERTIFIED", "CATEGORY_CERTIFIED"],
  "active": true,
  "secret": "webhook_secret_key"
}
```

### PUT /api/events/logs/webhooks/:id

Update webhook configuration.

**Roles**: ADMIN

### DELETE /api/events/logs/webhooks/:id

Delete a webhook.

**Roles**: ADMIN

### POST /api/events/logs/webhooks/:id/test

Test a webhook by sending a sample payload.

**Roles**: ADMIN

**Response**: Test result with HTTP status and response

## Tenant Endpoints

### GET /api/tenants

List all tenants.

**Roles**: SUPER_ADMIN

**Query Parameters**:
- `active` - Filter by active status
- `page`, `limit` - Pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "tenant_123",
      "name": "Organization Name",
      "slug": "org-name",
      "active": true,
      "plan": "PROFESSIONAL",
      "maxUsers": 100,
      "maxEvents": 50,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/tenants

Create a new tenant.

**Roles**: SUPER_ADMIN

**Request**:
```json
{
  "name": "New Organization",
  "slug": "new-org",
  "plan": "PROFESSIONAL",
  "maxUsers": 100,
  "maxEvents": 50,
  "adminEmail": "admin@neworg.com"
}
```

### GET /api/tenants/:id

Get tenant details.

**Roles**: SUPER_ADMIN, ADMIN (own tenant)

**Response**: Complete tenant information

### PUT /api/tenants/:id

Update tenant configuration.

**Roles**: SUPER_ADMIN, ADMIN (own tenant, limited fields)

### DELETE /api/tenants/:id

Delete a tenant (soft delete).

**Roles**: SUPER_ADMIN

**Warning**: Archives all tenant data

### POST /api/tenants/:id/activate

Activate a tenant.

**Roles**: SUPER_ADMIN

### POST /api/tenants/:id/deactivate

Deactivate a tenant (suspends access).

**Roles**: SUPER_ADMIN

### GET /api/tenants/:id/stats

Get tenant usage statistics.

**Response**:
```json
{
  "success": true,
  "data": {
    "userCount": 45,
    "eventCount": 12,
    "activeEvents": 3,
    "storageUsed": "2.3 GB",
    "apiCallsThisMonth": 15420
  }
}
```

### GET /api/tenants/:id/usage

Get detailed usage metrics for billing.

**Roles**: SUPER_ADMIN, ADMIN (own tenant)

**Response**: Detailed usage breakdown

### PUT /api/tenants/:id/limits

Update tenant limits.

**Roles**: SUPER_ADMIN

**Request**:
```json
{
  "maxUsers": 200,
  "maxEvents": 100,
  "maxStorage": "10 GB"
}
```

## Disaster Recovery Endpoints

### GET /api/dr/config

Get DR configuration.

**Roles**: ADMIN

**Response**:
```json
{
  "success": true,
  "data": {
    "backupEnabled": true,
    "backupFrequency": "DAILY",
    "retentionDays": 30,
    "targets": [...],
    "lastBackup": "2024-11-14T02:00:00Z",
    "rto": 4,
    "rpo": 24
  }
}
```

### PUT /api/dr/config/:id

Update DR configuration.

**Roles**: ADMIN

**Request**:
```json
{
  "backupFrequency": "HOURLY",
  "retentionDays": 60,
  "rto": 2,
  "rpo": 1
}
```

### GET /api/dr/schedules

List backup schedules.

**Roles**: ADMIN

### POST /api/dr/schedules

Create a backup schedule.

**Roles**: ADMIN

**Request**:
```json
{
  "name": "Nightly Full Backup",
  "frequency": "DAILY",
  "time": "02:00",
  "backupType": "FULL",
  "enabled": true
}
```

### PUT /api/dr/schedules/:id

Update a backup schedule.

**Roles**: ADMIN

### DELETE /api/dr/schedules/:id

Delete a backup schedule.

**Roles**: ADMIN

### GET /api/dr/targets

List backup targets (destinations).

**Roles**: ADMIN

**Response**: Array of configured backup destinations

### POST /api/dr/targets

Add a backup target.

**Roles**: ADMIN

**Request**:
```json
{
  "type": "S3",
  "name": "AWS S3 Production",
  "config": {
    "bucket": "my-backups",
    "region": "us-east-1",
    "accessKeyId": "...",
    "secretAccessKey": "..."
  }
}
```

**Target Types**: S3, AZURE_BLOB, GCS, LOCAL, FTP, SFTP

### PUT /api/dr/targets/:id

Update a backup target.

**Roles**: ADMIN

### DELETE /api/dr/targets/:id

Delete a backup target.

**Roles**: ADMIN

### POST /api/dr/targets/:id/verify

Verify backup target connectivity.

**Roles**: ADMIN

**Response**:
```json
{
  "success": true,
  "data": {
    "connected": true,
    "writeable": true,
    "availableSpace": "500 GB"
  }
}
```

### POST /api/dr/backup/execute

Execute a manual backup.

**Roles**: ADMIN

**Request**:
```json
{
  "type": "FULL",
  "targets": ["target_123", "target_456"]
}
```

**Response**: Backup job ID for status tracking

### POST /api/dr/test/execute

Execute a DR test (restore to test environment).

**Roles**: ADMIN

**Request**:
```json
{
  "backupId": "backup_789",
  "testType": "PARTIAL",
  "components": ["database", "files"]
}
```

### GET /api/dr/metrics

Get DR metrics and health status.

**Response**:
```json
{
  "success": true,
  "data": {
    "lastSuccessfulBackup": "2024-11-14T02:00:00Z",
    "backupSuccessRate": 98.5,
    "averageBackupDuration": "15 minutes",
    "totalBackupSize": "45 GB",
    "lastTestDate": "2024-11-01T10:00:00Z",
    "lastTestResult": "PASSED"
  }
}
```

### GET /api/dr/dashboard

Get comprehensive DR dashboard data.

**Response**: Complete overview including schedules, recent backups, alerts, and metrics

### GET /api/dr/rto-rpo

Get RTO/RPO compliance status.

**Response**:
```json
{
  "success": true,
  "data": {
    "rtoTarget": 4,
    "rtoActual": 2.5,
    "rtoCompliant": true,
    "rpoTarget": 24,
    "rpoActual": 1,
    "rpoCompliant": true,
    "lastRecoveryTest": "2024-11-01T10:00:00Z"
  }
}
```

## Bulk Operations Endpoints

### POST /api/bulk/users/import

Import users from CSV file.

**Roles**: ADMIN, ORGANIZER

**Request**: `multipart/form-data`
- `file` - CSV file with columns: name, email, role, password (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "failed": 3,
    "errors": [
      {
        "row": 12,
        "email": "invalid@",
        "error": "Invalid email format"
      }
    ]
  }
}
```

### GET /api/bulk/users/export

Export users to CSV.

**Roles**: ADMIN, ORGANIZER

**Query Parameters**:
- `role` - Filter by role
- `active` - Filter by active status

**Response**: CSV file download

### POST /api/bulk/contestants/import

Import contestants from CSV.

**Roles**: ADMIN, ORGANIZER

**Request**: `multipart/form-data`
- `file` - CSV file
- `eventId` - (optional) Auto-assign to event

### GET /api/bulk/contestants/export

Export contestants to CSV.

**Query Parameters**:
- `eventId` - Filter by event
- `categoryId` - Filter by category

### POST /api/bulk/judges/import

Import judges from CSV.

**Roles**: ADMIN, ORGANIZER

### GET /api/bulk/judges/export

Export judges to CSV.

### POST /api/bulk/events/import

Import events from JSON or CSV.

**Roles**: ADMIN, ORGANIZER

**Request**: `multipart/form-data`
- `file` - Import file
- `includeContests` - Include nested contests
- `includeCategories` - Include nested categories

### GET /api/bulk/events/export

Export events with optional nesting.

**Query Parameters**:
- `includeContests` - Include contests (default: false)
- `includeCategories` - Include categories (default: false)
- `format` - json, csv

### POST /api/bulk/delete

Bulk delete entities.

**Roles**: ADMIN

**Request**:
```json
{
  "entityType": "USER",
  "ids": ["user_123", "user_456", "user_789"]
}
```

**Response**: Count of deleted entities

**Warning**: Cannot be undone for hard deletes

### POST /api/bulk/update

Bulk update entities.

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "entityType": "CONTESTANT",
  "ids": ["cont_123", "cont_456"],
  "updates": {
    "eventId": "event_789"
  }
}
```

## Notification Endpoints

### GET /api/notifications

Get notifications for current user.

**Query Parameters**:
- `unread` - Filter by unread status
- `type` - Filter by notification type
- `page`, `limit` - Pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_123",
      "type": "SCORE_SUBMITTED",
      "title": "Score Submitted",
      "message": "Your score for Category Vocal has been submitted",
      "link": "/scoring/category/cat123",
      "read": false,
      "createdAt": "2024-11-14T10:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

### POST /api/notifications

Create a notification (system/admin use).

**Roles**: ADMIN, SYSTEM

**Request**:
```json
{
  "userId": "user_123",
  "type": "INFO",
  "title": "System Maintenance",
  "message": "Scheduled maintenance tonight at 2 AM",
  "link": "/announcements"
}
```

### GET /api/notifications/:id

Get a specific notification.

### PUT /api/notifications/:id/read

Mark notification as read.

**Response**: Updated notification

### DELETE /api/notifications/:id

Delete a notification.

### POST /api/notifications/mark-all-read

Mark all notifications as read for current user.

**Response**: Count of notifications marked

### GET /api/notification-preferences

Get notification preferences for current user.

**Response**:
```json
{
  "success": true,
  "data": {
    "emailEnabled": true,
    "pushEnabled": false,
    "types": {
      "SCORE_SUBMITTED": { "email": true, "push": false },
      "CERTIFICATION_COMPLETE": { "email": true, "push": true }
    }
  }
}
```

### PUT /api/notification-preferences

Update notification preferences.

**Request**:
```json
{
  "emailEnabled": true,
  "pushEnabled": true,
  "types": {
    "SCORE_SUBMITTED": { "email": false, "push": true }
  }
}
```

### POST /api/notifications/send

Send a notification (admin broadcast).

**Roles**: ADMIN, ORGANIZER

**Request**:
```json
{
  "recipients": ["ALL", "JUDGES", "CONTESTANTS", "user_123"],
  "type": "ANNOUNCEMENT",
  "title": "Event Update",
  "message": "Schedule has been updated",
  "channels": ["EMAIL", "PUSH", "IN_APP"]
}
```

### GET /api/notifications/templates

List notification templates.

**Roles**: ADMIN

**Response**: Array of notification templates

## WebSocket Events

### Connection

Connect to WebSocket server at `/socket.io`.

**Authentication**:
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'JWT_TOKEN_HERE'
  }
});
```

### Auto-Join Rooms

- `user:{userId}` - Automatically joined for user-specific events

### Server → Client Events

#### score:updated

Emitted when scores change.

**Payload**:
```json
{
  "categoryId": "cat123",
  "contestantId": "contestant456",
  "judgeId": "judge789",
  "totalScore": 83.5
}
```

#### certification:updated

Emitted when certification status changes.

**Payload**:
```json
{
  "categoryId": "cat123",
  "status": "TALLY_CERTIFIED",
  "currentStep": 2,
  "totalSteps": 4
}
```

#### notification:new

New notification for user.

**Payload**:
```json
{
  "id": "notif123",
  "type": "INFO",
  "title": "Score Submitted",
  "message": "Your score has been submitted",
  "link": "/scoring/category/cat123",
  "createdAt": "2024-11-14T10:00:00Z"
}
```

#### user:updated

User data changed (for current user).

**Payload**:
```json
{
  "userId": "user123",
  "field": "name",
  "newValue": "Updated Name"
}
```

### Client → Server Events

#### join-room

Join a specific room.

**Emit**:
```javascript
socket.emit('join-room', 'category:cat123');
```

#### leave-room

Leave a room.

**Emit**:
```javascript
socket.emit('leave-room', 'category:cat123');
```

#### mark-notification-read

Mark notification as read.

**Emit**:
```javascript
socket.emit('mark-notification-read', 'notif123');
```

---

**Next**: [Database Documentation](05-DATABASE.md)
