# Security Incident Response

## Scenario 1: Data Breach

### Immediate Actions (First 15 minutes)

1. **Contain the breach**
   ```bash
   # Isolate affected systems
   sudo systemctl stop event-manager
   sudo systemctl stop nginx

   # Block suspicious IPs
   sudo iptables -A INPUT -s SUSPICIOUS_IP -j DROP
   ```

2. **Preserve evidence**
   ```bash
   # Capture logs
   sudo cp -r /var/log/event-manager /tmp/incident_logs_$(date +%Y%m%d_%H%M%S)
   sudo journalctl > /tmp/system_logs_$(date +%Y%m%d_%H%M%S).log

   # Capture network connections
   sudo netstat -an > /tmp/connections_$(date +%Y%m%d_%H%M%S).txt
   ```

3. **Notify stakeholders**
   - Security team immediately
   - Legal team within 1 hour
   - Management within 2 hours

### Assessment (15-60 minutes)

```bash
# Check audit logs
sudo -u postgres psql -d event_manager -c "SELECT * FROM \"AuditLog\" WHERE timestamp > NOW() - INTERVAL '24 hours' ORDER BY timestamp DESC;"

# Check for unauthorized access
sudo -u postgres psql -d event_manager -c "SELECT * FROM \"User\" WHERE \"lastLogin\" > NOW() - INTERVAL '24 hours';"

# Check file modifications
sudo find /var/www/event-manager -type f -mtime -1 -ls
```

### Recovery Steps

1. **Reset all credentials**
   ```bash
   # Force password reset for all users
   sudo -u postgres psql -d event_manager -c "UPDATE \"User\" SET password_reset_required = true;"
   ```

2. **Restore from clean backup**
   ```bash
   # Use backup from before breach
   sudo /var/www/event-manager/scripts/restore-backup.sh \
     --backup /var/backups/event-manager/full/backup_before_breach.tar.gz
   ```

3. **Security hardening**
   - Update all passwords
   - Rotate API keys
   - Review and update firewall rules
   - Enable additional monitoring

### Legal Requirements
- Document timeline
- Notify affected users (within 72 hours in EU)
- File required reports
- Preserve evidence for investigation

---

## Scenario 2: Ransomware Attack

### Immediate Actions (DO NOT PAY RANSOM)

1. **Isolate immediately**
   ```bash
   # Disconnect from network
   sudo ip link set eth0 down

   # Power off if spreading
   sudo shutdown -h now
   ```

2. **Do not restart infected systems**

3. **Contact authorities**
   - Law enforcement
   - Cybersecurity team
   - Insurance provider

### Recovery Steps

1. **Rebuild from clean backup**
   ```bash
   # Wipe and reinstall OS
   # Follow Full System Recovery procedures

   # Restore from backup BEFORE infection
   sudo /var/www/event-manager/scripts/restore-backup.sh \
     --backup /remote/backups/clean_backup.tar.gz
   ```

2. **Security audit**
   - Identify attack vector
   - Patch vulnerabilities
   - Implement additional security controls

---

## Scenario 3: Compromised Credentials

### Immediate Actions

1. **Lock compromised accounts**
   ```bash
   sudo -u postgres psql -d event_manager -c "UPDATE \"User\" SET status = 'locked' WHERE email = 'compromised@example.com';"
   ```

2. **Review access logs**
   ```bash
   sudo -u postgres psql -d event_manager -c "SELECT * FROM \"AuditLog\" WHERE userId = 'compromised_user_id' ORDER BY timestamp DESC LIMIT 100;"
   ```

3. **Reset credentials**
   - Force password reset
   - Revoke active sessions
   - Rotate API keys

### Assessment Checklist

- [ ] When was compromise detected?
- [ ] What data was accessed?
- [ ] Were any changes made?
- [ ] Was data exfiltrated?
- [ ] Are other accounts affected?

---

## Post-Incident Procedures

### Documentation Required

1. **Incident Timeline**
   - Detection time
   - Response actions
   - Resolution time
   - Impact assessment

2. **Root Cause Analysis**
   - How did it happen?
   - What vulnerabilities were exploited?
   - What failed in detection?

3. **Remediation Plan**
   - Immediate fixes
   - Long-term improvements
   - Training needs

### Improvements

- Update security policies
- Implement additional monitoring
- Conduct security training
- Review and update incident response procedures

---

## Emergency Contacts

| Organization | Contact | Phone | Email |
|--------------|---------|-------|-------|
| Law Enforcement | [Department] | [Phone] | [Email] |
| Cybersecurity Firm | [Company] | [Phone] | [Email] |
| Legal Counsel | [Firm] | [Phone] | [Email] |
| Insurance | [Company] | [Phone] | [Email] |

---

**CRITICAL**: In case of security incident, preservation of evidence is paramount. Document everything before taking action.
