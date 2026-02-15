# Backup and Restore

## Overview


Database backup and restore procedures.

## Backup Types
- Full backups (daily at 2 AM)
- Incremental backups
- Manual on-demand backups

## Automated Backups
Managed by `ScheduledBackupService` (`/var/www/event-manager/src/services/scheduledBackupService.ts`)

## Manual Backup
```bash
npm run backup:create
```

## Restore
```bash
npm run backup:restore -- --file=backup.sql
```

## Storage
Backups stored in `/var/www/event-manager/backups/`

## Retention
Default: 30 days (configurable)


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
