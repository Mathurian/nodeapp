# Docker Setup Guide - Event Manager

**Last Updated:** November 13, 2025
**Version:** 2.0
**Estimated Time:** 5-10 minutes

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd event-manager

# 2. Copy environment file
cp .env.docker.example .env

# 3. Start with Docker Compose
docker-compose up -d

# 4. Access application
# Frontend: http://localhost:80
# Backend API: http://localhost:3000
# Database: localhost:5432
```

**Default Login:**
- Email: `admin@eventmanager.com`
- Password: `password123`

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Docker Compose Services](#docker-compose-services)
4. [Environment Configuration](#environment-configuration)
5. [Service Management](#service-management)
6. [Accessing Services](#accessing-services)
7. [Data Persistence](#data-persistence)
8. [Updating](#updating)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)

---

## Prerequisites

### Required Software

1. **Docker Engine:** 20.10 or higher
   - Linux: [Install Docker Engine](https://docs.docker.com/engine/install/)
   - macOS: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
   - Windows: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)

2. **Docker Compose:** 2.0 or higher
   - Included with Docker Desktop
   - Linux: `sudo apt-get install docker-compose-plugin`

3. **Git:** Any recent version

### System Requirements

- **RAM:** 4 GB minimum, 8 GB recommended
- **Storage:** 10 GB free space
- **Ports:** 80, 3000, 5432, 6379 (must be available)

### Verify Installation

```bash
# Check Docker version
docker --version
# Expected: Docker version 20.10.0 or higher

# Check Docker Compose version
docker-compose --version
# Expected: Docker Compose version 2.0.0 or higher

# Check Docker is running
docker ps
# Should return empty list or running containers
```

---

## Installation Steps

### Step 1: Clone Repository

```bash
# Clone the repository
git clone <repository-url> event-manager
cd event-manager

# Verify files
ls -la
# Should see: docker-compose.yml, .env.docker.example, etc.
```

### Step 2: Configure Environment

```bash
# Copy the Docker environment template
cp .env.docker.example .env

# Optional: Edit configuration
nano .env  # or vim, code, etc.
```

**Key Configuration Options:**

```env
# Application
NODE_ENV=production
PORT=3000
VITE_PORT=80

# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/event_manager

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-secure-random-secret-here

# Redis (optional but recommended)
REDIS_URL=redis://redis:6379
REDIS_ENABLED=true

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Step 3: Build and Start Services

```bash
# Build and start all services
docker-compose up -d

# This will:
# - Build backend and frontend containers
# - Start PostgreSQL database
# - Start Redis cache
# - Run database migrations
# - Seed default data (admin user)

# Monitor startup (optional)
docker-compose logs -f

# Wait for message: "Application started successfully"
# Press Ctrl+C to stop following logs
```

### Step 4: Verify Installation

```bash
# Check all services are running
docker-compose ps

# Expected output:
# NAME                STATUS    PORTS
# backend             Up        0.0.0.0:3000->3000/tcp
# frontend            Up        0.0.0.0:80->80/tcp
# postgres            Up        0.0.0.0:5432->5432/tcp
# redis               Up        0.0.0.0:6379->6379/tcp
```

### Step 5: Access Application

Open your browser to:
- **Application:** http://localhost
- **API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api-docs

Login with default credentials:
- **Email:** `admin@eventmanager.com`
- **Password:** `password123`

**⚠️ IMPORTANT:** Change the default password immediately!

---

## Docker Compose Services

The `docker-compose.yml` defines 4 services:

### 1. Backend Service

**Container Name:** `event-manager-backend`
**Image:** `node:18-alpine`
**Ports:** `3000:3000`
**Purpose:** Node.js/Express API server

**Healthcheck:** `http://localhost:3000/api/health`

### 2. Frontend Service

**Container Name:** `event-manager-frontend`
**Image:** `nginx:alpine`
**Ports:** `80:80`
**Purpose:** React application (production build)

### 3. PostgreSQL Database

**Container Name:** `event-manager-postgres`
**Image:** `postgres:15-alpine`
**Ports:** `5432:5432`
**Purpose:** Primary database

**Default Credentials:**
- Username: `postgres`
- Password: `postgres` (change in production!)
- Database: `event_manager`

### 4. Redis Cache

**Container Name:** `event-manager-redis`
**Image:** `redis:7-alpine`
**Ports:** `6379:6379`
**Purpose:** Session storage and caching

---

## Environment Configuration

### Full .env File Structure

```env
# ===================
# Application Settings
# ===================
NODE_ENV=production
PORT=3000
VITE_PORT=80
API_URL=http://localhost:3000

# ===================
# Database
# ===================
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/event_manager?schema=public&connection_limit=10

# ===================
# Authentication
# ===================
JWT_SECRET=change-this-to-a-secure-random-string-min-32-characters
JWT_EXPIRES_IN=1h

# ===================
# Redis Cache
# ===================
REDIS_URL=redis://redis:6379
REDIS_ENABLED=true
REDIS_FALLBACK_TO_MEMORY=true

# ===================
# File Uploads
# ===================
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# ===================
# ClamAV Virus Scanning
# ===================
CLAMAV_ENABLED=false
CLAMAV_HOST=clamav
CLAMAV_PORT=3310

# ===================
# Email (SMTP)
# ===================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@eventmanager.com

# ===================
# CORS
# ===================
CORS_ORIGIN=http://localhost,http://localhost:80,http://localhost:3000

# ===================
# Logging
# ===================
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# ===================
# Security
# ===================
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECRET=change-this-session-secret-to-something-secure
```

