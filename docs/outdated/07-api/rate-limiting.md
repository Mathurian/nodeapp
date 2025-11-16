# API Rate Limiting

## Overview


Rate limiting policies and implementation.

## Rate Limits

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication   | 5 requests | 15 minutes |
| General API      | 100 requests | 15 minutes |
| File Upload      | 10 requests | 1 hour |
| Score Submission | 60 requests | 1 minute |

## Implementation
Using `express-rate-limit` middleware

## Headers
Rate limit information in response headers:
- `X-RateLimit-Limit`: Max requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## Example Response

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890

{
  "error": "Too many requests, please try again later."
}
```

## Configuration
See `/var/www/event-manager/src/middleware/rateLimiting.ts`

## Bypassing (Development)
Set environment variable: `DISABLE_RATE_LIMIT=true`


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
