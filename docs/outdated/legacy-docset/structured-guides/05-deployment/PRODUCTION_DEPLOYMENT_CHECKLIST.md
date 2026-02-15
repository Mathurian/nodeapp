# Production Deployment Checklist - Disaster Recovery

Use this checklist when deploying the disaster recovery system to production.

---

## Pre-Deployment

### Documentation Review
- [ ] Read main disaster recovery runbook
- [ ] Review all 8 recovery procedures
- [ ] Print quick reference card
- [ ] Update contact information in runbooks
- [ ] Distribute documentation to team

### Team Preparation
- [ ] Identify primary administrator
- [ ] Identify secondary administrator
- [ ] Identify database administrator
- [ ] Schedule initial training session
- [ ] Add to on-call rotation

### Infrastructure Check
- [ ] Verify PostgreSQL version (12+)
- [ ] Check disk space (>20GB available)
- [ ] Verify root/sudo access
- [ ] Check zstd or gzip installed
- [ ] Verify curl/mail commands available

---

## Deployment Steps

### Phase 1: PITR Setup (15 minutes)

- [ ] Run PITR setup script
  ```bash
  sudo /var/www/event-manager/scripts/setup-pitr.sh
  ```

- [ ] Verify WAL archiving enabled
  ```bash
  sudo -u postgres psql -c "SHOW archive_mode;"
  sudo -u postgres psql -c "SHOW wal_level;"
  ```

- [ ] Check WAL archive directory created
  ```bash
  ls -ld /var/lib/postgresql/wal_archive/
  ```

- [ ] Verify WAL files being archived
  ```bash
  sudo -u postgres psql -c "SELECT pg_switch_wal();"
  sleep 5
  ls /var/lib/postgresql/wal_archive/ | head -5
  ```

**✅ Expected**: WAL files in archive directory

---

### Phase 2: First Base Backup (15-30 minutes)

- [ ] Create first PITR base backup
  ```bash
  sudo /var/www/event-manager/scripts/pitr-base-backup.sh
  ```

- [ ] Verify backup created
  ```bash
  ls -lh /var/backups/postgresql/base/
  ```

- [ ] Check backup integrity
  ```bash
  # Should show no errors
  cat /var/log/pitr-base-backup.log | grep -i error
  ```

**✅ Expected**: Base backup file created (*.tar.zst or *.tar.gz)

---

### Phase 3: Database Migration (5 minutes)

- [ ] Create BackupLog table
  ```bash
  cd /var/www/event-manager
  npx prisma migrate deploy
  ```

- [ ] Verify table created
  ```bash
  sudo -u postgres psql -d event_manager -c "\dt backup_logs"
  ```

- [ ] Regenerate Prisma client
  ```bash
  npx prisma generate
  ```

**✅ Expected**: backup_logs table exists

---

### Phase 4: Cron Jobs Setup (5 minutes)

- [ ] Install cron jobs
  ```bash
  sudo /var/www/event-manager/scripts/setup-cron.sh
  ```

- [ ] Verify cron jobs installed
  ```bash
  sudo cat /etc/cron.d/event-manager-backup
  ```

- [ ] Check cron service running
  ```bash
  sudo systemctl status cron || sudo systemctl status crond
  ```

**✅ Expected**: 6 cron jobs installed

---

### Phase 5: First Full Backup (10-20 minutes)

- [ ] Run first full backup manually
  ```bash
  sudo /var/www/event-manager/scripts/backup-full.sh
  ```

- [ ] Monitor backup progress
  ```bash
  tail -f /var/log/backup-full.log
  ```

- [ ] Verify backup created
  ```bash
  ls -lh /var/backups/event-manager/full/
  ```

- [ ] Check backup contains all components
  ```bash
  tar -tzf /var/backups/event-manager/full/*.tar.* | head -20
  ```

**✅ Expected**: Full backup file created with database, uploads, configs

---

### Phase 6: Application Restart (2 minutes)

- [ ] Restart application to load new routes
  ```bash
  sudo systemctl restart event-manager
  ```

- [ ] Verify application started
  ```bash
  sudo systemctl status event-manager
  ```

- [ ] Check for errors
  ```bash
  sudo journalctl -u event-manager -n 50
  ```

