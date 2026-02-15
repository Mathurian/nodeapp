# 📄 PHASE 1: CRITICAL FIXES & SECURITY
**Duration:** Days 1-7
**Focus:** Security vulnerabilities, secrets management, authentication
**Risk Level:** HIGH - Production security issues
**Dependencies:** None (start immediately)

---

## 🎯 PHASE OBJECTIVES

1. ✅ Eliminate all exposed secrets from repository
2. ✅ Move authentication from localStorage to httpOnly cookies
3. ✅ Implement Content Security Policy
4. ✅ Enforce password complexity requirements
5. ✅ Add XSS protection with DOMPurify
6. ✅ Harden file upload security
7. ✅ Update CORS configuration

---

## 📋 DAY 1: SECURITY EMERGENCY

### ⚠️ Task 1.1: Rotate All Secrets (2 hours)

**Priority:** P0 - CRITICAL
**Must complete before any other work**

#### Step 1: Generate New Secrets

```bash
# Generate JWT secret (64 bytes)
openssl rand -base64 64

# Generate Session secret (64 bytes)
openssl rand -base64 64

# Generate CSRF secret (32 bytes)
openssl rand -base64 32

# Generate new database password (32 characters, alphanumeric + special)
openssl rand -base64 32 | tr -dc 'a-zA-Z0-9!@#$%^&*' | head -c 32
```

#### Step 2: Create New .env File

**File:** `.env` (local only, never commit)

```bash
# ========================================
# SECURITY NOTICE
# ========================================
# This file contains sensitive credentials
# NEVER commit this file to git
# Rotated on: 2025-11-17
# ========================================

# Environment
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL="postgresql://event_manager:NEW_PASSWORD_HERE@localhost:5432/event_manager?schema=public"

# JWT Configuration (NEW - Rotated 2025-11-17)
JWT_SECRET=YOUR_NEW_JWT_SECRET_HERE
JWT_EXPIRES_IN=24h

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Session Configuration (NEW - Rotated 2025-11-17)
SESSION_SECRET=YOUR_NEW_SESSION_SECRET_HERE
SESSION_TIMEOUT=1800000

# CSRF Protection (NEW - Rotated 2025-11-17)
CSRF_SECRET=YOUR_NEW_CSRF_SECRET_HERE
CSRF_ENABLED=true

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/event-manager.log

# Email Configuration (if using)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@eventmanager.com

# CORS Configuration
ALLOWED_ORIGINS=https://conmgr.com,https://www.conmgr.com

# ClamAV Configuration
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
CLAMAV_ENABLED=true
CLAMAV_FALLBACK_BEHAVIOR=reject
```

#### Step 3: Update Database Password

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Change password for event_manager user
ALTER USER event_manager WITH PASSWORD 'YOUR_NEW_PASSWORD_HERE';

-- Verify connection
\q

-- Test connection with new password
psql -U event_manager -d event_manager -W
```

#### Step 4: Invalidate All User Sessions

**File:** `scripts/invalidate-sessions.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function invalidateAllSessions() {
  console.log('🔒 Invalidating all user sessions...');

  const result = await prisma.user.updateMany({
    data: {
      sessionVersion: {
        increment: 1
      }
    }
  });

  console.log(`✅ Invalidated sessions for ${result.count} users`);

  await prisma.$disconnect();
}

invalidateAllSessions()
  .catch(console.error)
  .finally(() => process.exit());
```

Run:
```bash
npx ts-node scripts/invalidate-sessions.ts
```

#### Step 5: Notify Users

**File:** `scripts/notify-password-rotation.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../src/services/EmailService';

const prisma = new PrismaClient();
const emailService = new EmailService();

async function notifyUsers() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { email: true, name: true }
  });

  for (const user of users) {
    await emailService.send({
      to: user.email,
      subject: 'Security Update - Please Log In Again',
      html: `
        <h2>Important Security Update</h2>
        <p>Hello ${user.name},</p>
        <p>We've updated our security systems to better protect your account.</p>
        <p>You'll need to log in again when you next visit the application.</p>
        <p>If you have any questions, please contact support.</p>
        <p>Thank you,<br>Event Manager Team</p>
      `
    });
  }

  console.log(`✅ Notified ${users.length} users`);
  await prisma.$disconnect();
}

notifyUsers().catch(console.error);
```

#### Verification Checklist

- [ ] New secrets generated and saved securely
- [ ] `.env` file updated with all new secrets
- [ ] Database password changed and tested
- [ ] All user sessions invalidated
- [ ] Users notified via email
- [ ] Application restarts successfully with new secrets
- [ ] Can log in with new authentication flow

---

### ⚠️ Task 1.2: Remove .env from Git (30 minutes)

#### Step 1: Update .gitignore

**File:** `.gitignore`

```bash
# Environment variables
.env
.env.local
.env.*.local
.env.production
.env.development
*.env
!.env.example

# Sensitive files
secrets/
*.key
*.pem
credentials.json

# Logs
logs/
*.log
npm-debug.log*

# Dependencies
node_modules/
frontend/node_modules/

# Build outputs
dist/
build/
coverage/
frontend/dist/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
tmp/
temp/
*.tmp
```

#### Step 2: Remove .env from Git

```bash
# Remove from staging
git rm --cached .env

