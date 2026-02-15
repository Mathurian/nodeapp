# Recovery Testing Procedures

## Overview

Regular testing ensures disaster recovery procedures work when needed. This document outlines the testing schedule and procedures.

## Monthly Testing Schedule

### Test 1: Backup Integrity (1st Monday)
```bash
# Run integrity test
sudo /var/www/event-manager/scripts/test-backup-integrity.sh

# Verify output
cat /var/log/backup-integrity-test.log
```

**Success Criteria:**
- All backups pass integrity checks
- No corruption detected
- Report generated

---

### Test 2: Backup Restoration to Test Environment (2nd Monday)
```bash
# Run recovery test
sudo /var/www/event-manager/scripts/test-recovery.sh

# Review results
cat /var/log/recovery-test.log
```

**Success Criteria:**
- Test database created
- Backup restored successfully
- Data accessible
- Test environment cleaned up

---

### Test 3: PITR Recovery (3rd Monday)
```bash
# Test PITR to specific time
sudo /var/www/event-manager/scripts/restore-pitr.sh \
  --dry-run \
  --backup /var/backups/postgresql/base/latest.tar.gz \
  --target-time "$(date -d '1 hour ago' '+%Y-%m-%d %H:%M:%S')"
```

**Success Criteria:**
- Recovery process completes without errors
- Target time can be specified
- Documentation is clear

---

### Test 4: Backup Monitoring (4th Monday)
```bash
# Check backup health
curl http://localhost:5000/api/admin/backups/health

# Review backup stats
curl http://localhost:5000/api/admin/backups/stats
```

**Success Criteria:**
- Health check reports healthy
- Stats are accurate
- Alerts are configured

---

## Quarterly Testing

### Full Disaster Recovery Drill (First Friday of Quarter)

**Duration**: 4 hours

**Procedure:**
1. **Simulate failure** (in test environment)
2. **Execute recovery** using runbooks
3. **Verify** all services restored
4. **Document** time and issues
5. **Update** procedures as needed

**Test Steps:**
```bash
# 1. Stop test services
sudo systemctl stop event-manager-test postgresql-test

# 2. Clear test data directory
sudo rm -rf /var/lib/postgresql-test/*/main/*

# 3. Execute full recovery
sudo /var/www/event-manager/scripts/restore-backup.sh \
  --backup /var/backups/event-manager/full/latest.tar.gz

# 4. Verify recovery
curl http://test.example.com/api/health
```

**Success Criteria:**
- [ ] Recovery completed within RTO (4 hours)
- [ ] Data loss within RPO (1 hour)
- [ ] All services operational
- [ ] Team followed procedures correctly
- [ ] Documentation was clear and accurate

---

### Table-Top Exercise (Second Friday of Quarter)

**Duration**: 2 hours

**Participants:**
- System Administrators
- Database Administrators
- Security Team
- Management

**Scenarios to Practice:**
1. Database corruption discovered
2. Ransomware attack
3. Data center loss
4. Accidental data deletion

**Exercise Format:**
- Present scenario
- Team discusses response
- Walk through procedures
- Identify gaps
- Update documentation

---

## Annual Testing

### Complete Infrastructure Failover (Once per year)

**Duration**: Full day (8 hours)

**Procedure:**
1. **Provision** new infrastructure
2. **Execute** full system recovery
3. **Cutover** to new infrastructure
4. **Verify** all functionality
5. **Document** lessons learned

**Success Criteria:**
- [ ] Complete system recovered
- [ ] All data restored
- [ ] Users can access system
- [ ] Performance acceptable
- [ ] No data loss

---

### Security Incident Simulation (Once per year)

**Duration**: Half day (4 hours)

**Scenarios:**
- Simulated data breach
- Compromised credentials
- SQL injection attempt

**Procedure:**
1. Red team simulates attack
2. Blue team responds
3. Execute incident response procedures
4. Document response time and effectiveness

---

## Test Documentation Template

```markdown
# Recovery Test Report

**Date**: [Date]
**Test Type**: [Monthly/Quarterly/Annual]
**Tester**: [Name]

## Test Summary
- Start Time: [Time]
- End Time: [Time]
- Duration: [Duration]
- Result: [Pass/Fail]

## Test Steps
1. [Step 1] - [Result]
2. [Step 2] - [Result]
3. [Step 3] - [Result]

## Issues Encountered
- [Issue 1] - [Resolution]
- [Issue 2] - [Resolution]

## Success Criteria Met
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Recommendations
- [Recommendation 1]
- [Recommendation 2]

## Action Items
- [ ] [Action 1] - [Owner] - [Due Date]
- [ ] [Action 2] - [Owner] - [Due Date]
```

---

## Continuous Improvement

### After Each Test

1. **Document results** using template above
2. **Update procedures** based on findings
3. **Assign action items** for improvements
4. **Share results** with team
5. **Schedule next test**

### Metrics to Track

- Recovery time actual vs RTO
- Data loss actual vs RPO
- Test pass rate
- Issues found per test
- Time to resolve issues

### Annual Review

- Review all test results
- Identify trends
- Update DR strategy
- Train new team members
- Budget for improvements

---

## Test Results Storage

All test results should be stored in:
```
/var/www/event-manager/docs/test-results/
├── monthly/
│   ├── 2025-01-backup-integrity.md
│   ├── 2025-01-backup-restoration.md
│   └── ...
├── quarterly/
│   ├── 2025-Q1-dr-drill.md
│   └── ...
└── annual/
    ├── 2025-infrastructure-failover.md
    └── ...
```

---

**Remember**: The best disaster recovery plan is one that has been tested regularly and updated based on those tests.
