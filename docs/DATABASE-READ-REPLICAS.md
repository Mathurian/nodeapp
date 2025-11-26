# Database Read Replicas

## Overview

Database read replicas improve application performance and scalability by:
- **Separating read and write workloads** - Write to primary, read from replica
- **Scaling read operations** - Add multiple replicas as needed
- **Reducing primary database load** - Offload read queries
- **Improving query performance** - Dedicated resources for reads
- **High availability** - Replicas can be promoted if primary fails

## Architecture

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼────┐ ┌─▼──────┐
│Primary │ │Read    │
│(Writes)│─┤Replica │
└────────┘ │(Reads) │
           └────────┘
              │
         Replication
```

### Write Path

1. Application sends write query (INSERT, UPDATE, DELETE)
2. Query routed to **primary database**
3. Primary executes and commits transaction
4. Changes replicated to replica asynchronously

### Read Path

1. Application sends read query (SELECT)
2. Query routed to **read replica**
3. Replica executes query
4. If replica unavailable → fallback to primary

---

## Setup

### 1. Cloud Provider Configuration

#### AWS RDS

```bash
# Create read replica via AWS CLI
aws rds create-db-instance-read-replica \
  --db-instance-identifier event-manager-replica \
  --source-db-instance-identifier event-manager-primary \
  --db-instance-class db.t3.medium \
  --availability-zone us-east-1b \
  --publicly-accessible
```

Or via AWS Console:
1. RDS → Databases → Select primary instance
2. Actions → Create read replica
3. Configure instance settings
4. Create replica

#### DigitalOcean Managed Databases

```bash
# Create read replica via doctl
doctl databases replica create <database-id> \
  --name event-manager-replica \
  --region nyc3 \
  --size db-s-2vcpu-4gb
```

Or via Web UI:
1. Databases → Select database → Settings
2. Add read-only node
3. Select region and size
4. Create node

#### Google Cloud SQL

```bash
# Create read replica
gcloud sql instances create event-manager-replica \
  --master-instance-name=event-manager-primary \
  --tier=db-n1-standard-2 \
  --region=us-central1
```

### 2. Get Connection URLs

After creating replica, get connection strings:

**Primary (writes):**
```
postgresql://user:password@primary-host:5432/event_manager
```

**Replica (reads):**
```
postgresql://user:password@replica-host:5432/event_manager
```

### 3. Update Environment Variables

```env
# .env
DATABASE_URL="postgresql://user:password@primary-host:5432/event_manager"
DATABASE_REPLICA_URL="postgresql://user:password@replica-host:5432/event_manager"

# Enable read replica usage
USE_READ_REPLICA=true

# Replication lag threshold (ms)
MAX_REPLICATION_LAG=500
```

---

## Prisma Configuration

### 1. Update Prisma Schema

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Add read replica extension (Prisma 5+)
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}
```

### 2. Create Prisma Extension for Read Replica

```typescript
// src/database/prismaExtension.ts
import { PrismaClient } from '@prisma/client';

export function createPrismaClientWithReplica() {
  const primary = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  const replica = process.env.DATABASE_REPLICA_URL
    ? new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_REPLICA_URL,
          },
        },
      })
    : primary; // Fallback to primary if no replica

  return { primary, replica };
}
```

### 3. Create Smart Client Wrapper

