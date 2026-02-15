# Disaster Recovery Runbook - Event Manager

## Overview

This runbook provides comprehensive procedures for disaster recovery scenarios for the Event Manager application. It covers database failures, application failures, security incidents, and complete system loss scenarios.

## Critical Information

### Contact Information

| Role | Primary | Secondary | Phone | Email |
|------|---------|-----------|-------|-------|
| System Administrator | [Name] | [Name] | [Phone] | [Email] |
| Database Administrator | [Name] | [Name] | [Phone] | [Email] |
| Security Team | [Name] | [Name] | [Phone] | [Email] |
| Management Escalation | [Name] | [Name] | [Phone] | [Email] |

### Recovery Objectives

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Maximum Tolerable Downtime**: 8 hours

### Key System Information

- **Production Server**: [IP/Hostname]
- **Database Server**: [IP/Hostname]
- **Backup Location**: `/var/backups/event-manager/`
- **Remote Backup**: [S3/Remote Location]
- **Application Directory**: `/var/www/event-manager`

## When to Use This Runbook

Use this runbook when you encounter:

1. **Database Issues**
   - Database corruption
   - Accidental data deletion
   - Database performance degradation
   - Complete database loss

2. **Application Issues**
   - Application server failure
   - Corrupted application files
   - Configuration problems
   - Service crashes

3. **Infrastructure Issues**
   - Server hardware failure
   - Network outages
   - Storage failures
   - Complete infrastructure loss

4. **Security Incidents**
   - Data breach
   - Ransomware attack
   - Compromised credentials
   - Unauthorized access

## Quick Reference Guide

### Decision Tree

```
┌─ Issue Detected
│
├─ Database Issue?
│  ├─ Corruption → Use Database Recovery Procedures
│  ├─ Data Deletion → Use PITR Recovery
│  └─ Performance → Use Performance Tuning Procedures
│
├─ Application Issue?
│  ├─ Crash → Restart Service
│  ├─ Config Error → Restore Configuration
│  └─ File Corruption → Restore from Backup
│
├─ Security Incident?
│  ├─ Breach → Follow Security Incident Response
│  ├─ Ransomware → Isolate and Restore
│  └─ Compromised Account → Lock and Reset
│
└─ Complete Loss?
   └─ Follow Full System Recovery
```

## Initial Response (First 5 Minutes)

### Step 1: Assess the Situation

1. **Verify the issue is real**
   ```bash
   # Check application status
   systemctl status event-manager

   # Check database status
   systemctl status postgresql

   # Check disk space
   df -h

   # Check system logs
   journalctl -xe -n 100
   ```

2. **Determine severity**
   - **Critical**: Production down, data loss imminent
   - **High**: Service degraded, data at risk
   - **Medium**: Non-critical issues, no immediate data risk

3. **Notify stakeholders**
   - Send alert to admin team
   - Update status page if available
   - Document start time

### Step 2: Take Immediate Actions

1. **Stop further damage**
   - For security incidents: Isolate affected systems
   - For data issues: Stop write operations if possible
   - For infrastructure: Prevent cascading failures

2. **Create emergency backup**
   ```bash
   # Quick database backup
   sudo -u postgres pg_dump event_manager | gzip > /tmp/emergency_backup_$(date +%Y%m%d_%H%M%S).sql.gz
   ```

3. **Document everything**
   - Note time of incident
   - Capture error messages
   - Save relevant logs

## Detailed Recovery Procedures

### Database Recovery

See [Database Recovery Procedures](./database-recovery-procedures.md) for:
- Scenario 1: Database Corruption
- Scenario 2: Accidental Data Deletion
- Scenario 3: Complete Database Loss
- Scenario 4: Performance Degradation

### Application Recovery

See [Application Recovery Procedures](./application-recovery-procedures.md) for:
- Scenario 1: Application Server Failure
- Scenario 2: Corrupted Application Files
- Scenario 3: Configuration Issues

### Full System Recovery

See [Full System Recovery Procedures](./full-system-recovery-procedures.md) for:
- Complete Infrastructure Loss
- Natural Disaster / Data Center Loss

### Security Incident Response

See [Security Incident Response](./security-incident-response.md) for:
- Scenario 1: Data Breach
- Scenario 2: Ransomware Attack
- Scenario 3: Compromised Credentials

## Post-Recovery Procedures

### Verification Checklist

After any recovery, verify:

- [ ] Database is accessible
- [ ] Application is running
- [ ] Users can log in
- [ ] Data integrity confirmed
- [ ] Backups are functioning
- [ ] Monitoring is active
- [ ] No error logs
- [ ] Performance is acceptable

