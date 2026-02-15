# API Documentation

Welcome to the Event Manager API documentation. This section provides comprehensive documentation for all API endpoints, WebSocket events, authentication, and best practices.

---

## Quick Links

- **[REST API Reference](./rest-api.md)** - Complete documentation of all REST endpoints
- **[WebSocket API Reference](./websocket-api.md)** - Real-time event documentation
- **[Authentication Guide](./authentication.md)** - Authentication and authorization
- **[Rate Limiting](./rate-limiting.md)** - API rate limits and quotas

---

## API Overview

The Event Manager API is a modern RESTful API built with Node.js, Express, and TypeScript. It provides comprehensive endpoints for managing events, contests, categories, scoring, and more.

### Key Features

- ✅ **RESTful Design** - Following REST principles
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Role-Based Access Control** - 7 distinct user roles
- ✅ **Real-Time Updates** - WebSocket support for live data
- ✅ **Comprehensive Error Handling** - Detailed error messages
- ✅ **Rate Limiting** - Protection against abuse
- ✅ **Request Validation** - Zod schema validation
- ✅ **File Upload Support** - Multi-part form data handling
- ✅ **Pagination** - Efficient large dataset handling
- ✅ **Filtering & Sorting** - Flexible query parameters
- ✅ **Bulk Operations** - Batch processing endpoints

---

## Getting Started

### Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
GET /api/events HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Get a token:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@eventmanager.com",
    "password": "password123"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "clxxx123",
      "name": "Admin User",
      "email": "admin@eventmanager.com",
      "role": "ADMIN"
    }
  }
}
```

---

## API Sections

### Core Resources

The API is organized around core resources:

1. **[Events](./rest-api.md#events)** - Top-level event management
2. **[Contests](./rest-api.md#contests)** - Contest management within events
3. **[Categories](./rest-api.md#categories)** - Judging categories
4. **[Contestants](./rest-api.md#contestants)** - Contestant management
5. **[Judges](./rest-api.md#judges)** - Judge management and assignments

### Scoring System

6. **[Scoring](./rest-api.md#scoring--certification)** - Score submission and retrieval
7. **[Certification](./rest-api.md#scoring--certification)** - Multi-stage certification workflow
8. **[Deductions](./rest-api.md#deductions)** - Score deduction requests

### User Management

9. **[Users](./rest-api.md#user-management)** - User CRUD operations
10. **[Authentication](./rest-api.md#authentication)** - Login, logout, token refresh
11. **[Role Assignments](./rest-api.md#role-assignments)** - Dynamic role assignment

### File Operations

12. **[File Uploads](./rest-api.md#file-management)** - General file uploads
13. **[Score Files](./rest-api.md#upload-score-file)** - Judge score sheet uploads
14. **[Backups](./rest-api.md#backup-management)** - Backup and restore

### Administration

15. **[Admin Operations](./rest-api.md#administration)** - System administration
16. **[Database Browser](./rest-api.md#database-browser)** - Database inspection (admin only)
17. **[Logs](./rest-api.md#get-system-logs)** - System and activity logs
18. **[Settings](./rest-api.md#settings)** - System configuration

### Advanced Features

19. **[Bulk Operations](./rest-api.md#bulk-operations)** - Batch processing
20. **[Reports](./rest-api.md#reports--analytics)** - Report generation and analytics
21. **[Notifications](./rest-api.md#notifications)** - User notifications
22. **[Email Templates](./rest-api.md#email-templates)** - Email template management

---

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ],
  "timestamp": "2025-11-12T10:30:00.000Z"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ /* array of items */ ],
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

## HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 204 | No Content | Successful, no data to return |
| 400 | Bad Request | Invalid request |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication**: 5 requests per 15 minutes per IP
- **General API**: 100 requests per 15 minutes per user
- **File Uploads**: 10 requests per 15 minutes per user
- **Bulk Operations**: 5 requests per 15 minutes per user

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response with a `retryAfter` field indicating when you can retry.

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699800000
```

---

## Real-Time Features

The API supports real-time updates via WebSocket connections. See the [WebSocket API documentation](./websocket-api.md) for details.

