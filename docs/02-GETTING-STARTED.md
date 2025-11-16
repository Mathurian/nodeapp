# Getting Started Guide

This guide will help you install, configure, and run the Event Manager application locally or in production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running Locally](#running-locally)
- [Building for Production](#building-for-production)
- [Creating First Admin User](#creating-first-admin-user)
- [Initial Setup](#initial-setup)
- [Docker Setup (Alternative)](#docker-setup-alternative)

## Prerequisites

### System Requirements

**Minimum Requirements**:
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows with WSL2
- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 12.0 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB available space

**Optional but Recommended**:
- **Redis**: Latest version (for caching)
- **ClamAV**: Latest version (for virus scanning)
- **Nginx**: For reverse proxy in production

### Software Prerequisites

1. **Node.js & npm**:
   ```bash
   # Check versions
   node --version  # Should be >= 18.0.0
   npm --version   # Should be >= 9.0.0

   # Install if needed (Ubuntu/Debian)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **PostgreSQL**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib

   # macOS
   brew install postgresql@14

   # Start PostgreSQL
   sudo systemctl start postgresql
   ```

3. **Git**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install git

   # macOS
   brew install git
   ```

4. **Redis** (Optional but recommended):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server

   # macOS
   brew install redis

   # Start Redis
   sudo systemctl start redis
   ```

## Installation

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd event-manager

# Or if you have a zip file
unzip event-manager.zip
cd event-manager
```

### Step 2: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 3: Generate Prisma Client

```bash
# Generate Prisma client from schema
npx prisma generate
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

### Required Environment Variables

Edit `.env` with your configuration:

```bash
# Environment
NODE_ENV=development  # or 'production'
PORT=3000

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/event_manager?schema=public"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=1h

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-min-32-chars

# CSRF Protection
CSRF_SECRET=your-csrf-secret-key-min-32-chars

# Application URLs
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Redis (Optional)
REDIS_URL=redis://localhost:6379
REDIS_ENABLE=true
REDIS_FALLBACK_TO_MEMORY=true

# Email Configuration (Optional)
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@eventmanager.com

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/event-manager.log

# ClamAV (Optional)
CLAMAV_ENABLED=false  # Set to true if you have ClamAV installed
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
CLAMAV_FALLBACK_BEHAVIOR=allow  # or 'reject'

# API Documentation
ENABLE_API_DOCS=true  # Set to false to disable Swagger UI
```

### Generating Secrets

You can generate secure secrets using Node.js:

```bash
# Generate a random 32-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Or use the built-in secrets CLI:

```bash
npm run secrets generate JWT_SECRET
npm run secrets generate SESSION_SECRET
npm run secrets generate CSRF_SECRET
```

### Frontend Environment Variables

Create `frontend/.env`:

```bash
# API URL (backend)
VITE_API_URL=http://localhost:3000

# WebSocket URL
VITE_WS_URL=http://localhost:3000

# App Configuration
VITE_APP_NAME="Event Manager"
VITE_APP_VERSION=1.0.0
```

## Database Setup

### Step 1: Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE event_manager;
CREATE USER event_manager WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE event_manager TO event_manager;
\q
```

### Step 2: Run Migrations

```bash
# Apply database migrations
npx prisma migrate deploy

# Or for development (creates migration history)
npx prisma migrate dev
```

### Step 3: Verify Database

```bash
# Open Prisma Studio to inspect database
npx prisma studio
# Access at http://localhost:5555
```

## Running Locally

### Development Mode

**Option 1: Run Backend and Frontend Separately**

Terminal 1 (Backend):
```bash
# Run backend in development mode
npm run dev

# Backend will start on http://localhost:3000
# API available at http://localhost:3000/api
# Swagger docs at http://localhost:3000/api-docs
```

Terminal 2 (Frontend):
```bash
# Run frontend development server
cd frontend
npm run dev

# Frontend will start on http://localhost:5173
```

**Option 2: Build Frontend and Serve from Backend**

```bash
# Build frontend
cd frontend
npm run build
cd ..

# Run backend (serves built frontend)
npm run dev
# Access at http://localhost:3000
```

### Production Mode

```bash
# Build backend TypeScript
npm run build

# Build frontend
cd frontend
npm run build
cd ..

# Start production server
npm start
# Access at http://localhost:3000
```

### Verify Installation

1. **Check Health Endpoint**:
   ```bash
   curl http://localhost:3000/health
   ```

   Expected response:
   ```json
   {
     "status": "OK",
     "timestamp": "2024-11-14T...",
     "uptime": 123.45,
     "database": "connected"
   }
   ```

2. **Check API Documentation**:
   - Open http://localhost:3000/api-docs
   - You should see Swagger UI with all API endpoints

3. **Check Frontend** (if running separately):
   - Open http://localhost:5173 or http://localhost:3000
   - You should see the login page

## Creating First Admin User

### Method 1: Using Prisma Studio

```bash
# Open Prisma Studio
npx prisma studio

# Navigate to 'User' model
# Click 'Add record'
# Fill in:
#   - name: "Admin User"
#   - email: "admin@example.com"
#   - password: (use bcrypt hash - see below)
#   - role: "ADMIN"
#   - tenantId: (create a tenant first)
#   - isActive: true
```

### Method 2: Using SQL

```bash
# Connect to database
psql -U event_manager -d event_manager

# First, create a tenant
INSERT INTO tenants (id, name, slug, "isActive", "createdAt", "updatedAt")
VALUES ('tenant1', 'Default Organization', 'default-org', true, NOW(), NOW());

# Create admin user (password hash for 'admin123')
INSERT INTO users (id, "tenantId", name, email, password, role, "isActive", "createdAt", "updatedAt")
VALUES (
  'admin1',
  'tenant1',
  'System Administrator',
  'admin@example.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lewu.dUjO2iIBJYlC',
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

### Method 3: Using API (After Server is Running)

```bash
# Create tenant
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Default Organization",
    "slug": "default-org"
  }'

# Note the returned tenant ID, then create admin user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "TENANT_ID_FROM_ABOVE",
    "name": "System Administrator",
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "role": "ADMIN"
  }'
```

### Generate Password Hash

If you need to generate a password hash:

```bash
# Using Node.js
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your-password', 12, (err, hash) => console.log(hash));"
```

## Initial Setup

After logging in as admin, complete initial setup:

### 1. Configure System Settings

- Navigate to **Admin → Settings**
- Configure:
  - Email settings (SMTP)
  - Security settings (password policy, session timeout)
  - Backup settings
  - Theme settings

### 2. Create User Roles

- Navigate to **Admin → Users**
- Create users for different roles:
  - ORGANIZER - Event management
  - JUDGE - Score entry
  - TALLY_MASTER - Score verification
  - AUDITOR - Score auditing
  - BOARD - Final approval
  - EMCEE - Script access
  - CONTESTANT - Participant view

### 3. Create Your First Event

- Navigate to **Events**
- Click **Create Event**
- Fill in event details:
  - Name
  - Description
  - Start/End dates
  - Location

### 4. Set Up Contests and Categories

- Open your event
- Create contests
- Add categories with scoring criteria
- Assign judges to categories

### 5. Import or Create Contestants

- Navigate to **Contestants**
- Import from CSV or create manually
- Assign to categories

### 6. Test Scoring Workflow

- Log in as a judge
- Enter scores for contestants
- Certify scores
- Test certification workflow

## Docker Setup (Alternative)

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: event_manager
      POSTGRES_USER: event_manager
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:latest
    ports:
      - "6379:6379"

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://event_manager:secure_password@postgres:5432/event_manager
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-jwt-secret
      SESSION_SECRET: your-session-secret
    depends_on:
      - postgres
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

volumes:
  postgres_data:
```

### Build and Run

```bash
# Build and start all services
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

## Common Commands

### Backend Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run dev:watch        # Start with file watching
npm run type-check       # Check TypeScript types
npm run build            # Build TypeScript
npm start                # Start production server

# Database
npm run migrate          # Run database migrations
npm run seed             # Seed database with test data

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run end-to-end tests
```

### Frontend Commands

```bash
cd frontend

# Development
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint code
```

### Prisma Commands

```bash
npx prisma studio        # Open Prisma Studio
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Create and apply migration
npx prisma migrate deploy # Apply migrations (production)
npx prisma db push       # Push schema changes (dev only)
npx prisma db pull       # Pull schema from database
```

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql -U event_manager -d event_manager -h localhost

# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Permission Errors

```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Fix upload directory
mkdir -p uploads
chmod 755 uploads
```

### Redis Connection Issues

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis
sudo systemctl start redis

# Use memory fallback if Redis is not available
# Set in .env:
REDIS_ENABLE=false
```

## Next Steps

- **[Features Guide](03-FEATURES.md)** - Learn about all features
- **[API Reference](04-API-REFERENCE.md)** - Explore the API
- **[Development Guide](09-DEVELOPMENT.md)** - Start developing
- **[Deployment Guide](08-DEPLOYMENT.md)** - Deploy to production

---

**Need Help?** See the [Troubleshooting Guide](10-TROUBLESHOOTING.md) or check the in-app help system.
