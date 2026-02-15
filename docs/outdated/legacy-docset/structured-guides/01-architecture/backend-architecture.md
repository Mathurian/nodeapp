# Backend Architecture

## Overview

The Event Manager backend is built with Node.js, Express, and TypeScript, following a layered architecture pattern with dependency injection. The system emphasizes type safety, testability, and maintainability through clear separation of concerns.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP/WebSocket Layer                     │
│  Express Middleware Pipeline + Socket.IO Handlers            │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                      Controller Layer                        │
│  - Request handling                                          │
│  - Response formatting                                       │
│  - Input validation                                          │
│  - HTTP status codes                                         │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                       Service Layer                          │
│  - Business logic                                            │
│  - Workflow orchestration                                    │
│  - Authorization                                             │
│  - Cross-entity operations                                   │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                     Repository Layer                         │
│  - Data access                                               │
│  - Database queries                                          │
│  - Transaction management                                    │
│  - Data mapping                                              │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  Prisma ORM + PostgreSQL                                     │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component           | Technology       | Version | Purpose                          |
|--------------------|------------------|---------|----------------------------------|
| Runtime            | Node.js          | 20.x    | JavaScript runtime               |
| Language           | TypeScript       | 5.9.x   | Type-safe JavaScript             |
| Framework          | Express          | 4.21.x  | Web application framework        |
| ORM                | Prisma           | 6.18.x  | Database ORM                     |
| DI Container       | TSyringe         | 4.10.x  | Dependency injection             |
| Validation         | Express Validator| 7.2.x   | Request validation               |
| WebSocket          | Socket.IO        | 4.8.x   | Real-time communication          |
| Job Queue          | BullMQ           | 5.63.x  | Background job processing        |
| Logging            | Winston          | 3.17.x  | Structured logging               |
| Cache              | IORedis          | 5.8.x   | Redis client                     |

## Directory Structure

```
src/
├── server.ts                 # Application entry point
├── config/                   # Configuration modules
│   ├── container.ts          # DI container setup
│   ├── database.ts           # Database connection
│   ├── express.config.ts     # Express configuration
│   ├── redis.config.ts       # Redis configuration
│   ├── routes.config.ts      # Route registration
│   ├── socket.config.ts      # Socket.IO setup
│   ├── swagger.config.ts     # API documentation
│   ├── monitoring.config.ts  # Monitoring setup
│   ├── secrets.config.ts     # Secrets management
│   └── virus-scan.config.ts  # ClamAV configuration
├── controllers/              # Request handlers (70+ files)
│   ├── authController.ts
│   ├── eventsController.ts
│   ├── scoringController.ts
│   └── ...
├── services/                 # Business logic (80+ files)
│   ├── AuthService.ts
│   ├── EventService.ts
│   ├── ScoringService.ts
│   └── ...
├── repositories/             # Data access layer
│   ├── BaseRepository.ts
│   └── ...
├── middleware/               # Express middleware
│   ├── auth.ts               # Authentication
│   ├── csrf.ts               # CSRF protection
│   ├── rateLimiting.ts       # Rate limiting
│   ├── errorHandler.ts       # Error handling
│   ├── requestLogger.ts      # Request logging
│   ├── permissions.ts        # Authorization
│   ├── cacheMiddleware.ts    # Response caching
│   ├── metrics.ts            # Prometheus metrics
│   └── ...
├── routes/                   # Route definitions (70+ files)
│   ├── authRoutes.ts
│   ├── eventsRoutes.ts
│   └── ...
├── types/                    # TypeScript type definitions
│   ├── express.d.ts          # Express type extensions
│   └── ...
├── utils/                    # Utility functions
│   ├── logger.ts             # Winston logger
│   ├── config.ts             # Config validation
│   └── ...
├── jobs/                     # Background jobs
│   └── ...
└── templates/                # Email/report templates
    └── ...
```

## Core Design Patterns

### 1. Layered Architecture

Each layer has a specific responsibility and only communicates with adjacent layers:

**Controller Layer:**
```typescript
// Example: EventsController
export class EventsController {
  constructor(
    @inject('EventService') private eventService: EventService
  ) {}

  async getEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await this.eventService.getEvent(req.params.id)
      res.json({ success: true, data: event })
    } catch (error) {
      next(error)
    }
  }
}
```

**Service Layer:**
```typescript
// Example: EventService
@injectable()
export class EventService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('CacheService') private cacheService: CacheService
  ) {}

  async getEvent(id: string): Promise<Event> {
    // Check cache
    const cached = await this.cacheService.get(`event:${id}`)
    if (cached) return cached

    // Fetch from database
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { contests: true }
    })

    if (!event) {
      throw new NotFoundError('Event not found')
    }

    // Cache result
    await this.cacheService.set(`event:${id}`, event, 300)

    return event
  }
}
```

### 2. Dependency Injection

Using TSyringe for loose coupling and testability:

