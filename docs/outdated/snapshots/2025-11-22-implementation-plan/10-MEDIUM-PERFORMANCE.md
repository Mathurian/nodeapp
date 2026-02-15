# Phase 3: Medium Priority - Performance Optimizations

**Priority:** 🟡 MEDIUM
**Timeline:** Week 2-3
**Risk Level:** LOW
**Dependencies:** Database optimizations (indexes)

---

## Performance Areas

### 1. Response Compression (30 minutes)

```bash
npm install compression
```

```typescript
// src/server.ts
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,  // Compression level (0-9)
}));
```

### 2. Caching Strategy (6 hours)

**Implement Redis caching:**

```bash
npm install redis ioredis
npm install --save-dev @types/ioredis
```

```typescript
// src/config/redis.ts
import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    })
  : null;

if (redis) {
  redis.on('connect', () => logger.info('Redis connected'));
  redis.on('error', (err) => logger.error('Redis error', { error: err }));
} else {
  logger.warn('Redis not configured, caching disabled');
}

export default redis;
```

**Cache utility:**

```typescript
// src/utils/cache.ts
import redis from '../config/redis';
import { logger } from '../config/logger';

export class CacheService {
  /**
   * Get cached value
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;

    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set cached value
   */
  static async set(
    key: string,
    value: any,
    ttlSeconds: number = 300
  ): Promise<void> {
    if (!redis) return;

    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  /**
   * Delete cached value
   */
  static async del(key: string): Promise<void> {
    if (!redis) return;

    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * Invalidate cache pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    if (!redis) return;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache invalidate error', { pattern, error });
    }
  }
}

/**
 * Cache decorator for methods
 */
export function Cacheable(ttl: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

      // Try cache first
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit', { key: cacheKey });
        return cached;
      }

      // Execute method
      const result = await originalMethod.apply(this, args);

      // Cache result
      await CacheService.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}
```

**Use in services:**

```typescript
export class EventService {
  @Cacheable(600) // Cache for 10 minutes
  async getPublicEvents() {
    return await prisma.event.findMany({
      where: { isPublic: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async createEvent(data: CreateEventDto) {
    const event = await prisma.event.create({ data });

    // Invalidate cache
    await CacheService.invalidatePattern('EventService:getPublicEvents:*');

    return event;
  }
}
```

### 3. Database Connection Pooling (1 hour)

```typescript
// src/config/database.ts
import { PrismaClient } from '@prisma/client';
import { dbConfig } from './env';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbConfig.url,
    },
  },
  log: dbConfig.log,
  // Connection pool settings
  datasources: {
    db: {
      url: dbConfig.url,
    },
  },
});

// Prisma handles connection pooling automatically
// Default pool size: 10 * (number of CPUs)
// Can be configured via DATABASE_URL:
// postgresql://user:password@host:5432/db?connection_limit=20

export default prisma;
```

### 4. Lazy Loading & Code Splitting (2 hours)

**Backend: Lazy load heavy modules:**

```typescript
// Instead of importing heavy modules upfront
// Load them only when needed

// BAD
import pdfMake from 'pdfmake';  // Heavy module loaded always

// GOOD
async function generatePDF(data: any) {
  const pdfMake = await import('pdfmake');  // Loaded only when needed
  // Use pdfMake
}
```

### 5. Response Optimization (3 hours)

**Return only needed data:**

```typescript
// src/controllers/UserController.ts
async getAll(req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      // Don't include password, metadata, etc.
    },
  });

  res.json({ data: users });
}
```

**Use ETags for caching:**

```bash
npm install express-etag
```

```typescript
import etag from 'express-etag';

app.use(etag());  // Automatically adds ETag headers
```

### 6. Background Jobs (4 hours)

**Offload heavy processing:**

```bash
npm install bull
npm install --save-dev @types/bull
```

```typescript
// src/config/queue.ts
import Bull from 'bull';
import { env } from './env';

export const emailQueue = new Bull('email', env.REDIS_URL || '');

export const reportQueue = new Bull('report', env.REDIS_URL || '');

// Process jobs
emailQueue.process(async (job) => {
  const { to, subject, body } = job.data;
  // Send email asynchronously
  await sendEmail(to, subject, body);
});
```

**Use in controllers:**

```typescript
// Instead of blocking request
await sendEmail(user.email, 'Welcome', 'Welcome message');

// Queue for background processing
await emailQueue.add({ to: user.email, subject: 'Welcome', body: '...' });
res.status(201).json({ message: 'User created, email will be sent shortly' });
```

### 7. Monitoring & Profiling (3 hours)

**Add performance monitoring:**

```bash
npm install prom-client
```

```typescript
// src/middleware/metrics.ts
import { Counter, Histogram, register } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
  });

  next();
}

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Performance Benchmarks

**Before optimization:**
- Average response time: 500ms
- P95 response time: 1500ms
- Requests per second: 50

**Target after optimization:**
- Average response time: < 200ms
- P95 response time: < 500ms
- Requests per second: > 200

---

## Estimated Effort

| Task | Time |
|------|------|
| Response compression | 30 min |
| Caching strategy | 6 hours |
| Connection pooling | 1 hour |
| Lazy loading | 2 hours |
| Response optimization | 3 hours |
| Background jobs | 4 hours |
| Monitoring | 3 hours |
| **Total** | **19.5 hours** |

---

**Status:** READY TO IMPLEMENT
**Owner:** Backend Dev + DevOps
