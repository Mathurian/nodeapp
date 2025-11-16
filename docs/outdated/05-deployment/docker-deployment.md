# Docker Deployment

## Overview


Docker-based production deployment.

## Docker Compose Stack
Services:
- **backend**: Node.js application
- **postgres**: PostgreSQL 16 database
- **redis**: Redis cache
- **clamav**: Virus scanner
- **nginx**: Reverse proxy (optional)

## Deployment Steps

1. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with production values
```

2. **Start services**:
```bash
docker-compose up -d
```

3. **Run migrations**:
```bash
docker-compose exec backend npm run migrate
```

4. **Check health**:
```bash
curl http://localhost:3000/health
```

## Configuration
See `docker-compose.yml` in project root.

## Volumes
- postgres-data: Database storage
- redis-data: Cache storage
- clamav-data: Virus definitions
- ./uploads: Uploaded files
- ./logs: Application logs
- ./backups: Database backups


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
