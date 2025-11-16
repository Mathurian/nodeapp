# Disaster Recovery Guide

## Overview

The Event Manager application includes comprehensive Disaster Recovery (DR) automation features to ensure business continuity and data protection.

## Table of Contents

1. [DR Overview](#dr-overview)
2. [Backup Types](#backup-types)
3. [Configuring DR](#configuring-dr)
4. [Backup Targets](#backup-targets)
5. [Backup Schedules](#backup-schedules)
6. [DR Testing](#dr-testing)
7. [RTO/RPO Monitoring](#rtorpo-monitoring)
8. [Restoration Procedures](#restoration-procedures)
9. [Best Practices](#best-practices)

## DR Overview

### What is Disaster Recovery?

Disaster Recovery ensures your application and data can be restored quickly in case of:
- Hardware failures
- Data corruption
- Natural disasters
- Cyber attacks
- Human errors

### Key Metrics

**RTO (Recovery Time Objective)**: Maximum acceptable downtime
- Default: 4 hours
- Configure based on business requirements

**RPO (Recovery Point Objective)**: Maximum acceptable data loss
- Default: 1 hour
- Determines backup frequency

## Backup Types

### 1. Full Backup
- Complete copy of all data
- Recommended frequency: Daily
- Storage requirements: Highest
- Restoration time: Fastest

### 2. Incremental Backup
- Only changed data since last backup
- Recommended frequency: Hourly
- Storage requirements: Low
- Restoration time: Moderate

### 3. Schema Backup
- Database structure only
- Recommended frequency: Before major changes
- Storage requirements: Minimal
- Restoration time: N/A (structure only)

## Configuring DR

### Initial Setup

1. Access DR Management:
   ```
   Navigate to: Admin → DR Management
   ```

2. Create DR Configuration:
   ```json
   {
     "rto": 4,
     "rpo": 1,
     "backupRetentionDays": 30,
     "testFrequencyDays": 90,
     "autoFailover": false,
     "notificationEmails": ["admin@example.com"]
   }
   ```

3. Set notification preferences
4. Configure backup targets
5. Create backup schedules

### Configuration Options

| Option | Description | Default | Range |
|--------|-------------|---------|-------|
| RTO | Hours to recover | 4 | 0.5 - 72 |
| RPO | Data loss tolerance (hours) | 1 | 0.25 - 24 |
| Retention | Days to keep backups | 30 | 7 - 365 |
| Test Frequency | Days between DR tests | 90 | 30 - 365 |
| Auto Failover | Automatic failover | false | true/false |

## Backup Targets

### Local Filesystem

**Use Case**: Development, small deployments

```json
{
  "name": "Local Storage",
  "targetType": "LOCAL",
  "config": {
    "path": "/var/backups/event-manager"
  }
}
```

### AWS S3

**Use Case**: Production, scalable storage

```json
{
  "name": "AWS S3 Production",
  "targetType": "S3",
  "config": {
    "bucket": "my-event-backups",
    "region": "us-east-1",
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "encryption": "AES256"
  }
}
```

**Setup Steps**:
1. Create S3 bucket in AWS Console
2. Enable versioning on bucket
3. Create IAM user with permissions:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:ListBucket`
   - `s3:DeleteObject`
4. Configure lifecycle policies for retention

### Azure Blob Storage

```json
{
  "name": "Azure Backup",
  "targetType": "AZURE",
  "config": {
    "accountName": "myeventbackups",
    "accountKey": "your-account-key",
    "containerName": "backups",
    "region": "eastus"
  }
}
```

### Google Cloud Storage

```json
{
  "name": "GCP Backup",
  "targetType": "GCP",
  "config": {
    "projectId": "my-project-123",
    "bucket": "event-manager-backups",
    "keyFile": "/path/to/service-account-key.json"
  }
}
```

### FTP/SFTP

**Use Case**: Legacy systems, specific compliance requirements

```json
{
  "name": "FTP Backup",
  "targetType": "FTP",
  "config": {
    "host": "ftp.example.com",
    "port": 21,
    "username": "backup-user",
    "password": "secure-password",
    "path": "/backups/event-manager"
  }
}
```

**SFTP (Recommended over FTP)**:
```json
{
  "targetType": "SFTP",
  "config": {
    "host": "sftp.example.com",
    "port": 22,
    "username": "backup-user",
    "privateKey": "/path/to/private-key",
    "path": "/backups"
  }
}
```

## Backup Schedules

### Creating Schedules

**Daily Full Backup**:
```json
{
  "name": "Daily Full Backup",
  "scheduleType": "FULL",
  "frequency": "DAILY",
  "cronExpression": "0 2 * * *",
  "active": true,
  "retentionDays": 7,
  "targets": ["s3-target-id"]
}
```

**Hourly Incremental**:
```json
{
  "name": "Hourly Incremental",
  "scheduleType": "INCREMENTAL",
  "frequency": "HOURLY",
  "cronExpression": "0 * * * *",
  "active": true,
  "retentionDays": 2,
  "targets": ["s3-target-id"]
}
```

### Cron Expression Examples

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every hour | `0 * * * *` | Hourly at minute 0 |
| Daily 2 AM | `0 2 * * *` | Once per day |
| Every 6 hours | `0 */6 * * *` | 4 times per day |
| Weekly Sunday 3 AM | `0 3 * * 0` | Once per week |
| Monthly 1st at midnight | `0 0 1 * *` | Once per month |

## DR Testing

### Test Types

1. **Backup Verification**: Verify backup files are valid
2. **Restore Test**: Restore to test environment
3. **Failover Test**: Test complete failover process
4. **Recovery Time Test**: Measure actual RTO

### Running DR Tests

```javascript
// Via API
POST /api/dr/test
{
  "testType": "FAILOVER",
  "targetEnvironment": "STAGING",
  "notifyOnCompletion": true
}
```

### Test Frequency

- **Minimum**: Quarterly (every 90 days)
- **Recommended**: Monthly
- **After major changes**: Always test

### Recording Results

```javascript
POST /api/dr/test/{testId}/results
{
  "success": true,
  "actualRTO": 3.5,
  "actualRPO": 0.8,
  "issues": [],
  "notes": "Test completed successfully",
  "participan ts": ["admin@example.com"]
}
```

## RTO/RPO Monitoring

### Metrics Dashboard

Access at: `Admin → DR Management → Metrics`

**Key Metrics**:
- Backup success rate
- Average backup duration
- Storage utilization
- RTO violations
- RPO violations

### Alerts

Configure alerts for:
- Backup failures
- RTO/RPO violations
- Storage capacity warnings
- Test overdue notifications

### API Endpoints

```javascript
// Get DR metrics
GET /api/dr/metrics
?startDate=2025-01-01
&endDate=2025-01-31

// Get violations
GET /api/dr/metrics/violations

// Get success rate
GET /api/dr/metrics/success-rate
```

## Restoration Procedures

### Full Restoration

1. **Identify Backup**:
   ```bash
   GET /api/dr/backups?type=FULL&latest=true
   ```

2. **Download Backup**:
   ```bash
   GET /api/dr/backups/{id}/download
   ```

3. **Stop Application**:
   ```bash
   systemctl stop event-manager
   ```

4. **Restore Database**:
   ```bash
   psql -U postgres event_manager < backup_2025-01-15.sql
   ```

5. **Restore Files**:
   ```bash
   tar -xzf files_2025-01-15.tar.gz -C /var/www/event-manager
   ```

6. **Verify Integrity**:
   ```bash
   npm run db:verify
   ```

7. **Start Application**:
   ```bash
   systemctl start event-manager
   ```

### Point-in-Time Recovery

1. Restore latest full backup
2. Apply incremental backups in sequence
3. Verify data consistency

### Partial Restoration

For specific data recovery:
```bash
# Restore only users table
pg_restore -U postgres -d event_manager -t users backup.dump
```

## Best Practices

### 1. Follow 3-2-1 Rule

- **3** copies of data
- **2** different media types
- **1** off-site copy

### 2. Encrypt Backups

```json
{
  "encryption": {
    "algorithm": "AES-256",
    "keyRotation": 90
  }
}
```

### 3. Test Regularly

- Schedule monthly tests
- Document results
- Update procedures

### 4. Monitor Continuously

- Set up real-time alerts
- Review metrics weekly
- Track trends

### 5. Maintain Documentation

- Keep restoration procedures updated
- Document all DR configurations
- Maintain contact lists

### 6. Geographic Redundancy

- Store backups in multiple regions
- Consider cross-region replication
- Plan for regional disasters

### 7. Compliance

- Verify retention policies meet regulations
- Audit backup access logs
- Maintain compliance documentation

## Troubleshooting

### Backup Failures

**Symptom**: Backup jobs failing

**Solutions**:
1. Check target connectivity
2. Verify credentials
3. Check disk space
4. Review error logs: `/var/log/event-manager/backup.log`

### Slow Backups

**Symptom**: Backups taking too long

**Solutions**:
1. Use incremental backups
2. Compress data
3. Schedule during off-peak hours
4. Increase network bandwidth

### Restoration Issues

**Symptom**: Cannot restore backup

**Solutions**:
1. Verify backup integrity
2. Check file permissions
3. Ensure compatible versions
4. Review restoration logs

## API Reference

### Create DR Config
```http
POST /api/dr/config
Content-Type: application/json

{
  "rto": 4,
  "rpo": 1,
  "backupRetentionDays": 30
}
```

### Create Backup Schedule
```http
POST /api/dr/schedules
Content-Type: application/json

{
  "name": "Daily Backup",
  "scheduleType": "FULL",
  "cronExpression": "0 2 * * *"
}
```

### Execute Manual Backup
```http
POST /api/dr/schedules/{id}/execute
```

### Run DR Test
```http
POST /api/dr/test
Content-Type: application/json

{
  "testType": "FAILOVER",
  "targetEnvironment": "STAGING"
}
```

## Additional Resources

- [AWS S3 Best Practices](https://docs.aws.amazon.com/s3/)
- [Azure Backup Documentation](https://docs.microsoft.com/azure/backup/)
- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)

## Support

For DR-related issues:
- Email: support@eventmanager.com
- Emergency: Call 1-800-DR-HELP
- Documentation: https://docs.eventmanager.com/dr
