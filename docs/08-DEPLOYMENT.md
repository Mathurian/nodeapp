# Deployment Guide

Production deployment guide for Event Manager covering all deployment methods and configurations.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Server Requirements](#server-requirements)
- [Deployment Methods](#deployment-methods)
- [Systemd Deployment](#systemd-deployment)
- [Docker Deployment](#docker-deployment)
- [Nginx Configuration](#nginx-configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Monitoring & Logging](#monitoring--logging)
- [Backup Strategy](#backup-strategy)
- [Performance Tuning](#performance-tuning)

## Pre-Deployment Checklist

- [ ] Server provisioned and accessible
- [ ] Domain name configured
- [ ] SSL certificate obtained
- [ ] PostgreSQL installed and configured
- [ ] Redis installed (optional but recommended)
- [ ] Node.js 18+ installed
- [ ] Nginx installed (for reverse proxy)
- [ ] Firewall configured
- [ ] Backup system configured
- [ ] Monitoring tools set up

## Server Requirements

### Minimum Requirements

- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ or similar Linux
- **Network**: Static IP, open ports 80/443

### Recommended Requirements

- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Database**: Separate database server
- **CDN**: For static assets
- **Load Balancer**: For high availability

## Deployment Methods

### 1. Systemd Service (Recommended for VPS)
- Native Linux service
- Auto-restart on failure
- System integration
- Log management

### 2. Docker (Recommended for Containers)
- Isolated environment
- Easy scaling
- Consistent deployment
- Docker Compose support

### 3. PM2 (Alternative)
- Process management
- Zero-downtime reload
- Log rotation
- Cluster mode

## Systemd Deployment

### Step 1: Prepare Application

```bash
# Clone repository
sudo mkdir -p /opt/event-manager
cd /opt/event-manager
git clone <repository-url> current
cd current

# Install dependencies
npm install --production

# Build application
npm run build

# Build frontend
cd frontend
npm install --production
npm run build
cd ..
```

### Step 2: Create Systemd Service

Create `/etc/systemd/system/event-manager.service`:

```ini
[Unit]
Description=Event Manager Application
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/event-manager/current
Environment=NODE_ENV=production
EnvironmentFile=/opt/event-manager/current/.env
ExecStart=/usr/bin/node /opt/event-manager/current/dist/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=event-manager

[Install]
WantedBy=multi-user.target
```

### Step 3: Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start
sudo systemctl enable event-manager

# Start service
sudo systemctl start event-manager

# Check status
sudo systemctl status event-manager

# View logs
sudo journalctl -u event-manager -f
```

## Docker Deployment

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install --production
RUN cd frontend && npm install --production

# Copy source
COPY . .

# Build application
RUN npm run build
RUN cd frontend && npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: event_manager
      POSTGRES_USER: event_manager
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://event_manager:${DB_PASSWORD}@postgres:5432/event_manager
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      SESSION_SECRET: ${SESSION_SECRET}
      CSRF_SECRET: ${CSRF_SECRET}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    command: >
      sh -c "npx prisma migrate deploy &&
             node dist/server.js"

volumes:
  postgres_data:
  redis_data:
```

### Deploy with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## Nginx Configuration

### Reverse Proxy Setup

Create `/etc/nginx/sites-available/event-manager`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # Real client IP handling for multi-hop reverse proxy chains.
        # Trust only your direct upstream proxy/load balancer IPs or CIDRs.
        set_real_ip_from 127.0.0.1;
        set_real_ip_from ::1;
        set_real_ip_from 10.10.10.10;   # Replace with your trusted proxy IP/CIDR
        real_ip_header X-Forwarded-For;
        real_ip_recursive on;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/event-manager-access.log;
    error_log /var/log/nginx/event-manager-error.log;

    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $realip_remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $realip_remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Upload size limit
    client_max_body_size 10M;
}
```

### Reverse Proxy Chain Requirements

For accurate rate limiting, audit logs, and security controls:

1. Preserve full forwarding chain:
   - Upstream proxies must append to `X-Forwarded-For` (not overwrite).
2. Trust only known proxies:
   - In Nginx, use `set_real_ip_from` for explicit upstream hops only.
   - Avoid broad private CIDRs unless your network design requires them.
3. Align application trust with proxy trust:
   - Set `TRUST_PROXY` in `.env` to the same trusted proxy IPs/CIDRs.
4. Validate after deployment:
   - Check request logs and confirm `ip` reflects real clients.
   - Confirm rate limiting no longer groups all users behind one proxy IP.

### Enable Configuration

```bash
# Link configuration
sudo ln -s /etc/nginx/sites-available/event-manager /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## SSL/TLS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

## Environment Configuration

### Production .env

```bash
# Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/event_manager?connection_limit=20&pool_timeout=20"

# Redis
REDIS_URL=redis://localhost:6379
REDIS_ENABLE=true

# Security
JWT_SECRET=<generate-secure-secret>
SESSION_SECRET=<generate-secure-secret>
CSRF_SECRET=<generate-secure-secret>
BCRYPT_ROUNDS=12
TRUST_PROXY=127.0.0.1,::1,10.10.10.10

# URLs
APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=<smtp-password>
SMTP_FROM=noreply@yourdomain.com

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/event-manager/current/logs/event-manager.log

# File Upload
UPLOAD_DIR=/opt/event-manager/current/uploads
MAX_FILE_SIZE=10485760

# ClamAV
CLAMAV_ENABLED=true
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
```

## Database Setup

### PostgreSQL Configuration

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql

CREATE DATABASE event_manager;
CREATE USER event_manager WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE event_manager TO event_manager;
\q

# Run migrations
cd /opt/event-manager/current
npx prisma migrate deploy
```

### Database Optimization

Edit `/etc/postgresql/14/main/postgresql.conf`:

```ini
# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 128MB
work_mem = 16MB

# Connections
max_connections = 100

# Query Optimization
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000  # Log slow queries (>1s)
```

## Monitoring & Logging

### Log Rotation

Create `/etc/logrotate.d/event-manager`:

```
/opt/event-manager/current/logs/*.log /opt/event-manager/current/logs/*/*.log /var/log/backup-*.log /var/log/pitr-backup.log /var/log/recovery-test.log /var/log/event-manager-*.log {
    daily
    rotate 14
    size 25M
    compress
    delaycompress
    notifempty
    copytruncate
    missingok
}
```

Apply/test:

```bash
sudo logrotate -f /etc/logrotate.d/event-manager
```

### Persistent Journal Caps

Create `/etc/systemd/journald.conf.d/event-manager.conf`:

```ini
[Journal]
SystemMaxUse=500M
SystemKeepFree=2G
RuntimeMaxUse=200M
MaxRetentionSec=14day
```

Apply:

```bash
sudo systemctl restart systemd-journald
sudo journalctl --vacuum-size=500M
```

### Prometheus Metrics

Metrics available at `/metrics`:

```bash
# Add to prometheus.yml
scrape_configs:
  - job_name: 'event-manager'
    static_configs:
      - targets: ['localhost:3000']
```

## Backup Strategy

Use the built-in backup scripts and cron installer in this repository.

### Install Scheduled Backups and Cleanup

```bash
cd /opt/event-manager/current
sudo ./scripts/setup-cron.sh
```

This installs `/etc/cron.d/event-manager-backup` with:
- Full backup daily at 02:00
- Incremental backup every 6 hours
- PITR base backup weekly
- Backup verification weekly
- Backup cleanup daily at 04:00
- Recovery test monthly

### Backup Rotation Tuning (Where It Is Set)

Primary config:
- `/opt/event-manager/current/config/backup.config.sh`

Production override (recommended):
- `/etc/event-manager/backup.env`
- UI runtime override (auto-generated from Super Admin settings):
- `/opt/event-manager/current/config/backup.runtime.env`

Install override template:
```bash
sudo mkdir -p /etc/event-manager
sudo cp /opt/event-manager/current/config/backup.env.example /etc/event-manager/backup.env
sudo chmod 600 /etc/event-manager/backup.env
```

Key retention controls:
- `RETENTION_DAYS_FULL_LOCAL`
- `RETENTION_DAYS_INCREMENTAL_LOCAL`
- `RETENTION_DAYS_PITR_LOCAL`
- `MIN_BACKUPS_TO_KEEP_FULL`
- `MIN_BACKUPS_TO_KEEP_INCREMENTAL`
- `MIN_BACKUPS_TO_KEEP_PITR`

Precedence order at runtime:
1. `config/backup.config.sh` defaults
2. `/etc/event-manager/backup.env` (manual file override)
3. `/opt/event-manager/current/config/backup.runtime.env` (Super Admin UI override)

Super Admin UI path:
- `Settings -> Backup & Off-site Replication` (switch settings scope to `Global`)

### External Alerts (Outside Application)

1. Create alert config:
```bash
sudo mkdir -p /etc/event-manager
sudo cp /opt/event-manager/current/config/alerts.env.example /etc/event-manager/alerts.env
sudo chmod 600 /etc/event-manager/alerts.env
```

2. Configure defaults (optional fallback):
- `ALERT_WEBHOOK_URL` (push/webhook notifications)
- `ALERT_EMAIL_TO` (email notifications, requires local mail/sendmail support)

3. Configure runtime alert policy in the app:
- `Settings -> System Health Alerts` (SUPER_ADMIN)
- `Settings -> Scoring Workflow Alerts` (SUPER_ADMIN/ADMIN/ORGANIZER/BOARD)

These settings are persisted in `system_settings` and are consumed by cron alert scripts.
The `/etc/event-manager/alerts.env` values remain fallback defaults and transport config.

4. `setup-cron.sh` also schedules:
- `scripts/ops/system-health-alert.sh` every 5 minutes
- `scripts/ops/scoring-event-alerts.sh` every 2 minutes

These provide out-of-app alerts for:
- host/service health (disk, memory, service status)
- governance requests
- deduction requests
- judge/category certification events

Scoring workflow alerts now support:
- recipient routing by configured roles/users/emails per tenant
- event-type toggles (governance create/approve/reject, deductions, certifications)
- unread-gated escalation (`onlyIfUnviewed` + `escalationMinutes`) using in-app notification read state

### Off-Host Backup Integrations

Backup scripts can replicate archives off-host via `upload_to_remote()` in `config/backup.config.sh`.

Supported types:
- `REMOTE_BACKUP_TYPE=s3`
- `REMOTE_BACKUP_TYPE=rsync`
- `REMOTE_BACKUP_TYPE=sftp`
- `REMOTE_BACKUP_TYPE=rclone`

`rclone` enables additional providers (Azure Blob, Google Cloud Storage, S3-compatible, Backblaze B2, etc.) through one integration path.

## Performance Tuning

### Node.js Optimization

```bash
# PM2 cluster mode
pm2 start dist/server.js -i max --name event-manager

# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" node dist/server.js
```

### Database Connection Pooling

```
DATABASE_URL="...?connection_limit=20&pool_timeout=20&connect_timeout=10"
```

---

**Next**: [Development Guide](09-DEVELOPMENT.md)