### Test Procedures

```bash
# Test database connectivity
sudo -u postgres psql -d event_manager -c "SELECT count(*) FROM \"User\";"

# Test application
curl http://localhost:5000/api/health

# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"testpassword"}'
```

### Documentation

After recovery:

1. **Document the incident**
   - What happened
   - When it was detected
   - Actions taken
   - Time to resolve
   - Data loss (if any)

2. **Update runbooks**
   - Note what worked
   - Note what didn't work
   - Add new procedures if needed

3. **Conduct post-mortem**
   - Root cause analysis
   - Prevention measures
   - Process improvements

## Communication Plan

### During Incident

**Internal Communication:**
- Update admin team every 30 minutes
- Use dedicated Slack/Teams channel
- Keep management informed

**External Communication:**
- Status page updates
- User notifications if needed
- Customer support briefing

### After Resolution

**Internal:**
- Post-mortem meeting within 48 hours
- Written incident report within 1 week
- Action items assigned

**External:**
- Resolution notice to users
- Transparency about any data impact
- Preventive measures communication

## Regular Testing

### Monthly Testing

- [ ] Restore latest backup to test environment
- [ ] Verify PITR recovery
- [ ] Test backup integrity
- [ ] Review disaster recovery procedures

### Quarterly Testing

- [ ] Full disaster recovery drill
- [ ] Table-top exercise with team
- [ ] Update contact information
- [ ] Review and update procedures

### Annual Testing

- [ ] Complete infrastructure failover test
- [ ] Security incident simulation
- [ ] Update entire DR plan
- [ ] Train new team members

## Common Issues and Solutions

### Issue: Backup is corrupted

**Solution:**
1. Check for previous backups
2. Use PITR if base backup is old
3. Restore from remote backup
4. Document for investigation

### Issue: Recovery takes longer than RTO

**Solution:**
1. Continue recovery process
2. Provide regular updates
3. Escalate to management
4. Consider partial restoration

### Issue: Data loss detected after recovery

**Solution:**
1. Assess extent of data loss
2. Check if PITR can recover missing data
3. Restore from earlier backup if needed
4. Document lost data for users

## Emergency Commands Reference

### Quick Status Checks

```bash
# System status
systemctl status event-manager postgresql nginx

# Check processes
ps aux | grep -E 'node|postgres'

# Check ports
netstat -tlnp | grep -E '5000|5432|80|443'

# Check logs
tail -f /var/log/event-manager/*.log
journalctl -u event-manager -f
```

### Quick Recovery Commands

```bash
# Restart all services
sudo systemctl restart postgresql
sudo systemctl restart event-manager
sudo systemctl restart nginx

# Emergency database restore
sudo /var/www/event-manager/scripts/restore-backup.sh \
  --backup /var/backups/event-manager/full/latest.tar.gz

# PITR restore
sudo /var/www/event-manager/scripts/restore-pitr.sh \
  --backup /var/backups/postgresql/base/latest.tar.gz \
  --target-time "2025-01-15 10:30:00"
```

## Resources and References

- **Database Recovery**: `./database-recovery-procedures.md`
- **Application Recovery**: `./application-recovery-procedures.md`
- **Full System Recovery**: `./full-system-recovery-procedures.md`
- **Security Response**: `./security-incident-response.md`
- **Backup Scripts**: `/var/www/event-manager/scripts/`
- **Log Files**: `/var/log/`
- **Configuration**: `/var/www/event-manager/config/`

## Appendix

### Backup Schedule

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Full Backup | Daily 2 AM | 30 days local, 90 days remote | /var/backups/event-manager/full/ |
| Incremental | Every 6 hours | 7 days | /var/backups/event-manager/incremental/ |
| PITR Base | Weekly (Sunday 1 AM) | 7 backups | /var/backups/postgresql/base/ |

### Key File Locations

```
/var/www/event-manager/          # Application root
├── .env                          # Configuration
├── scripts/                      # Backup and recovery scripts
├── uploads/                      # User uploads
└── logs/                         # Application logs

/var/backups/event-manager/      # Backups
├── full/                         # Full backups
├── incremental/                  # Incremental backups
└── pitr/                         # PITR backups

/var/lib/postgresql/             # PostgreSQL
├── data/                         # Database files
└── wal_archive/                  # WAL archives
```

---

**Last Updated**: 2025-01-12
**Version**: 1.0
**Owner**: System Administration Team
**Review Date**: 2025-04-12 (Quarterly)