# Commit the removal
git add .gitignore
git commit -m "security: Remove .env from repository and update .gitignore"
```

#### Step 3: Clean Git History (DESTRUCTIVE - Use with caution)

**⚠️ WARNING:** This rewrites git history. Only do this on a feature branch.

```bash
# Create backup branch first
git branch backup-before-filter-$(date +%Y%m%d)

# Remove .env from entire history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env .env.local .env.production' \
  --prune-empty --tag-name-filter cat -- --all

# Cleanup
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push to remote (ONLY if on feature branch)
git push origin --force --all
```

**Better Alternative:** Use BFG Repo-Cleaner

```bash
# Install BFG
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Create backup
git clone --mirror YOUR_REPO_URL repo-backup.git

# Remove .env files
bfg --delete-files .env
bfg --delete-files '*.env'

# Clean up
cd YOUR_REPO
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

#### Verification Checklist

- [ ] `.env` not in `git status`
- [ ] `.env` in `.gitignore`
- [ ] `.env.example` still exists and committed
- [ ] Git history clean (no .env references)
- [ ] Backup branch created

---

### 🔒 Task 1.3: Move Tokens to HttpOnly Cookies (4 hours)

See complete implementation in separate section below.

---

## 📋 DAYS 2-3: AUTHENTICATION MIGRATION

### Task 1.3: Implement HttpOnly Cookie Authentication

#### Backend Changes

**File:** `src/controllers/authController.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { jwtSecret, jwtExpiresIn } from '../config';

const prisma = new PrismaClient();

/**
 * Login endpoint - Sets httpOnly cookie instead of returning token
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: req.tenantId!,
          email
        }
      },
      include: {
        judge: true,
        contestant: true,
      }
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Generate JWT
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      sessionVersion: user.sessionVersion || 0,
    };

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: jwtExpiresIn
    });

    // Set httpOnly cookie
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Return user data (without password and token)
    const { password: _, ...userData } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userData }
    });

  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};
```

**File:** `src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { jwtSecret } from '../config';
import { userCache } from '../utils/cache';
import { createRequestLogger } from '../utils/logger';

const prisma = new PrismaClient();

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const log = createRequestLogger(req, 'auth');

  try {
    // Get token from httpOnly cookie
    const token = req.cookies?.access_token;

    if (!token) {
      log.warn('Authentication failed: No token provided');
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Verify JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      log.warn('Authentication failed: Invalid token');
      res.clearCookie('access_token');
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    const { userId, tenantId, sessionVersion } = decoded;

    // Check cache first
    let user = userCache.get(userId);

    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          judge: true,
          contestant: true,
        }
      });

      if (user) {
        userCache.set(userId, user);
      }
    }

    // Validate user
    if (!user || !user.isActive) {
      res.clearCookie('access_token');
      res.status(401).json({
        success: false,
        error: 'Invalid user'
      });
      return;
    }

    // Check session version
    if ((user.sessionVersion || 0) !== sessionVersion) {
      res.clearCookie('access_token');
      res.status(401).json({
        success: false,
        error: 'Session expired'
      });
      return;
    }

    // Attach user to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.sessionVersion || 0,
    };
    req.tenantId = user.tenantId;

    next();

  } catch (error) {
    log.error('Authentication error', { error: (error as Error).message });
    next(error);
  }
};
```

#### Frontend Changes

**File:** `frontend/src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await api.get('/auth/profile');
        setUser(response.data.data);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const csrfResponse = await api.get('/csrf-token');
      const csrfToken = csrfResponse.data.csrfToken;

      const response = await api.post('/auth/login',
        { email, password },
        { headers: { 'X-CSRF-Token': csrfToken } }
      );

      setUser(response.data.data.user);
      navigate('/dashboard');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**File:** `frontend/src/services/api.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  withCredentials: true, // CRITICAL: Always send cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export { api };
export default api;
```

---

## 📋 DAYS 4-5: SECURITY HARDENING

### Task 1.4: Content Security Policy

**File:** `src/config/express.config.ts`

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", ...allowedOrigins],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### Task 1.5: Password Policy Enforcement

**File:** `src/middleware/passwordValidation.ts`

```typescript
import { z } from 'zod';

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character');

export const validatePassword = (password: string) => {
  try {
    passwordSchema.parse(password);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, errors: error.errors.map(e => e.message) };
    }
    return { valid: false, errors: ['Invalid password'] };
  }
};
```

### Task 1.6: XSS Protection

**Frontend:**

```bash
cd frontend
npm install dompurify @types/dompurify
```

**File:** `frontend/src/utils/sanitize.ts`

```typescript
import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
};
```

---

## ✅ PHASE 1 COMPLETION CHECKLIST

- [ ] All secrets rotated
- [ ] .env removed from git
- [ ] HttpOnly cookies implemented
- [ ] Frontend localStorage cleared of tokens
- [ ] CSP headers configured
- [ ] Password policy enforced
- [ ] DOMPurify installed and configured
- [ ] All tests pass
- [ ] Deployed to staging
- [ ] Security scan passed
- [ ] Documentation updated

---

**Next:** [Phase 2: Test Infrastructure Recovery](./phase-2-testing.md)
