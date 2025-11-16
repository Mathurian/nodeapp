# Security Model

## Overview

The Event Manager implements a multi-layered security architecture following defense-in-depth principles. Security is enforced at network, application, data, and file levels.

## Security Layers

```
┌────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                                  │
│ - HTTPS/TLS encryption                                     │
│ - CORS policy enforcement                                  │
│ - Rate limiting                                            │
│ - IP whitelisting (optional)                               │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Layer 2: Application Security                              │
│ - JWT authentication                                       │
│ - CSRF protection                                          │
│ - Role-based authorization                                 │
│ - Input validation                                         │
│ - Security headers (Helmet)                                │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Layer 3: Data Security                                     │
│ - Password hashing (bcrypt)                                │
│ - Encrypted sensitive data                                 │
│ - SQL injection prevention (Prisma)                        │
│ - XSS prevention (React escaping)                          │
│ - Audit logging                                            │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ Layer 4: File Security                                     │
│ - Virus scanning (ClamAV)                                  │
│ - File type validation                                     │
│ - File size limits                                         │
│ - Secure file storage                                      │
└────────────────────────────────────────────────────────────┘
```

## Authentication System

### JWT-Based Authentication

**Token Generation**:
```typescript
const token = jwt.sign(
  {
    userId: user.id,
    role: user.role,
    sessionVersion: user.sessionVersion
  },
  process.env.JWT_SECRET!,
  {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    issuer: 'event-manager',
    audience: 'event-manager-app'
  }
)
```

**Token Validation**:
- Signature verification
- Expiration check
- Session version validation (enables token revocation)
- Issuer/audience validation

**Token Storage**:
- Frontend: `localStorage` with secure flag
- Backend: Stateless (no server-side storage)

**Token Refresh**:
- Short-lived tokens (1 hour default)
- Automatic refresh on activity
- Silent refresh in background

### Password Security

**Hashing Algorithm**: bcrypt with configurable rounds

```typescript
const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS)
```

**Password Policy** (configurable):
- Minimum length: 8 characters
- Require uppercase: Yes
- Require lowercase: Yes
- Require numbers: Yes
- Require special characters: Yes
- Password expiry: 90 days (optional)
- Password history: Prevent reuse of last 5 passwords

**Password Strength Validation**:
- Client-side: Real-time strength meter
- Server-side: Enforced validation

**Account Lockout**:
- Max failed attempts: 5 (configurable)
- Lockout duration: 30 minutes
- Lockout notification: Email alert

## Authorization System

### Role-Based Access Control (RBAC)

**User Roles**:
1. **ADMIN** - Full system access
2. **ORGANIZER** - Event management
3. **BOARD** - Final approval authority
4. **JUDGE** - Score submission
5. **CONTESTANT** - View own scores
6. **EMCEE** - Script management
7. **TALLY_MASTER** - Score aggregation
8. **AUDITOR** - Verification and audit

**Permission Matrix**:

| Feature                | ADMIN | ORGANIZER | BOARD | JUDGE | TALLY | AUDITOR | CONTESTANT |
|------------------------|-------|-----------|-------|-------|-------|---------|------------|
| User Management        | ✓     | ✓         | ✗     | ✗     | ✗     | ✗       | ✗          |
| Event Management       | ✓     | ✓         | ✗     | ✗     | ✗     | ✗       | ✗          |
| Contest Management     | ✓     | ✓         | ✗     | ✗     | ✗     | ✗       | ✗          |
| Category Management    | ✓     | ✓         | ✗     | ✗     | ✗     | ✗       | ✗          |
| Score Submission       | ✓     | ✓         | ✗     | ✓     | ✗     | ✗       | ✗          |
| Score Viewing          | ✓     | ✓         | ✓     | ✓     | ✓     | ✓       | Own Only   |
| Judge Certification    | ✓     | ✓         | ✗     | ✓     | ✗     | ✗       | ✗          |
| Tally Certification    | ✓     | ✓         | ✗     | ✗     | ✓     | ✗       | ✗          |
| Auditor Certification  | ✓     | ✓         | ✗     | ✗     | ✗     | ✓       | ✗          |
| Board Approval         | ✓     | ✓         | ✓     | ✗     | ✗     | ✗       | ✗          |
| System Settings        | ✓     | ✗         | ✗     | ✗     | ✗     | ✗       | ✗          |
| Backup/Restore         | ✓     | ✗         | ✗     | ✗     | ✗     | ✗       | ✗          |
| Audit Logs             | ✓     | ✓         | ✗     | ✗     | ✗     | ✓       | ✗          |

