# High Availability Setup Guide

## Overview

This guide covers setting up high availability (HA) for the Event Manager application to minimize downtime and ensure continuous service.

## Architecture

```
                    ┌─────────────┐
                    │Load Balancer│
                    │  (HAProxy)  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │ App Server 1│          │ App Server 2│
       │  (Primary)  │          │ (Secondary) │
       └──────┬──────┘          └──────┬──────┘
              │                         │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    │  (Replication)│
                    │ Primary + Replica│
                    └─────────────┘
```

## PostgreSQL Streaming Replication

### Primary Server Setup

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Add:
```
wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB
synchronous_commit = off  # or 'on' for sync replication
```

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Add:
```
host replication replicator REPLICA_IP/32 md5
```

```bash
# Create replication user
sudo -u postgres psql -c "CREATE USER replicator REPLICATION LOGIN ENCRYPTED PASSWORD 'secure_password';"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Replica Server Setup

```bash
# Stop PostgreSQL on replica
sudo systemctl stop postgresql

# Clear data directory
sudo rm -rf /var/lib/postgresql/*/main/*

# Base backup from primary
sudo -u postgres pg_basebackup -h PRIMARY_IP -D /var/lib/postgresql/*/main -U replicator -P -v -R

# Start PostgreSQL
sudo systemctl start postgresql

# Verify replication
sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"
```

**Expected**: You should see the replica connected

---

## Application Redundancy

### Server 1 (Primary)
```bash
# Install application
cd /var/www/event-manager
npm install
npm run build

# Configure for HA
echo "NODE_ENV=production" >> .env
echo "SERVER_ID=server1" >> .env
```

### Server 2 (Secondary)
```bash
# Same installation
cd /var/www/event-manager
npm install
npm run build

echo "NODE_ENV=production" >> .env
echo "SERVER_ID=server2" >> .env
```

### Shared Session Storage (Redis)

Both servers should use shared Redis for sessions:

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis (on dedicated server)
sudo nano /etc/redis/redis.conf
```

Update:
```
bind 0.0.0.0
requirepass your_secure_password
```

In application `.env`:
```
REDIS_URL=redis://redis-server:6379
REDIS_PASSWORD=your_secure_password
SESSION_STORE=redis
```

---

## Load Balancer Configuration

### Install HAProxy

```bash
sudo apt install haproxy
sudo nano /etc/haproxy/haproxy.cfg
```

Configuration:
```
global
    log /dev/log local0
    maxconn 4096
    user haproxy
    group haproxy
    daemon

defaults
    mode http
    log global
    option httplog
    option dontlognull
    option http-server-close
    option forwardfor except 127.0.0.0/8
    option redispatch
    retries 3
    timeout connect 5000
    timeout client  50000
    timeout server  50000

frontend http_front
    bind *:80
    default_backend http_back

backend http_back
    balance roundrobin
    option httpchk GET /api/health
    http-check expect status 200

    server app1 APP1_IP:5000 check inter 2000 rise 2 fall 3
    server app2 APP2_IP:5000 check inter 2000 rise 2 fall 3 backup

listen stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
```

```bash
# Restart HAProxy
sudo systemctl restart haproxy
sudo systemctl enable haproxy
```

---

## Automatic Failover

### PostgreSQL Automatic Failover (pg_auto_failover)

```bash
# Install on both DB servers
sudo apt install postgresql-auto-failover-cli

# Initialize monitor (on separate server)
pg_autoctl create monitor --pgdata /var/lib/pg_auto_failover/monitor

# Initialize primary
pg_autoctl create postgres --pgdata /var/lib/postgresql/*/main --monitor postgres://monitor:port/pg_auto_failover

# Initialize standby
pg_autoctl create postgres --pgdata /var/lib/postgresql/*/main --monitor postgres://monitor:port/pg_auto_failover
```

### Application Health Checks

```javascript
// In server.ts
app.get('/api/health', (req, res) => {
  // Check database connection
  prisma.$queryRaw`SELECT 1`
    .then(() => res.json({ status: 'healthy', server: process.env.SERVER_ID }))
    .catch(() => res.status(503).json({ status: 'unhealthy' }));
});
```

---

## Monitoring and Alerting

### Setup Monitoring

```bash
# Install monitoring stack
sudo /var/www/event-manager/scripts/setup-monitoring.sh

# Configure alerts
sudo nano /etc/prometheus/alert.rules.yml
```

Alert rules:
```yaml
groups:
  - name: ha_alerts
    rules:
      - alert: ApplicationServerDown
        expr: up{job="event-manager"} == 0
        for: 1m
        annotations:
          summary: "Application server {{ $labels.instance }} is down"

      - alert: DatabaseReplicationLag
        expr: pg_replication_lag_seconds > 10
        for: 2m
        annotations:
          summary: "Database replication lag > 10 seconds"

      - alert: LoadBalancerDown
        expr: haproxy_backend_up == 0
        for: 1m
        annotations:
          summary: "Load balancer backend is down"
```

---

## Testing Failover

### Test Application Failover
```bash
# Stop primary app server
sudo systemctl stop event-manager

# Verify HAProxy switches to backup
curl http://load-balancer/api/health

# Should return server2
```

### Test Database Failover
```bash
# Simulate primary failure
sudo systemctl stop postgresql

# Verify replica promotes to primary
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
# Should return 'f' (false) if promoted
```

---

## Maintenance Procedures

### Rolling Updates

1. **Update Server 2 (backup)**
   ```bash
   # On Server 2
   git pull origin main
   npm install
   npm run build
   sudo systemctl restart event-manager
   ```

2. **Verify Server 2**
   ```bash
   curl http://server2:5000/api/health
   ```

3. **Switch traffic to Server 2**
   - Make Server 2 primary in HAProxy
   - Remove 'backup' flag

4. **Update Server 1**
   - Same as Server 2

5. **Restore normal configuration**

---

## Estimated Costs

| Component | Monthly Cost (AWS) |
|-----------|-------------------|
| Load Balancer | $20 |
| 2x App Servers (t3.medium) | $120 |
| 2x DB Servers (t3.small) | $60 |
| Redis (t3.micro) | $15 |
| **Total** | **~$215/month** |

---

## Failover Times

| Scenario | Expected Failover Time |
|----------|----------------------|
| Application Server Failure | < 30 seconds |
| Database Failure (Auto) | < 60 seconds |
| Database Failure (Manual) | < 5 minutes |
| Complete Site Failure | < 30 minutes |

---

## Maintenance Schedule

- **Weekly**: Check replication status
- **Monthly**: Test manual failover
- **Quarterly**: Full DR drill
- **Annually**: Review and update HA architecture
