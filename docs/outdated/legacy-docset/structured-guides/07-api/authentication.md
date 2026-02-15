# API Authentication

## Overview


API authentication implementation and usage.

## Authentication Method
JWT (JSON Web Tokens) with Bearer scheme

## Login Flow
1. POST /api/auth/login with credentials
2. Receive JWT token
3. Include token in subsequent requests

## Example

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {"id":"123","name":"John Doe","role":"JUDGE"}
}

# Use token
curl http://localhost:3000/api/events \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Token Structure
```json
{
  "userId": "user-id",
  "role": "JUDGE",
  "sessionVersion": 1,
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Token Expiration
Default: 1 hour (configurable via JWT_EXPIRES_IN)

## Token Refresh
Currently not implemented. Client should re-authenticate when token expires.

## Security
- Tokens signed with JWT_SECRET
- HTTPS required in production
- Short token lifetime
- Session version for instant invalidation

See [Security Model](../01-architecture/security-model.md) for details.


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
