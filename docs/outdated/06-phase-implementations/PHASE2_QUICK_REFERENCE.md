# Phase 2 Quick Reference Guide

Quick reference for using Phase 2 features.

---

## Mobile Components

### Responsive DataTable

```typescript
import ResponsiveDataTable from '@/components/ResponsiveDataTable';

<ResponsiveDataTable
  data={items}
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', mobileHidden: true }
  ]}
  onEdit={(row) => handleEdit(row)}
  onDelete={(row) => handleDelete(row)}
/>
```

### Pull-to-Refresh

```typescript
import { usePullToRefresh, PullToRefreshIndicator } from '@/hooks/usePullToRefresh';

const { containerRef, isPulling, isRefreshing, pullDistance, threshold } =
  usePullToRefresh({ onRefresh: async () => await refetchData() });

<div ref={containerRef}>
  <PullToRefreshIndicator {...{ isPulling, isRefreshing, pullDistance, threshold }} />
  {/* content */}
</div>
```

### Mobile Forms

```typescript
import { MobileFormField, MobileSelect } from '@/components/MobileFormField';

<MobileFormField
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  clearable
/>
```

---

## Charts & Visualization

### Score Distribution

```typescript
import ScoreDistributionChart from '@/components/charts/ScoreDistributionChart';

<ScoreDistributionChart
  scores={scores}
  onBarClick={(data) => console.log(data)}
/>
```

### Progress Indicators

```typescript
import { ProgressIndicator, CircularProgress, ProgressCard } from '@/components/charts/ProgressIndicator';

<ProgressIndicator value={75} max={100} label="Progress" />
<CircularProgress value={85} size={120} />
<ProgressCard title="Certified" value={42} max={50} variant="circular" />
```

### Heatmap

```typescript
import ScoringHeatmap from '@/components/charts/ScoringHeatmap';

<ScoringHeatmap
  scores={scores}
  onCellClick={(judgeId, contestantId, score) => console.log(score)}
/>
```

---

## Background Jobs

### Queue Email

```typescript
import queueService from '@/services/QueueService';

await queueService.addJob('email', 'send-email', {
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<p>Hello!</p>'
});
```

### Queue Report

```typescript
await queueService.addJob('reports', 'generate-report', {
  reportType: 'event',
  format: 'csv',
  parameters: { eventId: '123' },
  requestedBy: userId,
  notifyEmail: 'user@example.com'
});
```

### Schedule Job

```typescript
await queueService.addScheduledJob(
  'maintenance',
  'cleanup',
  {},
  '0 2 * * *'  // Daily at 2 AM
);
```

### Monitor Queues

```typescript
const stats = await queueService.getAllQueueStats();
const jobs = await queueService.getJobs('email', 'failed');
await queueService.retryJob('email', jobId);
```

---

## Database

### Apply Indexes

```bash
psql -h localhost -U user -d database -f prisma/migrations/20251112_add_comprehensive_indexes/migration.sql
```

### Run Maintenance

```bash
./scripts/db-maintenance.sh all       # Full maintenance
./scripts/db-maintenance.sh vacuum    # Just vacuum
./scripts/db-maintenance.sh backup    # Just backup
```

### Monitor Queries

```typescript
import { QueryMetrics, ConnectionPoolMonitor } from '@/middleware/queryMonitoring';

const metrics = QueryMetrics.getMetrics();
const slowQueries = QueryMetrics.getSlowQueries(100);
const poolStats = await ConnectionPoolMonitor.getPoolStats();
```

---

## Environment Variables

```env
# Redis for background jobs
REDIS_URL=redis://localhost:6379

# Database with connection pooling
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=15&pool_timeout=5000

# Query monitoring
SLOW_QUERY_THRESHOLD=100
```

---

## Cron Jobs (Optional)

```cron
# Full DB maintenance weekly
0 2 * * 0 /var/www/event-manager/scripts/db-maintenance.sh all

# Daily vacuum
0 3 * * * /var/www/event-manager/scripts/db-maintenance.sh vacuum
```

---

For complete documentation, see [PHASE2_COMPLETE.md](./06-phase-implementations/PHASE2_COMPLETE.md)
