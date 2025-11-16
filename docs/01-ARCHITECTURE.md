# System Architecture

This document provides a comprehensive overview of the Event Manager system architecture, including technology stack, design patterns, and component organization.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Technology Stack](#technology-stack)
- [Directory Structure](#directory-structure)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Database Architecture](#database-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Real-Time Communication](#real-time-communication)
- [Caching Strategy](#caching-strategy)
- [Design Patterns](#design-patterns)
- [Performance Optimizations](#performance-optimizations)

## High-Level Architecture

Event Manager follows a modern three-tier architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  React 18 SPA (TypeScript + Tailwind CSS)          │    │
│  │  - Pages (40+)                                      │    │
│  │  - Components (80+)                                 │    │
│  │  - Context API for State Management                │    │
│  │  - React Query for Server State                    │    │
│  │  - Socket.IO Client for Real-time                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ▼ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Node.js 18+ / Express (TypeScript)                │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  API Layer (69 Routes)                       │  │    │
│  │  │  - RESTful endpoints                         │  │    │
│  │  │  - WebSocket handlers                        │  │    │
│  │  │  - Middleware stack                          │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Controllers (70)                            │  │    │
│  │  │  - Request handling                          │  │    │
│  │  │  - Input validation                          │  │    │
│  │  │  - Response formatting                       │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Services (79)                               │  │    │
│  │  │  - Business logic                            │  │    │
│  │  │  - Data processing                           │  │    │
│  │  │  - External integrations                     │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │  Repositories                                │  │    │
│  │  │  - Data access layer                         │  │    │
│  │  │  - Query optimization                        │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ▼ Prisma ORM
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  PostgreSQL 12+                                     │    │
│  │  - 60+ Tables                                       │    │
│  │  - 80+ Indexes                                      │    │
│  │  - Multi-tenant data isolation                     │    │
│  │  - JSONB for flexible data                         │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Redis (Optional)                                   │    │
│  │  - User session cache                               │    │
│  │  - Query result cache                               │    │
│  │  - Rate limiting                                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Supporting Services

```
┌──────────────────────────────────────────────────────────┐
│  Real-Time Communication                                  │
│  Socket.IO Server - Live updates, notifications          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Background Jobs                                          │
│  - Email sending (EmailJobProcessor)                     │
│  - Report generation (ReportJobProcessor)                │
│  - Scheduled backups (ScheduledBackupService)           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  External Services                                        │
│  - ClamAV (virus scanning)                               │
│  - SMTP (email delivery)                                 │
│  - File storage                                          │
└──────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 18+ | JavaScript runtime |
| Framework | Express | 4.x | Web application framework |
| Language | TypeScript | 5.9 | Type-safe development |
| ORM | Prisma | 6.18 | Database access layer |
| Database | PostgreSQL | 12+ | Primary data store |
| Cache | Redis + Node-Cache | Latest | Caching layer |
| Real-time | Socket.IO | 4.8 | WebSocket communication |
| Authentication | JWT | 9.0 | Token-based auth |
| Validation | Express-Validator | 7.x | Input validation |
| Jobs | BullMQ | 5.x | Background job processing |
| Logging | Winston | 3.x | Application logging |
| Monitoring | Prometheus | 15.x | Metrics collection |

### Frontend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | React | 18.2 | UI library |
| Language | TypeScript | 5.2 | Type-safe development |
| Build Tool | Vite | 5.0 | Fast build tool |
| Styling | Tailwind CSS | 3.3 | Utility-first CSS |
| Router | React Router | 6.8 | Client-side routing |
| State | Context API + React Query | - | State management |
| Real-time | Socket.IO Client | 4.7 | WebSocket client |
| HTTP Client | Axios | 1.6 | API communication |
| Forms | React Hook Form | - | Form handling |
| Icons | Heroicons | 2.1 | Icon library |

### Development & Testing

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Testing (Backend) | Jest | Unit/Integration tests |
| Testing (Frontend) | React Testing Library | Component tests |
| E2E Testing | Playwright | End-to-end tests |
| Type Checking | TypeScript Compiler | Static analysis |
| Linting | ESLint | Code quality |
| API Documentation | Swagger/OpenAPI | API docs |

## Directory Structure

### Backend Structure (`/src`)

```
src/
├── config/               # Configuration modules
│   ├── database.ts       # Prisma client & connection
│   ├── express.config.ts # Express middleware setup
│   ├── socket.config.ts  # Socket.IO configuration
│   ├── routes.config.ts  # Route registration
│   ├── swagger.config.ts # API documentation
│   └── container.ts      # Dependency injection
├── controllers/          # Request handlers (70 files)
│   ├── authController.ts
│   ├── eventsController.ts
│   ├── scoringController.ts
│   └── ...
├── services/             # Business logic (79 files)
│   ├── AuthService.ts
│   ├── EventService.ts
│   ├── ScoringService.ts
│   └── ...
├── repositories/         # Data access layer
│   ├── base.repository.interface.ts
│   ├── user.repository.ts
│   └── ...
├── middleware/           # Express middleware
│   ├── auth.ts           # JWT authentication
│   ├── permissions.ts    # RBAC authorization
│   ├── csrf.ts           # CSRF protection
│   ├── rateLimiting.ts   # Rate limiting
│   ├── errorHandler.ts   # Error handling
│   ├── validation.ts     # Input validation
│   └── tenantMiddleware.ts # Multi-tenancy
├── routes/               # API route definitions (69 files)
│   ├── authRoutes.ts
│   ├── eventsRoutes.ts
│   └── ...
├── jobs/                 # Background job processors
│   ├── EmailJobProcessor.ts
│   ├── ReportJobProcessor.ts
│   └── BaseJobProcessor.ts
├── types/                # TypeScript type definitions
│   ├── express.d.ts      # Express augmentations
│   ├── dtos/             # Data transfer objects
│   ├── models/           # Model types
│   └── services/         # Service interfaces
├── utils/                # Utility functions
│   ├── logger.ts         # Winston logger
│   ├── cache.ts          # Caching utilities
│   ├── validation.ts     # Validation helpers
│   └── config.ts         # Config validation
├── constants/            # Application constants
├── templates/            # Email/report templates
└── server.ts             # Application entry point
```

### Frontend Structure (`/frontend/src`)

```
frontend/src/
├── components/           # Reusable UI components (80+)
│   ├── Layout.tsx        # Main layout wrapper
│   ├── DataTable.tsx     # Reusable data table
│   ├── Modal.tsx         # Modal dialog
│   ├── LoadingSpinner.tsx
│   ├── ErrorBoundary.tsx
│   ├── bulk/             # Bulk operation components
│   ├── charts/           # Chart components
│   ├── notifications/    # Notification components
│   ├── settings/         # Settings components
│   └── widgets/          # Dashboard widgets
├── pages/                # Page components (40+)
│   ├── LoginPage.tsx
│   ├── EventsPage.tsx
│   ├── ScoringPage.tsx
│   ├── AdminPage.tsx
│   ├── print/            # Print-specific pages
│   └── ...
├── contexts/             # React Context providers
│   ├── AuthContext.tsx   # Authentication state
│   ├── ThemeContext.tsx  # Theme management
│   ├── SocketContext.tsx # WebSocket connection
│   ├── ToastContext.tsx  # Toast notifications
│   └── TenantContext.tsx # Multi-tenancy
├── hooks/                # Custom React hooks
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   ├── useOnlineStatus.ts
│   ├── usePWA.ts
│   └── ...
├── services/             # API client services
│   ├── api.ts            # Axios configuration
│   ├── TourService.ts    # Guided tours
│   └── tours/            # Tour definitions
├── utils/                # Utility functions
│   ├── helpers.ts
│   ├── permissions.ts
│   ├── dateUtils.ts
│   ├── errorHandler.ts
│   └── ...
├── types/                # TypeScript types
│   └── index.ts
├── constants/            # Frontend constants
│   └── roles.ts
├── styles/               # Global styles
│   └── high-contrast.css
├── App.tsx               # Root component
├── main.tsx              # Application entry
└── index.css             # Global styles
```

## Backend Architecture

### Layered Architecture

Event Manager backend follows a strict layered architecture:

```
Routes → Controllers → Services → Repositories → Database
  ↓          ↓            ↓            ↓
Middleware  Validation  Business    Data Access
                        Logic
```

### 1. Routes Layer

**Responsibility**: Define API endpoints and apply route-specific middleware

**Files**: 69 route modules in `src/routes/`

**Example**:
```typescript
// src/routes/eventsRoutes.ts
router.get('/', authenticateToken, requireRole(['ADMIN', 'ORGANIZER']),
  eventController.getAllEvents);
router.post('/', authenticateToken, requireRole(['ADMIN', 'ORGANIZER']),
  validateEvent, eventController.createEvent);
```

**Key Features**:
- RESTful endpoint definitions
- Route-specific middleware application
- Parameter validation
- Role-based access control

### 2. Controllers Layer

**Responsibility**: Handle HTTP requests/responses, coordinate service calls

**Files**: 70 controller modules in `src/controllers/`

**Example Structure**:
```typescript
export const eventController = {
  async getAllEvents(req, res, next) {
    try {
      const events = await eventService.getEventsByTenant(req.tenantId);
      res.json({ success: true, data: events });
    } catch (error) {
      next(error);
    }
  }
};
```

**Responsibilities**:
- Request parsing and validation
- Service orchestration
- Response formatting
- Error handling delegation

### 3. Services Layer

**Responsibility**: Implement business logic, coordinate repositories

**Files**: 79 service modules in `src/services/`

**Key Services**:
- `AuthService` - Authentication and authorization
- `EventService` - Event management
- `ScoringService` - Score calculation and validation
- `CertificationService` - Multi-stage certification workflow
- `NotificationService` - Real-time notifications
- `ReportingService` - Report generation
- `BackupService` - Automated backups

**Example**:
```typescript
export class EventService extends BaseService {
  async createEvent(tenantId: string, data: CreateEventDto) {
    // Validation logic
    // Business rules
    // Data transformation
    return await this.repository.create(tenantId, data);
  }
}
```

### 4. Repositories Layer

**Responsibility**: Data access and query optimization

**Pattern**: Repository pattern with Prisma ORM

**Example**:
```typescript
export class EventRepository {
  async findByTenant(tenantId: string) {
    return await prisma.event.findMany({
      where: { tenantId },
      include: { contests: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
```

### Middleware Stack

Applied in order:

1. **CORS** - Cross-origin resource sharing
2. **Helmet** - Security headers
3. **Compression** - Response compression
4. **Morgan** - HTTP request logging
5. **Cookie Parser** - Cookie handling
6. **Express JSON/URLEncoded** - Body parsing
7. **Rate Limiting** - DDoS protection
8. **Tenant Middleware** - Multi-tenancy context
9. **CSRF Protection** - CSRF token validation
10. **Authentication** - JWT validation
11. **Authorization** - Role-based access
12. **Error Handling** - Centralized error handling

## Frontend Architecture

### Component Hierarchy

```
App (ErrorBoundary)
└── QueryClientProvider
    └── ThemeProvider
        └── ToastProvider
            └── Router
                └── HighContrastProvider
                    └── AuthProvider
                        └── SocketProvider
                            ├── LoginPage (public)
                            └── ProtectedRoute
                                └── Layout
                                    ├── TopNavigation
                                    ├── Sidebar
                                    └── Page Content
                                        └── RoleProtectedRoute
                                            └── Page Component
```

### State Management Strategy

**Global State (Context API)**:
- `AuthContext` - User authentication, session, profile
- `ThemeContext` - Dark/light mode, theme preferences
- `SocketContext` - WebSocket connection, event handling
- `ToastContext` - Toast notifications
- `TenantContext` - Multi-tenant context
- `HighContrastContext` - Accessibility mode

**Server State (React Query)**:
- API data fetching
- Caching and invalidation
- Background refetching
- Optimistic updates

**Local State**:
- Component-specific state (useState)
- Form state (controlled components)
- UI state (modals, dropdowns)

### Routing Architecture

**Public Routes**:
- `/login` - Login page
- `/forgot-password` - Password recovery
- `/reset-password` - Password reset
- `/logout` - Logout handler

**Protected Routes** (require authentication):
- `/` - Home redirect (role-based)
- `/events` - Event management
- `/contests/:id` - Contest management
- `/categories/:id` - Category management
- `/scoring` - Score entry (Judge role)
- `/results` - View results
- `/admin` - Admin panel (Admin role)
- `/auditor` - Auditor workspace (Auditor role)
- `/board` - Board approval (Board role)
- `/tally` - Tally Master workspace
- `/emcee` - Emcee scripts
- `/settings` - User settings
- `/help` - Help system
- `/docs` - Documentation viewer

### Component Patterns

**1. Container/Presentational Pattern**:
```
EventsPage (Container) → manages state, API calls
└── EventList (Presentational) → displays UI
    └── EventCard (Presentational) → individual item
```

**2. Compound Components**:
```
<DataTable>
  <DataTable.Header />
  <DataTable.Body />
  <DataTable.Row />
  <DataTable.Pagination />
</DataTable>
```

**3. Render Props** (for complex logic):
```typescript
<PermissionGate render={(hasPermission) =>
  hasPermission ? <AdminPanel /> : <AccessDenied />
} />
```

**4. Custom Hooks** (for reusable logic):
```typescript
const { user, login, logout } = useAuth();
const { hasPermission } = usePermissions();
const { isOnline } = useOnlineStatus();
```

## Database Architecture

### Schema Design

**Multi-Tenancy**:
- All tables include `tenantId` foreign key
- Tenant isolation enforced at query level
- Indexes on `tenantId` for performance

**Key Models** (60+ total):
- `Tenant` - Multi-tenant organization
- `User` - System users with roles
- `Event` - Top-level event container
- `Contest` - Competition within event
- `Category` - Scoring category
- `Contestant` - Participant
- `Judge` - Scoring judge
- `Score` - Individual scores
- `Certification` - Certification workflow
- `Notification` - Real-time notifications
- `AuditLog` - Audit trail

**Relationships**:
- One-to-Many: Event → Contests, Contest → Categories
- Many-to-Many: Category ↔ Judges, Category ↔ Contestants
- Complex: Multi-stage certification with multiple approval levels

### Indexing Strategy

**80+ indexes** for optimal performance:
- Primary keys (automatic)
- Foreign keys (tenant relationships)
- Composite indexes (tenantId + other fields)
- Query-specific indexes (filtering, sorting)

Example indexes:
```prisma
@@index([tenantId])
@@index([tenantId, eventId])
@@index([userId, createdAt])
@@index([categoryId, judgeId])
```

### Data Integrity

- Foreign key constraints
- Cascade deletions for tenant data
- Check constraints on enums
- Unique constraints on business keys
- NOT NULL enforcement

## Authentication & Authorization

### Authentication Flow

```
1. User submits credentials
2. Server validates credentials
3. Server generates JWT with userId, role, tenantId, sessionVersion
4. JWT returned to client
5. Client stores JWT in memory (Context)
6. Client includes JWT in Authorization header for API requests
7. Server validates JWT on each request
8. Server checks session version against database
9. Request processed if valid
```

### JWT Structure

```json
{
  "userId": "clx...",
  "email": "user@example.com",
  "role": "ADMIN",
  "tenantId": "cly...",
  "sessionVersion": 1,
  "iat": 1699999999,
  "exp": 1700003599
}
```

### Session Versioning

- Each user has a `sessionVersion` field
- Incremented on password change, logout, security events
- Invalidates all existing tokens
- Cached in Redis for fast validation

### Authorization (RBAC)

**Role Hierarchy**:
```
ADMIN (full access)
  └── ORGANIZER (event management)
      ├── BOARD (approval authority)
      ├── AUDITOR (audit access)
      ├── TALLY_MASTER (verification)
      ├── JUDGE (scoring)
      ├── EMCEE (scripts)
      └── CONTESTANT (limited view)
```

**Permission Matrix**: See `src/middleware/permissions.ts`

## Real-Time Communication

### Socket.IO Architecture

**Connection Flow**:
```
1. Client authenticates with JWT
2. Socket.IO validates JWT
3. Client auto-joins user-specific room: `user:{userId}`
4. Server emits events to rooms
5. Client receives and processes events
```

**Event Types**:
- `score:updated` - Score changes
- `certification:updated` - Certification status
- `notification:new` - New notification
- `user:updated` - User data changes
- `event:updated` - Event changes

**Room Strategy**:
- `user:{userId}` - User-specific events
- `event:{eventId}` - Event-wide broadcasts
- `category:{categoryId}` - Category-specific updates

## Caching Strategy

### Multi-Layer Cache

**Level 1: Redis (if available)**
- User sessions
- Query results
- Rate limiting counters
- TTL: 1-60 minutes

**Level 2: Node-Cache (in-memory)**
- User data (1 hour TTL)
- Configuration (5 minutes TTL)
- Fallback when Redis unavailable

**Cache Invalidation**:
- On data mutation
- On session version change
- Time-based expiration
- Manual cache clear endpoint

## Design Patterns

### Backend Patterns

1. **Repository Pattern** - Data access abstraction
2. **Service Layer Pattern** - Business logic separation
3. **Dependency Injection** - Using TSyringe
4. **Factory Pattern** - Object creation (e.g., SecretsManager)
5. **Singleton Pattern** - Database connection, cache
6. **Observer Pattern** - Event emitters for real-time updates
7. **Strategy Pattern** - Different backup strategies
8. **Middleware Pattern** - Express middleware chain

### Frontend Patterns

1. **Container/Presentational** - Logic/UI separation
2. **Compound Components** - Flexible component composition
3. **Custom Hooks** - Reusable stateful logic
4. **Higher-Order Components** - Cross-cutting concerns
5. **Provider Pattern** - Context API
6. **Render Props** - Dynamic rendering logic

## Performance Optimizations

### Backend Optimizations

1. **Database**:
   - 80+ strategic indexes
   - Connection pooling (configurable limit)
   - Query optimization with Prisma
   - Lazy loading relationships

2. **Caching**:
   - Redis for session data (50-70% query reduction)
   - User data caching (1 hour TTL)
   - Query result caching

3. **API**:
   - Response compression (gzip)
   - Pagination on all list endpoints
   - Field selection (partial responses)
   - Rate limiting to prevent abuse

4. **Jobs**:
   - Background processing for heavy tasks
   - Email queue processing
   - Report generation in background

### Frontend Optimizations

1. **Code Splitting**:
   - Lazy loading of routes
   - Dynamic imports for large components
   - Separate chunks for different pages

2. **State Management**:
   - React Query for server state caching
   - Optimistic updates
   - Background refetching

3. **Rendering**:
   - React.memo for expensive components
   - useMemo/useCallback for computations
   - Virtualization for large lists

4. **Assets**:
   - Image optimization
   - Icon sprite sheets (Heroicons)
   - CSS purging (Tailwind)
   - Static asset caching

## Monitoring & Observability

### Logging

- **Winston** for structured logging
- Log levels: ERROR, WARN, INFO, DEBUG
- Separate log files by type
- Log rotation (daily, size-based)

### Metrics

- **Prometheus** metrics at `/metrics`
- Custom metrics:
  - Request count by endpoint
  - Response times
  - Error rates
  - Active connections
  - Cache hit/miss rates

### Health Checks

- `/health` endpoint
- Database connectivity
- Redis connectivity
- System uptime
- Detailed status information

---

**Next**: [Getting Started Guide](02-GETTING-STARTED.md)
