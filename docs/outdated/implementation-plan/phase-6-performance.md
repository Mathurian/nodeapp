# 📄 PHASE 6: PERFORMANCE & SCALABILITY OPTIMIZATION
**Duration:** Days 43-56 (2 weeks)
**Focus:** Optimize performance, prepare for scale
**Risk Level:** MEDIUM - Performance changes require monitoring
**Dependencies:** Phases 1-5 completed

---

## 🎯 PHASE OBJECTIVES

1. ✅ Implement frontend code splitting
2. ✅ Add Redis query result caching
3. ✅ Configure Socket.IO clustering with Redis adapter
4. ✅ Integrate CDN for static assets
5. ✅ Optimize bundle sizes (backend + frontend)
6. ✅ Implement database query optimization
7. ✅ Add performance monitoring and metrics

---

## 📋 DAY 43-44: FRONTEND OPTIMIZATION

### Task 6.1: Code Splitting & Lazy Loading (8 hours)

#### Implement Route-Based Code Splitting

**File:** `frontend/src/App.tsx` (updated)

```typescript
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load all pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ScoringPage = lazy(() => import('./pages/ScoringPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
// ... lazy load all other pages

// Lazy load heavy components
const CommandPalette = lazy(() => import('./components/CommandPalette/CommandPalette'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Router>
            <AuthProvider>
              <SocketProvider>
                {/* Lazy load command palette only when opened */}
                <Suspense fallback={null}>
                  {isCommandPaletteOpen && (
                    <CommandPalette
                      isOpen={isCommandPaletteOpen}
                      onClose={() => setIsCommandPaletteOpen(false)}
                    />
                  )}
                </Suspense>

                <div className="min-h-screen bg-gray-50">
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route
                        path="/*"
                        element={
                          <ProtectedRoute>
                            <Layout onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}>
                              <Routes>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<DashboardPage />} />
                                <Route path="/events" element={<EventsPage />} />
                                <Route path="/users" element={<UsersPage />} />
                                <Route path="/scoring" element={<ScoringPage />} />
                                <Route path="/results" element={<ResultsPage />} />
                                <Route path="/reports" element={<ReportsPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                              </Routes>
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </Suspense>
                </div>
              </SocketProvider>
            </AuthProvider>
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
```

#### Loading Component

**File:** `frontend/src/components/LoadingSpinner.tsx`

```typescript
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
```

---

### Task 6.2: Bundle Size Optimization (6 hours)

#### Analyze Bundle

**File:** `frontend/vite.config.ts` (updated)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ /* ... */ }),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react', 'framer-motion'],
          'form-vendor': ['react-hook-form', 'react-select', 'react-datepicker'],
          'chart-vendor': ['recharts'],
          'query-vendor': ['react-query'],
          'socket-vendor': ['socket.io-client'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
```

#### Tree Shaking

Ensure proper imports for tree shaking:

```typescript
// ❌ Bad - imports entire library
import _ from 'lodash';

// ✅ Good - imports only what's needed
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
```

#### Image Optimization

**Install:**
```bash
npm install --save-dev vite-plugin-image-optimizer
```

**Configure:**
```typescript
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

export default defineConfig({
  plugins: [
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      webp: { quality: 80 },
    }),
  ],
});
```

---

## 📋 DAY 45-46: REDIS CACHING

### Task 6.3: Implement Query Result Caching (10 hours)

#### Redis Cache Service

**File:** `src/shared/services/CacheService.ts`

```typescript
import { injectable } from 'tsyringe';
import Redis from 'redis';
import { Logger } from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
}

@injectable()
export class CacheService {
  private client: Redis.RedisClientType;
  private isConnected: boolean = false;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('CacheService');
    this.client = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error', { error: err });
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.logger.info('Redis connected');
      this.isConnected = true;
    });

    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis', { error });
    }
  }

  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const fullKey = this.buildKey(key, options.namespace);
      const value = await this.client.get(fullKey);

      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error('Cache get error', { key, error });
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const fullKey = this.buildKey(key, options.namespace);
      const serialized = JSON.stringify(value);

      if (options.ttl) {
        await this.client.setEx(fullKey, options.ttl, serialized);
      } else {
        await this.client.set(fullKey, serialized);
      }

      return true;
    } catch (error) {
      this.logger.error('Cache set error', { key, error });
      return false;
    }
  }

  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const fullKey = this.buildKey(key, options.namespace);
      await this.client.del(fullKey);
      return true;
    } catch (error) {
      this.logger.error('Cache delete error', { key, error });
      return false;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      this.logger.error('Cache invalidate pattern error', { pattern, error });
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Cache decorator
export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService as CacheService;
      if (!cacheService) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key from method name and args
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = await cacheService.get(cacheKey, options);
      if (cached !== null) {
        return cached;
      }

      // Execute method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await cacheService.set(cacheKey, result, options);

      return result;
    };

    return descriptor;
  };
}
```

#### Use Caching in Services

**File:** `src/features/events/events.service.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import { PrismaClient, Event } from '@prisma/client';
import { CacheService, Cacheable } from '@shared/services/CacheService';