```typescript
// Container setup (config/container.ts)
container.register('PrismaClient', { useValue: prisma })
container.register('EventService', { useClass: EventService })
container.register('CacheService', { useClass: CacheService })

// Injection in services
@injectable()
export class EventService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('CacheService') private cache: CacheService
  ) {}
}
```

### 3. Repository Pattern (Partial)

Data access abstraction for complex queries:

```typescript
@injectable()
export class BaseRepository<T> {
  constructor(
    @inject('PrismaClient') protected prisma: PrismaClient
  ) {}

  async findById(id: string): Promise<T | null> {
    // Implementation
  }

  async create(data: Partial<T>): Promise<T> {
    // Implementation
  }
}
```

### 4. Middleware Pipeline

Express middleware for cross-cutting concerns:

```typescript
// Request flow
app.use(helmet())                    // Security headers
app.use(cors(corsOptions))           // CORS
app.use(express.json())              // Body parsing
app.use(cookieParser())              // Cookie parsing
app.use(requestLogging)              // Request logging
app.use('/api/auth/', authLimiter)   // Rate limiting
app.use('/api/', csrfProtection)     // CSRF protection
app.use('/api/', authenticate)       // Authentication
app.use('/api/', metricsMiddleware)  // Metrics collection
```

### 5. Error Handling

Centralized error handling with custom error types:

```typescript
// Custom error classes
export class NotFoundError extends Error {
  statusCode = 404
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred', { error: err.message, stack: err.stack })

  if (err instanceof NotFoundError) {
    return res.status(404).json({ success: false, error: err.message })
  }

  res.status(500).json({ success: false, error: 'Internal server error' })
}
```

## Key Components

### 1. Authentication System

**JWT-Based Authentication:**
```typescript
// Generate token
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET!,
  { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
)

// Verify token (middleware)
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

**Password Security:**
- Bcrypt hashing with configurable rounds (default: 12)
- Password strength validation
- Password policy enforcement

### 2. Authorization System

**Role-Based Access Control (RBAC):**
```typescript
enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  BOARD = 'BOARD',
  JUDGE = 'JUDGE',
  CONTESTANT = 'CONTESTANT',
  EMCEE = 'EMCEE',
  TALLY_MASTER = 'TALLY_MASTER',
  AUDITOR = 'AUDITOR'
}

// Permission middleware
const requireRole = (...roles: UserRole[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
```

### 3. Caching Strategy

**Multi-Level Caching:**
```typescript
// Redis cache with in-memory fallback
@injectable()
export class CacheService {
  private memoryCache = new Map()

  async get(key: string): Promise<any> {
    try {
      // Try Redis first
      const value = await redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      // Fall back to memory cache
      return this.memoryCache.get(key)
    }
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      // Fall back to memory cache
      this.memoryCache.set(key, value)
      setTimeout(() => this.memoryCache.delete(key), ttl * 1000)
    }
  }
}
```

**Cache Invalidation:**
- Time-based expiration (TTL)
- Event-based invalidation
- Pattern-based deletion

### 4. Real-Time Communication

**Socket.IO Integration:**
```typescript
// Server setup
const io = new Server(server, {
  cors: { origin: allowedOrigins },
  transports: ['websocket', 'polling']
})

// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET!)
    socket.data.user = user
    next()
  } catch (error) {
    next(new Error('Authentication failed'))
  }
})

// Event handlers
io.on('connection', (socket) => {
  // Join role-specific rooms
  socket.join(`role:${socket.data.user.role}`)

  // Handle events
  socket.on('score:submit', handleScoreSubmit)
  socket.on('certification:update', handleCertificationUpdate)
})

// Broadcast updates
io.to(`role:JUDGE`).emit('scores:updated', scoreData)
```

### 5. Validation System

**Request Validation:**
```typescript
// Using express-validator
const validateEvent = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('startDate').isISO8601().withMessage('Invalid date'),
  body('endDate').isISO8601().custom((endDate, { req }) => {
    if (new Date(endDate) <= new Date(req.body.startDate)) {
      throw new Error('End date must be after start date')
    }
    return true
  }),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  }
]

router.post('/events', validateEvent, eventController.createEvent)
```

### 6. Database Access

**Prisma ORM:**
```typescript
// Type-safe queries
const event = await prisma.event.findUnique({
  where: { id: eventId },
  include: {
    contests: {
      include: {
        categories: {
          include: {
            scores: true,
            judges: true
          }
        }
      }
    }
  }
})

// Transactions
await prisma.$transaction(async (tx) => {
  const event = await tx.event.create({ data: eventData })
  const contest = await tx.contest.create({
    data: { ...contestData, eventId: event.id }
  })
  return { event, contest }
})
```

### 7. Background Jobs

**BullMQ Integration:**
```typescript
// Job queue setup
const backupQueue = new Queue('backups', {
  connection: redisConnection
})

// Job processor
const worker = new Worker('backups', async (job) => {
  const { type, options } = job.data
  await performBackup(type, options)
}, { connection: redisConnection })

