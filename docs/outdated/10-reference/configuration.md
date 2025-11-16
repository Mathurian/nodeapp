# Configuration Reference

## Overview


Complete configuration options reference.

## Environment Variables
See [Environment Variables](./environment-variables.md)

## Database Configuration
- Connection pooling
- Timeout settings
- SSL mode

## Application Settings
Stored in `system_settings` table

Categories:
- General
- Security
- Email
- Backup
- Logging

## Runtime Configuration
```typescript
// Access settings
const setting = await prisma.systemSetting.findUnique({
  where: { key: 'app.timezone' }
})
```

## Configuration Files
- `.env` - Environment variables
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `prisma/schema.prisma` - Database schema
- `docker-compose.yml` - Docker services

See individual configuration files for detailed options.


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