```typescript
// src/database/smartPrismaClient.ts
import { PrismaClient } from '@prisma/client';
import { createPrismaClientWithReplica } from './prismaExtension';
import { logger } from '../utils/logger';

class SmartPrismaClient {
  private primary: PrismaClient;
  private replica: PrismaClient;
  private useReplica: boolean;
  private replicaHealth: boolean = true;

  constructor() {
    const { primary, replica } = createPrismaClientWithReplica();
    this.primary = primary;
    this.replica = replica;
    this.useReplica = process.env.USE_READ_REPLICA === 'true';

    // Monitor replica health
    this.monitorReplicaHealth();
  }

  /**
   * Get client for read operations
   */
  get read(): PrismaClient {
    if (this.useReplica && this.replicaHealth) {
      return this.replica;
    }
    return this.primary;
  }

  /**
   * Get client for write operations
   */
  get write(): PrismaClient {
    return this.primary;
  }

  /**
   * Execute query with automatic routing
   */
  async query<T>(
    operation: (client: PrismaClient) => Promise<T>,
    options: { forceWrite?: boolean } = {}
  ): Promise<T> {
    const client = options.forceWrite ? this.write : this.read;

    try {
      return await operation(client);
    } catch (error) {
      // Fallback to primary if replica fails
      if (client === this.replica) {
        logger.warn('Read replica failed, falling back to primary', { error });
        this.replicaHealth = false;
        return await operation(this.primary);
      }
      throw error;
    }
  }

  /**
   * Monitor replica health and replication lag
   */
  private async monitorReplicaHealth() {
    if (!this.useReplica) return;

    setInterval(async () => {
      try {
        // Check if replica is responsive
        await this.replica.$queryRaw`SELECT 1`;

        // Check replication lag (PostgreSQL specific)
        const lagResult = await this.replica.$queryRaw<Array<{ lag: number }>>`
          SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) * 1000 AS lag
        `;

        const lag = lagResult[0]?.lag || 0;
        const maxLag = parseInt(process.env.MAX_REPLICATION_LAG || '1000', 10);

        if (lag > maxLag) {
          logger.warn('Replica lag too high', { lag, maxLag });
          this.replicaHealth = false;
        } else {
          this.replicaHealth = true;
        }

        logger.debug('Replica health check', { lag, healthy: this.replicaHealth });
      } catch (error) {
        logger.error('Replica health check failed', { error });
        this.replicaHealth = false;
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Disconnect all clients
   */
  async disconnect() {
    await this.primary.$disconnect();
    if (this.replica !== this.primary) {
      await this.replica.$disconnect();
    }
  }
}

export const db = new SmartPrismaClient();
```

---

## Usage in Application

### Update Service Layer

```typescript
// src/services/EventService.ts (Example)
import { db } from '../database/smartPrismaClient';

export class EventService {
  /**
   * Read operations - use replica
   */
  async getEventById(id: string) {
    return await db.query(
      (client) => client.event.findUnique({
        where: { id },
        include: {
          contests: true,
          categories: true,
        },
      })
    );
  }

  async getAllEvents(tenantId: string) {
    return await db.query(
      (client) => client.event.findMany({
        where: { tenantId },
        orderBy: { startDate: 'desc' },
      })
    );
  }

  /**
   * Write operations - use primary
   */
  async createEvent(data: CreateEventInput) {
    return await db.query(
      (client) => client.event.create({
        data,
      }),
      { forceWrite: true }
    );
  }

  async updateEvent(id: string, data: UpdateEventInput) {
    return await db.query(
      (client) => client.event.update({
        where: { id },
        data,
      }),
      { forceWrite: true }
    );
  }

  /**
   * Read-after-write - use primary to avoid replication lag
   */
  async createEventAndReturn(data: CreateEventInput) {
    // Create on primary
    const event = await db.query(
      (client) => client.event.create({
        data,
      }),
      { forceWrite: true }
    );

    // Read from primary (avoid lag)
    return await db.query(
      (client) => client.event.findUnique({
        where: { id: event.id },
        include: {
          contests: true,
          categories: true,
        },
      }),
      { forceWrite: true } // Force primary for consistency
    );
  }
}
```

### Direct Client Access

```typescript
// Read from replica
const events = await db.read.event.findMany({
  where: { tenantId },
});

// Write to primary
await db.write.event.create({
  data: eventData,
});

// Force primary for read-after-write
const newEvent = await db.write.event.create({
  data: eventData,
});
const refreshed = await db.write.event.findUnique({
  where: { id: newEvent.id },
});
```

---

## Handling Replication Lag

### What is Replication Lag?

Replication is **asynchronous**, meaning there's a delay between:
1. Write committed on primary
2. Change replicated to replica

Typical lag: **10-500ms** (can be higher under load)

### Read-After-Write Consistency

**Problem:** User creates record, then immediately reads it from replica → record not found (lag)

