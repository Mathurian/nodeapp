# Environment Variables

## Overview


Complete environment variables reference.

## Required Variables

### Application
```bash
NODE_ENV=production|development|test
PORT=3000
```

### Database
```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname?connection_limit=10"
```

### Security
```bash
JWT_SECRET="<random-64-char-string>"
JWT_EXPIRES_IN="1h"
SESSION_SECRET="<random-64-char-string>"
CSRF_SECRET="<random-32-char-string>"
BCRYPT_ROUNDS=12
```

### CORS
```bash
ALLOWED_ORIGINS="http://localhost:3001,https://app.example.com"
```

## Optional Variables

### Redis
```bash
REDIS_URL="redis://localhost:6379"
REDIS_ENABLE=true
REDIS_FALLBACK_TO_MEMORY=true
```

### ClamAV
```bash
CLAMAV_ENABLED=true
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
CLAMAV_FALLBACK_BEHAVIOR=allow|reject
CLAMAV_TIMEOUT=60000
CLAMAV_MAX_FILE_SIZE=52428800
```

### File Uploads
```bash
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```

### Email
```bash
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@example.com
```

### Logging
```bash
LOG_LEVEL=info|debug|warn|error
LOG_FILE=logs/event-manager.log
```

### Rate Limiting
```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend
```bash
VITE_API_URL=http://localhost:3000
```

## Generating Secrets
```bash
# Generate random secret
openssl rand -base64 64

# Or use the secrets CLI
npm run secrets generate
```

See example: `.env.example` (if available)


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
