# Phase 2: High Priority - Replace Console.log with Proper Logging

**Priority:** 🟠 HIGH
**Timeline:** Week 1 (after Phase 1)
**Risk Level:** LOW
**Dependencies:** None (can run parallel with other Phase 2 tasks)

---

## Problem Summary

**Issue:** 333 console.log statements scattered throughout codebase
**Impact:**
- **No Log Levels:** Cannot filter debug vs error messages
- **No Structured Logging:** Difficult to parse and analyze
- **Production Pollution:** Console statements in production code
- **No Log Management:** Cannot route to monitoring systems
- **Performance:** console.log is synchronous and can block

**Current State:**
```bash
grep -r "console\.log" src/ | wc -l
# Output: 333
```

---

## Logging Strategy

### Recommended Solution: Winston Logger

**Why Winston:**
- ✅ Structured logging with levels (error, warn, info, debug)
- ✅ Multiple transports (file, console, external services)
- ✅ Log rotation built-in
- ✅ JSON formatting for log aggregation
- ✅ Production-ready
- ✅ Active maintenance and community

**Existing Logger:**
Already have logger at `src/config/logger.ts` - needs to be used consistently

---

## Implementation Plan

### Step 1: Verify/Enhance Existing Logger (2 hours)

**Review current logger:**

```typescript
// src/config/logger.ts (VERIFY EXISTS)
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logDir = path.join(__dirname, '../../logs');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (colorized for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console output (development)
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || 'debug',
  }),

  // Error logs
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: format,
    maxSize: '20m',
    maxFiles: '14d',
  }),

  // Combined logs
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: format,
    maxSize: '20m',
    maxFiles: '14d',
  }),
];

// Create logger
export const logger = winston.createLogger({
  levels,
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
```

**If logger doesn't exist or is incomplete, create it with above code**

### Step 2: Create Migration Script (3 hours)

**Automated console.log replacement:**

```bash
#!/bin/bash
# scripts/migrate-console-logs.sh

echo "Migrating console.log to logger..."

# Find all files with console.log
FILES=$(grep -rl "console\.log" src/)

for file in $FILES; do
  echo "Processing: $file"

  # Add logger import if not present
  if ! grep -q "import.*logger.*from.*config/logger" "$file"; then
    # Find import section and add logger import
    sed -i "1a import { logger } from '../config/logger';" "$file"
  fi

  # Replace console.log with logger.info
  sed -i "s/console\.log(/logger.info(/g" "$file"

  # Replace console.error with logger.error
  sed -i "s/console\.error(/logger.error(/g" "$file"

  # Replace console.warn with logger.warn
  sed -i "s/console\.warn(/logger.warn(/g" "$file"

  # Replace console.debug with logger.debug
  sed -i "s/console\.debug(/logger.debug(/g" "$file"
done

echo "Migration complete!"
echo "Files processed: $(echo "$FILES" | wc -l)"
```

**Run script:**
```bash
chmod +x scripts/migrate-console-logs.sh
./scripts/migrate-console-logs.sh
```

**⚠️ Note:** Automated script is starting point - manual review still needed!

### Step 3: Manual Replacement by Category (12 hours)

**Category 1: Debug Statements (most common)**

**Before:**
```typescript
console.log('User data:', user);
console.log('Processing event:', eventId);
console.log('Starting migration...');
```

**After:**
```typescript
logger.debug('User data:', { user });
logger.debug('Processing event', { eventId });
logger.info('Starting migration');
```

**Best Practices:**
- Use `logger.debug()` for debugging information
- Pass objects as second parameter for structured logging
- Use template literals only when needed

**Category 2: Error Logging**

**Before:**
```typescript
catch (error) {
  console.error('Error fetching users:', error);
}
```

**After:**
```typescript
catch (error) {
  logger.error('Error fetching users', {
    error: error.message,
    stack: error.stack,
    context: { userId, tenantId }
  });
}
```

**Best Practices:**
- Always use `logger.error()` for errors
- Include error message and stack
- Add context (userId, tenantId, etc.)

**Category 3: Info/Audit Logging**

**Before:**
```typescript
console.log('User logged in:', user.email);
console.log('Event created:', event.id);
```

**After:**
```typescript
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  timestamp: new Date()
});

logger.info('Event created', {
  eventId: event.id,
  tenantId: event.tenantId,
  createdBy: req.user.id
});
```

**Best Practices:**
- Use `logger.info()` for important operations
- Include IDs and context
- Good for audit trail

**Category 4: HTTP Request Logging**

**Before:**
```typescript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

**After:**
```typescript
import morgan from 'morgan';
import { stream } from './config/logger';

app.use(morgan('combined', { stream }));
```

**Best Practices:**
- Use morgan middleware for HTTP logging
- Connects to Winston logger
- Standard format

**Category 5: Performance Logging**

**Before:**
```typescript
console.log('Query took:', Date.now() - start, 'ms');
```

**After:**
```typescript
const duration = Date.now() - start;
logger.debug('Query performance', {
  duration,
  query: 'findManyUsers',
  threshold: duration > 1000 ? 'slow' : 'normal'
});