**✅ Expected**: No errors, service active

---

### Phase 7: API Testing (5 minutes)

- [ ] Test backup health endpoint
  ```bash
  curl http://localhost:5000/api/admin/backups/health | jq
  ```

- [ ] Test backup stats endpoint
  ```bash
  curl http://localhost:5000/api/admin/backups/stats | jq
  ```

- [ ] Test backup list endpoint
  ```bash
  curl http://localhost:5000/api/admin/backups | jq
  ```

- [ ] Test backup files endpoint
  ```bash
  curl http://localhost:5000/api/admin/backups/files | jq
  ```

**✅ Expected**: All endpoints return valid JSON

---

### Phase 8: Backup Verification (10 minutes)

- [ ] Run backup verification
  ```bash
  sudo /var/www/event-manager/scripts/backup-verify.sh
  ```

- [ ] Check verification results
  ```bash
  cat /var/log/backup-verify.log
  ```

**✅ Expected**: Verification passes for all backups

---

### Phase 9: Recovery Test (30 minutes)

- [ ] Run recovery test (non-destructive)
  ```bash
  sudo /var/www/event-manager/scripts/test-recovery.sh
  ```

- [ ] Review test results
  ```bash
  cat /var/log/recovery-test.log
  ```

- [ ] Verify test database cleaned up
  ```bash
  sudo -u postgres psql -l | grep test
  ```

**✅ Expected**: All tests pass, test DB removed

---

## Post-Deployment Validation

### Monitoring Setup (10 minutes)

- [ ] Configure alert email
  ```bash
  sudo nano /var/www/event-manager/config/backup.config.sh
  # Set ALERT_EMAIL
  ```

- [ ] Test alert system
  ```bash
  # Trigger test alert
  curl -X POST http://localhost:5000/api/admin/backups/alert \
    -H "Content-Type: application/json" \
    -d '{"level":"INFO","subject":"Test","message":"Testing alerts"}'
  ```

- [ ] Check email received (if configured)

**✅ Expected**: Alert logged (email optional)

---

### Documentation Update (15 minutes)

- [ ] Fill in contact information in runbooks
- [ ] Update emergency contact card
- [ ] Document system-specific details
- [ ] Update server IP addresses
- [ ] Note any customizations made

**✅ Expected**: All contact fields filled

---

### Team Training (30 minutes)

- [ ] Walk through disaster recovery runbook
- [ ] Demonstrate backup verification
- [ ] Show how to trigger manual backup
- [ ] Explain recovery procedures
- [ ] Practice emergency response

**✅ Expected**: Team familiar with procedures

---

## First Week Monitoring

### Daily Checks (5 minutes each)

**Day 1-7:**
- [ ] Check backup logs
  ```bash
  grep -i error /var/log/backup-full.log
  ```

- [ ] Verify backups created
  ```bash
  ls -lh /var/backups/event-manager/full/ | tail -7
  ```

- [ ] Check disk space
  ```bash
  df -h /var/backups/
  ```

- [ ] Review backup health
  ```bash
  curl http://localhost:5000/api/admin/backups/health | jq
  ```

**✅ Expected**: Daily backups created, no errors

---

### Week 1 Validation

- [ ] 7 full backups created
- [ ] Multiple incremental backups
- [ ] PITR base backup created (Sunday)
- [ ] Weekly verification ran (Saturday)
- [ ] No backup failures
- [ ] Disk space adequate
- [ ] No alert emails (unless configured)

---

## First Month

### Week 2-4 Checks

- [ ] Monitor backup sizes (watch for growth)
- [ ] Verify cleanup working (old backups removed)
- [ ] Check WAL archive size
- [ ] Review backup statistics trends

### End of Month 1

- [ ] Run recovery test (automated on 1st)
- [ ] Review test results
- [ ] Conduct table-top exercise with team
- [ ] Document any issues found
- [ ] Update procedures if needed

---

## Quarterly Tasks

### Quarter 1 Setup

- [ ] Schedule first DR drill (full recovery test)
- [ ] Add to team calendar
- [ ] Prepare test environment
- [ ] Notify stakeholders

### Ongoing Quarterly

