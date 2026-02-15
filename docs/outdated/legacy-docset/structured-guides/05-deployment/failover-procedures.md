# Failover Procedures

## Manual Failover - Database

### When to Use
- Primary database failure
- Planned maintenance
- Performance issues on primary

### Steps

1. **Verify replica is ready**
   ```bash
   # Check replication lag
   sudo -u postgres psql -h REPLICA_IP -c "SELECT pg_last_wal_replay_lsn();"

   # Should be close to primary's LSN
   sudo -u postgres psql -h PRIMARY_IP -c "SELECT pg_current_wal_lsn();"
   ```

2. **Promote replica to primary**
   ```bash
   # On replica server
   sudo -u postgres pg_ctl promote -D /var/lib/postgresql/*/main

   # Or using PostgreSQL 12+
   sudo -u postgres psql -c "SELECT pg_promote();"
   ```

3. **Update application configuration**
   ```bash
   # On both app servers
   sudo nano /var/www/event-manager/.env

   # Change DATABASE_URL to point to new primary
   DATABASE_URL=postgresql://user:pass@NEW_PRIMARY_IP:5432/event_manager

   # Restart application
   sudo systemctl restart event-manager
   ```

4. **Verify failover**
   ```bash
   # Test database connectivity
   curl http://localhost:5000/api/health

   # Check application logs
   sudo journalctl -u event-manager -f
   ```

**Expected Time**: 5 minutes
**Downtime**: < 30 seconds

---

## Manual Failover - Application Server

### When to Use
- Primary app server failure
- Deployment or maintenance
- Performance issues

### Steps

1. **Update load balancer**
   ```bash
   # Edit HAProxy config
   sudo nano /etc/haproxy/haproxy.cfg

   # Remove 'backup' flag from server2
   server app2 APP2_IP:5000 check inter 2000 rise 2 fall 3

   # Reload HAProxy
   sudo systemctl reload haproxy
   ```

2. **Verify failover**
   ```bash
   # Test through load balancer
   curl http://LOAD_BALANCER_IP/api/health

   # Should show server2
   ```

3. **Monitor new primary**
   ```bash
   # Watch logs on server2
   ssh server2
   sudo journalctl -u event-manager -f
   ```

**Expected Time**: 1 minute
**Downtime**: None (if using load balancer)

---

## Automatic Failover

### Prerequisites
- Health checks configured
- Monitoring in place
- Alerts set up

### How It Works

**Application Layer:**
- HAProxy monitors /api/health endpoint
- If unhealthy > 3 checks (6 seconds), traffic redirects to backup
- No manual intervention needed

**Database Layer (with pg_auto_failover):**
- Monitor detects primary failure
- Promotes standby automatically
- Updates connection strings
- Notifies administrators

### Monitoring Automatic Failover

```bash
# Check HAProxy stats
curl http://LOAD_BALANCER_IP:8404/stats

# Check pg_auto_failover status
pg_autoctl show state

# Check application logs
sudo journalctl -u event-manager -f
```

---

## Failback Procedures

### After Database Failover

1. **Fix original primary**
   ```bash
   # Determine what went wrong
   sudo journalctl -u postgresql -n 200

   # Fix issue (disk space, corruption, etc.)

   # Verify it starts
   sudo systemctl start postgresql
   ```

2. **Convert old primary to replica**
   ```bash
   # Stop PostgreSQL
   sudo systemctl stop postgresql

   # Clear data directory
   sudo rm -rf /var/lib/postgresql/*/main/*

   # Create replica from new primary
   sudo -u postgres pg_basebackup -h NEW_PRIMARY_IP -D /var/lib/postgresql/*/main -U replicator -R

   # Start as replica
   sudo systemctl start postgresql
   ```

3. **(Optional) Failback to original**
   ```bash
   # If you want original to be primary again
   # Repeat failover steps, promoting original replica
   ```

### After Application Failover

1. **Fix original app server**
   ```bash
   # Diagnose issue
   sudo journalctl -u event-manager -n 200

   # Fix and restart
   sudo systemctl restart event-manager

   # Verify health
   curl http://APP1_IP:5000/api/health
   ```

2. **Update load balancer**
   ```bash
   # Edit HAProxy config
   sudo nano /etc/haproxy/haproxy.cfg

   # Restore original configuration
   server app1 APP1_IP:5000 check inter 2000 rise 2 fall 3
   server app2 APP2_IP:5000 check inter 2000 rise 2 fall 3 backup

   # Reload
   sudo systemctl reload haproxy
   ```

---

## Testing Failover

### Monthly Failover Test

```bash
# Test database failover (in test environment)
sudo systemctl stop postgresql-test
# Verify automatic promotion
pg_autoctl show state

# Test application failover
sudo systemctl stop event-manager-test
# Verify HAProxy redirects traffic
curl http://test-lb/api/health
```

### Record Test Results

Document:
- [ ] Failover initiated at: [time]
- [ ] Failover completed at: [time]
- [ ] Total downtime: [duration]
- [ ] Issues encountered: [list]
- [ ] Lessons learned: [list]

---

## Troubleshooting

### Failover Not Working

**Database:**
```bash
# Check replication status
sudo -u postgres psql -c "SELECT * FROM pg_stat_replication;"

# Check replication lag
sudo -u postgres psql -c "SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) FROM pg_stat_replication;"

# Check promotion status
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
```

**Application:**
```bash
# Check HAProxy status
sudo systemctl status haproxy

# Check backend health
curl http://LOAD_BALANCER_IP:8404/stats

# Verify app server health
curl http://APP_SERVER_IP:5000/api/health
```

### Split-Brain Scenario

**Prevention:**
- Use proper fencing
- Implement STONITH (Shoot The Other Node In The Head)
- Monitor both nodes

**Resolution:**
```bash
# Identify which node has latest data
# On each node:
sudo -u postgres psql -c "SELECT pg_current_wal_lsn();"

# Keep node with higher LSN
# Rebuild other node from backup
```

---

## Rollback Procedures

### If Failover Causes Issues

1. **Immediate rollback**
   ```bash
   # Switch traffic back to original
   # Update load balancer or DNS

   # For database, promote original primary again
   sudo -u postgres pg_ctl promote
   ```

2. **Investigate issue**
   - What went wrong?
   - Data corruption?
   - Configuration issue?

3. **Fix and retry**

---

## Communication During Failover

### Internal Communication
- Post in incident channel
- Update every 15 minutes
- Notify when resolved

### External Communication
- Update status page
- Send user notification if downtime > 5 minutes
- Post-mortem after resolution

---

## Post-Failover Checklist

- [ ] Primary service restored
- [ ] Backup service ready
- [ ] Replication working
- [ ] Monitoring active
- [ ] Backups running
- [ ] Logs reviewed
- [ ] Incident documented
- [ ] Stakeholders notified
- [ ] Performance acceptable

---

**Remember**: Test failover regularly. Untested failover is no failover at all.