if (duration > 1000) {
  logger.warn('Slow query detected', {
    duration,
    query: 'findManyUsers'
  });
}
```

**Best Practices:**
- Log performance metrics
- Warn on slow operations
- Include query/operation details

### Step 4: Remove Development Logs (4 hours)

**Identify and remove debugging logs no longer needed:**

```bash
# Find potential debug logs to remove
grep -r "logger.debug.*test\|temp\|TODO" src/
```

**Examples of logs to remove:**

```typescript
// REMOVE - No longer needed
logger.debug('test');
logger.debug('here');
logger.debug('checkpoint 1');
logger.debug('TODO: remove this');
logger.debug(JSON.stringify(data)); // Use structured logging instead
```

**Keep logs that add value:**

```typescript
// KEEP - Useful debugging info
logger.debug('Processing batch', { batchSize, currentIndex });
logger.debug('Cache hit', { key, ttl });
logger.debug('Tenant context loaded', { tenantId, features });
```

### Step 5: Add Request Context Middleware (2 hours)

**Create request context for better log correlation:**

```typescript
// src/middleware/requestContext.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';

// Add requestId to Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate unique request ID
  req.requestId = uuidv4();

  // Add to response headers for debugging
  res.setHeader('X-Request-ID', req.requestId);

  // Log incoming request
  logger.http('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    tenantId: req.tenantId,
  });

  // Log response
  res.on('finish', () => {
    logger.http('Request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - (req as any).startTime,
    });
  });

  // Track request start time
  (req as any).startTime = Date.now();

  next();
};
```

**Register middleware:**

```typescript
// src/server.ts
import { requestContextMiddleware } from './middleware/requestContext';

// Add early in middleware chain
app.use(requestContextMiddleware);
```

**Use in logging:**

```typescript
// Now all logs can include requestId
logger.info('Processing user request', {
  requestId: req.requestId,
  userId: user.id,
});
```

### Step 6: Implement Log Levels by Environment (1 hour)

**Environment-based configuration:**

```typescript
// src/config/env.ts
export const config = {
  logLevel: process.env.LOG_LEVEL || (
    process.env.NODE_ENV === 'production' ? 'info' :
    process.env.NODE_ENV === 'test' ? 'error' :
    'debug'
  ),
};
```

**Update logger:**

```typescript
// src/config/logger.ts
import { config } from './env';

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
    level: config.logLevel, // Use from config
  }),
  // ... other transports
];
```

**Environment settings:**

```bash
# .env.development
LOG_LEVEL=debug

# .env.production
LOG_LEVEL=info

# .env.test
LOG_LEVEL=error
```

---

## File-by-File Replacement Guide

### Controllers (All files)

**Pattern:**

```typescript
// Before
import { PrismaClient } from '@prisma/client';

