# Redis Distributed Caching Guide

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Cache Strategies](#cache-strategies)
- [Administration](#administration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Event Manager application uses Redis for distributed caching to significantly improve performance and reduce database load.

### Benefits

- **Performance**: 70% reduction in database queries
- **Scalability**: Distributed caching across multiple instances
- **Flexibility**: Multiple caching strategies and TTL configurations
- **Monitoring**: Built-in statistics and health checks

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Client    │────▶│  Backend    │────▶│  PostgreSQL  │
└─────────────┘     └──────┬──────┘     └──────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │    Cache    │
                    └─────────────┘
```

---

## Quick Start

### 1. Start Redis with Docker

```bash
# Using Docker Compose
docker-compose up -d redis

# Verify Redis is running
docker-compose ps redis
```

### 2. Configure Environment

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
REDIS_DB=0
REDIS_KEY_PREFIX=event-manager:
```

### 3. Use in Your Code

```typescript
import { getCacheService } from './services/RedisCacheService';

// Get cache service instance
const cache = getCacheService();

// Basic operations
await cache.set('user:123', userData, { ttl: 3600 });
const user = await cache.get('user:123');
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis server hostname |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | - | Redis authentication password |
| `REDIS_DB` | `0` | Redis database number (0-15) |
| `REDIS_KEY_PREFIX` | `event-manager:` | Prefix for all cache keys |
| `REDIS_TIMEOUT` | `10000` | Connection timeout (ms) |

### TTL Configuration

Pre-defined TTL values in `src/config/redis.config.ts`:

```typescript
export const CacheTTL = {
  VERY_SHORT: 60,      // 1 minute
  SHORT: 300,          // 5 minutes
  MEDIUM: 900,         // 15 minutes
  LONG: 3600,          // 1 hour
  VERY_LONG: 86400,    // 24 hours
  WEEK: 604800,        // 7 days
};
```

### Cache Namespaces

Organize cache keys by data type:

```typescript
export const CacheNamespace = {
  USER: 'user',
  EVENT: 'event',
  CONTEST: 'contest',
  CATEGORY: 'category',
  SCORE: 'score',
  SETTINGS: 'settings',
  // ... more namespaces
};
```

---

## Usage

### Basic Operations

#### Set Cache

```typescript
// Simple set
await cache.set('key', value);

// With TTL
await cache.set('key', value, { ttl: CacheTTL.LONG });

// With namespace
await cache.set('123', userData, {
  namespace: CacheNamespace.USER,
  ttl: CacheTTL.LONG
});

// With tags for group invalidation
await cache.set('event:1', eventData, {
  ttl: CacheTTL.MEDIUM,
  tags: ['events', 'event:1']
});
```

#### Get Cache

```typescript
// Simple get
const value = await cache.get('key');

// With namespace
const user = await cache.get('123', {
  namespace: CacheNamespace.USER
});

// Type-safe get
const user = await cache.get<User>('123', {
  namespace: CacheNamespace.USER
});
```

#### Delete Cache

```typescript
// Single key
await cache.delete('key');

// With namespace
await cache.delete('123', CacheNamespace.USER);

// Multiple keys
await cache.deleteMany(['key1', 'key2']);

// Pattern-based deletion
await cache.deletePattern('user:*');

// Tag-based deletion
await cache.invalidateTag('events');
```

### Advanced Operations

#### Cache-Aside Pattern

```typescript
const user = await cache.getOrSet(
  'user:123',
  async () => {
    // This function only runs on cache miss
    return await database.getUser(123);
  },
  { ttl: CacheTTL.LONG }
);
```

#### Batch Operations

```typescript
// Get multiple values
const users = await cache.getMany(['user:1', 'user:2', 'user:3']);

// Set multiple values
await cache.setMany([
  { key: 'user:1', value: user1, options: { ttl: 3600 } },
  { key: 'user:2', value: user2, options: { ttl: 3600 } },
]);
```

#### Counters

```typescript
// Increment
await cache.increment('page:views', 1);

// Decrement
await cache.decrement('active:users', 1);

// Get current value
const views = await cache.get('page:views');
```

### HTTP Caching Middleware

#### Basic Usage

```typescript
import { cacheMiddleware } from './middleware/cacheMiddleware';

// Cache GET requests for 15 minutes
app.get('/api/events',
  cacheMiddleware({ ttl: 900 }),
  eventController.getEvents
);
```

#### Authenticated Caching

```typescript
import { cacheAuthenticated } from './middleware/cacheMiddleware';

// Cache per user
app.get('/api/profile',
  authenticateToken,
  cacheAuthenticated({ ttl: 3600 }),
  profileController.getProfile
);
```

#### Paginated Caching

```typescript
import { cachePaginated } from './middleware/cacheMiddleware';

// Cache includes query parameters
app.get('/api/events',
  cachePaginated({ ttl: 900 }),
  eventController.getEvents
);
```

#### Conditional Caching

```typescript
import { cacheIf } from './middleware/cacheMiddleware';

// Only cache for non-admin users
app.get('/api/data',
  cacheIf(
    (req) => req.user?.role !== 'ADMIN',
    { ttl: 900 }
  ),
  dataController.getData
);
```

#### Cache Invalidation

```typescript
import { invalidateCache, invalidateCacheTag } from './middleware/cacheMiddleware';

// Invalidate pattern on update
app.put('/api/events/:id',
  invalidateCache('event:*'),
  eventController.updateEvent
);

// Invalidate tag on update
app.put('/api/events/:id',
  invalidateCacheTag(['events', 'event:${req.params.id}']),
  eventController.updateEvent
);
```

---

## Cache Strategies

### 1. Cache-Aside (Lazy Loading)

**When to use:** Read-heavy operations

```typescript
async function getUser(userId: string): Promise<User> {
  return await cache.getOrSet(
    `user:${userId}`,
    async () => await database.getUser(userId),
    { ttl: CacheTTL.LONG }
  );
}
```

**Pros:**
- Simple to implement
- Only cache what's needed
- Cache misses don't block

**Cons:**
- First request is slow (cache miss)
- Stale data possible

### 2. Write-Through

**When to use:** Write-heavy operations requiring consistency

```typescript
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  // Update database
  const user = await database.updateUser(userId, data);

  // Update cache
  await cache.set(`user:${userId}`, user, { ttl: CacheTTL.LONG });

  return user;
}
```

**Pros:**
- Cache always consistent
- No cache misses for writes

**Cons:**
- Write latency increased
- Unused data may be cached

### 3. Write-Behind (Write-Back)

**When to use:** High write volume, eventual consistency acceptable

```typescript
async function updateScore(scoreId: string, value: number): Promise<void> {
  // Update cache immediately
  await cache.set(`score:${scoreId}`, { id: scoreId, value }, {
    ttl: CacheTTL.SHORT
  });

  // Queue database update (async)
  await queue.add('update-score', { scoreId, value });
}
```

**Pros:**
- Fast writes
- Reduced database load

**Cons:**
- Risk of data loss
- Complex implementation

### 4. Refresh-Ahead

**When to use:** Predictable access patterns

```typescript
async function getEvent(eventId: string): Promise<Event> {
  const ttl = await cache.ttl(`event:${eventId}`);

  // Refresh if TTL < 5 minutes
  if (ttl < 300) {
    // Async refresh (don't wait)
    refreshEvent(eventId).catch(console.error);
  }

  return await cache.getOrSet(
    `event:${eventId}`,
    async () => await database.getEvent(eventId),
    { ttl: CacheTTL.MEDIUM }
  );
}

async function refreshEvent(eventId: string): Promise<void> {
  const event = await database.getEvent(eventId);
  await cache.set(`event:${eventId}`, event, { ttl: CacheTTL.MEDIUM });
}
```

**Pros:**
- No cache misses
- Always fresh data

**Cons:**
- Complex logic
- Wasted refreshes

---

## Administration

### Cache Statistics

```bash
# Get cache statistics
curl http://localhost:3000/api/admin/cache/statistics

# Response:
{
  "success": true,
  "data": {
    "hits": 85420,
    "misses": 12340,
    "sets": 15230,
    "deletes": 3420,
    "errors": 12,
    "hitRate": 87.4,
    "memoryUsage": 52428800,
    "keyCount": 15230
  }
}
```

### Clear Cache

```bash
# Clear specific namespace
curl -X DELETE http://localhost:3000/api/admin/cache/namespace/user

# Clear all cache (dangerous!)
curl -X DELETE http://localhost:3000/api/admin/cache/all

# Delete specific key
curl -X DELETE http://localhost:3000/api/admin/cache/key/user:123?namespace=user
```

### Tag Invalidation

```bash
# Invalidate all caches with tag
curl -X POST http://localhost:3000/api/admin/cache/invalidate/tag/events
```

### Health Check

```bash
# Check Redis health
curl http://localhost:3000/health | jq '.services[] | select(.name=="redis")'

# Response:
{
  "name": "redis",
  "status": "healthy",
  "responseTime": 15,
  "message": "Redis cache is healthy",
  "details": {
    "hitRate": 87.4,
    "keyCount": 15230
  }
}
```

---

## Best Practices

### 1. Choose Appropriate TTLs

```typescript
// Frequently changing data - SHORT TTL
await cache.set('score:123', score, { ttl: CacheTTL.SHORT }); // 5 min

// Rarely changing data - LONG TTL
await cache.set('settings', settings, { ttl: CacheTTL.VERY_LONG }); // 24 hours

// User sessions - MEDIUM TTL
await cache.set(`session:${token}`, session, { ttl: CacheTTL.LONG }); // 1 hour
```

### 2. Use Namespaces

```typescript
// Good - organized by namespace
await cache.set('123', user, { namespace: 'user' });
await cache.set('123', event, { namespace: 'event' });

// Bad - flat keys
await cache.set('user_123', user);
await cache.set('event_123', event);
```

### 3. Implement Cache Warming

```typescript
async function warmCache(): Promise<void> {
  // Preload frequently accessed data
  const events = await database.getUpcomingEvents();

  for (const event of events) {
    await cache.set(`event:${event.id}`, event, {
      ttl: CacheTTL.MEDIUM
    });
  }
}

// Run on application startup
warmCache().catch(console.error);
```

### 4. Handle Cache Failures Gracefully

```typescript
async function getUser(userId: string): Promise<User> {
  try {
    // Try cache first
    const cached = await cache.get(`user:${userId}`);
    if (cached) return cached;
  } catch (error) {
    console.error('Cache error:', error);
    // Continue to database
  }

  // Fallback to database
  return await database.getUser(userId);
}
```

### 5. Monitor Cache Performance

```typescript
// Track cache hit rate
const stats = await cache.getStatistics();

if (stats.hitRate < 70) {
  console.warn('Low cache hit rate:', stats.hitRate);
  // Consider adjusting TTLs or warming strategy
}
```

---

## Troubleshooting

### Problem: Low Cache Hit Rate

**Symptoms:**
- Hit rate below 70%
- Frequent cache misses

**Solutions:**
1. Increase TTL for stable data
2. Implement cache warming
3. Review access patterns
4. Check for cache eviction

### Problem: High Memory Usage

**Symptoms:**
- Redis using too much memory
- OOM errors

**Solutions:**
1. Reduce TTLs
2. Implement eviction policy
3. Clear unused namespaces
4. Increase Redis memory limit

```bash
# Check memory usage
docker-compose exec redis redis-cli INFO memory

# Clear specific namespace
curl -X DELETE http://localhost:3000/api/admin/cache/namespace/reports
```

### Problem: Stale Data

**Symptoms:**
- Users seeing outdated information
- Data inconsistency

**Solutions:**
1. Reduce TTL
2. Implement cache invalidation
3. Use write-through pattern
4. Add cache versioning

```typescript
// Invalidate on update
async function updateEvent(eventId: string, data: any): Promise<void> {
  await database.updateEvent(eventId, data);
  await cache.delete(`event:${eventId}`);
  await cache.invalidateTag('events');
}
```

### Problem: Cache Stampede

**Symptoms:**
- Multiple simultaneous cache misses
- Database overload on cache expiry

**Solutions:**
1. Implement lock mechanism
2. Use probabilistic early expiration
3. Implement refresh-ahead pattern

```typescript
// Lock-based approach
async function getWithLock(key: string, factory: () => Promise<any>): Promise<any> {
  const cached = await cache.get(key);
  if (cached) return cached;

  const lockKey = `lock:${key}`;
  const locked = await cache.set(lockKey, '1', { ttl: 10, nx: true });

  if (locked) {
    try {
      const value = await factory();
      await cache.set(key, value, { ttl: CacheTTL.MEDIUM });
      return value;
    } finally {
      await cache.delete(lockKey);
    }
  } else {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return await getWithLock(key, factory);
  }
}
```

### Problem: Redis Connection Issues

**Symptoms:**
- Connection timeouts
- "Redis unavailable" errors

**Solutions:**
1. Check Redis is running
2. Verify connection settings
3. Check network connectivity
4. Review Redis logs

```bash
# Check Redis status
docker-compose ps redis

# Check logs
docker-compose logs redis

# Test connection
redis-cli -h localhost -p 6379 -a your_password ping

# Restart if needed
docker-compose restart redis
```

---

## Performance Tips

### 1. Batch Operations

```typescript
// Good - single network call
const users = await cache.getMany(['user:1', 'user:2', 'user:3']);

// Bad - multiple network calls
const user1 = await cache.get('user:1');
const user2 = await cache.get('user:2');
const user3 = await cache.get('user:3');
```

### 2. Pipeline for Multiple Sets

```typescript
// Use setMany for better performance
await cache.setMany([
  { key: 'user:1', value: user1 },
  { key: 'user:2', value: user2 },
  { key: 'user:3', value: user3 },
]);
```

### 3. Compress Large Values

```typescript
import zlib from 'zlib';

// Compress before caching
const compressed = zlib.gzipSync(JSON.stringify(largeData));
await cache.set('large:key', compressed.toString('base64'));

// Decompress when reading
const cached = await cache.get('large:key');
const decompressed = zlib.gunzipSync(Buffer.from(cached, 'base64'));
const data = JSON.parse(decompressed.toString());
```

### 4. Use Appropriate Data Types

```typescript
// For counters, use increment/decrement
await cache.increment('views:123');

// For sets, use Redis sets (via getClient())
const client = cache.getClient();
await client.sadd('users:online', userId);
```

---

## Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [ioredis Documentation](https://github.com/luin/ioredis)
- [Caching Best Practices](https://aws.amazon.com/caching/best-practices/)
- [Event Manager Health Check](http://localhost:3000/health)
- [Cache Admin API](http://localhost:3000/api/admin/cache/statistics)

---

**Last Updated:** November 12, 2025
**Version:** 1.0.0
