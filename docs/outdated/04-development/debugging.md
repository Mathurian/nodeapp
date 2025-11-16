# Debugging Guide

## Overview


Debugging techniques and tools.

## Backend Debugging
```bash
# VS Code launch configuration
npm run dev:ts
# Attach debugger to port 9229
```

## Frontend Debugging
- Use React DevTools
- Use Redux DevTools (if applicable)
- Browser console and Network tab
- Breakpoints in VS Code

## Logging
Winston logger at `src/utils/logger.ts`

```typescript
logger.info('Message', { data })
logger.error('Error', { error })
```

## Database Debugging
```bash
# Prisma Studio
npx prisma studio

# Query logging
Enable in .env: DEBUG=prisma:query
```

## Common Issues
See [Troubleshooting](../05-deployment/troubleshooting.md)


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