// Schedule jobs
await backupQueue.add('scheduled-backup', {
  type: 'full',
  options: { compress: true }
}, {
  repeat: { cron: '0 2 * * *' } // Daily at 2 AM
})
```

### 8. Logging System

**Winston Logger:**
```typescript
// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
})

// Usage
logger.info('Event created', { eventId, userId })
logger.error('Database error', { error: err.message, stack: err.stack })
```

## API Route Structure

The application has 70+ route files organized by feature:

### Core Routes
- `/api/auth` - Authentication (login, logout, register)
- `/api/users` - User management
- `/api/events` - Event management
- `/api/contests` - Contest management
- `/api/categories` - Category management

### Scoring Routes
- `/api/scoring` - Score submission and retrieval
- `/api/results` - Results calculation
- `/api/deductions` - Deduction management
- `/api/commentary` - Judge commentary

### Certification Routes
- `/api/certifications` - Certification workflow
- `/api/category-certifications` - Category certification
- `/api/contest-certifications` - Contest certification
- `/api/judge-certifications` - Judge certification

### Role-Specific Routes
- `/api/admin` - Admin functions
- `/api/judge` - Judge features
- `/api/auditor` - Auditor features
- `/api/board` - Board member features
- `/api/tally-master` - Tally master features
- `/api/emcee` - Emcee features

### System Routes
- `/api/settings` - System settings
- `/api/backups` - Backup management
- `/api/reports` - Report generation
- `/api/notifications` - Notifications
- `/api/performance` - Performance metrics
- `/api/health` - Health checks

## Security Measures

### 1. Input Validation
- Express-validator for request validation
- Zod for TypeScript schema validation
- Prisma for SQL injection prevention

### 2. Authentication
- JWT tokens with short expiration
- Secure password hashing (bcrypt)
- Session management via Redis

### 3. Authorization
- Role-based access control
- Resource-level permissions
- Assignment-based access

### 4. Protection Mechanisms
- CSRF protection (csurf)
- Rate limiting (express-rate-limit)
- Helmet for security headers
- CORS configuration
- File upload validation

### 5. Data Security
- Encrypted sensitive data
- Audit logging
- Activity tracking
- IP address logging

## Performance Optimization

### 1. Database Optimization
- Connection pooling (configurable)
- Query optimization with indexes
- Eager/lazy loading strategies
- Pagination for large datasets

### 2. Caching
- Redis for distributed caching
- In-memory fallback
- Cache invalidation strategies
- Query result caching

### 3. Response Optimization
- Compression middleware
- HTTP caching headers
- Pagination
- Field selection

### 4. Monitoring
- Prometheus metrics
- Performance logging
- Error tracking
- Health checks

## Testing Strategy

### 1. Unit Tests
- Service layer testing
- Utility function testing
- Validation testing

### 2. Integration Tests
- API endpoint testing
- Database integration testing
- External service mocking

### 3. E2E Tests
- Playwright for browser testing
- Full workflow testing
- Multi-role scenarios

## Configuration Management

### Environment Variables
All configuration via environment variables:
```
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
CSRF_SECRET=...
```

### Configuration Validation
Startup validation ensures all required config is present:
```typescript
export const validateProductionConfig = () => {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'CSRF_SECRET',
    'SESSION_SECRET'
  ]

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required config: ${key}`)
    }
  }
}
```

## Error Handling Strategy

### 1. Custom Error Classes
```typescript
export class ValidationError extends Error {
  statusCode = 400
  constructor(message: string, public errors?: any[]) {
    super(message)
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401
}

export class ForbiddenError extends Error {
  statusCode = 403
}

export class NotFoundError extends Error {
  statusCode = 404
}
```

### 2. Global Error Handler
Catches all errors and formats responses:
```typescript
export const errorHandler = (err, req, res, next) => {
  logger.error('Error', { error: err.message, stack: err.stack })

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}
```

### 3. Async Error Handling
All async routes wrapped with error handling:
```typescript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

router.get('/events/:id', asyncHandler(async (req, res) => {
  const event = await eventService.getEvent(req.params.id)
  res.json({ success: true, data: event })
}))
```

## Deployment Considerations

### 1. Graceful Shutdown
```typescript
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close()
  await prisma.$disconnect()
  await redis.quit()
  process.exit(0)
})
```

### 2. Health Checks
```typescript
app.get('/health', async (req, res) => {
  const dbHealthy = await testDatabaseConnection()
  res.json({
    status: dbHealthy ? 'OK' : 'DEGRADED',
    uptime: process.uptime(),
    database: dbHealthy ? 'connected' : 'disconnected'
  })
})
```

### 3. Metrics Export
Prometheus-compatible metrics at `/metrics`

## Related Documentation

- [System Architecture Overview](./overview.md)
- [Frontend Architecture](./frontend-architecture.md)
- [Database Schema](./database-schema.md)
- [Security Model](./security-model.md)
- [API Documentation](../07-api/README.md)
- [Coding Standards](../04-development/coding-standards.md)
