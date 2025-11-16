# Security Guide

Comprehensive security documentation for Event Manager covering authentication, authorization, and security best practices.

## Table of Contents

- [Security Overview](#security-overview)
- [Authentication](#authentication)
- [Authorization & RBAC](#authorization--rbac)
- [Security Middleware](#security-middleware)
- [Input Validation](#input-validation)
- [CSRF Protection](#csrf-protection)
- [Rate Limiting](#rate-limiting)
- [File Upload Security](#file-upload-security)
- [Session Management](#session-management)
- [Password Security](#password-security)
- [Audit Logging](#audit-logging)
- [Security Headers](#security-headers)
- [Best Practices](#best-practices)

## Security Overview

Event Manager implements multiple layers of security:

1. **Authentication**: JWT-based with MFA support
2. **Authorization**: Role-based access control (RBAC)
3. **Input Validation**: Server-side validation
4. **CSRF Protection**: Token-based protection
5. **Rate Limiting**: DDoS prevention
6. **Audit Logging**: Complete action tracking
7. **File Security**: Virus scanning, type validation
8. **Session Management**: Session versioning

## Authentication

### JWT (JSON Web Tokens)

**Token Structure**:
```json
{
  "userId": "clx123...",
  "email": "user@example.com",
  "role": "ADMIN",
  "tenantId": "tenant123",
  "sessionVersion": 1,
  "iat": 1699999999,
  "exp": 1700003599
}
```

**Token Lifetime**: 1 hour (configurable via JWT_EXPIRES_IN)

**Token Storage**:
- Frontend: In-memory only (AuthContext)
- Never in localStorage or cookies
- Cleared on logout/tab close

### Multi-Factor Authentication (MFA)

**Supported Methods**:
- TOTP (Time-based One-Time Password)
- Backup codes (recovery)

**MFA Flow**:
1. User enables MFA in settings
2. QR code generated with secret
3. User scans with authenticator app
4. Verification code required at login
5. Backup codes provided for recovery

**Implementation** (`src/services/AuthService.ts`):
```typescript
async enableMFA(userId: string) {
  const secret = speakeasy.generateSecret();
  const qrCode = await qrcode.toDataURL(secret.otpauth_url);
  // Save secret, return QR code
}

async verifyMFA(userId: string, token: string) {
  return speakeasy.totp.verify({
    secret: userMfaSecret,
    token,
    window: 2
  });
}
```

## Authorization & RBAC

### Role Hierarchy

```
ADMIN (full access)
  ├── ORGANIZER (event management)
  ├── BOARD (approval authority)
  ├── AUDITOR (audit access)
  ├── TALLY_MASTER (verification)
  ├── JUDGE (scoring)
  ├── EMCEE (scripts)
  └── CONTESTANT (view only)
```

### Permission Matrix

| Action | ADMIN | ORGANIZER | BOARD | JUDGE | TALLY | AUDITOR | EMCEE | CONTESTANT |
|--------|-------|-----------|-------|-------|-------|---------|-------|------------|
| Manage Events | ✓ | ✓ | - | - | - | - | - | - |
| Score Entry | ✓ | ✓ | - | ✓ | - | - | - | - |
| Certify Scores | ✓ | ✓ | - | ✓ | - | - | - | - |
| Verify Totals | ✓ | ✓ | - | - | ✓ | - | - | - |
| Audit Scores | ✓ | ✓ | ✓ | - | - | ✓ | - | - |
| Final Approval | ✓ | ✓ | ✓ | - | - | - | - | - |
| View Results | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓* |

*After release

### RBAC Implementation

**Middleware** (`src/middleware/auth.ts`):
```typescript
const requireRole = (roles: string[]) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // ADMIN always has access
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

**Usage in Routes**:
```typescript
router.post('/events', 
  authenticateToken, 
  requireRole(['ADMIN', 'ORGANIZER']),
  createEvent
);
```

## Security Middleware

### Middleware Stack

Applied in order:

1. **CORS** - Cross-origin control
2. **Helmet** - Security headers
3. **Compression** - Response compression
4. **Rate Limiting** - DDoS protection
5. **CSRF** - CSRF token validation
6. **Authentication** - JWT validation
7. **Authorization** - Role checking

### Helmet Configuration

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### CORS Configuration

```typescript
cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
})
```

## Input Validation

### Express Validator

**Example Validation**:
```typescript
const validateEvent = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 255 }).withMessage('Name too long'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),
  body('startDate')
    .isISO8601().withMessage('Invalid date format')
    .custom((value, { req }) => {
      if (new Date(value) < new Date()) {
        throw new Error('Start date must be in the future');
      }
      return true;
    }),
];
```

### Validation Middleware

```typescript
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};
```

### Sanitization

```typescript
// Remove HTML tags
body('description').trim().escape()

// Normalize email
body('email').normalizeEmail()

// Remove whitespace
body('name').trim()
```

## CSRF Protection

### Token Generation

```typescript
// Get CSRF token (public endpoint)
GET /api/csrf-token

Response:
{
  "csrfToken": "random-token-here"
}
```

### Token Validation

**Required for**:
- POST, PUT, PATCH, DELETE requests
- Mutating operations
- Not required in test environment

**Header**:
```http
X-CSRF-Token: <token>
```

**Implementation**:
```typescript
app.use('/api', (req, res, next) => {
  const method = req.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return csrfProtection(req, res, next);
  }
  next();
});
```

## Rate Limiting

### Configuration

**Auth Endpoints** (stricter):
```typescript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
```

**General API** (permissive):
```typescript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});
```

### Redis-based Rate Limiting

When Redis is available:
```typescript
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:',
  }),
  // ... other options
});
```

## File Upload Security

### Virus Scanning

**ClamAV Integration**:
```typescript
const scanFile = async (filePath: string) => {
  if (!clamavEnabled) {
    return { isInfected: false };
  }
  
  const { isInfected, viruses } = await clamscan.scanFile(filePath);
  
  if (isInfected) {
    await fs.unlink(filePath);
    throw new Error(`Virus detected: ${viruses.join(', ')}`);
  }
  
  return { isInfected: false };
};
```

### File Type Validation

```typescript
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/csv',
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};
```

### File Size Limits

```typescript
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  },
  fileFilter: fileFilter,
});
```

## Session Management

### Session Versioning

**Purpose**: Invalidate all tokens on security events

**Events that increment session version**:
- Password change
- MFA enable/disable
- Role change
- Manual logout all sessions
- Security breach detection

**Implementation**:
```typescript
// Increment on password change
await prisma.user.update({
  where: { id: userId },
  data: {
    password: hashedPassword,
    sessionVersion: { increment: 1 },
  },
});

