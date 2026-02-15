# Phase 2: High Priority - Standardize Environment Variable Access

**Priority:** 🟠 HIGH
**Timeline:** Week 1
**Risk Level:** LOW
**Dependencies:** None (can run in parallel)

---

## Problem Summary

**Issue:** Direct `process.env` access scattered throughout codebase, no type safety
**Impact:**
- **No Type Safety:** Environment variables are always strings
- **No Validation:** Missing required vars only discovered at runtime
- **No Defaults:** Hard to manage fallback values
- **Scattered Access:** Difficult to find all env var usage
- **No Documentation:** Unclear what variables are required

**Current Pattern:**
```typescript
// Scattered throughout codebase
const port = process.env.PORT || 3000;
const dbUrl = process.env.DATABASE_URL;  // Could be undefined!
const nodeEnv = process.env.NODE_ENV;
```

---

## Recommended Solution

### Centralized, Typed Environment Configuration

```typescript
// src/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

/**
 * Environment variable schema with validation
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT/Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('24h'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // CSRF
  CSRF_SECRET: z.string().optional(),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // SMS (optional)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // File Storage
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(10485760), // 10MB

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),

  // External Services
  REDIS_URL: z.string().optional(),

  // Feature Flags
  ENABLE_REGISTRATION: z.coerce.boolean().default(true),
  ENABLE_SMS: z.coerce.boolean().default(false),
  ENABLE_EMAIL: z.coerce.boolean().default(true),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

/**
 * Parsed and validated environment variables
 */
type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Validated environment configuration
 * @example
 * import { env } from './config/env';
 * console.log(env.PORT); // number, not string!
 */
export const env = validateEnv();

/**
 * Helper to check if running in production
 */
export const isProduction = () => env.NODE_ENV === 'production';

/**
 * Helper to check if running in development
 */
export const isDevelopment = () => env.NODE_ENV === 'development';

/**
 * Helper to check if running in test
 */
export const isTest = () => env.NODE_ENV === 'test';

/**
 * Database configuration
 */
export const dbConfig = {
  url: env.DATABASE_URL,
  // Add Prisma-specific config if needed
  log: isDevelopment() ? ['query', 'error', 'warn'] : ['error'],
};

/**
 * JWT configuration
 */
export const jwtConfig = {
  secret: env.JWT_SECRET,
  expiresIn: env.JWT_EXPIRY,
};

/**
 * Server configuration
 */
export const serverConfig = {
  port: env.PORT,
  host: env.HOST,
  corsOrigins: isDevelopment()
    ? ['http://localhost:5173', 'http://localhost:3000']
    : ['https://yourdomain.com'],
};

/**
 * Feature flags
 */
export const features = {
  registration: env.ENABLE_REGISTRATION,
  sms: env.ENABLE_SMS,
  email: env.ENABLE_EMAIL,
};
```

---

## Implementation Steps

### Step 1: Install Zod for Validation (15 minutes)

```bash
npm install zod
```

**Why Zod:**
- ✅ Runtime validation
- ✅ TypeScript type inference
- ✅ Detailed error messages
- ✅ Schema composition
- ✅ Widely used

### Step 2: Create env.ts Configuration (2 hours)

**Create the file above at:** `src/config/env.ts`

**Customize for your environment variables:**
1. List all environment variables used in the project
2. Define validation rules for each
3. Set appropriate defaults
4. Mark required variables (no default)

**Find all current env var usage:**

```bash
grep -roh "process\.env\.[A-Z_]*" src/ | sort | uniq > /tmp/env-vars.txt
cat /tmp/env-vars.txt
```

### Step 3: Replace Direct process.env Access (8 hours)

**Pattern: Replace scattered access**

**Before:**
```typescript
// src/server.ts
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

app.listen(port, host, () => {
  console.log(`Server running on ${host}:${port}`);
});
```

**After:**
```typescript
// src/server.ts
import { env, serverConfig } from './config/env';

app.listen(serverConfig.port, serverConfig.host, () => {
  logger.info(`Server running on ${serverConfig.host}:${serverConfig.port}`);
});
```

**Before:**
```typescript
// src/config/database.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

**After:**
```typescript
// src/config/database.ts
import { dbConfig } from './env';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbConfig.url,
    },
  },
  log: dbConfig.log,
});
```

**Before:**
```typescript
// src/services/AuthService.ts
const jwtSecret = process.env.JWT_SECRET || 'default-secret'; // ❌ Unsafe
const token = jwt.sign(payload, jwtSecret);
```

**After:**
```typescript
// src/services/AuthService.ts
import { jwtConfig } from '../config/env';

const token = jwt.sign(payload, jwtConfig.secret, {
  expiresIn: jwtConfig.expiresIn,
});
```

**Before:**
```typescript
// Various files
if (process.env.NODE_ENV === 'production') {
  // ...
}
```

**After:**
```typescript
import { isProduction } from '../config/env';

if (isProduction()) {
  // ...
}
```

### Step 4: Update .env.example (1 hour)

**Create comprehensive example:**

```bash
# .env.example

# Node Environment (development | production | test)
NODE_ENV=development

# Server Configuration
PORT=3000
HOST=localhost

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/event_manager"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars-long"
JWT_EXPIRY=24h

# Session
SESSION_SECRET="your-super-secret-session-key-min-32-chars"

