# Monitoring and Validation Strategy

**Document Purpose:** Define monitoring and validation for all implementation phases
**Created:** November 22, 2025
**Version:** 1.0

---

## Monitoring Philosophy

**Monitor Everything, Alert on Anomalies**

### Key Metrics Categories

1. **Application Health:** Uptime, errors, response times
2. **Database Performance:** Query times, connection pool
3. **Resource Usage:** CPU, memory, disk
4. **Business Metrics:** User activity, API usage
5. **Security:** Failed logins, rate limits hit

---

## Phase 1: Critical Fixes Monitoring

### PrismaClient Singleton Monitoring

**Metrics to Track:**

```sql
-- Database connections (should stay < 10)
SELECT count(*) as connection_count
FROM pg_stat_activity
WHERE datname = 'event_manager';

-- Long-running queries (should be rare)
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;
```

**Application Metrics:**

```typescript
// src/middleware/monitoring.ts
import { Counter, Gauge } from 'prom-client';

export const dbConnectionGauge = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  async collect() {
    const count = await getActiveConnections();
    this.set(count);
  },
});

// Alert if > 8 connections
```

**Validation Checks (Daily for first week):**

```bash
#!/bin/bash
# scripts/validate-phase1.sh

# Check for multiple PrismaClient instances
echo "Checking for new PrismaClient() in code..."
INSTANCES=$(grep -r "new PrismaClient()" src/ | wc -l)
if [ $INSTANCES -gt 0 ]; then
  echo "❌ Found $INSTANCES new PrismaClient instances"
  exit 1
fi

# Check database connection count
echo "Checking database connections..."
CONN_COUNT=$(psql event_manager -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'event_manager';")
if [ $CONN_COUNT -gt 10 ]; then
  echo "⚠️  High connection count: $CONN_COUNT"
fi

echo "✅ Phase 1 validation passed"
```

### Cascade Deletes Monitoring

**Audit Deletions:**

```sql
-- Create deletion audit table
CREATE TABLE deletion_audit (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  cascaded_count INTEGER,
  deleted_by INTEGER,
  deleted_at TIMESTAMP DEFAULT NOW()
);

-- Trigger on major deletes
CREATE OR REPLACE FUNCTION audit_tenant_deletion()
RETURNS TRIGGER AS $$
DECLARE
  cascade_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cascade_count
  FROM "User" WHERE "tenantId" = OLD.id;

  INSERT INTO deletion_audit (table_name, record_id, cascaded_count)
  VALUES ('Tenant', OLD.id, cascade_count);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_deletion_audit
BEFORE DELETE ON "Tenant"
FOR EACH ROW EXECUTE FUNCTION audit_tenant_deletion();
```

**Daily Validation:**

```sql
-- Check for orphaned records
SELECT 'Orphaned Scores' as issue, COUNT(*) as count
FROM "Score" s
WHERE s."contestId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Contest" c WHERE c.id = s."contestId")
UNION ALL
SELECT 'Orphaned Contests', COUNT(*)
FROM "Contest" c
WHERE c."eventId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Event" e WHERE e.id = c."eventId");

-- Should return 0 for all
```

---

## Phase 2: High Priority Monitoring

### Password Hashing Performance

**Track hashing times:**

```typescript
// src/utils/password.ts
import { Histogram } from 'prom-client';

const hashDuration = new Histogram({
  name: 'password_hash_duration_seconds',
  help: 'Time to hash password',
  buckets: [0.1, 0.2, 0.5, 1.0, 2.0],
});

export class PasswordService {
  static async hash(password: string): Promise<string> {
    const end = hashDuration.startTimer();
    try {
      const hash = await bcrypt.hash(password, 12);
      return hash;
    } finally {
      end();
    }
  }
}
```

**Alert if:** Hash time > 500ms

### Logging Monitoring

**Log Levels Distribution:**

```bash
#!/bin/bash
# scripts/analyze-logs.sh

echo "Log level distribution (last hour):"
tail -n 10000 logs/combined-*.log | \
  jq -r '.level' | \
  sort | uniq -c | sort -rn

echo "\nError count (last hour):"
grep '"level":"error"' logs/combined-*.log | wc -l

# Alert if > 50 errors/hour
```

**Log Volume Monitoring:**

```bash
# Check log file growth
du -sh logs/

# Alert if > 1GB/day
```

### Type Safety Validation

**Continuous:**

```bash
# Run in CI/CD
npx tsc --noEmit

# Should have 0 errors after phase complete
```

---

## Phase 3: Medium Priority Monitoring

### Database Performance

**Query Performance Tracking:**

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Index Usage:**

```sql
-- Unused indexes (candidates for removal)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;
```

**Cache Hit Ratio:**

```sql
-- Should be > 99%
SELECT
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 AS cache_hit_ratio
FROM pg_statio_user_tables;
```

### Redis Caching Monitoring

**Cache Metrics:**

```typescript
import { Counter, Histogram } from 'prom-client';

const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
});

const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
});

const cacheOperationDuration = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Cache operation duration',
  labelNames: ['operation'], // get, set, delete
});

// Use in CacheService
static async get<T>(key: string): Promise<T | null> {
  const end = cacheOperationDuration.startTimer({ operation: 'get' });
  try {
    const value = await redis.get(key);
    if (value) {
      cacheHits.inc();
    } else {
      cacheMisses.inc();
    }
    return value ? JSON.parse(value) : null;
  } finally {
    end();
  }
}
```