**Solution 1: Read from Primary**

```typescript
async createEvent(data: CreateEventInput) {
  // Create on primary
  const event = await db.write.event.create({ data });

  // Read from primary (avoid lag)
  return await db.write.event.findUnique({
    where: { id: event.id },
    include: { contests: true },
  });
}
```

**Solution 2: Wait for Replication**

```typescript
async createEventAndWait(data: CreateEventInput) {
  const event = await db.write.event.create({ data });

  // Wait for replica to catch up
  await this.waitForReplication(event.id);

  // Now read from replica
  return await db.read.event.findUnique({
    where: { id: event.id },
  });
}

private async waitForReplication(id: string, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const exists = await db.read.event.findUnique({
      where: { id },
      select: { id: true },
    });
    if (exists) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Replication timeout');
}
```

**Solution 3: Client-Side Caching**

```typescript
// Return immediately from write, use that data
const event = await db.write.event.create({ data });
return event; // Don't re-fetch
```

---

## Monitoring

### Replication Lag

**PostgreSQL Query:**

```sql
-- On replica
SELECT
  EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) * 1000 AS lag_ms;
```

**Monitor in Application:**

```typescript
import { logger } from './logger';
import { db } from './smartPrismaClient';

export async function checkReplicationLag() {
  try {
    const result = await db.read.$queryRaw<Array<{ lag_ms: number }>>`
      SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) * 1000 AS lag_ms
    `;

    const lag = result[0]?.lag_ms || 0;

    logger.info('Replication lag', { lag_ms: lag });

    if (lag > 1000) {
      logger.warn('High replication lag detected', { lag_ms: lag });
    }

    return lag;
  } catch (error) {
    logger.error('Failed to check replication lag', { error });
    return null;
  }
}

// Check every minute
setInterval(checkReplicationLag, 60000);
```

### Metrics

Track these metrics:

- **Replication lag** (milliseconds)
- **Read queries routed to replica** (count, %)
- **Write queries routed to primary** (count, %)
- **Replica fallback events** (when replica fails)
- **Query performance** (primary vs replica)

```typescript
import { metricsService } from './services/MetricsService';

// In SmartPrismaClient
async query<T>(
  operation: (client: PrismaClient) => Promise<T>,
  options: { forceWrite?: boolean } = {}
): Promise<T> {
  const client = options.forceWrite ? this.write : this.read;
  const isReplica = client === this.replica && this.replicaHealth;

  const start = Date.now();

  try {
    const result = await operation(client);
    const duration = Date.now() - start;

    metricsService.recordDatabaseQuery({
      target: isReplica ? 'replica' : 'primary',
      duration,
      success: true,
    });

    return result;
  } catch (error) {
    // Fallback and metrics...
  }
}
```

---

## Best Practices

### ✅ Do

- **Route reads to replica** - Use `.read` for all SELECT queries
- **Route writes to primary** - Use `.write` for INSERT/UPDATE/DELETE
- **Monitor replication lag** - Alert if lag > 1000ms
- **Implement fallback** - Use primary if replica fails
- **Handle read-after-write** - Read from primary after creating/updating
- **Use connection pooling** - Both primary and replica
- **Test failover** - Simulate replica failure
- **Monitor costs** - Replica = additional database cost

### ❌ Don't

- **Don't write to replica** - Read-only!
- **Don't assume instant replication** - Expect lag
- **Don't ignore lag** - Can cause consistency issues
- **Don't expose lag to users** - Handle gracefully
- **Don't over-replicate** - Start with 1 replica
- **Don't forget indexes** - Replica needs same indexes as primary

---

## Query Routing Decision Tree

```
Is this a write operation (INSERT/UPDATE/DELETE)?
├─ YES → Use PRIMARY
└─ NO → Is this read-after-write?
    ├─ YES → Use PRIMARY (avoid lag)
    └─ NO → Use REPLICA
        └─ Is replica healthy and lag < threshold?
            ├─ YES → Use REPLICA
            └─ NO → Fallback to PRIMARY
```

---

## Common Patterns

### Pattern 1: Simple Read

