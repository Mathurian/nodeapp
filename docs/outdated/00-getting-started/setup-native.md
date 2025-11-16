# Setup Without Docker

This guide explains how to run the Event Manager application using natively installed services instead of Docker containers. This approach is ideal for development environments, systems where Docker is not available, or when you prefer direct control over service configuration.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Automated Installation](#automated-installation)
- [Manual Installation](#manual-installation)
  - [Linux (Ubuntu/Debian)](#linux-ubuntudebian)
  - [Linux (Fedora/RHEL/CentOS)](#linux-fedorarhel centos)
  - [macOS](#macos)
  - [Windows](#windows)
- [Service Configuration](#service-configuration)
- [Environment Variables](#environment-variables)
- [Graceful Fallback](#graceful-fallback)
- [Troubleshooting](#troubleshooting)
- [Docker vs Native Comparison](#docker-vs-native-comparison)

---

## Overview

The Event Manager application can use the following services:

1. **Redis** - Distributed caching and session storage
2. **ClamAV** - Virus scanning for file uploads
3. **PostgreSQL** - Primary database

All services support:
- ✅ Docker containers (original setup)
- ✅ Native installations (this guide)
- ✅ Graceful fallback when unavailable
- ✅ Auto-detection of connection method

---

## Prerequisites

### All Platforms

- Node.js 18+ and npm
- Basic command line knowledge
- Administrative/sudo access for service installation

### Platform-Specific

**Linux:**
- Package manager access (`apt`, `dnf`, or `yum`)
- systemd or similar service manager

**macOS:**
- Homebrew package manager ([install here](https://brew.sh))

**Windows:**
- PowerShell 5.1+ (Administrator mode)
- Chocolatey package manager (will be installed by script)

---

## Automated Installation

The easiest way to install all services is using our automated scripts.

### Linux and macOS

```bash
cd /var/www/event-manager
./scripts/install-services-native.sh
```

The script will:
1. Detect your operating system
2. Ask which services to install
3. Install and configure selected services
4. Set up PostgreSQL database and user
5. Update your `.env` file with correct settings
6. Verify all installations

### Windows

```powershell
cd C:\path\to\event-manager
.\scripts\install-services-native.ps1
```

**Note:** Must be run as Administrator

---

## Manual Installation

If you prefer to install services manually or the automated script doesn't work for your system, follow these platform-specific guides.

### Linux (Ubuntu/Debian)

#### 1. Install Redis

```bash
# Update package list
sudo apt-get update

# Install Redis
sudo apt-get install -y redis-server

# Enable and start service
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify installation
redis-cli ping  # Should return "PONG"
```

**Connection:** `localhost:6379`

#### 2. Install ClamAV

```bash
# Install ClamAV packages
sudo apt-get install -y clamav clamav-daemon clamav-freshclam

# Stop freshclam service to update virus definitions
sudo systemctl stop clamav-freshclam

# Update virus definitions (this may take 10-15 minutes)
sudo freshclam

# Start services
sudo systemctl enable clamav-daemon
sudo systemctl enable clamav-freshclam
sudo systemctl start clamav-freshclam
sudo systemctl start clamav-daemon

# Verify installation
clamdscan --version
```

**Connection:** Unix socket at `/var/run/clamav/clamd.ctl`

#### 3. Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Enable and start service
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER event_manager WITH PASSWORD 'your_secure_password';
CREATE DATABASE event_manager OWNER event_manager;
GRANT ALL PRIVILEGES ON DATABASE event_manager TO event_manager;
EOF

# Verify installation
psql --version
```

**Connection:** `localhost:5432`

---

### Linux (Fedora/RHEL/CentOS)

#### 1. Install Redis

```bash
# Install Redis
sudo dnf install -y redis

# Enable and start service
sudo systemctl enable redis
sudo systemctl start redis

# Verify installation
redis-cli ping
```

**Connection:** `localhost:6379`

#### 2. Install ClamAV

```bash
# Install ClamAV
sudo dnf install -y clamav clamav-update clamd

# Update virus definitions
sudo freshclam

# Enable and start service
sudo systemctl enable clamd@scan
sudo systemctl start clamd@scan

# Verify installation
clamdscan --version
```

**Connection:** Unix socket at `/var/run/clamd.scan/clamd.sock`

#### 3. Install PostgreSQL

```bash
# Install PostgreSQL
sudo dnf install -y postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup --initdb

# Enable and start service
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user (same as Ubuntu)
sudo -u postgres psql <<EOF
CREATE USER event_manager WITH PASSWORD 'your_secure_password';
CREATE DATABASE event_manager OWNER event_manager;
GRANT ALL PRIVILEGES ON DATABASE event_manager TO event_manager;
EOF
```

**Connection:** `localhost:5432`

---

### macOS

#### 1. Install Redis

```bash
# Install via Homebrew
brew install redis

# Start Redis service
brew services start redis

# Verify installation
redis-cli ping
```

**Connection:** `localhost:6379`

#### 2. Install ClamAV

```bash
# Install via Homebrew
brew install clamav

# Copy and configure config files
cp /usr/local/etc/clamav/freshclam.conf.sample /usr/local/etc/clamav/freshclam.conf
sed -i '' 's/^Example/#Example/' /usr/local/etc/clamav/freshclam.conf

cp /usr/local/etc/clamav/clamd.conf.sample /usr/local/etc/clamav/clamd.conf
sed -i '' 's/^Example/#Example/' /usr/local/etc/clamav/clamd.conf

# Update virus definitions
freshclam

# Start ClamAV service
brew services start clamav

# Verify installation
clamdscan --version
```

**Connection:** Unix socket at `/tmp/clamd.socket`

#### 3. Install PostgreSQL

```bash
# Install via Homebrew
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database and user
psql -U $(whoami) -d postgres <<EOF
CREATE USER event_manager WITH PASSWORD 'your_secure_password';
CREATE DATABASE event_manager OWNER event_manager;
GRANT ALL PRIVILEGES ON DATABASE event_manager TO event_manager;
EOF

# Verify installation
psql --version
```

**Connection:** `localhost:5432`

---

### Windows

#### 1. Install Chocolatey (if not already installed)

Open PowerShell as Administrator:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
```

#### 2. Install Redis

```powershell
# Install Redis
choco install redis-64 -y

# Start Redis service
Start-Service Redis
Set-Service Redis -StartupType Automatic

# Verify installation
& "C:\Program Files\Redis\redis-cli.exe" ping
```

**Connection:** `localhost:6379`

#### 3. Install ClamAV

Download and install ClamAV for Windows from:
[https://www.clamav.net/downloads](https://www.clamav.net/downloads)

After installation:

```powershell
# Update virus definitions
& "C:\Program Files\ClamAV\freshclam.exe"

# Verify installation
& "C:\Program Files\ClamAV\clamdscan.exe" --version
```

**Connection:** `localhost:3310` (TCP)

#### 4. Install PostgreSQL

```powershell
# Install PostgreSQL
choco install postgresql15 -y

# Verify installation
psql --version
```

Then use pgAdmin or psql to create the database:

```sql
CREATE USER event_manager WITH PASSWORD 'your_secure_password';
CREATE DATABASE event_manager OWNER event_manager;
GRANT ALL PRIVILEGES ON DATABASE event_manager TO event_manager;
```

**Connection:** `localhost:5432`

---

## Service Configuration

### Checking Service Status

#### Linux (systemd)

```bash
# Redis
sudo systemctl status redis-server   # Ubuntu/Debian
sudo systemctl status redis           # Fedora/RHEL

# ClamAV
sudo systemctl status clamav-daemon   # Ubuntu/Debian
sudo systemctl status clamd@scan      # Fedora/RHEL

# PostgreSQL
sudo systemctl status postgresql
```

#### macOS

```bash
brew services list
```

#### Windows

```powershell
Get-Service Redis
Get-Service postgresql*
```

### Starting/Stopping Services

#### Linux

```bash
# Start
sudo systemctl start <service-name>

# Stop
sudo systemctl stop <service-name>

# Restart
sudo systemctl restart <service-name>

# Enable auto-start on boot
sudo systemctl enable <service-name>
```

#### macOS

```bash
brew services start <service-name>
brew services stop <service-name>
brew services restart <service-name>
```

#### Windows

```powershell
Start-Service <service-name>
Stop-Service <service-name>
Restart-Service <service-name>
```

---

## Environment Variables

After installing services, update your `.env` file with the correct configuration.

### Redis Configuration

```env
# Enable/disable Redis
REDIS_ENABLED=true

# Connection method (auto-detected)
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional: Unix socket path (Linux/macOS)
# REDIS_SOCKET=/var/run/redis/redis-server.sock

# Optional: Password (if configured)
# REDIS_PASSWORD=your_password

# Fallback to in-memory cache if Redis unavailable
REDIS_FALLBACK_TO_MEMORY=true
```

**Auto-detection modes:**
- `docker` - Connects to `redis:6379` (Docker container)
- `native` - Connects to `localhost:6379` (native installation)
- `socket` - Connects via Unix socket (Linux/macOS)
- `memory` - Uses in-memory cache only (fallback)

### ClamAV Configuration

```env
# Enable/disable virus scanning
CLAMAV_ENABLED=true

# Connection method (auto-detected)
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# Optional: Unix socket path (Linux/macOS)
# CLAMAV_SOCKET=/var/run/clamav/clamd.ctl

# Behavior when ClamAV unavailable
CLAMAV_FALLBACK_BEHAVIOR=allow  # or 'reject'

# Optional settings
CLAMAV_TIMEOUT=60000              # 60 seconds
CLAMAV_MAX_FILE_SIZE=52428800     # 50MB
```

**Auto-detection modes:**
- `docker` - Connects to `clamav:3310` (Docker container)
- `native-tcp` - Connects to `localhost:3310` (Windows)
- `native-socket` - Connects via Unix socket (Linux/macOS)
- `disabled` - Skips all virus scanning

### PostgreSQL Configuration

```env
DATABASE_URL="postgresql://event_manager:your_password@localhost:5432/event_manager?schema=public&connection_limit=10&pool_timeout=10&connect_timeout=5"
```

**Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?[options]
```

---

## Graceful Fallback

The application is designed to work even when services are unavailable.

### Redis Fallback

When Redis is unavailable:
- ✅ Automatically switches to in-memory cache
- ✅ Application continues to function
- ⚠️ Cache is not shared across multiple instances
- ⚠️ Cache is lost on application restart

**To disable Redis and use in-memory only:**

```env
REDIS_ENABLED=false
```

### ClamAV Fallback

When ClamAV is unavailable:
- ✅ Application continues to accept file uploads
- ⚠️ Files are not scanned for viruses
- ℹ️ Controlled by `CLAMAV_FALLBACK_BEHAVIOR`

**Fallback behaviors:**
- `allow` - Accept files without scanning (default)
- `reject` - Reject all file uploads

**To disable virus scanning completely:**

```env
CLAMAV_ENABLED=false
```

### Monitoring Service Mode

Check which mode your application is using:

```bash
# Check application logs
npm start

# Look for messages like:
# "Redis cache client connected (native mode)"
# "ClamAV scanning via Unix socket"
# "Using in-memory cache (Redis unavailable)"
```

You can also call the health check endpoint:

```bash
curl http://localhost:3000/api/health
```

---

## Troubleshooting

### Redis Issues

**Problem:** Redis not responding

```bash
# Check if Redis is running
sudo systemctl status redis-server  # Linux
brew services list                  # macOS
Get-Service Redis                   # Windows

# Check Redis logs
sudo journalctl -u redis-server     # Linux
tail -f /usr/local/var/log/redis.log  # macOS

# Test connection
redis-cli ping

# Check if port is in use
sudo netstat -tlnp | grep 6379     # Linux
lsof -i :6379                       # macOS
netstat -an | findstr 6379          # Windows
```

**Problem:** Permission denied

```bash
# Linux: Ensure Redis socket permissions
sudo chmod 777 /var/run/redis/redis-server.sock
```

**Solution:** Application will fall back to in-memory cache automatically if `REDIS_FALLBACK_TO_MEMORY=true`

### ClamAV Issues

**Problem:** ClamAV daemon not starting

```bash
# Check logs
sudo journalctl -u clamav-daemon     # Linux
tail -f /usr/local/var/log/clamav.log  # macOS

# Common issue: Virus definitions not updated
sudo freshclam

# Check socket exists
ls -la /var/run/clamav/clamd.ctl    # Ubuntu
ls -la /var/run/clamd.scan/clamd.sock  # Fedora
ls -la /tmp/clamd.socket            # macOS
```

**Problem:** Socket permission denied

```bash
# Add your user to clamav group (Linux)
sudo usermod -a -G clamav $USER

# Or make socket world-readable
sudo chmod 666 /var/run/clamav/clamd.ctl
```

**Solution:** Set `CLAMAV_FALLBACK_BEHAVIOR=allow` to continue without scanning

### PostgreSQL Issues

**Problem:** Connection refused

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql     # Linux
brew services list                   # macOS
Get-Service postgresql*              # Windows

# Check if listening on port
sudo netstat -tlnp | grep 5432      # Linux
lsof -i :5432                       # macOS
netstat -an | findstr 5432          # Windows
```

**Problem:** Authentication failed

```bash
# Check pg_hba.conf allows local connections
sudo nano /etc/postgresql/15/main/pg_hba.conf  # Ubuntu
sudo nano /var/lib/pgsql/data/pg_hba.conf      # Fedora

# Look for line:
# local   all   all   peer

# Change to:
# local   all   all   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**Problem:** Database doesn't exist

```bash
# Create database manually
sudo -u postgres createdb event_manager
sudo -u postgres createuser event_manager

# Or use psql
sudo -u postgres psql
CREATE DATABASE event_manager;
CREATE USER event_manager WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE event_manager TO event_manager;
```

### General Debugging

**Enable detailed logging:**

```env
LOG_LEVEL=debug
```

**Check application health:**

```bash
curl http://localhost:3000/api/health | jq
```

**Test each service individually:**

```bash
# Redis
redis-cli ping

# ClamAV
echo "test" | clamdscan -

# PostgreSQL
psql -U event_manager -d event_manager -c "SELECT version();"
```

---

## Docker vs Native Comparison

| Aspect | Docker | Native |
|--------|--------|--------|
| **Installation** | Single `docker-compose up` | Platform-specific packages |
| **Portability** | Identical across platforms | Different per OS |
| **Resource Usage** | Higher (containers + services) | Lower (services only) |
| **Performance** | Slight overhead | Native performance |
| **Isolation** | Complete isolation | Shared system resources |
| **Updates** | Rebuild images | System package manager |
| **Development** | Consistent environment | Mirrors production better |
| **Production** | Excellent for microservices | Good for single server |
| **Debugging** | More complex | Direct access to logs |
| **Disk Space** | Larger (images + containers) | Smaller (binaries only) |

### When to Use Docker

✅ Team environment (consistent across developers)
✅ Microservices architecture
✅ CI/CD pipelines
✅ Quick setup/teardown needed
✅ Multiple isolated environments on same machine

### When to Use Native

✅ Production on dedicated servers
✅ Docker not available/allowed
✅ Maximum performance needed
✅ Direct control over configuration
✅ Existing infrastructure with these services
✅ Learning/understanding the services

---

## Next Steps

After setting up services:

1. **Verify Configuration**
   ```bash
   npm run health-check  # If available
   ```

2. **Run Database Migrations**
   ```bash
   npm run migrate
   ```

3. **Seed Database (optional)**
   ```bash
   npm run seed
   ```

4. **Start Application**
   ```bash
   npm start
   ```

5. **Monitor Services**
   - Check application logs for connection messages
   - Verify Redis cache is working
   - Test file upload with virus scanning
   - Confirm database queries are fast

---

## Additional Resources

### Redis
- Documentation: https://redis.io/docs/
- Configuration: https://redis.io/docs/manual/config/
- Security: https://redis.io/docs/manual/security/

### ClamAV
- Documentation: https://docs.clamav.net/
- Configuration: https://docs.clamav.net/manual/Usage/Configuration.html
- Virus DB: https://www.clamav.net/documents/private-local-mirrors

### PostgreSQL
- Documentation: https://www.postgresql.org/docs/
- Configuration: https://www.postgresql.org/docs/current/runtime-config.html
- Performance: https://wiki.postgresql.org/wiki/Performance_Optimization

---

## Support

If you encounter issues not covered in this guide:

1. Check the [main README.md](../README.md)
2. Review application logs
3. Test services individually
4. Check service-specific logs
5. Consult official documentation

For application-specific issues, check the [Troubleshooting Guide](./TROUBLESHOOTING.md).
