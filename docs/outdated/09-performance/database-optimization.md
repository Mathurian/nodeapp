# Database Optimization

## Overview


Database performance tuning guide.

## Connection Pooling
```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10&connect_timeout=5"
```

Recommended pool sizes:
- Development: 5-10
- Production (small): 10-20
- Production (large): 20-50

## Indexes
Strategic indexes on:
- Foreign keys
- Frequently queried fields
- Unique constraints
- Composite indexes for common queries

Example:
```prisma
@@index([categoryId, judgeId])
@@index([isCertified, categoryId])
```

## Query Optimization
1. **Use select**: Only fetch needed fields
2. **Use include wisely**: Eager load related data
3. **Paginate**: Use skip/take for large datasets
4. **Avoid N+1**: Use include instead of separate queries

## Performance Monitoring
- Enable query logging: `DEBUG=prisma:query`
- Monitor slow queries
- Use EXPLAIN ANALYZE for complex queries

## Maintenance
```bash
# Vacuum (PostgreSQL)
VACUUM ANALYZE;

# Reindex
REINDEX DATABASE event_manager;
```

See Prisma schema at `/var/www/event-manager/prisma/schema.prisma`


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