export class UserController {
  async getUsers(req, res) {
    console.log('Fetching users for tenant:', req.tenantId);
    try {
      const users = await prisma.user.findMany();
      console.log('Found users:', users.length);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

**After:**

```typescript
import { logger } from '../config/logger';
import prisma from '../config/database';

export class UserController {
  async getUsers(req, res) {
    logger.debug('Fetching users', {
      requestId: req.requestId,
      tenantId: req.tenantId,
    });

    try {
      const users = await prisma.user.findMany({
        where: { tenantId: req.tenantId },
      });

      logger.info('Users fetched successfully', {
        requestId: req.requestId,
        count: users.length,
        tenantId: req.tenantId,
      });

      res.json({ data: users });
    } catch (error) {
      logger.error('Error fetching users', {
        requestId: req.requestId,
        tenantId: req.tenantId,
        error: error.message,
        stack: error.stack,
      });

      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

**Apply to:**
- adminController.ts
- archiveController.ts
- cacheController.ts
- categoriesController.ts
- contestsController.ts
- eventsController.ts
- scoringController.ts
- settingsController.ts
- usersController.ts
- workflowController.ts

### Services (All files)

**Pattern:**

```typescript
// Before
export class EventService {
  async createEvent(data) {
    console.log('Creating event:', data);
    const event = await prisma.event.create({ data });
    console.log('Event created:', event.id);
    return event;
  }
}
```

**After:**

```typescript
import { logger } from '../config/logger';

export class EventService {
  async createEvent(data: CreateEventDto, context: RequestContext) {
    logger.debug('Creating event', {
      requestId: context.requestId,
      tenantId: data.tenantId,
      eventName: data.name,
    });

    try {
      const event = await prisma.event.create({ data });

      logger.info('Event created successfully', {
        requestId: context.requestId,
        eventId: event.id,
        tenantId: event.tenantId,
      });

      return event;
    } catch (error) {
      logger.error('Failed to create event', {
        requestId: context.requestId,
        error: error.message,
        data,
      });
      throw error;
    }
  }
}
```

### Routes (All files)

**Before:**

```typescript
router.get('/api/users', async (req, res) => {
  console.log('GET /api/users');
  // ...
});
```

**After:**

```typescript
// Remove console.log - HTTP logging handled by morgan middleware
router.get('/api/users', authenticate, async (req, res) => {
  // Morgan logs the request automatically
  // Only log application-specific events
  // ...
});
```

### Middleware

**Before:**

```typescript
export const authenticate = (req, res, next) => {
  console.log('Authenticating request...');
  // ...
};
```

**After:**

```typescript
import { logger } from '../config/logger';

export const authenticate = (req, res, next) => {
  logger.debug('Authenticating request', {
    requestId: req.requestId,
    path: req.path,
  });
  // ...
};
```

---

## Testing Strategy

### Verification (2 hours)

**Check no console.log remains:**

```bash
# Should return 0
grep -r "console\.log" src/ | wc -l

# Should return 0
grep -r "console\.error" src/

# Should return 0
grep -r "console\.warn" src/

# Should return 0
grep -r "console\.debug" src/
```

**Verify logger imports:**

```bash
# Count logger imports (should match file count using logger)
grep -r "import.*logger.*from.*config/logger" src/ | wc -l
```

### Log Output Tests (2 hours)

**Test different log levels:**

```typescript
// test/logger.test.ts
import { logger } from '../src/config/logger';
import fs from 'fs';
import path from 'path';

describe('Logger', () => {
  const testLogFile = path.join(__dirname, '../logs/test.log');

  beforeEach(() => {
    // Clear test log
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  it('should log at different levels', () => {
    logger.error('Test error');
    logger.warn('Test warning');
    logger.info('Test info');
    logger.debug('Test debug');

    // Verify log file created
    expect(fs.existsSync(testLogFile)).toBe(true);
  });

  it('should include structured data', () => {
    logger.info('Test with data', {
      userId: 123,
      action: 'login',
    });

    const logContent = fs.readFileSync(testLogFile, 'utf8');
    expect(logContent).toContain('userId');
    expect(logContent).toContain('123');
  });

  it('should log errors with stack traces', () => {
    const error = new Error('Test error');
    logger.error('Error occurred', {
      error: error.message,
      stack: error.stack,
    });

    const logContent = fs.readFileSync(testLogFile, 'utf8');
    expect(logContent).toContain('Error occurred');
    expect(logContent).toContain('Test error');
  });
});
```

### Integration Tests (1 hour)

**Test logging in request flow:**

```typescript
import request from 'supertest';
import app from '../src/server';

describe('Request Logging', () => {
  it('should log HTTP requests', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect(200);

    // Check for X-Request-ID header
    expect(response.headers['x-request-id']).toBeDefined();

    // Verify logs created (check log file or capture console)
    // In real scenario, would check log aggregation system
  });
});
```

---

## Log Analysis and Monitoring

### Log Rotation Setup

**Already configured with DailyRotateFile:**

```typescript
new DailyRotateFile({
  filename: 'logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',    // Rotate when file reaches 20MB
  maxFiles: '14d',   // Keep logs for 14 days
})
```

**Verify log directory:**

```bash
ls -lh logs/
# Should see:
# combined-2025-11-22.log
# error-2025-11-22.log
# etc.
```

### Log Aggregation (Optional)

**For production monitoring, consider:**

1. **ELK Stack (Elasticsearch, Logstash, Kibana)**
2. **Splunk**
3. **DataDog**
4. **CloudWatch (AWS)**

**Winston transport for external service:**

```typescript
// Example: Datadog
import { transports } from 'winston';
import DatadogWinston from 'datadog-winston';

const datadogTransport = new DatadogWinston({
  apiKey: process.env.DATADOG_API_KEY,
  service: 'event-manager',
  ddsource: 'nodejs',
});

logger.add(datadogTransport);
```

---

## Estimated Effort

| Task | Time | Developer |
|------|------|-----------|
| Verify/enhance logger | 2 hours | Backend Dev |
| Create migration script | 3 hours | Backend Dev |
| Manual replacement (333 logs) | 12 hours | Backend Dev |
| Remove debug logs | 4 hours | Backend Dev |
| Add request context | 2 hours | Backend Dev |
| Environment config | 1 hour | Backend Dev |
| Testing/verification | 5 hours | Backend Dev + QA |
| Documentation | 1 hour | Backend Dev |
| **Total** | **30 hours** | **4 days** |

---

## Success Criteria

✅ **Zero console.log in src/ directory**
✅ **All logging uses Winston logger**
✅ **Structured logging with context**
✅ **Log levels properly used** (error, warn, info, debug)
✅ **Log rotation configured**
✅ **Request IDs in all logs**
✅ **HTTP requests logged via Morgan**
✅ **Environment-based log levels**

---

**Status:** READY TO IMPLEMENT
**Dependencies:** None (can start immediately)
**Next Steps:** Verify logger exists, create migration script
**Owner:** Backend Development Team