### Authorization Middleware

```typescript
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    next()
  }
}

// Usage
router.post('/users', requireRole('ADMIN'), createUser)
```

### Resource-Level Authorization

Beyond role-based access, resource-level checks ensure users can only access their own data:

```typescript
// Judges can only see their assigned categories
if (req.user.role === 'JUDGE') {
  const isAssigned = await checkJudgeAssignment(req.user.id, categoryId)
  if (!isAssigned) {
    throw new ForbiddenError('Not assigned to this category')
  }
}
```

## CSRF Protection

**Implementation**: csurf middleware

```typescript
import csrf from 'csurf'

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
})

// Get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

// Validate on mutating operations
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return csrfProtection(req, res, next)
  }
  next()
})
```

**Frontend Integration**:
```typescript
// Fetch CSRF token
const csrfToken = await getCSRFToken()

// Include in requests
axios.post('/api/scores', data, {
  headers: { 'X-CSRF-Token': csrfToken }
})
```

## Rate Limiting

**Strategy**: Token bucket algorithm via express-rate-limit

**Rate Limits**:
- General API: 100 requests per 15 minutes per IP
- Authentication: 5 requests per 15 minutes per IP
- File uploads: 10 requests per hour per user
- Score submission: 60 requests per minute per judge

```typescript
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
})

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
})
```

## Input Validation

### Request Validation

**express-validator** for input sanitization:

```typescript
const validateEvent = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name too long'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email'),
  
  body('startDate')
    .isISO8601()
    .toDate()
    .withMessage('Invalid date format'),
  
  // Validation result handler
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  }
]
```

### SQL Injection Prevention

**Prisma ORM** provides automatic SQL injection protection through parameterized queries:

```typescript
// Safe - Prisma handles escaping
const user = await prisma.user.findUnique({
  where: { email: userInput } // Automatically escaped
})

// Safe - Parameterized raw query
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`
```

### XSS Prevention

**React** automatically escapes output:

```typescript
// Safe - React escapes by default
<div>{userInput}</div>

// Dangerous - Only use with trusted content
<div dangerouslySetInnerHTML={{ __html: trustedHTML }} />
```

**DOMPurify** for sanitizing HTML content:

```typescript
import DOMPurify from 'dompurify'

const cleanHTML = DOMPurify.sanitize(dirtyHTML)
```

## Security Headers

**Helmet.js** sets secure HTTP headers:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
}))
```

**Headers Set**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: ...`

## CORS Configuration

**Whitelist-based CORS**:

```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}

app.use(cors(corsOptions))
```

## File Upload Security

### Virus Scanning

**ClamAV Integration**:

```typescript
const scanFile = async (filePath: string): Promise<boolean> => {
  try {
    const result = await clamav.scanFile(filePath)
    return result.isClean
  } catch (error) {
    if (CLAMAV_FALLBACK_BEHAVIOR === 'allow') {
      logger.warn('Virus scan failed, allowing upload')
      return true
    }
    throw new Error('Virus scan failed')
  }
}
```

**Scan Points**:
- All file uploads
- Before serving downloaded files
- Scheduled scans of upload directory

### File Validation

**Checks Performed**:
1. File type validation (MIME type and extension)
2. File size limits (configurable per category)
3. Filename sanitization
4. Virus scanning
5. Storage path sanitization

```typescript
const validateFile = (file: Express.Multer.File) => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large')
  }

  // Check MIME type
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type')
  }

  // Sanitize filename
  const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')

  return safeFilename
}
```

## Data Encryption

### At Rest

**Sensitive Fields** encrypted before storage:
- Payment information (if applicable)
- Social security numbers (if collected)
- API keys
- Secrets

```typescript
import crypto from 'crypto'

