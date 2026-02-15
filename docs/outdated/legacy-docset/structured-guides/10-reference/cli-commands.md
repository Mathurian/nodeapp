# CLI Commands Reference

## Overview


Command-line interface reference.

## NPM Scripts

### Development
```bash
npm run dev              # Start dev server (tsx watch)
npm run dev:ts           # Start dev server (ts-node-dev)
npm run type-check       # TypeScript type checking
```

### Build
```bash
npm run build            # Build for production
npm run clean            # Clean build directory
npm start                # Start production server
```

### Database
```bash
npm run migrate          # Run migrations
npm run seed             # Seed database
npx prisma studio        # Open Prisma Studio
npx prisma migrate dev   # Create migration
```

### Testing
```bash
npm test                 # Run unit tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:e2e         # E2E tests (Playwright)
```

### Utilities
```bash
npm run secrets          # Secrets management CLI
```

## Database CLI
```bash
# Prisma commands
npx prisma migrate dev --name migration_name
npx prisma migrate deploy
npx prisma migrate reset
npx prisma db push
npx prisma db pull
npx prisma generate
npx prisma studio
```

## Docker Commands
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Restart service
docker-compose restart backend

# Stop all
docker-compose down

# Rebuild
docker-compose build --no-cache
```


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