- [ ] Review and update contact information
- [ ] Conduct full DR drill
- [ ] Update procedures based on learnings
- [ ] Review backup retention policies
- [ ] Check disk space projections
- [ ] Test failover procedures (if HA setup)

---

## Annual Tasks

- [ ] Complete infrastructure failover test
- [ ] Security incident simulation
- [ ] Update entire DR plan
- [ ] Train new team members
- [ ] Review and update cost estimates
- [ ] Audit backup security
- [ ] Review and renew any required certifications

---

## Troubleshooting Common Issues

### Issue: PITR setup fails

**Check:**
```bash
sudo journalctl -u postgresql -n 50
```

**Fix:**
- Verify PostgreSQL version (must be 10+)
- Check disk space in WAL archive directory
- Verify postgres user permissions

---

### Issue: First backup fails

**Check:**
```bash
cat /var/log/backup-full.log
```

**Common Causes:**
- Insufficient disk space
- Permissions issues
- Database not accessible

**Fix:**
```bash
# Check disk space
df -h

# Check permissions
ls -ld /var/backups/event-manager/

# Test database connection
sudo -u postgres psql -d event_manager -c "SELECT 1;"
```

---

### Issue: Cron jobs not running

**Check:**
```bash
sudo systemctl status cron || sudo systemctl status crond
sudo cat /var/log/syslog | grep CRON
```

**Fix:**
```bash
# Restart cron
sudo systemctl restart cron || sudo systemctl restart crond

# Verify syntax
sudo crontab -l
```

---

### Issue: API endpoints not working

**Check:**
```bash
sudo journalctl -u event-manager -n 50
```

**Fix:**
```bash
# Verify route registered
grep -r "backupAdmin" /var/www/event-manager/src/config/

# Restart application
sudo systemctl restart event-manager
```

---

## Rollback Procedures

If deployment fails and you need to rollback:

1. **Remove cron jobs**
   ```bash
   sudo /var/www/event-manager/scripts/setup-cron.sh --remove
   ```

2. **Revert database migration** (if needed)
   ```bash
   # Only if migration causes issues
   cd /var/www/event-manager
   npx prisma migrate resolve --rolled-back MIGRATION_NAME
   ```

3. **Disable PITR** (if causing issues)
   ```bash
   # Restore original postgresql.conf from backup
   sudo cp /etc/postgresql/*/main/postgresql.conf.backup.* \
          /etc/postgresql/*/main/postgresql.conf
   sudo systemctl restart postgresql
   ```

4. **Remove backup directories** (optional)
   ```bash
   # Only if you want to clean up
   sudo rm -rf /var/backups/event-manager/
   sudo rm -rf /var/lib/postgresql/wal_archive/
   ```

---

## Sign-Off

### Deployment Sign-Off

- **Deployed By**: ___________________________
- **Date**: ___________________________
- **Time**: ___________________________
- **All Checks Passed**: ☐ Yes ☐ No
- **Issues Found**: ___________________________
- **Resolution**: ___________________________

### Validation Sign-Off (After 1 Week)

- **Validated By**: ___________________________
- **Date**: ___________________________
- **Backups Working**: ☐ Yes ☐ No
- **Recovery Tested**: ☐ Yes ☐ No
- **Team Trained**: ☐ Yes ☐ No
- **Ready for Production**: ☐ Yes ☐ No

### Notes

________________________________

________________________________

________________________________

________________________________

---

## Success Criteria

✅ **Deployment Complete When:**
- [ ] All 9 deployment phases completed
- [ ] All verification tests pass
- [ ] First backup created successfully
- [ ] Recovery test passes
- [ ] API endpoints working
- [ ] Cron jobs installed and running
- [ ] Team trained on procedures
- [ ] Documentation updated
- [ ] Monitoring configured
- [ ] No errors in logs

✅ **System Ready for Production When:**
- [ ] 7 consecutive successful daily backups
- [ ] Recovery test passed in production
- [ ] Team conducted table-top exercise
- [ ] All runbooks reviewed and updated
- [ ] Emergency contacts confirmed
- [ ] Backup storage monitored
- [ ] Alerts tested and working

---

**Document Version**: 1.0
**Last Updated**: 2025-01-12
**Next Review**: 2025-04-12