```typescript
// List all events (can tolerate slight lag)
const events = await db.read.event.findMany({
  where: { tenantId },
});
```

### Pattern 2: Simple Write

```typescript
// Create event
const event = await db.write.event.create({
  data: eventData,
});
```

### Pattern 3: Read-After-Write

```typescript
// Create and immediately return full data
const event = await db.write.event.create({
  data: eventData,
  include: { contests: true }, // Use include to get related data in same query
});

// OR force primary for subsequent read
const event = await db.write.event.create({ data: eventData });
const full = await db.write.event.findUnique({
  where: { id: event.id },
  include: { contests: true },
});
```

### Pattern 4: Transaction (Always Primary)

```typescript
// Transactions always use primary
await db.write.$transaction(async (tx) => {
  const event = await tx.event.create({ data: eventData });
  const contest = await tx.contest.create({
    data: { ...contestData, eventId: event.id },
  });
  return { event, contest };
});
```

### Pattern 5: Analytics/Reports (Replica OK)

```typescript
// Heavy analytics queries - perfect for replica
const stats = await db.read.$queryRaw`
  SELECT
    DATE(created_at) as date,
    COUNT(*) as count
  FROM events
  WHERE tenant_id = ${tenantId}
  GROUP BY DATE(created_at)
  ORDER BY date DESC
`;
```

---

## Costs

### AWS RDS

- **Primary:** db.t3.medium (~$60/month)
- **Replica:** db.t3.medium (~$60/month)
- **Total:** ~$120/month (2x primary cost)

### DigitalOcean

- **Primary:** db-s-2vcpu-4gb ($60/month)
- **Read-only node:** +$30/month (50% of primary)
- **Total:** ~$90/month (1.5x primary cost)

### Google Cloud SQL

- **Primary:** db-n1-standard-2 (~$100/month)
- **Replica:** db-n1-standard-2 (~$100/month)
- **Total:** ~$200/month (2x primary cost)

**Note:** Costs vary by region, instance size, and storage.

---

## Rollout Strategy

### Phase 1: Setup (Week 1)

1. Create read replica in cloud provider
2. Verify replication is working
3. Get replica connection URL
4. Add to environment variables (disabled)

### Phase 2: Code Changes (Week 1)

1. Implement `SmartPrismaClient`
2. Update one service to use read replica
3. Deploy with `USE_READ_REPLICA=false`
4. Test in staging

### Phase 3: Gradual Rollout (Week 2)

1. Enable replica for staging: `USE_READ_REPLICA=true`
2. Monitor lag, errors, performance
3. Update remaining services
4. Enable in production for 10% of traffic
5. Gradually increase to 100%

### Phase 4: Monitoring (Ongoing)

1. Set up lag alerts (>1000ms)
2. Monitor replica health
3. Track query routing metrics
4. Review costs monthly

---

## Troubleshooting

### Replica Lag Too High

**Symptoms:** Lag consistently > 1000ms

**Causes:**
- Heavy write load on primary
- Replica under-provisioned
- Network issues

**Solutions:**
- Upgrade replica instance size
- Reduce write load
- Check network connectivity
- Investigate slow queries on replica

### Replica Connection Fails

**Symptoms:** "Connection refused" errors

**Causes:**
- Replica not running
- Firewall blocking connection
- Wrong connection URL

**Solutions:**
- Check replica status in cloud console
- Verify security group/firewall rules
- Verify connection string
- Test connection with `psql`

### Inconsistent Read Results

**Symptoms:** User sees old data after update

**Causes:**
- Reading from replica immediately after write
- High replication lag

**Solutions:**
- Read from primary for read-after-write
- Wait for replication before reading
- Increase `MAX_REPLICATION_LAG` threshold

---

## Resources

- [PostgreSQL Replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [AWS RDS Read Replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [Prisma Read Replicas](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#read-replicas)
- [Database Scaling Strategies](https://www.digitalocean.com/community/tutorials/understanding-database-scaling-patterns)

---

*Last Updated: November 25, 2025*
*Owner: DevOps/Engineering Team*
*Review Frequency: Quarterly*