**Example events:**
- Score submissions
- Certification updates
- User status changes
- System notifications

---

## Security

### Authentication

JWT tokens are required for all protected endpoints. Tokens are valid for 1 hour and can be refreshed using the `/api/auth/refresh` endpoint.

### CSRF Protection

All state-changing operations (POST, PUT, DELETE, PATCH) require a valid CSRF token in the `X-CSRF-Token` header.

### HTTPS Required

In production, all API requests must use HTTPS. HTTP requests will be redirected to HTTPS.

### Request Validation

All request bodies are validated using Zod schemas. Invalid requests return detailed validation errors.

---

## Versioning

The current API version is **2.0**. Future versions may be introduced with URL versioning:

```
/api/v2/events  (current)
/api/v3/events  (future)
```

Version 1.x (PHP-based) is no longer supported.

---

## Client Libraries

Official client libraries:

- **JavaScript/TypeScript**: Built-in (frontend uses api.ts service)
- **Python**: Coming soon
- **Java**: Planned

---

## Postman Collection

Download the Postman collection for easy API testing:

```bash
# Coming soon
curl -O https://api.eventmanager.local/postman/collection.json
```

---

## OpenAPI/Swagger

Interactive API documentation is available at:

```
Development: http://localhost:3000/api-docs
Production: https://your-domain.com/api-docs
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Using fetch
const response = await fetch('http://localhost:3000/api/events', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

### cURL

```bash
# List events
curl -X GET http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create event
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type": application/json" \
  -d '{
    "name": "Summer Festival 2025",
    "startDate": "2025-07-15",
    "endDate": "2025-07-17",
    "location": "Main Hall"
  }'
```

---

## Best Practices

### 1. Use Proper HTTP Methods

- **GET** - Retrieve resources (idempotent)
- **POST** - Create resources
- **PUT** - Update entire resource
- **PATCH** - Update partial resource
- **DELETE** - Delete resource

### 2. Handle Errors Gracefully

Always check the `success` field and handle errors appropriately:

```typescript
if (!response.success) {
  console.error(response.message);
  if (response.errors) {
    response.errors.forEach(err => {
      console.error(`${err.field}: ${err.message}`);
    });
  }
}
```

### 3. Implement Retry Logic

For failed requests, implement exponential backoff:

```typescript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429) {
        // Rate limited - wait and retry
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

### 4. Use Pagination

Always use pagination for list endpoints to avoid performance issues:

```typescript
let offset = 0;
const limit = 20;
let hasMore = true;

while (hasMore) {
  const response = await fetch(`/api/events?limit=${limit}&offset=${offset}`);
  const data = await response.json();

  // Process data.data

  hasMore = data.pagination.hasMore;
  offset += limit;
}
```

### 5. Cache Responses

Implement client-side caching for frequently accessed data:

```typescript
const cache = new Map();

async function getCachedEvents() {
  if (cache.has('events') && !isCacheExpired('events')) {
    return cache.get('events');
  }

  const response = await fetch('/api/events');
  const data = await response.json();

  cache.set('events', {
    data: data,
    timestamp: Date.now()
  });

  return data;
}
```

---

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Token expired: Use `/api/auth/refresh` to get a new token
- Invalid token: Login again to get a new token
- Missing Authorization header: Include `Authorization: Bearer <token>`

**403 Forbidden**
- Insufficient permissions: Your role doesn't have access
- Locked resource: Event/Contest is locked for editing

**429 Too Many Requests**
- Rate limit exceeded: Wait for the time specified in `retryAfter`
- Implement request throttling in your client

**500 Internal Server Error**
- Check server logs for details
- Report to support team
- Retry with exponential backoff

---

## Support

- **Documentation**: https://docs.eventmanager.local
- **API Support**: api-support@eventmanager.local
- **Bug Reports**: https://github.com/your-org/event-manager/issues
- **Feature Requests**: https://github.com/your-org/event-manager/discussions

---

## Changelog

See [CHANGELOG.md](../../CHANGELOG.md) for API version history.

---

**Last Updated:** November 12, 2025
**API Version:** 2.0
