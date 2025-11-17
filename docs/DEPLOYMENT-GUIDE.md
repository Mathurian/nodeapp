# Production Deployment Guide

Comprehensive guide for deploying the Event Manager application with all Phase 1-6 features enabled.

**Last Updated:** 2025-11-17

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Phase 1: Security Configuration](#phase-1-security-configuration)
5. [Phase 2: Testing Infrastructure](#phase-2-testing-infrastructure)
6. [Phase 3: Command Palette Features](#phase-3-command-palette-features)
7. [Phase 6: Performance Optimization](#phase-6-performance-optimization)
8. [Deployment Options](#deployment-options)
9. [Verification Steps](#verification-steps)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)
12. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Software

- **Node.js**: 18.x or later
- **PostgreSQL**: 14.x or later
- **Redis**: 7.x or later (for caching and Socket.IO clustering)
- **npm** or **yarn**: Latest stable version

### Optional (for advanced features)

- **Docker**: For containerized deployment
- **PM2**: For process management and clustering
- **Kubernetes**: For orchestration and horizontal scaling
- **k6**: For load testing

### Infrastructure Requirements

**Minimum:**
- 2 vCPUs
- 4 GB RAM
- 20 GB SSD storage
- PostgreSQL database (managed or self-hosted)

**Recommended (Production):**
- 4+ vCPUs
- 8+ GB RAM
- 50+ GB SSD storage
- Managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
- Managed Redis (AWS ElastiCache, Google Cloud Memorystore, etc.)
- Load balancer (for horizontal scaling)

---

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd nodeapp
npm install
```

### 2. Environment Variables

Create `.env` file in project root:

```bash
# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
DATABASE_URL="postgresql://user:password@localhost:5432/event_manager"

# ============================================================================
# SECURITY CONFIGURATION (Phase 1)
# ============================================================================

# JWT Configuration
JWT_SECRET="<generate-strong-secret-256-bit>"  # openssl rand -base64 32
JWT_REFRESH_SECRET="<generate-strong-secret-256-bit>"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Cookie Configuration
COOKIE_SECRET="<generate-strong-secret-256-bit>"
COOKIE_DOMAIN="yourdomain.com"  # Your production domain
COOKIE_SECURE="true"  # Must be true in production (HTTPS required)
COOKIE_SAME_SITE="strict"  # strict, lax, or none

# CORS Configuration
ALLOWED_ORIGINS="https://app.yourdomain.com,https://admin.yourdomain.com"
CORS_CREDENTIALS="true"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"  # 15 minutes
RATE_LIMIT_MAX_REQUESTS="100"  # 100 requests per window

# ============================================================================
# REDIS CONFIGURATION (Phase 6)
# ============================================================================

# Redis Connection
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD="<your-redis-password>"
REDIS_DB="0"

# Cache Configuration
CACHE_ENABLED="true"
CACHE_WARMUP_ENABLED="true"
CACHE_DEFAULT_TTL="300"  # 5 minutes default
CACHE_DEBUG="false"  # Set to true for debugging

# ============================================================================
# SOCKET.IO CLUSTERING (Phase 6)
# ============================================================================

# Enable for multi-instance deployments (PM2, Kubernetes)
SOCKET_IO_CLUSTERING_ENABLED="false"  # Set to true if running multiple instances

# ============================================================================
# SERVER CONFIGURATION
# ============================================================================

NODE_ENV="production"
PORT="3000"
HOST="0.0.0.0"

# Logging
LOG_LEVEL="info"  # error, warn, info, debug
LOG_FILE_PATH="./logs"

# ============================================================================
# FRONTEND CONFIGURATION
# ============================================================================

VITE_API_URL="https://api.yourdomain.com"
VITE_SOCKET_URL="https://api.yourdomain.com"

# ============================================================================
# EMAIL CONFIGURATION (Optional)
# ============================================================================

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="<your-email>"
SMTP_PASSWORD="<your-app-password>"
EMAIL_FROM="noreply@yourdomain.com"

# ============================================================================
# MONITORING (Optional)
# ============================================================================

SENTRY_DSN="<your-sentry-dsn>"
DATADOG_API_KEY="<your-datadog-key>"
```

### 3. Generate Secrets

```bash
# Generate JWT secrets
openssl rand -base64 32

# Generate cookie secret
openssl rand -base64 32

# Generate refresh token secret
openssl rand -base64 32
```

---

## Database Setup

### 1. Create Database

```bash
# PostgreSQL
createdb event_manager

# Or using SQL
psql -U postgres
CREATE DATABASE event_manager;
\q
```

### 2. Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run all migrations
npx prisma migrate deploy

# Verify migrations
npx prisma migrate status
```

### 3. Apply Performance Indexes

The following migrations include comprehensive indexes:
- `20250120000000_add_performance_indexes`
- `20251112_add_comprehensive_indexes`

Verify indexes were created:

```sql
-- Check indexes
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 4. Seed Database (Optional)

```bash
# Create admin user and sample data
npx prisma db seed
```

---

## Phase 1: Security Configuration

### 1. HttpOnly Cookie Authentication

The application now uses secure httpOnly cookies instead of localStorage for JWT tokens.

**Frontend Changes:**
- Authentication state managed via `/api/auth/profile` endpoint
- Login sets httpOnly cookies automatically
- Logout clears cookies

**No frontend code changes required** - cookies are handled automatically by the browser.

### 2. XSS Protection

All user inputs are sanitized using `xss-clean` middleware.

**Backend (already configured in server.ts):**
```typescript
import xss from 'xss-clean';
app.use(xss());
```

### 3. CORS Configuration

Configure allowed origins in `.env`:

```bash
ALLOWED_ORIGINS="https://app.yourdomain.com,https://admin.yourdomain.com"
```

**Verify CORS:**
```bash
curl -H "Origin: https://app.yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://api.yourdomain.com/api/auth/login
```

### 4. Rate Limiting

Rate limiting is enabled by default (100 requests per 15 minutes).

**Adjust if needed:**
```bash
RATE_LIMIT_MAX_REQUESTS="200"  # More permissive
```

---

## Phase 2: Testing Infrastructure

### 1. Run Tests Before Deployment

```bash
# Backend tests
npm run test

# Frontend tests
cd frontend && npm run test

# E2E tests (optional)
npm run test:e2e
```

### 2. Load Testing with k6

```bash
# Install k6
brew install k6  # macOS
choco install k6  # Windows
# See tests/load/README.md for Linux

# Run smoke test
k6 run tests/load/smoke-test.js

# Run load test
k6 run tests/load/load-test.js
```

**Expected Results:**
- Smoke test: 0% errors, p95 < 500ms
- Load test: < 5% errors, p95 < 1000ms

---

## Phase 3: Command Palette Features

### 1. Frontend Build

The command palette is already integrated. Build the frontend:

```bash
cd frontend
npm install
npm run build
```

### 2. Verify Command Palette

After deployment:
1. Open application in browser
2. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
3. Command palette should open
4. Search for "Dashboard" or "Events"
5. Press Enter to navigate

### 3. Keyboard Shortcuts

All shortcuts are automatically configured:
- `Cmd/Ctrl + K`: Open command palette
- `Cmd/Ctrl + H`: Dashboard
- `Cmd/Ctrl + E`: Events
- `Cmd/Ctrl + Shift + Q`: Logout

---

## Phase 6: Performance Optimization

### 1. Redis Setup

**Local Development:**
```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Production (AWS ElastiCache):**
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id event-manager-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1

# Get endpoint
aws elasticache describe-cache-clusters \
  --cache-cluster-id event-manager-cache \
  --show-cache-node-info
```

Update `.env`:
```bash
REDIS_URL="redis://your-elasticache-endpoint:6379"
```

### 2. Enable Caching

```bash
# .env
CACHE_ENABLED="true"
CACHE_WARMUP_ENABLED="true"
```

**Verify caching works:**
```bash
# Connect to Redis
redis-cli

# Monitor cache operations
MONITOR

# In another terminal, make API request
curl https://api.yourdomain.com/api/events

# Check for cache keys
KEYS *

# Check specific key
GET events:allEvents:*
```

### 3. Socket.IO Clustering (Multi-Instance Deployments)

**Only enable if running multiple instances** (PM2 cluster, Kubernetes HPA):

```bash
# .env
SOCKET_IO_CLUSTERING_ENABLED="true"
REDIS_URL="redis://your-redis-endpoint:6379"
```

**PM2 Cluster Mode:**
```bash
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'event-manager-api',
    script: './dist/server.js',
    instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      SOCKET_IO_CLUSTERING_ENABLED: 'true',
      REDIS_URL: 'redis://localhost:6379'
    }
  }]
};

# Start with PM2
pm2 start ecosystem.config.js
```

**Kubernetes HPA:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-manager-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        env:
        - name: SOCKET_IO_CLUSTERING_ENABLED
          value: "true"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
```

---

## Deployment Options

### Option 1: Single Server (PM2)

**1. Build application:**
```bash
# Backend
npm run build

# Frontend
cd frontend && npm run build
cd ..
```

**2. Install PM2:**
```bash
npm install -g pm2
```

**3. Start application:**
```bash
# Start backend
pm2 start dist/server.js --name event-manager-api

# Serve frontend (using nginx or serve)
npm install -g serve
pm2 start "serve frontend/dist -p 80" --name event-manager-frontend

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

**4. Monitor:**
```bash
pm2 status
pm2 logs event-manager-api
pm2 monit
```

### Option 2: Docker Compose

**1. Create `docker-compose.yml`:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: event_manager
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: <password>
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass <redis-password>
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:<password>@postgres:5432/event_manager
      REDIS_URL: redis://:< redis-password>@redis:6379
      NODE_ENV: production
      CACHE_ENABLED: "true"
      SOCKET_IO_CLUSTERING_ENABLED: "false"
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
```

**2. Deploy:**
```bash
docker-compose up -d
docker-compose logs -f api
```

### Option 3: Kubernetes

**1. Create deployment files in `k8s/`:**

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-manager-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: event-manager-api
  template:
    metadata:
      labels:
        app: event-manager-api
    spec:
      containers:
      - name: api
        image: your-registry/event-manager-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: event-manager-secrets
              key: database-url
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: SOCKET_IO_CLUSTERING_ENABLED
          value: "true"
        - name: CACHE_ENABLED
          value: "true"
---
apiVersion: v1
kind: Service
metadata:
  name: event-manager-api-service
spec:
  selector:
    app: event-manager-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: event-manager-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: event-manager-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**2. Deploy:**
```bash
kubectl apply -f k8s/
kubectl get pods
kubectl get services
```

---

## Verification Steps

### 1. Health Check

```bash
curl https://api.yourdomain.com/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 2. Authentication Flow

```bash
# Login
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  -c cookies.txt

# Verify cookie was set
cat cookies.txt
# Should see: access_token and refresh_token

# Get profile (using cookies)
curl https://api.yourdomain.com/api/auth/profile \
  -b cookies.txt

# Logout
curl -X POST https://api.yourdomain.com/api/auth/logout \
  -b cookies.txt
```

### 3. Cache Performance

```bash
# First request (cache miss - slower)
time curl https://api.yourdomain.com/api/events

# Second request (cache hit - faster)
time curl https://api.yourdomain.com/api/events
```

### 4. WebSocket Connection

```bash
# Install wscat
npm install -g wscat

# Connect to Socket.IO
wscat -c "wss://api.yourdomain.com/socket.io/?EIO=4&transport=websocket"
```

### 5. Command Palette

1. Open browser to `https://app.yourdomain.com`
2. Press `Cmd/Ctrl + K`
3. Type "events"
4. Verify suggestions appear
5. Press Enter to navigate

---

## Monitoring & Maintenance

### 1. Application Logs

**PM2:**
```bash
pm2 logs event-manager-api --lines 100
pm2 logs event-manager-api --err
```

**Docker:**
```bash
docker-compose logs -f api --tail=100
```

**Kubernetes:**
```bash
kubectl logs -f deployment/event-manager-api
kubectl logs -f pod/<pod-name>
```

### 2. Database Performance

```bash
# Connect to PostgreSQL
psql $DATABASE_URL

# Check slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;

# Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY idx_tup_read DESC;
```

### 3. Redis Monitoring

```bash
# Connect to Redis
redis-cli

# Check memory usage
INFO memory

# Check cache hit rate
INFO stats

# Monitor operations
MONITOR

# Check key count
DBSIZE

# Find large keys
MEMORY USAGE <key>
```

### 4. Load Testing (Ongoing)

```bash
# Weekly load test
k6 run tests/load/load-test.js

# Before major releases
k6 run tests/load/stress-test.js
```

### 5. Health Checks

Create monitoring service to ping `/health` every 60 seconds:

```bash
# Uptime monitoring
curl https://api.yourdomain.com/health

# Database connectivity
curl https://api.yourdomain.com/health/db

# Redis connectivity
curl https://api.yourdomain.com/health/redis
```

---

## Troubleshooting

### Issue: "Cannot set headers after they are sent"

**Cause:** Multiple response.send() calls or middleware errors

**Fix:**
```typescript
// Ensure only one response per request
if (error) {
  return res.status(500).json({ error: 'Server error' });
}
// Don't send another response after return
```

### Issue: CORS errors in browser

**Fix:**
1. Verify `ALLOWED_ORIGINS` includes your frontend domain
2. Check `CORS_CREDENTIALS="true"` is set
3. Ensure frontend uses `credentials: 'include'`:
   ```typescript
   fetch(url, {
     credentials: 'include',
     headers: { 'Content-Type': 'application/json' }
   });
   ```

### Issue: Redis connection fails

**Fix:**
```bash
# Check Redis is running
redis-cli ping
# Expected: PONG

# Check Redis password
redis-cli -a <password> ping

# Verify REDIS_URL in .env
echo $REDIS_URL
```

### Issue: Socket.IO not working across instances

**Fix:**
1. Ensure `SOCKET_IO_CLUSTERING_ENABLED="true"`
2. Verify Redis adapter is configured in `src/config/socket-redis-adapter.config.ts`
3. Check all instances connect to same Redis:
   ```bash
   redis-cli
   CLIENT LIST
   # Should see multiple clients
   ```

### Issue: Slow query performance

**Fix:**
1. Check if indexes exist:
   ```sql
   \di  -- List all indexes
   ```

2. Run EXPLAIN ANALYZE:
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM events WHERE status = 'active';
   ```

3. Add missing indexes (see `docs/DATABASE-OPTIMIZATION.md`)

### Issue: High memory usage

**Fix:**
1. Check Redis memory:
   ```bash
   redis-cli INFO memory
   ```

2. Set maxmemory policy:
   ```bash
   redis-cli CONFIG SET maxmemory 256mb
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

3. Clear unused caches:
   ```bash
   redis-cli FLUSHDB
   ```

---

## Rollback Procedures

### 1. Database Rollback

```bash
# List migrations
npx prisma migrate status

# Rollback last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Reset to specific migration
npx prisma migrate resolve --applied <migration-name>
```

### 2. Application Rollback

**PM2:**
```bash
# Stop current version
pm2 stop event-manager-api

# Checkout previous version
git checkout <previous-commit>

# Rebuild
npm run build

# Restart
pm2 restart event-manager-api
```

**Docker:**
```bash
# Rollback to previous image
docker-compose down
docker tag event-manager-api:latest event-manager-api:backup
docker pull your-registry/event-manager-api:<previous-tag>
docker-compose up -d
```

**Kubernetes:**
```bash
# Rollback deployment
kubectl rollout undo deployment/event-manager-api

# Rollback to specific revision
kubectl rollout history deployment/event-manager-api
kubectl rollout undo deployment/event-manager-api --to-revision=2
```

### 3. Environment Variable Rollback

```bash
# Keep backup of .env
cp .env .env.backup

# Restore if needed
cp .env.backup .env
pm2 restart event-manager-api
```

---

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied successfully
- [ ] Performance indexes created and verified
- [ ] Redis connection working
- [ ] Cache warming completed
- [ ] Health check endpoint responding
- [ ] Authentication flow tested (login/logout)
- [ ] CORS configured correctly
- [ ] Rate limiting working
- [ ] WebSocket connections established
- [ ] Command palette accessible (Cmd/Ctrl+K)
- [ ] Load tests passing (< 5% errors)
- [ ] Monitoring and logging configured
- [ ] SSL/TLS certificates installed (HTTPS)
- [ ] Backup procedures tested
- [ ] Rollback procedures documented and tested

---

## Additional Resources

- **Security:** See `docs/SECURITY-IMPLEMENTATION.md`
- **Database Optimization:** See `docs/DATABASE-OPTIMIZATION.md`
- **Load Testing:** See `tests/load/README.md`
- **Implementation Status:** See `docs/IMPLEMENTATION-STATUS.md`
- **TODO Tracker:** See `docs/TODO-TRACKER.md`

---

**For support or issues, contact your DevOps team or create an issue in the repository.**