@injectable()
export class EventService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(CacheService) private cacheService: CacheService
  ) {}

  @Cacheable({ ttl: 300, namespace: 'events' }) // Cache for 5 minutes
  async getAllEvents(tenantId: string): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: { tenantId, isActive: true },
      orderBy: { startDate: 'desc' },
    });
  }

  @Cacheable({ ttl: 300, namespace: 'events' })
  async getEventById(id: string, tenantId: string): Promise<Event | null> {
    return this.prisma.event.findUnique({
      where: { id, tenantId },
      include: {
        contests: {
          include: {
            categories: true,
          },
        },
      },
    });
  }

  async createEvent(data: CreateEventDTO, tenantId: string): Promise<Event> {
    const event = await this.prisma.event.create({
      data: { ...data, tenantId },
    });

    // Invalidate cache
    await this.cacheService.invalidatePattern('events:*');

    return event;
  }

  async updateEvent(
    id: string,
    data: UpdateEventDTO,
    tenantId: string
  ): Promise<Event> {
    const event = await this.prisma.event.update({
      where: { id, tenantId },
      data,
    });

    // Invalidate specific cache entries
    await this.cacheService.del(`getEventById:["${id}","${tenantId}"]`, {
      namespace: 'events',
    });
    await this.cacheService.invalidatePattern('events:getAllEvents*');

    return event;
  }
}
```

---

## 📋 DAY 47-48: SOCKET.IO CLUSTERING

### Task 6.4: Configure Redis Adapter for Horizontal Scaling (8 hours)

#### Install Dependencies

```bash
npm install @socket.io/redis-adapter redis
```

#### Configure Socket.IO with Redis

**File:** `src/config/socket.config.ts`

```typescript
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { Logger } from '../shared/utils/logger';

const logger = new Logger('Socket.IO');

export async function configureSocketIO(io: Server): Promise<void> {
  // Create Redis clients for pub/sub
  const pubClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  const subClient = pubClient.duplicate();

  // Handle errors
  pubClient.on('error', (err) => logger.error('Redis Pub Error', { error: err }));
  subClient.on('error', (err) => logger.error('Redis Sub Error', { error: err }));

  // Connect clients
  await Promise.all([pubClient.connect(), subClient.connect()]);

  // Configure adapter
  io.adapter(createAdapter(pubClient, subClient));

  logger.info('Socket.IO configured with Redis adapter for clustering');

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const user = socket.data.user;
    logger.info('Client connected', { userId: user.userId });

    // Join user-specific room
    socket.join(`user:${user.userId}`);

    // Join tenant room
    socket.join(`tenant:${user.tenantId}`);

    // Join role-specific room
    socket.join(`role:${user.role}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info('Client disconnected', { userId: user.userId });
    });
  });
}
```

#### Emit Events Across Cluster

**File:** `src/shared/services/SocketService.ts`

```typescript
import { injectable } from 'tsyringe';
import { Server } from 'socket.io';

@injectable()
export class SocketService {
  private io: Server | null = null;

  setIO(io: Server): void {
    this.io = io;
  }

  // Emit to specific user (works across cluster)
  emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Emit to all users in tenant
  emitToTenant(tenantId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`tenant:${tenantId}`).emit(event, data);
  }

  // Emit to users with specific role
  emitToRole(role: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`role:${role}`).emit(event, data);
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }
}
```

---

## 📋 DAY 49-50: CDN INTEGRATION

### Task 6.5: Configure CloudFront/Cloudflare CDN (6 hours)

#### Static Asset Optimization

**File:** `src/config/express.config.ts` (updated)

```typescript
import express from 'express';
import path from 'path';

export function configureStaticAssets(app: express.Application): void {
  // Serve static files with caching headers
  app.use(
    '/static',
    express.static(path.join(__dirname, '../../public'), {
      maxAge: '1y', // Cache for 1 year
      immutable: true,
      etag: true,
      lastModified: true,
    })
  );

  // Serve uploaded files
  app.use(
    '/uploads',
    express.static(path.join(__dirname, '../../uploads'), {
      maxAge: '7d', // Cache for 7 days
      etag: true,
    })
  );

  // Serve frontend build
  if (process.env.NODE_ENV === 'production') {
    app.use(
      express.static(path.join(__dirname, '../../frontend/dist'), {
        maxAge: '1h',
        etag: true,
        index: 'index.html',
      })
    );
  }
}
```

#### CDN Configuration (CloudFront example)

**File:** `infrastructure/cloudfront.yml`

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: CloudFront distribution for Event Manager

Resources:
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultCacheBehavior:
          TargetOriginId: EventManagerOrigin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods:
            - GET
            - HEAD
            - OPTIONS
          CachedMethods:
            - GET
            - HEAD
          Compress: true
          CachePolicyId: !Ref CachePolicy

        CacheBehaviors:
          # Static assets - long cache
          - PathPattern: '/static/*'
            TargetOriginId: EventManagerOrigin
            ViewerProtocolPolicy: https-only
            CachePolicyId: !Ref LongCachePolicy

          # API requests - no cache
          - PathPattern: '/api/*'
            TargetOriginId: EventManagerOrigin
            ViewerProtocolPolicy: https-only
            CachePolicyId: !Ref NoCachePolicy

        Origins:
          - Id: EventManagerOrigin
            DomainName: api.eventmanager.com
            CustomOriginConfig:
              HTTPPort: 80
              HTTPSPort: 443
              OriginProtocolPolicy: https-only

  LongCachePolicy:
    Type: AWS::CloudFront::CachePolicy
    Properties:
      CachePolicyConfig:
        Name: EventManager-LongCache
        DefaultTTL: 31536000 # 1 year
        MaxTTL: 31536000
        MinTTL: 31536000

  NoCachePolicy:
    Type: AWS::CloudFront::CachePolicy
    Properties:
      CachePolicyConfig:
        Name: EventManager-NoCache
        DefaultTTL: 0
        MaxTTL: 0
        MinTTL: 0
```

---

## 📋 DAY 51-52: DATABASE OPTIMIZATION

### Task 6.6: Query Optimization & Indexing (8 hours)

#### Analyze Slow Queries

**File:** `scripts/analyze-queries.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
  ],
});