**Cache Hit Rate:**

```
Cache Hit Rate = cache_hits / (cache_hits + cache_misses) * 100
Target: > 80%
```

### Security Monitoring

**Failed Login Attempts:**

```typescript
const failedLogins = new Counter({
  name: 'failed_login_attempts_total',
  help: 'Total failed login attempts',
  labelNames: ['ip'],
});

// Alert if > 10 from same IP in 5 minutes
```

**Rate Limit Hits:**

```typescript
const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total rate limit violations',
  labelNames: ['endpoint', 'ip'],
});

// Alert if spike in rate limit hits
```

---

## Application Health Monitoring

### Health Check Endpoint

```typescript
// src/routes/health.ts
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      memory: checkMemory(),
    },
  };

  const isHealthy = Object.values(health.checks).every(check => check.status === 'ok');

  res.status(isHealthy ? 200 : 503).json(health);
});

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

async function checkRedis() {
  if (!redis) return { status: 'disabled' };
  try {
    await redis.ping();
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function checkMemory() {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

  return {
    status: heapUsedMB < 500 ? 'ok' : 'warning',
    heapUsedMB,
    heapTotalMB,
  };
}
```

### Response Time Monitoring

```typescript
// src/middleware/metrics.ts
import { Histogram } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export function metricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode,
      },
      duration
    );
  });

  next();
}
```

### Error Rate Monitoring

```typescript
const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total HTTP request errors',
  labelNames: ['method', 'route', 'status_code'],
});

// In error handler
app.use((err, req, res, next) => {
  httpRequestErrors.inc({
    method: req.method,
    route: req.route?.path || req.path,
    status_code: res.statusCode || 500,
  });

  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({ error: 'Internal server error' });
});
```

---

## Alerting Rules

### Critical Alerts (Immediate Response)

```yaml
# Alert configuration (Prometheus format)
groups:
  - name: critical
    rules:
      - alert: ApplicationDown
        expr: up == 0
        for: 1m
        annotations:
          summary: "Application is down"

      - alert: DatabaseConnectionsFull
        expr: db_connections_active > 9
        for: 5m
        annotations:
          summary: "Database connection pool near limit"

      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) > 0.05
        annotations:
          summary: "Error rate > 5%"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 5m
        annotations:
          summary: "95th percentile response time > 2s"
```

### Warning Alerts (Review Next Business Day)

```yaml
  - name: warnings
    rules:
      - alert: HighMemoryUsage
        expr: memory_usage_mb > 400
        for: 10m
        annotations:
          summary: "Memory usage high"

      - alert: LowCacheHitRate
        expr: cache_hits / (cache_hits + cache_misses) < 0.8
        for: 30m
        annotations:
          summary: "Cache hit rate < 80%"

      - alert: SlowDatabaseQuery
        expr: histogram_quantile(0.95, db_query_duration_seconds) > 1
        for: 10m
        annotations:
          summary: "Slow database queries detected"
```

---

## Monitoring Dashboard

**Grafana Dashboard Panels:**

1. **Application Overview:**
   - Uptime
   - Request rate
   - Error rate
   - Response times (p50, p95, p99)

2. **Database:**
   - Connection count
   - Query performance
   - Cache hit ratio
   - Index usage

3. **Resources:**
   - CPU usage
   - Memory usage
   - Disk I/O

4. **Business Metrics:**
   - Active users
   - Events created/day
   - Scores entered/day

---

## Validation Checklist

**Daily (First Week After Deployment):**

- [ ] Check error logs for new issues
- [ ] Verify database connection count
- [ ] Check orphaned record query results
- [ ] Review slow query log
- [ ] Check application response times
- [ ] Verify cache hit rate

**Weekly:**

- [ ] Review alert history
- [ ] Check resource trends
- [ ] Review security logs
- [ ] Validate backup integrity
- [ ] Check test coverage

**Monthly:**

- [ ] Performance review
- [ ] Security audit
- [ ] Capacity planning
- [ ] Documentation updates

---

## Validation Scripts

```bash
#!/bin/bash
# scripts/daily-validation.sh

echo "=== Daily Validation Report ==="
echo "Date: $(date)"
echo ""

# Check application health
echo "1. Application Health:"
curl -s http://localhost:3000/health | jq .
echo ""

# Check error count
echo "2. Error Count (last 24h):"
grep '"level":"error"' logs/combined-$(date +%Y-%m-%d).log | wc -l
echo ""

# Check database connections
echo "3. Database Connections:"
psql event_manager -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'event_manager';"
echo ""

# Check orphaned records
echo "4. Orphaned Records:"
psql event_manager -c "
SELECT 'Orphaned Scores' as issue, COUNT(*) as count
FROM \"Score\" s
WHERE s.\"contestId\" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM \"Contest\" c WHERE c.id = s.\"contestId\");"
echo ""

# Check disk space
echo "5. Disk Space:"
df -h /var/www/event-manager
echo ""

# Check log file size
echo "6. Log File Size:"
du -sh logs/
echo ""

echo "=== End Report ==="
```

---

**Review Frequency:** Daily (first week), Weekly (first month), Monthly (ongoing)
**Owner:** DevOps Team
**On-Call:** 24/7 rotation for critical alerts
