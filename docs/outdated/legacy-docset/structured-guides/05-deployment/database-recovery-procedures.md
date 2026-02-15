# Database Recovery Procedures

## Scenario 1: Database Corruption

### Symptoms
- Database won't start
- Corruption errors in logs
- Data inconsistencies
- Query failures

### Assessment
```bash
# Check PostgreSQL logs
sudo journalctl -u postgresql -n 100

# Try to start database
sudo systemctl start postgresql

# Check data directory
sudo ls -la /var/lib/postgresql/*/main/
```

### Recovery Steps

1. **Stop PostgreSQL**
   ```bash
   sudo systemctl stop postgresql
   ```

2. **Create safety backup**
   ```bash
   sudo cp -a /var/lib/postgresql/*/main /var/backups/safety_$(date +%Y%m%d_%H%M%S)
   ```

3. **Restore from latest backup**
   ```bash
   sudo /var/www/event-manager/scripts/restore-backup.sh \
     --backup $(ls -t /var/backups/event-manager/full/*.tar.* | head -1)
   ```

4. **Verify recovery**
   ```bash
   sudo systemctl start postgresql
   sudo -u postgres psql -d event_manager -c "SELECT count(*) FROM \"User\";"
   ```

**Expected Time**: 30-60 minutes
**Data Loss**: Up to last backup (max 24 hours)

---

## Scenario 2: Accidental Data Deletion

### Symptoms
- User reports missing data
- Records deleted unintentionally
- Data present in backups but missing in production

### Assessment
```bash
# Find when data was last present
sudo -u postgres psql -d event_manager -c "SELECT * FROM \"AuditLog\" WHERE table_name='TableName' ORDER BY timestamp DESC LIMIT 10;"

# Check backup times
ls -lh /var/backups/event-manager/full/
```

### Recovery Steps (Point-in-Time Recovery)

1. **Determine target time**
   - When was data last known to be good?
   - Example: "2025-01-15 10:30:00"

2. **Stop application**
   ```bash
   sudo systemctl stop event-manager
   ```

3. **Restore using PITR**
   ```bash
   sudo /var/www/event-manager/scripts/restore-pitr.sh \
     --backup /var/backups/postgresql/base/pitr_base_latest.tar.gz \
     --target-time "2025-01-15 10:30:00"
   ```

4. **Verify data is restored**
   ```bash
   sudo -u postgres psql -d event_manager -c "SELECT * FROM TableName WHERE id='missing_id';"
   ```

5. **Restart application**
   ```bash
   sudo systemctl start event-manager
   ```

**Expected Time**: 60-90 minutes
**Data Loss**: Transactions after target time (need to be re-entered)

---

## Scenario 3: Complete Database Loss

### Symptoms
- Database files deleted
- Disk failure
- Cannot access database at all

### Recovery Steps

1. **Stop PostgreSQL (if running)**
   ```bash
   sudo systemctl stop postgresql
   ```

2. **Restore latest full backup**
   ```bash
   sudo /var/www/event-manager/scripts/restore-backup.sh \
     --backup $(ls -t /var/backups/event-manager/full/*.tar.* | head -1) \
     --no-confirm
   ```

3. **Apply WAL files (if available)**
   ```bash
   # Copy WAL archives to PostgreSQL
   sudo cp /var/lib/postgresql/wal_archive/* /var/lib/postgresql/*/main/pg_wal/
   ```

4. **Start and verify**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl start event-manager

   # Test
   curl http://localhost:5000/api/health
   ```

**Expected Time**: 1-2 hours
**Data Loss**: Since last successful backup

---

## Scenario 4: Performance Degradation

### Symptoms
- Slow queries
- High CPU/memory usage
- Connection timeouts
- Locks and deadlocks

### Assessment
```bash
# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
sudo -u postgres psql -c "SELECT query, state, wait_event FROM pg_stat_activity WHERE state != 'idle';"

# Check database size
sudo -u postgres psql -d event_manager -c "SELECT pg_size_pretty(pg_database_size('event_manager'));"
```

### Recovery Steps

1. **Kill long-running queries**
   ```bash
   sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '5 minutes';"
   ```

2. **Run VACUUM and ANALYZE**
   ```bash
   sudo -u postgres vacuumdb -d event_manager --analyze --verbose
   ```

3. **Restart PostgreSQL**
   ```bash
   sudo systemctl restart postgresql
   ```

4. **If issues persist, restore from backup**
   ```bash
   sudo /var/www/event-manager/scripts/restore-backup.sh \
     --backup $(ls -t /var/backups/event-manager/full/*.tar.* | head -1)
   ```

**Expected Time**: 15-30 minutes
**Data Loss**: None (unless restore needed)

---

## Post-Recovery Checklist

- [ ] Database is accessible
- [ ] All tables present
- [ ] Row counts match expected values
- [ ] Application can connect
- [ ] Users can log in
- [ ] No error logs
- [ ] Backups resume normally
- [ ] Monitoring alerts cleared

---

**Related Documents:**
- [Disaster Recovery Runbook](./disaster-recovery-runbook.md)
- [Application Recovery Procedures](./application-recovery-procedures.md)
- [Recovery Testing Procedures](./recovery-testing-procedures.md)