# CSRF Protection (optional)
CSRF_SECRET="your-csrf-secret-key"

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS Configuration (optional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=debug

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_SMS=false
ENABLE_EMAIL=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 5: Document Required Variables (1 hour)

**Create: `docs/ENVIRONMENT_VARIABLES.md`**

```markdown
# Environment Variables

## Required Variables

These MUST be set or the application will not start:

### `DATABASE_URL`
- **Type:** String
- **Description:** PostgreSQL connection string
- **Example:** `postgresql://user:password@localhost:5432/event_manager`

### `JWT_SECRET`
- **Type:** String (min 32 characters)
- **Description:** Secret key for signing JWT tokens
- **Example:** Generate with `openssl rand -base64 32`

### `SESSION_SECRET`
- **Type:** String (min 32 characters)
- **Description:** Secret key for session encryption
- **Example:** Generate with `openssl rand -base64 32`

## Optional Variables

### Email Configuration

Only needed if `ENABLE_EMAIL=true`:

- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password

### SMS Configuration

Only needed if `ENABLE_SMS=true`:

- `TWILIO_ACCOUNT_SID`: Twilio account SID
- `TWILIO_AUTH_TOKEN`: Twilio auth token
- `TWILIO_PHONE_NUMBER`: Twilio phone number

## Default Values

Variables with defaults (can be omitted):

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | Server port |
| `HOST` | `localhost` | Server host |
| `LOG_LEVEL` | `info` | Logging level |
| `UPLOAD_DIR` | `./uploads` | File upload directory |
| `MAX_FILE_SIZE` | `10485760` | Max file size (10MB) |
| `JWT_EXPIRY` | `24h` | JWT expiration time |
| `ENABLE_REGISTRATION` | `true` | Allow new user registration |
| `ENABLE_EMAIL` | `true` | Enable email features |
| `ENABLE_SMS` | `false` | Enable SMS features |

## Environment Setup

### Development

```bash
cp .env.example .env
# Edit .env with your local values
npm run dev
```

### Production

Set environment variables via your hosting platform:
- AWS: Systems Manager Parameter Store
- Heroku: Config Vars
- Docker: docker-compose.yml or -e flags
- Kubernetes: ConfigMaps and Secrets
```

---

## Testing Strategy

### Validation Tests (2 hours)

```typescript
// test/config/env.test.ts
import { z } from 'zod';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should fail if DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;

    expect(() => {
      require('../src/config/env');
    }).toThrow();
  });

  it('should fail if JWT_SECRET is too short', () => {
    process.env.JWT_SECRET = 'short';

    expect(() => {
      require('../src/config/env');
    }).toThrow('JWT_SECRET must be at least 32 characters');
  });

  it('should use default values when optional vars missing', () => {
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.SESSION_SECRET = 'b'.repeat(32);

    const { env } = require('../src/config/env');

    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.NODE_ENV).toBe('development');
  });

  it('should coerce string numbers to actual numbers', () => {
    process.env.PORT = '8080';
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.SESSION_SECRET = 'b'.repeat(32);

    const { env } = require('../src/config/env');

    expect(env.PORT).toBe(8080);
    expect(typeof env.PORT).toBe('number');
  });

  it('should coerce boolean strings', () => {
    process.env.ENABLE_REGISTRATION = 'false';
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.SESSION_SECRET = 'b'.repeat(32);

    const { env } = require('../src/config/env');

    expect(env.ENABLE_REGISTRATION).toBe(false);
    expect(typeof env.ENABLE_REGISTRATION).toBe('boolean');
  });
});
```

### Integration Tests (1 hour)

```typescript
// Ensure application starts with valid env
describe('Application Startup', () => {
  it('should start server with valid environment', async () => {
    const app = require('../src/server');

    // Should not throw
    expect(app).toBeDefined();
  });
});
```

---

## Migration Checklist

**For each file using process.env:**

- [ ] Import `env` from `config/env`
- [ ] Replace `process.env.X` with `env.X` or appropriate config object
- [ ] Remove fallback logic (handled in env.ts)
- [ ] Update types if needed (env vars are now typed)
- [ ] Test file still works

**Files likely needing updates:**

- src/server.ts
- src/config/database.ts
- src/config/logger.ts
- src/services/AuthService.ts
- src/services/EmailService.ts
- src/services/SMSService.ts
- src/middleware/auth.ts
- src/middleware/csrf.ts
- Various other files

---

## Benefits After Implementation

### ✅ Type Safety

```typescript
// Before
const port = process.env.PORT || 3000;  // port is string | number
console.log(port + 1);  // Could be "30001" instead of 3001!

// After
import { env } from './config/env';
console.log(env.PORT + 1);  // 3001 (number)
```

### ✅ Validation at Startup

```bash
# Application won't start if config is invalid
node dist/server.js

❌ Invalid environment variables:
  JWT_SECRET: String must contain at least 32 character(s)
  DATABASE_URL: Required
```

### ✅ IDE Autocomplete

```typescript
import { env } from './config/env';

env.  // <-- IDE shows all available variables with types
```

### ✅ Single Source of Truth

```typescript
// Before: What env vars does this app need?
// Have to grep through entire codebase

// After: Check one file
// src/config/env.ts has complete list
```

---

## Estimated Effort

| Task | Time | Developer |
|------|------|-----------|
| Install Zod | 15 min | Backend Dev |
| Create env.ts | 2 hours | Backend Dev |
| Replace process.env | 8 hours | Backend Dev |
| Update .env.example | 1 hour | Backend Dev |
| Documentation | 1 hour | Backend Dev |
| Testing | 3 hours | Backend Dev + QA |
| Code review | 1 hour | Senior Dev |
| **Total** | **16 hours** | **2 days** |

---

## Success Criteria

✅ **Zero direct process.env access in src/**
✅ **All environment variables validated via Zod**
✅ **Type-safe env configuration**
✅ **Comprehensive .env.example**
✅ **Environment documentation complete**
✅ **Application fails fast on invalid config**
✅ **Tests passing**

---

**Status:** READY TO IMPLEMENT
**Dependencies:** None
**Next Steps:** Install Zod, create env.ts
**Owner:** Backend Development Team
