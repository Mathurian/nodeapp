# Phase 3: Medium Priority - Security Improvements

**Priority:** 🟡 MEDIUM
**Timeline:** Week 2-3
**Risk Level:** HIGH (security issues)
**Dependencies:** Environment variables standardized

---

## Security Audit Findings

### 1. Input Validation (6 hours)

**Add comprehensive validation middleware:**

```typescript
// src/middleware/validation.ts
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation middleware factory
 */
export function validate(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  };
}

// Create validation schemas
export const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  location: z.string().max(500).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(200),
  role: z.enum(['ADMIN', 'JUDGE', 'USER']).optional(),
});

export const updateUserSchema = createUserSchema.partial();
```

**Apply to routes:**

```typescript
router.post('/api/events',
  authenticate,
  validate(createEventSchema),
  eventController.create
);

router.post('/api/users',
  authenticate,
  requireRole('ADMIN'),
  validate(createUserSchema),
  userController.create
);
```

### 2. SQL Injection Prevention (2 hours)

**Already protected by Prisma, but verify:**

```typescript
// BAD: Never do this (raw SQL without parameterization)
const result = await prisma.$queryRaw(
  `SELECT * FROM User WHERE email = '${userInput}'`  // ❌ Vulnerable
);

// GOOD: Use parameterized queries
const result = await prisma.$queryRaw(
  Prisma.sql`SELECT * FROM User WHERE email = ${userInput}`  // ✅ Safe
);

// BEST: Use Prisma's query builder
const result = await prisma.user.findMany({
  where: { email: userInput }  // ✅ Automatically safe
});
```

### 3. XSS Protection (3 hours)

**Sanitize output:**

```bash
npm install dompurify isomorphic-dompurify
npm install --save-dev @types/dompurify
```

```typescript
// src/utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  });
}

// Use in services
export class EventService {
  async create(data: CreateEventDto) {
    return await prisma.event.create({
      data: {
        ...data,
        description: sanitizeHtml(data.description || ''),
      },
    });
  }
}
```

**Set security headers:**

```bash
npm install helmet
```

```typescript
// src/server.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

### 4. Rate Limiting (2 hours)

**Implement rate limiting:**

```bash
npm install express-rate-limit
```

```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later',
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: 'API rate limit exceeded',
});
```

**Apply to routes:**

```typescript
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

### 5. CORS Configuration (1 hour)

**Secure CORS setup:**

```typescript
// src/server.ts
import cors from 'cors';
import { serverConfig } from './config/env';

app.use(cors({
  origin: serverConfig.corsOrigins,  // From env config
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 6. Audit Logging (4 hours)

**Log security-relevant events:**

```typescript
// src/services/AuditLogService.ts
import prisma from '../config/database';
import { logger } from '../config/logger';

export class AuditLogService {
  static async log(event: {
    action: string;
    userId?: number;
    tenantId?: number;
    resourceType?: string;
    resourceId?: number;
    metadata?: any;
    ipAddress?: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          ...event,
          timestamp: new Date(),
        },
      });

      logger.info('Audit log created', event);
    } catch (error) {
      logger.error('Failed to create audit log', { error, event });
    }
  }
}

// Use in controllers
await AuditLogService.log({
  action: 'USER_LOGIN',
  userId: user.id,
  tenantId: user.tenantId,
  ipAddress: req.ip,
  metadata: { userAgent: req.get('user-agent') },
});
```

### 7. Secrets Management (2 hours)

**Verify no secrets in code:**

```bash
# Check for potential secrets
grep -riE "(password|secret|api[_-]?key|token)" src/ \
  | grep -v ".test." \
  | grep -v "process.env" \
  | grep -v "interface" \
  | grep -v "type "

# Should only find references to env vars, not hardcoded values
```

**Pre-commit hook to prevent secrets:**

```bash
# .husky/pre-commit
#!/bin/sh

# Check for potential secrets
if git diff --cached | grep -iE "(password|secret|api[_-]?key|token).*=.*['\"][^'\"]{20,}"; then
  echo "❌ Potential secret detected in commit"
  echo "Please use environment variables instead"
  exit 1
fi
```

---

## Security Checklist

- [ ] Input validation on all endpoints
- [ ] SQL injection protection (Prisma)
- [ ] XSS protection (sanitization + CSP headers)
- [ ] Rate limiting on auth endpoints
- [ ] Rate limiting on API endpoints
- [ ] CORS properly configured
- [ ] Security headers (helmet)
- [ ] Audit logging for sensitive actions
- [ ] No secrets in code
- [ ] Dependency vulnerability scan
- [ ] HTTPS enforced in production

---

## Estimated Effort

| Task | Time |
|------|------|
| Input validation | 6 hours |
| SQL injection audit | 2 hours |
| XSS protection | 3 hours |
| Rate limiting | 2 hours |
| CORS config | 1 hour |
| Audit logging | 4 hours |
| Secrets audit | 2 hours |
| **Total** | **20 hours** |

---

**Status:** READY TO IMPLEMENT
**Owner:** Backend Dev + Security Team
