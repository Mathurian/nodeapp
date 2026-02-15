# Deployment Troubleshooting

## Overview


Common deployment issues and solutions.

## Database Connection Issues
**Problem**: Cannot connect to database
**Solution**: 
- Verify DATABASE_URL in .env
- Check PostgreSQL is running
- Verify network connectivity
- Check firewall rules

## Port Already in Use
**Problem**: Port 3000 already in use
**Solution**:
```bash
# Find process using port
lsof -i :3000
# Kill process or change PORT in .env
```

## Migration Failures
**Problem**: Migrations fail to run
**Solution**:
- Check database connectivity
- Verify user permissions
- Run: `npx prisma migrate reset` (dev only)

## Permission Errors
**Problem**: EACCES errors
**Solution**:
```bash
# Fix ownership
sudo chown -R $USER:  $USER .
# Fix permissions
chmod -R 755 .
```

## Memory Issues
**Problem**: Out of memory errors
**Solution**:
- Increase Node.js heap: `NODE_OPTIONS="--max-old-space-size=4096"`
- Add swap space
- Upgrade server resources

See logs at `/var/www/event-manager/logs/`


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