---

## Service Management

### Starting Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# Start with rebuild
docker-compose up -d --build
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop but keep data
docker-compose stop

# Stop and remove volumes (⚠️ DELETES DATA!)
docker-compose down -v
```

### Restarting Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Viewing Logs

```bash
# All services
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100
```

### Executing Commands

```bash
# Run command in backend container
docker-compose exec backend npm run migrate

# Open bash shell in backend
docker-compose exec backend sh

# Run Prisma commands
docker-compose exec backend npx prisma studio

# Database backup
docker-compose exec postgres pg_dump -U postgres event_manager > backup.sql
```

---

## Accessing Services

### Web Interfaces

| Service | URL | Purpose |
|---------|-----|---------|
| Application | http://localhost | Main application UI |
| API | http://localhost:3000/api | REST API endpoints |
| API Docs | http://localhost:3000/api-docs | Swagger documentation |

### Direct Database Access

```bash
# Using Docker
docker-compose exec postgres psql -U postgres event_manager

# Using psql (if installed locally)
psql -h localhost -U postgres -d event_manager
```

### Redis CLI

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Test Redis
127.0.0.1:6379> PING
PONG

# View all keys
127.0.0.1:6379> KEYS *

# Get cache value
127.0.0.1:6379> GET events:list:
```

---

## Data Persistence

Docker volumes persist data across container restarts:

### Volumes Created

```bash
# List volumes
docker volume ls | grep event-manager

# Expected volumes:
# event-manager_postgres-data
# event-manager_redis-data
# event-manager_uploads
```

### Backup Data

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U postgres event_manager > backup-$(date +%Y%m%d).sql

# Backup uploads
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/

# Backup Redis (if needed)
docker-compose exec redis redis-cli SAVE
docker cp event-manager-redis:/data/dump.rdb redis-backup-$(date +%Y%m%d).rdb
```

### Restore Data

```bash
# Restore PostgreSQL
docker-compose exec -T postgres psql -U postgres event_manager < backup-20251113.sql

# Restore uploads
tar -xzf uploads-backup-20251113.tar.gz

# Restore Redis
docker cp redis-backup-20251113.rdb event-manager-redis:/data/dump.rdb
docker-compose restart redis
```

---

## Updating

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart services
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run migrations (if any)
docker-compose exec backend npm run migrate

# Check status
docker-compose ps
```

### Update Docker Images

```bash
# Pull latest base images
docker-compose pull

# Rebuild with new images
docker-compose up -d --build
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker info

# Check available ports
sudo lsof -i :80
sudo lsof -i :3000
sudo lsof -i :5432

# Check Docker logs
docker-compose logs

# Remove old containers
docker-compose down -v
docker-compose up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -c "SELECT version();"

# Restart PostgreSQL
docker-compose restart postgres
```

### Frontend Not Loading

```bash
# Check Nginx logs
docker-compose logs frontend

# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Check build files exist
docker-compose exec frontend ls -la /usr/share/nginx/html
```

### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused images
docker image prune -a

# Clean up everything (⚠️ careful!)
docker system prune -a --volumes
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Increase Docker Desktop resources:
# Settings → Resources → Advanced
# Increase CPUs and Memory

# Check container logs for errors
docker-compose logs -f
```

---

## Production Deployment

For production deployment with Docker:

### 1. Use Production Environment File

```bash
# Create production .env
cp .env.docker.example .env.production

# Edit with production values
nano .env.production

# Important changes:
# - Strong JWT_SECRET (min 32 chars)
# - Strong SESSION_SECRET
# - Production DATABASE_URL
# - Production CORS_ORIGIN
# - NODE_ENV=production
```

### 2. Enable HTTPS

Add Nginx reverse proxy with SSL:

```yaml
# docker-compose.prod.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
```

### 3. Use Docker Secrets

```bash
# Create secrets
echo "strong-jwt-secret" | docker secret create jwt_secret -
echo "strong-session-secret" | docker secret create session_secret -

# Update docker-compose.yml to use secrets
```

### 4. Enable Monitoring

```bash
# Start with monitoring stack
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Access Grafana: http://localhost:3500
# Access Prometheus: http://localhost:9090
```

### 5. Set Up Backups

```bash
# Add to crontab
0 2 * * * cd /path/to/event-manager && docker-compose exec postgres pg_dump -U postgres event_manager > /backups/db-$(date +\%Y\%m\%d).sql
```

---

## Next Steps

After successful Docker setup:

1. **Configure Application:**
   - [System Settings](../03-administration/system-settings.md)
   - [User Management](../03-administration/user-management.md)

2. **Set Up Features:**
   - [Create Your First Event](../02-features/event-management.md)
   - [Configure Scoring](../02-features/scoring-system.md)

3. **Production Hardening:**
   - [Production Deployment Guide](../05-deployment/production-deployment.md)
   - [Security Best Practices](../08-security/security-best-practices.md)

---

**Having issues?** Check the [Troubleshooting Guide](../05-deployment/troubleshooting.md)