// Log slow queries
prisma.$on('query', (e) => {
  if (e.duration > 1000) { // Log queries slower than 1 second
    console.warn('Slow query detected:', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  }
});
```

#### Add Missing Indexes

**File:** `prisma/schema.prisma` (update)

```prisma
model Score {
  id            String   @id @default(cuid())
  judgeId       String
  contestantId  String
  categoryId    String
  contestId     String
  value         Float
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  judge         Judge    @relation(fields: [judgeId], references: [id])
  contestant    Contestant @relation(fields: [contestantId], references: [id])
  category      Category @relation(fields: [categoryId], references: [id])
  contest       Contest  @relation(fields: [contestId], references: [id])

  // Indexes for common queries
  @@index([categoryId])
  @@index([contestantId])
  @@index([judgeId])
  @@index([contestId])
  @@index([categoryId, contestantId]) // Composite for score lookups
  @@index([createdAt]) // For sorting by date
}
```

#### Optimize N+1 Queries

Before (N+1 query):
```typescript
const events = await prisma.event.findMany();
for (const event of events) {
  const contests = await prisma.contest.findMany({
    where: { eventId: event.id }
  });
  // ...
}
```

After (optimized):
```typescript
const events = await prisma.event.findMany({
  include: {
    contests: {
      include: {
        categories: true
      }
    }
  }
});
```

---

## 📋 DAY 53-54: PERFORMANCE MONITORING

### Task 6.7: Implement Monitoring & Metrics (8 hours)

#### Performance Middleware

**File:** `src/shared/middleware/performance.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import prometheus from 'prom-client';

const logger = new Logger('Performance');

// Prometheus metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export function performanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  // Capture response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    // Record metrics
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);

    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();

    // Log slow requests
    if (duration > 1) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}s`,
        statusCode: res.statusCode,
      });
    }
  });

  next();
}
```

#### Metrics Endpoint

**File:** `src/routes/metricsRoutes.ts`

```typescript
import express from 'express';
import prometheus from 'prom-client';

const router = express.Router();

// Collect default metrics
prometheus.collectDefaultMetrics();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  const metrics = await prometheus.register.metrics();
  res.send(metrics);
});

export default router;
```

---

## 📋 DAY 55-56: LOAD TESTING & VERIFICATION

### Task 6.8: Load Testing (6 hours)

#### k6 Load Test

**File:** `tests/load/api-load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failures
  },
};

export default function () {
  // Test dashboard endpoint
  const res = http.get('http://localhost:3000/api/events', {
    headers: {
      'Cookie': 'access_token=YOUR_TEST_TOKEN',
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

Run:
```bash
k6 run tests/load/api-load-test.js
```

---

## ✅ PHASE 6 COMPLETION CHECKLIST

### Frontend Optimization
- [ ] Code splitting implemented
- [ ] All routes lazy loaded
- [ ] Bundle size < 1.2MB
- [ ] Tree shaking configured
- [ ] Images optimized
- [ ] Build time < 1 minute

### Backend Optimization
- [ ] Redis caching implemented
- [ ] Cache hit rate > 70%
- [ ] Query response time reduced by 50%+
- [ ] Socket.IO Redis adapter configured
- [ ] CDN configured for static assets

### Database
- [ ] All necessary indexes added
- [ ] N+1 queries eliminated
- [ ] Query execution time < 100ms (95th percentile)
- [ ] Connection pooling optimized

### Monitoring
- [ ] Prometheus metrics configured
- [ ] Performance middleware active
- [ ] Slow query logging enabled
- [ ] Grafana dashboards created (optional)

### Load Testing
- [ ] Load tests passing with 200 concurrent users
- [ ] 95th percentile response time < 500ms
- [ ] Error rate < 1%
- [ ] Memory usage stable under load

---

**Implementation Plan Complete!**
Return to [Overview](./00-OVERVIEW.md) for next steps.