// JWT validation checks session version
const tokenSessionVersion = decoded.sessionVersion || 1;
const dbSessionVersion = user.sessionVersion || 1;

if (tokenSessionVersion !== dbSessionVersion) {
  return res.status(401).json({
    error: 'Session expired',
    code: 'SESSION_VERSION_MISMATCH'
  });
}
```

## Password Security

### Password Requirements

**Enforced via PasswordPolicy**:
- Minimum length: 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Password Hashing

**Bcrypt with configurable rounds**:
```typescript
const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;

const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, bcryptRounds);
};

const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};
```

### Password Validation Middleware

```typescript
const validatePassword = (req, res, next) => {
  const { password } = req.body;
  const policy = await getPasswordPolicy();
  
  if (password.length < policy.minLength) {
    return res.status(400).json({ error: 'Password too short' });
  }
  // Additional checks...
  
  next();
};
```

## Audit Logging

### Activity Logging

**What's Logged**:
- User actions (create, update, delete)
- Authentication events (login, logout, failed attempts)
- Authorization failures
- Certification actions
- Score modifications
- System configuration changes

**Log Structure**:
```typescript
{
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  changes: JSON,
  ipAddress: string,
  userAgent: string,
  timestamp: DateTime,
}
```

### Comprehensive Audit Trail

**AuditLog Model**:
- Tracks all mutations
- Before/after state
- User and timestamp
- IP and user agent
- Searchable and exportable

## Security Headers

### Headers Set by Helmet

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: no-referrer
```

### Custom Headers

```typescript
app.use((req, res, next) => {
  res.setHeader('X-API-Version', '1.0');
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

## Best Practices

### Secure Coding

1. **Never Trust User Input**: Validate and sanitize everything
2. **Principle of Least Privilege**: Minimum required permissions
3. **Defense in Depth**: Multiple security layers
4. **Secure by Default**: Opt-in for less secure options
5. **Fail Securely**: Return minimal error information

### Secret Management

```bash
# Use environment variables for secrets
JWT_SECRET=generated-secret
DATABASE_URL=postgresql://...

# Never commit secrets to version control
# Use .env.example for templates
# Use secrets management (AWS Secrets Manager, etc.) in production
```

### Regular Security Tasks

- [ ] Update dependencies monthly
- [ ] Review audit logs weekly
- [ ] Rotate JWT secrets quarterly
- [ ] Review user permissions monthly
- [ ] Test backup restoration quarterly
- [ ] Security vulnerability scan monthly

---

**Next**: [Deployment Guide](08-DEPLOYMENT.md)
