# Administrator Guide

Complete guide for system administrators managing the Event Manager application.

## Table of Contents

- [System Access](#system-access)
- [Monitoring and Dashboards](#monitoring-and-dashboards)
- [Health Checks and Diagnostics](#health-checks-and-diagnostics)
- [Service Management](#service-management)
- [Database Administration](#database-administration)
- [Backup and Recovery](#backup-and-recovery)
- [Security Management](#security-management)
- [Event and Scoring Configuration](#event-and-scoring-configuration)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)

## System Access

### Application URLs

All services are accessible through the main domain or localhost:

| Service | Public URL | Direct URL | Port | Purpose |
|---------|-----------|------------|------|---------|
| **Main Application** | https://conmgr.com/ | http://localhost:3002 | 80 → 3002 | Primary web application |
| **Backend API** | https://conmgr.com/api/ | http://localhost:3000/api/ | 80 → 3000 | REST API endpoints |
| **API Documentation** | https://conmgr.com/api-docs | http://localhost:3000/api-docs | 80 → 3000 | Swagger/OpenAPI docs |
| **Grafana Dashboard** | https://conmgr.com/monitoring/grafana/ | http://localhost:3001 | 80 → 3001 | Performance monitoring |
| **Prometheus Metrics** | https://conmgr.com/monitoring/prometheus/ | http://localhost:9090 | 80 → 9090 | Metrics collection |
| **Metrics Endpoint** | https://conmgr.com/metrics | http://localhost:3000/metrics | 80 → 3000 | Raw Prometheus metrics |
| **Health Check** | https://conmgr.com/health | http://localhost:3000/health | 80 → 3000 | System health status |

**Note**: Cloudflare enforces HTTPS for all public URLs. HTTP requests are automatically redirected to HTTPS.

### Default Credentials

**Grafana Dashboard**:
- Username: `admin`
- Password: `admin` (Change on first login!)
- **⚠️ IMPORTANT**: Change the default password immediately after first login

**PostgreSQL Database**:
- Username: Configured in `.env` file
- Password: Configured in `.env` file
- Database: `event_manager`

## Monitoring and Dashboards

### Grafana Dashboard

**Access**: https://conmgr.com/monitoring/grafana/

**Features**:
- Real-time performance metrics
- Database query performance
- API response times
- System resource usage
- Custom alerts and notifications
- Pre-configured dashboards

**Common Tasks**:

```bash
# Check Grafana service status
sudo systemctl status grafana-server

# Restart Grafana
sudo systemctl restart grafana-server

# View Grafana logs
sudo journalctl -u grafana-server -f

# Verify Grafana configuration
cat /etc/grafana/grafana.ini | grep -E "http_port|root_url"
```

**Configuration Files**:
- Main config: `/etc/grafana/grafana.ini`
- Data directory: `/var/lib/grafana`
- Provisioning: `/etc/grafana/provisioning/`
- Dashboards: `/etc/grafana/provisioning/dashboards/`
- Datasources: `/etc/grafana/provisioning/datasources/`

### Prometheus Metrics

**Access**: https://conmgr.com/monitoring/prometheus/

**Features**:
- PromQL query interface
- Metrics explorer
- Target health status
- Alert rules configuration
- Time-series graphs

**Common Tasks**:

```bash
# Check Prometheus service status
sudo systemctl status prometheus

# Restart Prometheus
sudo systemctl restart prometheus

# View Prometheus logs
sudo journalctl -u prometheus -f

# Verify Prometheus configuration
promtool check config /etc/prometheus/prometheus.yml
```

**Configuration Files**:
- Main config: `/etc/prometheus/prometheus.yml`
- Data directory: `/var/lib/prometheus`

**Useful Queries** (in Prometheus UI):

```promql
# HTTP request rate
rate(http_requests_total[5m])

# Database query duration
histogram_quantile(0.95, rate(database_query_duration_bucket[5m]))

# Memory usage
process_resident_memory_bytes

# Active connections
nodejs_active_connections

# Test execution metrics
test_runs_total                          # Total test runs
rate(test_pass_total[5m])               # Test pass rate
rate(test_fail_total[5m])               # Test failure rate
test_suite_status                        # Current test status (0=idle, 1=running, 2=passed, 3=failed)
histogram_quantile(0.95, rate(test_duration_seconds_bucket[5m]))  # p95 test duration

# System status metrics
service_status{service="backend-production"}    # Service health (0=down, 1=up)
service_uptime_seconds                           # Service uptime
service_memory_usage_bytes                       # Memory usage
service_cpu_usage_percent                        # CPU usage
```

### Test and System Monitoring Dashboard

**NEW**: Event Manager now includes automated monitoring for test execution and system health.

**Access Grafana Dashboard**:
1. Navigate to https://conmgr.com/monitoring/grafana/
2. Login with admin credentials (default: admin/admin - change immediately!)
3. Dashboard should auto-load as "Event Manager - Test & System Monitoring"
4. If not visible, import from: `/var/www/event-manager/monitoring/grafana/dashboards/event-manager-monitoring.json`

**Dashboard Features**:
- **Test Results Over Time**: Real-time view of test pass/fail/skip rates
- **Test Suite Status**: Current status of test suites (idle/running/passed/failed)
- **Test Duration Trends**: p50 and p95 percentiles for test execution time
- **Service Health**: Up/down status for all critical services
- **Resource Usage**: Memory and CPU usage per service
- **Service Uptime**: How long each service has been running

**Automated Test Reporting**:

The Playwright test suite automatically reports metrics to Prometheus:

```bash
# When you run tests, metrics are automatically collected
npm run test:e2e

# Example output:
# [Prometheus Reporter] Test run started: e2e-local
# [Prometheus Reporter] Test run completed: { passed: 218, failed: 0, skipped: 0, duration: '145.23s' }
# [Prometheus Reporter] Test results reported successfully
```

**Manual Test Reporting** (for custom test suites):

```bash
# Report test start
curl -X POST http://localhost:3000/api/monitoring/test-start \
  -H "Content-Type: application/json" \
  -d '{
    "suite": "integration-tests",
    "type": "integration"
  }'

# Report test results
curl -X POST http://localhost:3000/api/monitoring/test-results \
  -H "Content-Type: application/json" \
  -d '{
    "suite": "integration-tests",
    "type": "integration",
    "passed": 45,
    "failed": 2,
    "skipped": 1,
    "durationSeconds": 120.5
  }'
```

**System Status Monitoring**:

```bash
# Get current system status (similar to status.sh)
curl http://localhost:3000/api/monitoring/system-status

# Example response:
{
  "success": true,
  "data": {
    "timestamp": "2024-12-28T12:00:00.000Z",
    "services": [
      {
        "name": "backend-production",
        "port": "3000",
        "isRunning": true,
        "pid": 12345,
        "uptimeSeconds": 86400,
        "memoryMB": 256.5,
        "cpuPercent": 12.3
      },
      {
        "name": "grafana",
        "port": "3001",
        "isRunning": true,
        "pid": 12346,
        "uptimeSeconds": 86400,
        "memoryMB": 128.2,
        "cpuPercent": 5.1
      },
      ...
    ]
  }
}

# Update service metrics manually
curl -X POST http://localhost:3000/api/monitoring/service-status \
  -H "Content-Type: application/json" \
  -d '{
    "service": "custom-worker",
    "port": "8080",
    "isRunning": true,
    "uptimeSeconds": 3600,
    "memoryBytes": 524288000,
    "cpuPercent": 15.5
  }'
```

**Dashboard Import Instructions**:

See detailed instructions at: `/var/www/event-manager/monitoring/grafana/dashboards/README.md`

Quick import via Grafana UI:
1. Go to https://conmgr.com/monitoring/grafana/
2. Login with credentials (default: admin/admin)
3. Click "+" → "Import"
4. Upload `/var/www/event-manager/monitoring/grafana/dashboards/event-manager-monitoring.json`
5. Select "Prometheus" as data source
6. Click "Import"

**Monitoring Endpoints**:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/monitoring/test-start` | POST | Report test run started |
| `/api/monitoring/test-results` | POST | Report test execution results |
| `/api/monitoring/service-status` | POST | Update service status metrics |
| `/api/monitoring/system-status` | GET | Get current system status |

### API Documentation (Swagger)

**Access**: https://conmgr.com/api-docs

**Features**:
- Complete API endpoint documentation
- Interactive API testing ("Try it out")
- Request/response examples
- Schema definitions
- Authentication testing

**Usage**:
1. Navigate to http://conmgr.com/api-docs
2. Click "Authorize" button
3. Enter JWT token in format: `Bearer <your-jwt-token>`
4. Expand any endpoint to see details
5. Click "Try it out" to test endpoints interactively

## Health Checks and Diagnostics

### System Health Check

**Access**: http://conmgr.com/health

**Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-28T12:00:00.000Z",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected"
}
```

### Service Status Check

```bash
# Check all services at once
./scripts/status.sh

# Check individual services
sudo systemctl status event-manager     # Production backend
sudo systemctl status grafana-server
sudo systemctl status prometheus
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server

# Check which ports are listening
sudo ss -tlnp | grep -E ":(3000|3001|3002|9090|5432|6379|80)"
```

### Database Health

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to database
psql postgresql://event_manager:password@localhost:5432/event_manager

# Check database size
psql -U event_manager -d event_manager -c "
  SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;
"

# Check active connections
psql -U event_manager -d event_manager -c "
  SELECT count(*) as active_connections
  FROM pg_stat_activity
  WHERE datname = 'event_manager';
"
```

### Redis Health

```bash
# Check Redis status
sudo systemctl status redis-server

# Connect to Redis
redis-cli

# Check memory usage
redis-cli INFO memory

# Check connected clients
redis-cli INFO clients

# Monitor commands in real-time
redis-cli MONITOR
```

### Application Metrics

**Access**: http://conmgr.com/metrics

View raw Prometheus-format metrics:

```bash
# View all metrics
curl http://conmgr.com/metrics

# Filter specific metrics
curl http://conmgr.com/metrics | grep http_requests

# Check database metrics
curl http://conmgr.com/metrics | grep database
```

## Service Management

### Production Services

**Start Production Server**:
```bash
cd /var/www/event-manager
./scripts/start-production.sh
```

**Stop Production Server**:
```bash
cd /var/www/event-manager
./scripts/stop-production.sh
```

**Check Service Status**:
```bash
cd /var/www/event-manager
./scripts/status.sh
```

### Development Services

**Start Development Servers**:
```bash
cd /var/www/event-manager
./scripts/start-development.sh
```

**Stop Development Servers**:
```bash
cd /var/www/event-manager
./scripts/stop-development.sh
```

### Nginx Configuration

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx (without downtime)
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View site configuration
cat /etc/nginx/sites-enabled/event-manager
```

### Systemd Services

```bash
# List all event-manager related services
systemctl list-units | grep -E "event-manager|grafana|prometheus"

# Enable service to start on boot
sudo systemctl enable event-manager
sudo systemctl enable grafana-server
sudo systemctl enable prometheus

# Disable service from starting on boot
sudo systemctl disable event-manager

# View service logs
sudo journalctl -u event-manager -f
sudo journalctl -u grafana-server -f
sudo journalctl -u prometheus -f
```

## Database Administration

### Common Database Tasks

**Run Migrations**:
```bash
cd /var/www/event-manager
npx prisma migrate deploy
```

**Check Migration Status**:
```bash
npx prisma migrate status
```

**Generate Prisma Client**:
```bash
npx prisma generate
```

**Open Database GUI**:
```bash
npx prisma studio
# Opens at http://localhost:5555
```

### Database Backup

**Manual Backup**:
```bash
# Backup to file
pg_dump -U event_manager event_manager > /backup/event_manager_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump -U event_manager event_manager | gzip > /backup/event_manager_$(date +%Y%m%d_%H%M%S).sql.gz
```

**Automated Backup** (recommended):
```bash
# Create backup directory
sudo mkdir -p /backup/event-manager

# Add to crontab
sudo crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * pg_dump -U event_manager event_manager | gzip > /backup/event-manager/event_manager_$(date +\%Y\%m\%d).sql.gz
```

### Database Restore

```bash
# Restore from backup
psql -U event_manager event_manager < /backup/event_manager_20241228.sql

# Restore from compressed backup
gunzip -c /backup/event_manager_20241228.sql.gz | psql -U event_manager event_manager
```

## Backup and Recovery

### What to Backup

1. **Database** - PostgreSQL data
2. **Uploaded Files** - `/var/www/event-manager/uploads/`
3. **Configuration** - `.env` file, nginx configs
4. **SSL Certificates** - If using Let's Encrypt
5. **Grafana Dashboards** - `/var/lib/grafana`

### Backup Script

Create `/var/www/event-manager/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backup/event-manager"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U event_manager event_manager | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/event-manager/uploads/

# Backup configuration
cp /var/www/event-manager/.env $BACKUP_DIR/env_$DATE

# Backup Grafana
sudo tar -czf $BACKUP_DIR/grafana_$DATE.tar.gz /var/lib/grafana

# Remove backups older than 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

Make it executable:
```bash
chmod +x /var/www/event-manager/scripts/backup.sh
```

## Security Management

### SSL/TLS Certificates

**Check Certificate Status**:
```bash
# Check certificate expiration
sudo certbot certificates

# View certificate details
openssl x509 -in /etc/letsencrypt/live/conmgr.com/cert.pem -text -noout
```

**Renew Certificates**:
```bash
# Manual renewal
sudo certbot renew

# Test renewal (dry-run)
sudo certbot renew --dry-run
```

### Security Auditing

**Check Failed Login Attempts**:
```bash
# View authentication logs
sudo journalctl -u event-manager | grep "authentication failed"

# Count failed attempts by IP
sudo journalctl -u event-manager | grep "authentication failed" | \
  grep -oP '\d+\.\d+\.\d+\.\d+' | sort | uniq -c | sort -rn
```

**Review Audit Logs**:
```bash
# View audit logs in database
psql -U event_manager -d event_manager -c "
  SELECT * FROM audit_logs
  ORDER BY created_at DESC
  LIMIT 50;
"
```

### Firewall Configuration

```bash
# Check firewall status
sudo ufw status

# Allow specific ports
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 22/tcp    # SSH

# Deny direct access to application ports
sudo ufw deny 3000/tcp
sudo ufw deny 3001/tcp
sudo ufw deny 3002/tcp
sudo ufw deny 9090/tcp
```

## Event and Scoring Configuration

### Olympic Scoring vs Straight Scoring

The Event Manager system supports two scoring methodologies that can be configured at the tenant, event, or contest level:

#### Straight Scoring (Default)
- **Calculation**: Averages all judge scores for a contestant
- **Use Case**: Standard scoring for most competitions
- **Requirements**: No minimum judge requirement
- **Example**: If a contestant receives scores of 8.5, 9.0, and 7.5, the final score is (8.5 + 9.0 + 7.5) / 3 = 8.33

#### Olympic Scoring
- **Calculation**: Drops the highest and lowest scores, then averages the remaining scores
- **Use Case**: International competitions, figure skating, diving, gymnastics
- **Requirements**: **Minimum 3 judges per contest**
- **Example**: If a contestant receives scores of 8.5, 9.0, 7.5, 8.8, and 9.2:
  - Drop lowest (7.5) and highest (9.2)
  - Average remaining: (8.5 + 9.0 + 8.8) / 3 = 8.77

### Configuring Scoring Types

Scoring types follow a hierarchical inheritance model:

**Contest > Event > Tenant**

If a contest doesn't specify a scoring type, it inherits from its event. If the event doesn't specify one, it inherits from the tenant.

#### Tenant-Level Configuration

**Via Settings Page** (Recommended):
1. Navigate to Settings → Scoring Settings
2. Select "Straight Scoring" or "Olympic Scoring"
3. Click "Save Changes"

**Via API**:
```bash
curl -X PUT https://conmgr.com/api/tenant/current \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=YOUR_TOKEN" \
  -d '{"scoringType": "OLYMPIC"}'
```

#### Event-Level Configuration

When creating or editing an event:
1. Navigate to Events page
2. Click "Create Event" or edit an existing event
3. Under "Scoring Type", select:
   - "Inherit from tenant" (default)
   - "Straight Scoring"
   - "Olympic Scoring"
4. Save the event

#### Contest-Level Configuration

When creating or editing a contest:
1. Navigate to Contests page
2. Click "Create Contest" or edit an existing contest
3. Under "Scoring Type", select:
   - "Inherit from event/tenant" (default)
   - "Straight Scoring"
   - "Olympic Scoring"
4. Save the contest

### Validation Rules

The system enforces these validation rules:

1. **Olympic Scoring Requires 3+ Judges**: If a contest uses Olympic scoring (directly or inherited), it must have at least 3 judges assigned before scores can be submitted and certified.

2. **Certification Checks**: The TallyMaster certification process validates that Olympic scoring contests have sufficient judges before allowing certification.

3. **Score Display**: Results pages show which scores were dropped when using Olympic scoring for transparency.

### Monitoring Scoring Type Usage

**Grafana Dashboard**:
The system collects Prometheus metrics for scoring type distribution:
- `tenants_by_scoring_type_total{scoring_type="STRAIGHT|OLYMPIC"}` - Tenant counts
- `events_by_scoring_type_total{tenant_id="X", scoring_type="STRAIGHT|OLYMPIC"}` - Event counts per tenant
- `contests_by_scoring_type_total{tenant_id="X", scoring_type="STRAIGHT|OLYMPIC"}` - Contest counts per tenant

**Database Query**:
```sql
-- Check scoring type distribution
SELECT scoringType, COUNT(*) as count
FROM tenants
WHERE isActive = true
GROUP BY scoringType;

-- Find events using Olympic scoring (direct or inherited)
SELECT e.id, e.name,
       COALESCE(e.scoringType, t.scoringType) as effective_scoring_type
FROM events e
JOIN tenants t ON e.tenantId = t.id
WHERE COALESCE(e.scoringType, t.scoringType) = 'OLYMPIC';
```

### Troubleshooting Olympic Scoring

**Issue**: Contest won't certify with Olympic scoring

**Solution**: Verify judge count
```sql
SELECT c.id, c.name, COUNT(cj.id) as judge_count
FROM contests c
LEFT JOIN contest_judges cj ON c.id = cj.contestId
WHERE c.id = 'CONTEST_ID'
GROUP BY c.id, c.name;
```

Ensure judge_count >= 3 for Olympic scoring contests.

**Issue**: Scores not calculating correctly

**Solution**: Check effective scoring type
```sql
SELECT
  cat.id as category_id,
  cat.name as category_name,
  con.name as contest_name,
  COALESCE(con.scoringType, e.scoringType, t.scoringType) as effective_type,
  con.scoringType as contest_type,
  e.scoringType as event_type,
  t.scoringType as tenant_type
FROM categories cat
JOIN contests con ON cat.contestId = con.id
JOIN events e ON con.eventId = e.id
JOIN tenants t ON e.tenantId = t.id
WHERE cat.id = 'CATEGORY_ID';
```

## Performance Tuning

### PostgreSQL Optimization

**Check Connection Pool**:
```bash
psql -U event_manager -d event_manager -c "
  SELECT count(*), state
  FROM pg_stat_activity
  GROUP BY state;
"
```

**Analyze Query Performance**:
```bash
# Enable query logging
# Edit /etc/postgresql/14/main/postgresql.conf
log_min_duration_statement = 1000  # Log queries slower than 1s
```

**Vacuum and Analyze**:
```bash
# Vacuum database
psql -U event_manager -d event_manager -c "VACUUM ANALYZE;"

# Reindex database
psql -U event_manager -d event_manager -c "REINDEX DATABASE event_manager;"
```

### Redis Optimization

**Check Memory Usage**:
```bash
redis-cli INFO memory | grep used_memory_human
```

**Clear Cache** (if needed):
```bash
# Clear all Redis data
redis-cli FLUSHDB

# Or use npm script
npm run cache:clear
```

### Node.js Memory

**Monitor Memory**:
```bash
# Check current memory usage
ps aux | grep node

# Monitor in real-time
top -p $(pgrep -f "node dist/server.js")
```

## Troubleshooting

### Common Issues

**1. Service Won't Start**

```bash
# Check logs
sudo journalctl -u event-manager -n 50 --no-pager

# Check port conflicts
sudo ss -tlnp | grep :3000

# Verify configuration
node -c dist/server.js
```

**2. Database Connection Issues**

```bash
# Test database connection
psql postgresql://event_manager:password@localhost:5432/event_manager

# Check PostgreSQL is running
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

**3. Nginx 502 Bad Gateway**

```bash
# Check backend is running
curl http://localhost:3000/health

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t
```

**4. High Memory Usage**

```bash
# Check Node.js memory
ps aux | grep node | awk '{print $6}'

# Restart service to clear memory
sudo systemctl restart event-manager

# Check for memory leaks in Grafana
```

**5. Slow Performance**

```bash
# Check database queries
psql -U event_manager -d event_manager -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  ORDER BY total_time DESC
  LIMIT 10;
"

# Check Redis hit rate
redis-cli INFO stats | grep keyspace

# View application metrics
curl http://conmgr.com/metrics | grep -E "duration|latency"
```

### Getting Help

**Log Locations**:
- Application: `sudo journalctl -u event-manager -f`
- Nginx: `/var/log/nginx/error.log`
- PostgreSQL: `/var/log/postgresql/postgresql-14-main.log`
- Grafana: `sudo journalctl -u grafana-server -f`
- Prometheus: `sudo journalctl -u prometheus -f`

**Debug Commands**:
```bash
# Full system status
./scripts/status.sh

# Test database connectivity
npm run health:db

# Test Redis connectivity
npm run health:redis

# Test API health
npm run health:check
```

## Quick Reference

### Daily Tasks

```bash
# Morning health check
./scripts/status.sh
curl http://conmgr.com/health

# View overnight errors
sudo journalctl -u event-manager --since "yesterday" | grep -i error

# Check disk space
df -h

# Check database size
npm run db:stats
```

### Weekly Tasks

```bash
# Review backup status
ls -lh /backup/event-manager/

# Database maintenance
npm run db:optimize

# Security updates
sudo apt update && sudo apt upgrade

# Review Grafana dashboards
# Visit http://conmgr.com/monitoring/grafana/
```

### Monthly Tasks

```bash
# Full system backup
./scripts/backup.sh

# Review and rotate logs
sudo journalctl --vacuum-time=30d

# Review security audit logs
# Check database audit_logs table

# Performance review
# Review Grafana dashboard metrics
```

## Additional Resources

- **Full Documentation**: See `/docs/` directory
- **Deployment Guide**: `docs/08-DEPLOYMENT.md`
- **Troubleshooting**: `docs/10-TROUBLESHOOTING.md`
- **Security**: `docs/07-SECURITY.md`
- **Disaster Recovery**: `docs/11-DISASTER-RECOVERY.md`

---

**Last Updated**: December 2024
**Version**: 1.0.0
