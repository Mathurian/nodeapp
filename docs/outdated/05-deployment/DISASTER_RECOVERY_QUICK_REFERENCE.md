# Disaster Recovery - Quick Reference Card

**Print and keep this accessible for emergencies!**

---

## 🚨 Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Primary Admin | __________ | __________ | __________ |
| Secondary Admin | __________ | __________ | __________ |
| Database Admin | __________ | __________ | __________ |
| Security Team | __________ | __________ | __________ |

---

## 🎯 Quick Decision Tree

```
Problem Detected
    ↓
┌─────────────────────────────┐
│ Can users access system?    │
└───────┬─────────────────────┘
        │
    ┌───NO───┐         ┌───YES──┐
    │        │         │        │
    ↓        ↓         ↓        ↓
Database  Application  Data    Performance
Issue     Issue        Issue   Issue
    │        │         │        │
    ↓        ↓         ↓        ↓
Section A  Section B  Section C Section D
```

---

## A. Database Issues

### Symptoms
- Database won't start
- Query failures
- Corruption errors

### Quick Fix
```bash
# Restart database
sudo systemctl restart postgresql

# If that fails, restore latest backup
sudo /var/www/event-manager/scripts/restore-backup.sh \
  --backup $(ls -t /var/backups/event-manager/full/*.tar.* | head -1)
```

**Time**: 30-60 min | **Data Loss**: Up to 24h

### Point-in-Time Recovery (if data deleted)
```bash
sudo /var/www/event-manager/scripts/restore-pitr.sh \
  --backup /var/backups/postgresql/base/latest.tar.gz \
  --target-time "YYYY-MM-DD HH:MM:SS"
```

**Time**: 60-90 min | **Data Loss**: After target time

**→ Full Procedures**: `docs/05-deployment/database-recovery-procedures.md`

---

## B. Application Issues

### Symptoms
- Application not responding
- 500 errors
- Service crashes

### Quick Fix
```bash
# Restart application
sudo systemctl restart event-manager

# Check status
systemctl status event-manager
curl http://localhost:5000/api/health

# View logs if issues persist
sudo journalctl -u event-manager -n 50
```

**Time**: < 5 min | **Data Loss**: None

### If Restart Fails
```bash
# Restore from backup
cd /var/www/event-manager
git reset --hard HEAD
npm install
npm run build
sudo systemctl restart event-manager
```

**→ Full Procedures**: `docs/05-deployment/application-recovery-procedures.md`

---

## C. Data Issues

### Accidental Deletion
```bash
# Determine when data was last good
# Then use PITR to restore

sudo /var/www/event-manager/scripts/restore-pitr.sh \
  --backup /var/backups/postgresql/base/latest.tar.gz \
  --target-time "YYYY-MM-DD HH:MM:SS"
```

---

## D. Performance Issues

### Quick Checks
```bash
# Check disk space
df -h

# Check memory
free -h

# Check processes
ps aux | grep -E 'node|postgres'

# Restart if needed
sudo systemctl restart event-manager postgresql
```

---

## 🔒 Security Incidents

### Data Breach
1. **Isolate**: Stop services immediately
   ```bash
   sudo systemctl stop event-manager nginx
   ```

2. **Preserve**: Copy all logs
   ```bash
   sudo cp -r /var/log/event-manager /tmp/incident_$(date +%Y%m%d_%H%M%S)
   ```

3. **Notify**: Call security team immediately

4. **Do NOT**: Restart services without security clearance

**→ Full Procedures**: `docs/05-deployment/security-incident-response.md`

### Ransomware
- **DO NOT PAY RANSOM**
- Power off affected systems
- Call law enforcement
- Restore from clean backup

---

## 📊 Backup Status

### Check Backup Health
```bash
# API check
curl http://localhost:5000/api/admin/backups/health

# View latest backup
ls -lh /var/backups/event-manager/full/ | tail -1

# Check logs
tail -f /var/log/backup-full.log
```

### Manual Backup
```bash
sudo /var/www/event-manager/scripts/backup-full.sh
```

### Verify Backup
```bash
sudo /var/www/event-manager/scripts/backup-verify.sh
```

---

## 📂 Key Locations

```
Application:     /var/www/event-manager/
Backups:         /var/backups/event-manager/
Scripts:         /var/www/event-manager/scripts/
Logs:            /var/log/
Database Data:   /var/lib/postgresql/
WAL Archive:     /var/lib/postgresql/wal_archive/
```

---

## 🔧 Essential Commands

### Service Management
```bash
sudo systemctl status event-manager    # Check status
sudo systemctl restart event-manager   # Restart app
sudo systemctl restart postgresql      # Restart DB
sudo systemctl restart nginx           # Restart web server
```

### Logs
```bash
sudo journalctl -u event-manager -f    # Follow app logs
sudo journalctl -u postgresql -n 100   # DB logs (last 100)
tail -f /var/log/backup-full.log       # Backup logs
```

### Health Checks
```bash
curl http://localhost:5000/api/health  # App health
sudo -u postgres psql -c "SELECT 1;"   # DB health
df -h                                   # Disk space
free -h                                 # Memory
```

---

## ⏱️ Recovery Time Estimates

| Scenario | Recovery Time | Data Loss |
|----------|---------------|-----------|
| App Restart | < 5 min | None |
| Database Restart | < 5 min | None |
| Full Backup Restore | 30-60 min | Up to 24h |
| PITR Restore | 60-90 min | After target time |
| Complete System Loss | 3-4 hours | Last remote backup |

---

## 📞 Emergency Procedures

1. **Assess** the situation (5 min)
2. **Notify** team immediately
3. **Create** emergency backup if possible
4. **Execute** recovery procedures
5. **Verify** system is working
6. **Document** incident
7. **Conduct** post-mortem

---

## 🎯 Success Criteria

After recovery, verify:
- [ ] Database is accessible
- [ ] Application is running
- [ ] Users can log in
- [ ] No error logs
- [ ] Backups resume
- [ ] Monitoring active

---

## 📚 Full Documentation

**Main Runbook**: `docs/05-deployment/disaster-recovery-runbook.md`

**All Procedures**:
- Database Recovery
- Application Recovery
- Full System Recovery
- Security Incident Response
- Recovery Testing
- High Availability Setup
- Failover Procedures

---

## 🔐 Recovery Objectives

- **RTO** (Recovery Time): < 4 hours
- **RPO** (Recovery Point): < 1 hour
- **Backup Schedule**: Daily at 2 AM
- **Retention**: 30 days local, 90 days remote

---

**Last Updated**: 2025-01-12
**Print Date**: ___________
**Reviewed By**: ___________

**KEEP THIS CARD ACCESSIBLE AT ALL TIMES**

---

## Notes / Updates

________________________________

________________________________

________________________________

________________________________
