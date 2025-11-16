# Installation Overview - Event Manager

**Last Updated:** November 13, 2025
**Version:** 2.0
**Estimated Time:** 5-30 minutes (depending on method)

---

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Installation Methods](#installation-methods)
4. [Pre-Installation Checklist](#pre-installation-checklist)
5. [Quick Decision Guide](#quick-decision-guide)
6. [Post-Installation Steps](#post-installation-steps)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Event Manager offers **three installation methods** to suit different environments and requirements:

| Method | Best For | Time | Difficulty | Production-Ready |
|--------|----------|------|------------|------------------|
| **Docker** | Quick start, consistent environments | 5-10 min | Easy | ✅ Yes |
| **Native** | Performance, full control | 15-30 min | Medium | ✅ Yes |
| **Automated Script** | First-time users, development | 10-15 min | Easy | ⚠️ Development |

---

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Linux (Ubuntu 20.04+, Debian 11+, RHEL 8+), macOS 12+, Windows 10+ with WSL2 |
| **CPU** | 2 cores |
| **RAM** | 4 GB |
| **Storage** | 10 GB free space |
| **Network** | Internet connection (initial setup) |

### Recommended Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Linux (Ubuntu 22.04 LTS) |
| **CPU** | 4+ cores |
| **RAM** | 8+ GB |
| **Storage** | 20+ GB SSD |
| **Network** | 100 Mbps+ connection |

### Software Dependencies

#### For Docker Installation
- **Docker**: 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: 2.0+ (included with Docker Desktop)
- **Git**: Any recent version

#### For Native Installation
- **Node.js**: 18.x LTS or higher ([Download](https://nodejs.org/))
- **npm**: 9.x+ (comes with Node.js)
- **PostgreSQL**: 12+ ([Download](https://www.postgresql.org/download/))
- **Git**: Any recent version

#### Optional Components
- **Redis**: 6.0+ (for caching - improves performance)
- **ClamAV**: Latest (for virus scanning file uploads)
- **Nginx**: Latest (for reverse proxy in production)

---

## Installation Methods

### Method 1: Docker Installation (Recommended for Beginners)

**Advantages:**
- ✅ Fastest setup
- ✅ Consistent across all platforms
- ✅ Isolated environment
- ✅ Easy updates and rollbacks
- ✅ Includes all dependencies

**Disadvantages:**
- ❌ Slightly higher resource usage
- ❌ Additional Docker knowledge helpful

**Installation Time:** 5-10 minutes

**Best For:**
- First-time users
- Development environments
- Quick demos
- Teams needing consistency

**Guide:** [Docker Setup Guide](./setup-docker.md)

### Method 2: Native Installation (Recommended for Production)

**Advantages:**
- ✅ Best performance
- ✅ Full control over configuration
- ✅ Direct access to logs and services
- ✅ Lower resource usage
- ✅ Better for debugging

**Disadvantages:**
- ❌ More complex setup
- ❌ Platform-specific instructions
- ❌ Manual dependency management

**Installation Time:** 15-30 minutes

**Best For:**
- Production deployments
- Performance-critical applications
- Advanced users
- Custom configurations

**Guide:** [Native Setup Guide](./setup-native.md)

### Method 3: Automated Setup Script

**Advantages:**
- ✅ Zero-configuration
- ✅ Handles all dependencies
- ✅ Interactive prompts
- ✅ Good for beginners

**Disadvantages:**
- ❌ Less control over process
- ❌ May not work on all systems
- ❌ Primarily for development

**Installation Time:** 10-15 minutes

**Best For:**
- Development environments
- Testing and evaluation
- Quick local setup

**Guide:** Included in [Quick Start Guide](./quick-start.md)

---

## Pre-Installation Checklist

Before installing Event Manager, ensure you have:

### Required

- [ ] Supported operating system (Linux, macOS, or Windows with WSL2)
- [ ] Administrator/sudo access
- [ ] Internet connection
- [ ] Git installed
- [ ] For Docker: Docker and Docker Compose installed
- [ ] For Native: Node.js 18+ and PostgreSQL 12+ installed

### Recommended

- [ ] Domain name (for production deployments)
- [ ] SSL certificate (for HTTPS)
- [ ] Email account for SMTP (for notifications)
- [ ] Backup strategy planned
- [ ] Firewall rules planned
- [ ] Monitoring solution identified

### Optional

- [ ] Redis server (for improved caching)
- [ ] ClamAV (for virus scanning)
- [ ] Reverse proxy (Nginx/Apache)
- [ ] CDN account (for static assets)

---

## Quick Decision Guide

### Choose Docker If:
- ✅ You want the quickest setup
- ✅ You're new to Event Manager
- ✅ You need consistent environments across team
- ✅ You're setting up a development environment
- ✅ You want easy updates

### Choose Native If:
- ✅ You're deploying to production
- ✅ You need maximum performance
- ✅ You have specific system requirements
- ✅ You want full control
- ✅ Docker is not available

### Choose Automated Script If:
- ✅ You're evaluating Event Manager
- ✅ You want zero configuration
- ✅ You're setting up for development only
- ✅ You're comfortable with automated installations

---

## Post-Installation Steps

After installation, follow these steps to complete setup:

### 1. Initial Configuration

```bash
# Access the application
# Docker: http://localhost:80
# Native: http://localhost:3001
```

### 2. First Login

Use default administrator credentials:
- **Email:** `admin@eventmanager.com`
- **Password:** `password123`

**⚠️ CRITICAL:** Change this password immediately after first login!

### 3. System Configuration

Navigate to **Settings** (Admin only) and configure:

- [ ] **Application Settings**
  - App name and branding
  - Organization details
  - Theme preferences

- [ ] **Security Settings**
  - Change admin password
  - Configure password policies
  - Set up rate limiting

- [ ] **Email Settings (Optional)**
  - SMTP server details
  - Email templates
  - Notification preferences

- [ ] **User Management**
  - Create additional users
  - Assign roles
  - Set up permissions

### 4. Create First Event

1. Navigate to **Events** → **Create Event**
2. Fill in event details (name, dates, location)
3. Create contests within the event
4. Set up categories for judging
5. Assign judges to categories
6. Add contestants

### 5. Backup Configuration

Set up automated backups:
1. Go to **Admin** → **Backup & Restore**
2. Configure backup schedule
3. Test backup and restore
4. Configure off-site backup storage (recommended)

---

## Troubleshooting

### Common Installation Issues

#### Issue: Port Already in Use

**Symptom:** Error message about ports 3000, 3001, 5432, or 6379 being in use

**Solution:**

```bash
# Check what's using the port (Linux/macOS)
sudo lsof -i :3000
sudo lsof -i :3001

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or change ports in .env file
PORT=4000
VITE_PORT=4001
```

#### Issue: Database Connection Failed

**Symptom:** Application can't connect to PostgreSQL

**Docker Solution:**
```bash
# Restart Docker containers
docker-compose down
docker-compose up -d

# Check container logs
docker-compose logs postgres
```

**Native Solution:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Verify connection
psql -U postgres -c "SELECT version();"
```

#### Issue: npm Permission Errors

**Symptom:** EACCES errors during npm install

**Solution:**
```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/event-manager

# Or use npm's built-in fix
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Issue: Missing Dependencies

**Symptom:** Module not found errors

**Solution:**
```bash
# Clean install
rm -rf node_modules
npm install

# For frontend
cd frontend
rm -rf node_modules
npm install
```

#### Issue: Docker Build Fails

**Symptom:** Docker build errors

**Solution:**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

### Getting Additional Help

If you encounter issues not covered here:

1. **Check logs:**
   - Docker: `docker-compose logs -f`
   - Native: `npm run logs` or check `/logs` directory

2. **Review documentation:**
   - [Troubleshooting Guide](../05-deployment/troubleshooting.md)
   - [FAQ](../10-reference/faq.md)

3. **Community support:**
   - GitHub Issues
   - Community forums
   - Stack Overflow (tag: event-manager)

4. **Professional support:**
   - Contact your system administrator
   - Reach out to Event Manager support team

---

## Next Steps

After successful installation:

1. **For Administrators:**
   - [User Management Guide](../03-administration/user-management.md)
   - [System Settings](../03-administration/system-settings.md)
   - [Backup & Restore](../03-administration/backup-restore.md)

2. **For Developers:**
   - [Development Guide](../04-development/getting-started.md)
   - [API Documentation](../07-api/rest-api.md)
   - [Testing Guide](../04-development/testing-guide.md)

3. **For Organizers:**
   - [Event Management](../02-features/event-management.md)
   - [Scoring System](../02-features/scoring-system.md)
   - [Certification Workflow](../02-features/certification-workflow.md)

4. **For All Users:**
   - [Quick Reference](../10-reference/quick-reference.md)
   - [Features Overview](../02-features/README.md)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Nov 13, 2025 | Complete rewrite with Docker/Native options |
| 1.0 | Oct 2025 | Initial version |

---

**Need help?** Check our [Documentation Index](../INDEX.md) or [Quick Start Guide](./quick-start.md)