const encrypt = (text: string): string => {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

const decrypt = (encrypted: string): string => {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

### In Transit

**TLS/HTTPS** for all connections:
- API requests
- WebSocket connections
- Database connections

## Session Management

### Session Security

**Features**:
- Session version tracking (enables instant invalidation)
- Automatic session expiry
- Secure session storage (Redis)
- Session regeneration on login

```typescript
// Invalidate all user sessions
await prisma.user.update({
  where: { id: userId },
  data: { sessionVersion: { increment: 1 } }
})
```

### Session Timeout

**Configuration**:
- Default: 8 hours (480 minutes)
- Configurable via `SESSION_TIMEOUT_MINUTES`
- Automatic extension on activity
- Warning before expiry

## Audit Logging

### Activity Logging

**All actions logged**:
- User login/logout
- Data modifications
- Permission changes
- System setting updates
- File uploads/downloads
- Score submissions
- Certification steps

```typescript
await prisma.activityLog.create({
  data: {
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    action: 'SCORE_SUBMITTED',
    resourceType: 'Score',
    resourceId: score.id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    details: { categoryId, contestantId, judgeId }
  }
})
```

### Audit Trail

**Compliance-level logging**:
- Who did what, when, and from where
- Before/after states for modifications
- Immutable audit records
- Long-term retention (configurable)

## Security Monitoring

### Metrics Collection

**Prometheus metrics**:
- Failed authentication attempts
- Rate limit violations
- CSRF token failures
- File upload rejections
- Virus detections

### Alerting

**Alert on**:
- Repeated failed logins
- Unusual activity patterns
- Virus detections
- System errors
- Security policy violations

## Secrets Management

### Environment Variables

**Secure secret storage**:
```bash
# Generate random secrets
JWT_SECRET=$(openssl rand -base64 64)
CSRF_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

**Never commit**:
- `.env` files to version control
- Secrets in code
- Database credentials
- API keys

### Secret Rotation

**Regular rotation** of:
- JWT secrets (with grace period)
- Database passwords
- API keys
- Encryption keys

## Security Best Practices

### For Administrators

1. **Use strong admin passwords**
2. **Enable two-factor authentication** (if available)
3. **Regularly review audit logs**
4. **Keep software updated**
5. **Restrict admin access**
6. **Use IP whitelisting** for admin access
7. **Regular security audits**
8. **Backup before major changes**

### For Developers

1. **Never log sensitive data**
2. **Validate all input**
3. **Use parameterized queries**
4. **Implement least privilege**
5. **Keep dependencies updated**
6. **Follow secure coding guidelines**
7. **Review code for security issues**
8. **Use security linters**

### For Users

1. **Use strong, unique passwords**
2. **Don't share credentials**
3. **Log out on shared devices**
4. **Report suspicious activity**
5. **Keep browser updated**
6. **Be cautious with file uploads**

## Incident Response

### Detection

**Monitoring for**:
- Failed authentication spikes
- Unusual data access patterns
- Suspicious file uploads
- SQL injection attempts
- XSS attempts

### Response Process

1. **Identify**: Detect the incident
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat
4. **Recover**: Restore normal operations
5. **Lessons Learned**: Review and improve

### Incident Log

**Record**:
- Time of detection
- Type of incident
- Affected systems
- Actions taken
- Resolution time
- Root cause
- Preventive measures

## Compliance

### Data Protection

**GDPR/Privacy considerations**:
- User consent for data collection
- Right to access data
- Right to deletion
- Data portability
- Privacy policy
- Cookie consent

### Audit Requirements

**For competitions**:
- Complete audit trail
- Certification workflow
- Digital signatures
- Tamper-evident records
- Long-term retention

## Security Updates

### Update Policy

**Critical updates**: Within 24 hours
**Security patches**: Within 1 week
**Regular updates**: Monthly schedule

### Vulnerability Scanning

**Regular scans**:
- Dependency vulnerabilities (npm audit)
- Code security (SAST tools)
- Infrastructure vulnerabilities
- Penetration testing (annual)

## Related Documentation

- [Authentication Feature](../02-features/authentication.md)
- [Authorization Feature](../02-features/authorization.md)
- [Virus Scanning](../08-security/virus-scanning.md)
- [Security Best Practices](../08-security/security-best-practices.md)
- [Audit Logging](../08-security/audit-logging.md)
- [Vulnerability Management](../08-security/vulnerability-management.md)
