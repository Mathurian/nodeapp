# REST API Reference

**Base URL:** `/api`
**Version:** 2.0
**Last Updated:** November 12, 2025

---

## Table of Contents

1. [Authentication](#authentication)
2. [Core Resources](#core-resources)
   - [Events](#events)
   - [Contests](#contests)
   - [Categories](#categories)
   - [Contestants](#contestants)
   - [Judges](#judges)
3. [Scoring & Certification](#scoring--certification)
4. [User Management](#user-management)
5. [File Management](#file-management)
6. [Administration](#administration)
7. [Bulk Operations](#bulk-operations)
8. [Reports & Analytics](#reports--analytics)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

---

## Overview

The Event Manager API is a RESTful API that uses JWT for authentication and returns JSON responses. All endpoints follow a consistent response format and error handling pattern.

### Base Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error message",
  "errors": [],
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## Authentication

### Login

Authenticate a user and receive a JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clxxx123",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "ADMIN"
    }
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Logout

Invalidate the current session token.

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Refresh Token

Refresh an expiring JWT token.

**Endpoint:** `POST /api/auth/refresh`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { /* user object */ }
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Get Current User Profile

Get authenticated user's profile.

**Endpoint:** `GET /api/auth/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clxxx123",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "ADMIN",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "judge": null,
    "contestant": null
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## Core Resources

### Events

Events are the top-level containers for contests.

#### List All Events

**Endpoint:** `GET /api/events`

**Query Parameters:**
- `archived` (boolean): Filter by archived status
- `search` (string): Search by event name
- `startDate` (ISO date): Filter by start date
- `endDate` (ISO date): Filter by end date

**Example Request:**
```
GET /api/events?archived=false&search=Annual
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx456",
      "name": "Annual Talent Show 2025",
      "startDate": "2025-06-01T00:00:00.000Z",
      "endDate": "2025-06-03T00:00:00.000Z",
      "location": "Main Hall",
      "description": "Annual event description",
      "maxContestants": 100,
      "archived": false,
      "isLocked": false,
      "createdAt": "2025-01-15T00:00:00.000Z",
      "updatedAt": "2025-01-15T00:00:00.000Z"
    }
  ],
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### Get Event by ID

**Endpoint:** `GET /api/events/:id`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clxxx456",
    "name": "Annual Talent Show 2025",
    "startDate": "2025-06-01T00:00:00.000Z",
    "endDate": "2025-06-03T00:00:00.000Z",
    "location": "Main Hall",
    "description": "Annual event description",
    "maxContestants": 100,
    "contestantNumberingMode": "AUTO",
    "archived": false,
    "isLocked": false,
    "contestantViewRestricted": false,
    "createdAt": "2025-01-15T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z"
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### Create Event

**Endpoint:** `POST /api/events`

**Required Role:** ADMIN, ORGANIZER, BOARD

**Request Body:**
```json
{
  "name": "Summer Festival 2025",
  "startDate": "2025-07-15",
  "endDate": "2025-07-17",
  "location": "Outdoor Arena",
  "description": "Summer festival with multiple contests",
  "maxContestants": 150,
  "contestantNumberingMode": "AUTO"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": "clxxx789",
    "name": "Summer Festival 2025",
    "startDate": "2025-07-15T00:00:00.000Z",
    "endDate": "2025-07-17T00:00:00.000Z",
    "location": "Outdoor Arena",
    "description": "Summer festival with multiple contests",
    "maxContestants": 150,
    "contestantNumberingMode": "AUTO",
    "archived": false,
    "isLocked": false,
    "createdAt": "2025-11-12T10:30:00.000Z",
    "updatedAt": "2025-11-12T10:30:00.000Z"
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "startDate",
      "message": "Start date is required"
    },
    {
      "field": "endDate",
      "message": "End date must be after start date"
    }
  ],
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### Update Event

**Endpoint:** `PUT /api/events/:id`

**Required Role:** ADMIN, ORGANIZER, BOARD

**Request Body:**
```json
{
  "name": "Updated Event Name",
  "location": "New Location",
  "description": "Updated description"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": {
    /* updated event object */
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Event is locked and cannot be edited. Please unlock it first.",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### Delete Event

**Endpoint:** `DELETE /api/events/:id`

**Required Role:** ADMIN

**Success Response (204):**
```
No content
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Event is locked and cannot be deleted. Please unlock it first.",
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### Archive/Unarchive Event

**Endpoint:** `PATCH /api/events/:id/archive`

**Required Role:** ADMIN, ORGANIZER, BOARD

**Request Body:**
```json
{
  "archived": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Event archived successfully",
  "data": {
    /* event object with archived: true */
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### Get Event Statistics

**Endpoint:** `GET /api/events/:id/stats`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalContests": 5,
    "totalCategories": 15,
    "totalContestants": 87,
    "totalJudges": 12,
    "totalScores": 1305,
    "certificationStatus": {
      "certified": 12,
      "pending": 3
    }
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

### Contests

Contests belong to events and contain categories.

#### List Contests by Event

**Endpoint:** `GET /api/contests?eventId=:eventId`

**Query Parameters:**
- `eventId` (required): Event ID
- `includeArchived` (boolean): Include archived contests

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx111",
      "eventId": "clxxx456",
      "name": "Vocal Performance",
      "description": "Solo vocal performance contest",
      "contestantNumberingMode": "AUTO",
      "nextContestantNumber": 1,
      "archived": false,
      "isLocked": false,
      "createdAt": "2025-01-16T00:00:00.000Z",
      "updatedAt": "2025-01-16T00:00:00.000Z"
    }
  ],
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### Create Contest

**Endpoint:** `POST /api/contests`

**Required Role:** ADMIN, ORGANIZER, BOARD

**Request Body:**
```json
{
  "eventId": "clxxx456",
  "name": "Instrumental Performance",
  "description": "Solo instrumental performance contest",
  "contestantNumberingMode": "MANUAL"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Contest created successfully",
  "data": {
    /* contest object */
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### Update Contest

**Endpoint:** `PUT /api/contests/:id`

**Required Role:** ADMIN, ORGANIZER, BOARD

#### Delete Contest

**Endpoint:** `DELETE /api/contests/:id`

**Required Role:** ADMIN

#### Get Contest Statistics

**Endpoint:** `GET /api/contests/:id/stats`

---

### Categories

Categories belong to contests and define what is being judged.

#### List Categories by Contest

**Endpoint:** `GET /api/categories?contestId=:contestId`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx222",
      "contestId": "clxxx111",
      "name": "Vocal Technique",
      "description": "Judging vocal technique and skill",
      "scoreCap": 100,
      "timeLimit": 300,
      "contestantMin": 1,
      "contestantMax": 1,
      "totalsCertified": false,
      "createdAt": "2025-01-16T00:00:00.000Z"
    }
  ],
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### Create Category

**Endpoint:** `POST /api/categories`

**Required Role:** ADMIN, ORGANIZER, BOARD

**Request Body:**
```json
{
  "contestId": "clxxx111",
  "name": "Stage Presence",
  "description": "Judging stage presence and audience engagement",
  "scoreCap": 50,
  "timeLimit": 300,
  "contestantMin": 1,
  "contestantMax": 1
}
```

---

### Contestants

#### List All Contestants

**Endpoint:** `GET /api/contestants`

**Query Parameters:**
- `search` (string): Search by name or email
- `contestId` (string): Filter by contest

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx333",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "gender": "Female",
      "pronouns": "she/her",
      "contestantNumber": 42,
      "bio": "Experienced vocalist",
      "imagePath": "/uploads/contestants/jane.jpg",
      "createdAt": "2025-01-20T00:00:00.000Z"
    }
  ],
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### Create Contestant

**Endpoint:** `POST /api/contestants`

**Required Role:** ADMIN, ORGANIZER, BOARD

**Request Body:**
```json
{
  "name": "John Performer",
  "email": "john@example.com",
  "gender": "Male",
  "pronouns": "he/him",
  "contestantNumber": 43,
  "bio": "First-time contestant"
}
```

---

### Judges

#### List All Judges

**Endpoint:** `GET /api/judges`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx444",
      "userId": "clxxx555",
      "name": "Dr. Expert Judge",
      "expertise": "Vocal Performance",
      "bio": "20 years judging experience",
      "imagePath": "/uploads/judges/expert.jpg",
      "createdAt": "2025-01-18T00:00:00.000Z"
    }
  ],
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

#### Create Judge

**Endpoint:** `POST /api/judges`

**Required Role:** ADMIN, ORGANIZER, BOARD

---

## Scoring & Certification

### Submit Score

**Endpoint:** `POST /api/scoring/scores`

**Required Role:** JUDGE

**Request Body:**
```json
{
  "categoryId": "clxxx222",
  "judgeId": "clxxx444",
  "contestantId": "clxxx333",
  "rawScore": 95.5,
  "comments": "Excellent performance",
  "deductions": 0
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Score submitted successfully",
  "data": {
    "id": "clxxx666",
    "categoryId": "clxxx222",
    "judgeId": "clxxx444",
    "contestantId": "clxxx333",
    "rawScore": 95.5,
    "deductions": 0,
    "finalScore": 95.5,
    "comments": "Excellent performance",
    "isCertified": false,
    "createdAt": "2025-11-12T10:30:00.000Z"
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Get Scores for Category

**Endpoint:** `GET /api/scoring/scores?categoryId=:categoryId`

**Query Parameters:**
- `categoryId` (required): Category ID
- `judgeId` (optional): Filter by judge
- `contestantId` (optional): Filter by contestant
- `certified` (boolean): Filter by certification status

### Certify Scores

**Endpoint:** `POST /api/scoring/certify`

**Required Role:** TALLY_MASTER, AUDITOR, BOARD

**Request Body:**
```json
{
  "categoryId": "clxxx222",
  "judgeId": "clxxx444",
  "contestantId": "clxxx333"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Scores certified successfully",
  "data": {
    /* certification object */
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## User Management

### List All Users

**Endpoint:** `GET /api/users`

**Required Role:** ADMIN, ORGANIZER

**Query Parameters:**
- `role` (string): Filter by role (ADMIN, JUDGE, CONTESTANT, etc.)
- `active` (boolean): Filter by active status
- `search` (string): Search by name or email

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx777",
      "name": "Alice Admin",
      "email": "alice@example.com",
      "role": "ADMIN",
      "active": true,
      "lastLoginAt": "2025-11-12T09:00:00.000Z",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Create User

**Endpoint:** `POST /api/users`

**Required Role:** ADMIN, ORGANIZER

**Request Body:**
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "role": "JUDGE"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "clxxx888",
    "name": "New User",
    "email": "newuser@example.com",
    "role": "JUDGE",
    "active": true,
    "createdAt": "2025-11-12T10:30:00.000Z"
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## File Management

### Upload File

**Endpoint:** `POST /api/files/upload`

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Request Body:**
```
file: (binary)
eventId: (optional)
contestId: (optional)
categoryId: (optional)
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "clxxx999",
    "fileName": "document.pdf",
    "filePath": "/uploads/2025/11/document-xxx.pdf",
    "fileType": "application/pdf",
    "fileSize": 1048576,
    "uploadedById": "clxxx777",
    "createdAt": "2025-11-12T10:30:00.000Z"
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Upload Score File

**Endpoint:** `POST /api/score-files`

**Required Role:** ADMIN, JUDGE, ORGANIZER, BOARD, TALLY_MASTER, AUDITOR

**Request Body:**
```json
{
  "categoryId": "clxxx222",
  "judgeId": "clxxx444",
  "contestantId": "clxxx333",
  "fileName": "score-sheet.pdf",
  "fileType": "application/pdf",
  "filePath": "/uploads/scores/sheet.pdf",
  "fileSize": 524288,
  "notes": "Completed score sheet"
}
```

### Get Score Files by Category

**Endpoint:** `GET /api/score-files/category/:categoryId`

---

## Administration

### Get System Logs

**Endpoint:** `GET /api/admin/logs`

**Required Role:** ADMIN

**Query Parameters:**
- `level` (string): Filter by log level (error, warn, info)
- `startDate` (ISO date): Filter from date
- `endDate` (ISO date): Filter to date
- `limit` (number): Results per page
- `offset` (number): Pagination offset

### Get Active Users

**Endpoint:** `GET /api/admin/active-users`

**Required Role:** ADMIN

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalActive": 15,
    "users": [
      {
        "id": "clxxx123",
        "name": "John Doe",
        "role": "JUDGE",
        "lastActivity": "2025-11-12T10:29:00.000Z"
      }
    ]
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Database Browser

**Endpoint:** `GET /api/database-browser/tables`

**Required Role:** ADMIN

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "name": "users",
      "rowCount": 125,
      "size": "2.5 MB"
    },
    {
      "name": "events",
      "rowCount": 15,
      "size": "512 KB"
    }
  ],
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## Bulk Operations

### Bulk Activate Users

**Endpoint:** `POST /api/bulk/users/activate`

**Required Role:** ADMIN, ORGANIZER

**Request Body:**
```json
{
  "userIds": ["clxxx111", "clxxx222", "clxxx333"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Users activated successfully",
  "data": {
    "successful": 3,
    "failed": 0,
    "results": [
      {
        "id": "clxxx111",
        "status": "success"
      },
      {
        "id": "clxxx222",
        "status": "success"
      },
      {
        "id": "clxxx333",
        "status": "success"
      }
    ]
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Bulk Delete Events

**Endpoint:** `POST /api/bulk/events/delete`

**Required Role:** ADMIN

**Request Body:**
```json
{
  "eventIds": ["clxxx456", "clxxx457"]
}
```

---

## Reports & Analytics

### Generate Event Report

**Endpoint:** `POST /api/reports/generate`

**Required Role:** ADMIN, ORGANIZER, BOARD, TALLY_MASTER, AUDITOR

**Request Body:**
```json
{
  "reportType": "event-summary",
  "eventId": "clxxx456",
  "format": "pdf",
  "includeScores": true,
  "includeCertifications": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Report generation started",
  "data": {
    "jobId": "report-job-xxx",
    "status": "pending",
    "estimatedTime": "2 minutes"
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Get Report Status

**Endpoint:** `GET /api/reports/:jobId/status`

### Download Report

**Endpoint:** `GET /api/reports/:jobId/download`

---

## Error Handling

### Error Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request successful, no content to return |
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Authentication required or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate email) |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Messages

**Authentication Errors:**
- "Invalid credentials" - Wrong email or password
- "Token expired" - JWT token has expired, use refresh endpoint
- "Invalid token" - Malformed or invalid JWT token
- "Session mismatch" - Session version doesn't match

**Authorization Errors:**
- "Insufficient permissions" - User role doesn't have access
- "Event is locked and cannot be edited" - Event/Contest is locked

**Validation Errors:**
- "Validation failed" - Request body validation failed
- Field-specific errors included in `errors` array

---

## Rate Limiting

### Default Limits

- **Authentication endpoints:** 5 requests per 15 minutes per IP
- **General API endpoints:** 100 requests per 15 minutes per user
- **File upload endpoints:** 10 requests per 15 minutes per user
- **Bulk operation endpoints:** 5 requests per 15 minutes per user

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699800000
```

### Rate Limit Exceeded Response (429)

```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "retryAfter": 900,
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## Pagination

Endpoints that return lists support pagination.

**Query Parameters:**
- `limit` (number): Results per page (default: 20, max: 100)
- `offset` (number): Number of results to skip (default: 0)
- `sortBy` (string): Field to sort by
- `sortOrder` (string): "asc" or "desc"

**Response:**
```json
{
  "success": true,
  "data": [ /* results */ ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

---

## Filtering

Many endpoints support filtering with query parameters.

**Example:**
```
GET /api/users?role=JUDGE&active=true&search=john
```

---

## Sorting

Use `sortBy` and `sortOrder` query parameters.

**Example:**
```
GET /api/events?sortBy=createdAt&sortOrder=desc
```

---

## Webhook Events (Future)

Planned webhook support for real-time notifications of events.

---

## Additional Endpoints

### Backup Management

- `GET /api/backups` - List backups
- `POST /api/backups` - Create backup
- `GET /api/backups/:id/download` - Download backup
- `POST /api/backups/:id/restore` - Restore backup

### Settings

- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update settings

### Notifications

- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

### Email Templates

- `GET /api/email-templates` - List email templates
- `POST /api/email-templates` - Create template
- `PUT /api/email-templates/:id` - Update template

---

## WebSocket API

See [websocket-api.md](./websocket-api.md) for real-time features.

---

## Changelog

- **2025-11-12**: Initial API documentation created
- **2025-11-12**: Added ScoreFile endpoints
- **2025-11-12**: Added Restriction endpoints

---

## Support

For API support, please contact:
- **Email:** api-support@eventmanager.local
- **Documentation:** https://docs.eventmanager.local
- **GitHub Issues:** https://github.com/your-org/event-manager/issues

---

**Last Updated:** November 12, 2025
**API Version:** 2.0
