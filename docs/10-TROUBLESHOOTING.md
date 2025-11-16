# Troubleshooting Guide

Common issues and solutions for Event Manager.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Issues](#database-issues)
- [Authentication Issues](#authentication-issues)
- [Real-Time Connection Issues](#real-time-connection-issues)
- [File Upload Issues](#file-upload-issues)
- [Performance Issues](#performance-issues)
- [Build & Deployment Issues](#build--deployment-issues)
- [Common Error Codes](#common-error-codes)
- [Getting Support](#getting-support)

## Installation Issues

### Node Version Mismatch

**Problem**: `Error: The engine "node" is incompatible with this module`

**Solution**:
```bash
# Check Node version
node --version  # Should be 18.0.0 or higher

# Install correct version
nvm install 18
nvm use 18
```

### Dependencies Installation Fails

**Problem**: `npm install` fails with errors

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and lockfile
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Prisma Generation Fails

**Problem**: `Error generating Prisma Client`

**Solution**:
```bash
# Clean Prisma cache
npx prisma generate --force

# If still failing, check DATABASE_URL
echo $DATABASE_URL

# Ensure PostgreSQL is running
sudo systemctl status postgresql
```

## Database Issues

### Cannot Connect to Database

**Problem**: `Error: Can't reach database server`

**Solution**:
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Test connection
psql -U event_manager -d event_manager -h localhost

# Check DATABASE_URL format
# Should be: postgresql://user:password@host:port/database
```

### Migration Fails

**Problem**: Migration errors during `prisma migrate`

**Solution**:
```bash
# Check migration status
npx prisma migrate status

# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Or apply specific migration
npx prisma migrate deploy

# Check for migration conflicts
npx prisma migrate resolve
```

### Connection Pool Exhausted

**Problem**: `Error: Prepared statement already exists`

**Solution**:
```bash
# Increase connection pool limit in DATABASE_URL
# Add: ?connection_limit=20&pool_timeout=20

# Example:
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20"

# Restart application
sudo systemctl restart event-manager
```

### Slow Queries

**Problem**: Database queries are slow

**Solution**:
```bash
# Enable query logging
# In postgresql.conf:
log_min_duration_statement = 1000

# Check for missing indexes
# Run EXPLAIN ANALYZE on slow queries

# Update statistics
VACUUM ANALYZE;
```

## Authentication Issues

### JWT Token Expired

**Problem**: `Token expired` error when authenticated

**Solution**:
- This is expected behavior after 1 hour (default)
- User needs to log in again
- Increase JWT_EXPIRES_IN in .env if needed

### Session Version Mismatch

**Problem**: `SESSION_VERSION_MISMATCH` error

**Solution**:
```bash
# This happens after:
# - Password change
# - MFA enable/disable
# - Manual session invalidation

# User must log in again to get new token
# This is a security feature, not a bug
```

### CSRF Token Invalid

**Problem**: `Invalid CSRF token` on form submission

**Solution**:
```typescript
// Frontend: Ensure token is fetched and included
const csrfToken = await fetchCsrfToken();

// Include in headers
headers: {
  'X-CSRF-Token': csrfToken
}
```

### 401 Unauthorized

**Problem**: API returns 401 even with valid token

**Solution**:
```bash
# Check if token is included in headers
Authorization: Bearer <your_token>

# Verify JWT_SECRET matches between .env and token

# Check token expiration
# Decode JWT at jwt.io to inspect claims

# Ensure authenticateToken middleware is applied
```

### 403 Forbidden

**Problem**: User cannot access endpoint despite being authenticated

**Solution**:
```bash
# Check user role
# Verify role matches required roles in route

# Example: Route requires ADMIN, user has JUDGE role
# User needs role upgrade

# Check permissions matrix in documentation
```

## Real-Time Connection Issues

### WebSocket Connection Failed

**Problem**: Socket.IO cannot connect

**Solution**:
```bash
# Check WebSocket URL
# Should match backend URL

# Ensure token is passed in auth
socket = io(WS_URL, {
  auth: { token: authToken }
});

# Check for proxy/firewall blocking WebSocket
# Nginx should have Upgrade headers configured

# Check CORS configuration
# ALLOWED_ORIGINS should include frontend URL
```

### Events Not Received

**Problem**: Not receiving real-time updates

**Solution**:
```typescript
// Ensure room is joined
socket.emit('join-room', roomName);

// Check event listener spelling
socket.on('score:updated', handler);  // Must match server event name

// Verify socket is connected
socket.connected === true

// Check server-side emission
// Verify io.to(room).emit() is called
```

## File Upload Issues

### File Upload Fails

**Problem**: Cannot upload files

**Solution**:
```bash
# Check file size limit
# Default: 10MB (MAX_FILE_SIZE in .env)

# Verify MIME type is allowed
# See allowedMimeTypes in fileFilter

# Check upload directory permissions
mkdir -p uploads
chmod 755 uploads

# Nginx: Check client_max_body_size
client_max_body_size 10M;
```

### Virus Scan Fails

**Problem**: ClamAV virus scan errors

**Solution**:
```bash
# Check if ClamAV is running
sudo systemctl status clamav-daemon

# Start ClamAV
sudo systemctl start clamav-daemon

# Or disable virus scanning
CLAMAV_ENABLED=false

# Set fallback behavior
CLAMAV_FALLBACK_BEHAVIOR=allow
```

### File Not Found After Upload

**Problem**: File uploaded but cannot be accessed

**Solution**:
```bash
# Check file path stored in database
# Should be relative to uploads directory

# Verify static file serving
# Nginx should serve /uploads

# Check file permissions
ls -la uploads/

# Ensure www-data can read files
sudo chown -R www-data:www-data uploads/
```

## Performance Issues

### Slow Page Load

**Problem**: Frontend loads slowly

**Solution**:
```bash
# Build frontend with optimizations
cd frontend
npm run build

# Check bundle size
# Analyze with: npm run build -- --analyze

# Implement code splitting
# Use React.lazy() for large components

# Enable caching in production
# Check Cache-Control headers
```

### Slow API Responses

**Problem**: API endpoints are slow

**Solution**:
```bash
# Check database query performance
# Enable slow query logging

# Add missing indexes
# Run EXPLAIN on slow queries

# Enable Redis caching
REDIS_ENABLE=true

# Check connection pool settings
# Increase if needed: connection_limit=20
```

### High Memory Usage

**Problem**: Application uses too much memory

**Solution**:
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096"

# Check for memory leaks
# Use Node.js profiling tools

# Reduce connection pool size
# Lower connection_limit in DATABASE_URL

# Restart application periodically
# Use PM2 or systemd timer
```

## Build & Deployment Issues

### TypeScript Build Fails

**Problem**: `tsc` compilation errors

**Solution**:
```bash
# Check TypeScript errors
npm run type-check

# Fix type errors in code
# Add missing type definitions

# Update tsconfig.json if needed
# Ensure all source files are included
```

### Frontend Build Fails

**Problem**: Vite build fails

**Solution**:
```bash
# Clear Vite cache
rm -rf frontend/node_modules/.vite

# Rebuild
cd frontend
npm run build

# Check for import errors
# Verify all dependencies are installed

# Check for environment variable issues
# Ensure VITE_* variables are set
```

### Systemd Service Won't Start

**Problem**: Service fails to start

**Solution**:
```bash
# Check service status
sudo systemctl status event-manager

# View logs
sudo journalctl -u event-manager -n 50

# Check .env file exists and is readable
ls -la /var/www/event-manager/.env

# Verify Node.js path in service file
which node

# Check file permissions
sudo chown -R www-data:www-data /var/www/event-manager
```

## Common Error Codes

### Backend Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `AUTH_ERROR` | Authentication failed | Check credentials, verify token |
| `TOKEN_EXPIRED` | JWT expired | Login again |
| `INVALID_TOKEN` | Malformed JWT | Clear token, login again |
| `SESSION_VERSION_MISMATCH` | Session invalidated | Login again |
| `INSUFFICIENT_PERMISSIONS` | Role not allowed | Check user role |
| `VALIDATION_ERROR` | Invalid input | Check request data format |
| `RESOURCE_NOT_FOUND` | Not found | Verify ID exists |
| `DUPLICATE_ENTRY` | Already exists | Use different unique value |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait before retrying |

### HTTP Status Codes

- **400**: Bad request - Check request format
- **401**: Unauthorized - Need authentication
- **403**: Forbidden - Insufficient permissions
- **404**: Not found - Resource doesn't exist
- **409**: Conflict - Duplicate resource
- **422**: Validation failed - Invalid input
- **429**: Rate limited - Too many requests
- **500**: Server error - Check logs
- **503**: Service unavailable - Service down

## Getting Support

### Before Asking for Help

1. Check this troubleshooting guide
2. Search existing issues on GitHub
3. Check application logs
4. Review documentation

### Gathering Information

When reporting issues, provide:

1. **Error Message**: Exact error text
2. **Steps to Reproduce**: How to trigger the issue
3. **Environment**: OS, Node version, database version
4. **Logs**: Relevant log excerpts
5. **Configuration**: Relevant .env settings (redact secrets)

### Log Locations

```bash
# Application logs
/var/www/event-manager/logs/event-manager.log

# Systemd logs
sudo journalctl -u event-manager

# Nginx logs
/var/log/nginx/event-manager-*.log

# PostgreSQL logs
/var/log/postgresql/postgresql-*-main.log
```

### Support Channels

- **Documentation**: This documentation set
- **API Docs**: `/api-docs` in application
- **GitHub Issues**: For bug reports
- **Discussions**: For questions

---

**Documentation Complete!** Return to [Documentation Index](INDEX.md)
