# Event Manager - 5-Minute Quick Start

Get Event Manager up and running in 5 minutes or less.

---

## Prerequisites Check

Before you begin, ensure you have:

- [ ] **Operating System:** Linux, macOS, or Windows with WSL2
- [ ] **Git:** Installed and configured
- [ ] **Node.js:** Version 18 or higher (run `node --version`)
- [ ] **PostgreSQL:** Version 12+ (or Docker for automated setup)

**Don't have these?** Our setup script can install them automatically. Continue below.

---

## Option 1: Automated Setup (Recommended)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd event-manager
```

### Step 2: Run Setup Script

```bash
# Make script executable
chmod +x setup.sh

# Run automated setup
./setup.sh --non-interactive
```

This will:
- ✅ Install all prerequisites (Node.js, PostgreSQL, etc.)
- ✅ Configure environment variables
- ✅ Set up the database
- ✅ Create default users
- ✅ Build frontend
- ✅ Start the application

### Step 3: Access the Application

Open your browser to:
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000

### Step 4: Login

Use any of these default accounts (password: `password123`):

| Role | Email |
|------|-------|
| **ADMIN** | admin@eventmanager.com |
| **ORGANIZER** | organizer@eventmanager.com |
| **JUDGE** | judge@eventmanager.com |

**Done!** You're ready to use Event Manager.

---

## Option 2: Docker Setup (Even Faster)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd event-manager
```

### Step 2: Start with Docker Compose

```bash
docker-compose up -d
```

### Step 3: Access the Application

Open your browser to:
- **Frontend:** http://localhost:80
- **Backend API:** http://localhost:3000

### Step 4: Login

Same default credentials as above (password: `password123`).

**Done!** Event Manager is running in Docker containers.

---

## Next Steps

Now that Event Manager is running:

### 1. Explore the Features
- Create your first event
- Add contestants
- Set up scoring categories
- Assign judges
- Start scoring

### 2. Customize Settings
- Login as ADMIN
- Go to Settings
- Configure:
  - App name and branding
  - Theme colors
  - Email settings
  - User field visibility

### 3. Read the Documentation
- [Features Guide](./02-features/README.md)
- [User Management](./03-administration/user-management.md)
- [Quick Reference](./10-reference/quick-reference.md)

### 4. Set Up for Production
- [Production Deployment](./05-deployment/production-deployment.md)
- [Security Best Practices](./08-security/security-best-practices.md)
- [Monitoring Setup](./03-administration/monitoring-docker.md)

---

## Common Issues

### Port Already in Use

**Problem:** Port 3000 or 3001 is already in use.

**Solution:**
```bash
# Change ports in .env file
PORT=4000                    # Backend port
VITE_PORT=4001              # Frontend port
```

### Database Connection Failed

**Problem:** Cannot connect to PostgreSQL.

**Solution:**
```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql

# Or restart setup
./setup.sh --auto-setup-db
```

### npm Permission Errors

**Problem:** EACCES permission errors during npm install.

**Solution:**
```bash
# Fix permissions
sudo chown -R $USER:$USER .
npm install
```

---

## Getting Help

- **Full Documentation:** [Documentation Index](./INDEX.md)
- **Detailed Setup:** [Installation Guide](./00-getting-started/quick-start.md)
- **Troubleshooting:** [Deployment Troubleshooting](./05-deployment/troubleshooting.md)
- **Quick Reference:** [Command Reference](./10-reference/quick-reference.md)

---

## What's Next?

### For Administrators
1. [User Management Guide](./03-administration/user-management.md)
2. [System Settings](./03-administration/system-settings.md)
3. [Backup & Restore](./03-administration/backup-restore.md)

### For Developers
1. [Development Guide](./04-development/getting-started.md)
2. [Coding Standards](./04-development/coding-standards.md)
3. [API Documentation](./07-api/rest-api.md)

### For Organizers
1. [Event Management](./02-features/event-management.md)
2. [Scoring System](./02-features/scoring-system.md)
3. [Certification Workflow](./02-features/certification-workflow.md)

---

**Congratulations!** Event Manager is now running. Start managing your contests! 🎉
