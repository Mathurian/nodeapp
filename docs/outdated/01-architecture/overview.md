# System Architecture Overview

## Introduction

The Event Manager Contest System is a modern, full-stack web application designed to manage contest events, scoring, judging, and certification workflows. The system follows a three-tier architecture with a clear separation of concerns.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript                                          │
│  - React Router (SPA routing)                                   │
│  - Tailwind CSS (styling)                                       │
│  - Socket.IO Client (real-time)                                 │
│  - Axios (HTTP client)                                          │
│  - React Query (data fetching/caching)                          │
└─────────────────────────────────────────────────────────────────┘
                           ↓ HTTPS/WSS
┌─────────────────────────────────────────────────────────────────┐
│                    Reverse Proxy Layer (Optional)                │
├─────────────────────────────────────────────────────────────────┤
│  Nginx                                                           │
│  - SSL/TLS termination                                          │
│  - Static file serving                                          │
│  - Load balancing                                               │
│  - Rate limiting                                                │
└─────────────────────────────────────────────────────────────────┘
                           ↓ HTTP
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Node.js + Express + TypeScript                                 │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Middleware  │  │   Routes     │  │ Socket.IO    │         │
│  │              │  │              │  │              │         │
│  │ - Auth       │  │ - REST APIs  │  │ - Real-time  │         │
│  │ - CSRF       │  │ - GraphQL    │  │ - Events     │         │
│  │ - Rate Limit │  │ - WebSocket  │  │ - Rooms      │         │
│  │ - Validation │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Controllers  │  │  Services    │  │ Repositories │         │
│  │              │  │              │  │              │         │
│  │ - Request    │  │ - Business   │  │ - Data       │         │
│  │   Handling   │  │   Logic      │  │   Access     │         │
│  │ - Response   │  │ - Validation │  │ - Queries    │         │
│  │   Formatting │  │ - Workflows  │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  Dependency Injection: TSyringe                                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Caching Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  Redis (Primary) / In-Memory (Fallback)                         │
│  - Session storage                                              │
│  - Query result caching                                         │
│  - Rate limiting counters                                       │
│  - Real-time state synchronization                             │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL 16                                                   │
│  - Prisma ORM                                                   │
│  - Connection pooling                                           │
│  - Transactions                                                 │
│  - Migrations                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Supporting Services                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  ClamAV      │  │  BullMQ      │  │  Winston     │         │
│  │              │  │              │  │              │         │
│  │ - Virus      │  │ - Background │  │ - Logging    │         │
│  │   Scanning   │  │   Jobs       │  │ - Audit      │         │
│  │              │  │ - Scheduling │  │   Trail      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture Layers

### 1. Client Layer (Frontend)

**Technology Stack:**
- React 18 with TypeScript
- Vite (build tool)
- React Router v6 (client-side routing)
- Tailwind CSS (styling)
- Socket.IO Client (WebSocket)
- Axios (HTTP client)
- React Query (server state management)

**Key Characteristics:**
- Single Page Application (SPA)
- Component-based architecture
- Progressive Web App (PWA) capabilities
- Responsive design (mobile-first)
- Real-time updates via WebSocket
- Client-side caching and state management

### 2. Application Layer (Backend)

**Technology Stack:**
- Node.js (LTS version)
- Express.js 4.x
- TypeScript 5.x
- Prisma ORM
- Socket.IO (WebSocket server)
- TSyringe (dependency injection)

**Design Patterns:**
- **Layered Architecture**: Clear separation between Controllers, Services, and Repositories
- **Dependency Injection**: Using TSyringe for loose coupling and testability
- **Repository Pattern**: Data access abstraction
- **Service Layer Pattern**: Business logic encapsulation
- **Middleware Pipeline**: Request processing chain
- **Event-Driven Architecture**: Real-time updates via Socket.IO

**Key Components:**

#### Middleware Layer
- Authentication (JWT-based)
- Authorization (role-based access control)
- CSRF protection
- Rate limiting
- Request validation
- Error handling
- Logging and metrics

#### Controllers
- Handle HTTP requests/responses
- Input validation
- Response formatting
- Delegate to services

#### Services
- Implement business logic
- Orchestrate workflows
- Validation and authorization
- Integration with external services

#### Repositories
- Data access layer
- Database queries
- Transaction management
- Data mapping

### 3. Data Layer

**PostgreSQL Database:**
- Primary data store
- ACID compliance
- Relational data model
- Connection pooling (configurable)
- Automatic migrations via Prisma

**Prisma ORM Features:**
- Type-safe database client
- Declarative schema
- Migration system
- Query builder
- Relation loading

### 4. Caching Layer

**Redis (with fallback):**
- Session management
- Query result caching
- Rate limiting state
- Real-time data synchronization
- Pub/Sub for distributed events

**Fallback Strategy:**
- In-memory cache when Redis unavailable
- Graceful degradation
- Automatic reconnection

### 5. Supporting Services

#### ClamAV (Virus Scanning)
- File upload scanning
- Malware detection
- Configurable fallback behavior

#### BullMQ (Job Queue)
- Background job processing
- Scheduled tasks
- Retry mechanism
- Job prioritization

#### Winston (Logging)
- Structured logging
- Multiple transports (file, console)
- Log levels (error, warn, info, debug)
- Audit trail

## Key Architectural Decisions

### 1. Monolithic vs. Microservices

**Decision:** Monolithic architecture with modular design

**Rationale:**
- Simpler deployment and operations
- Lower infrastructure costs
- Easier development and debugging
- Sufficient for expected scale
- Modular design allows future migration to microservices

### 2. TypeScript Throughout

**Decision:** Full TypeScript adoption (backend and frontend)

**Rationale:**
- Type safety reduces runtime errors
- Better IDE support and developer experience
- Self-documenting code
- Easier refactoring
- Industry best practice

### 3. Prisma ORM

**Decision:** Use Prisma instead of raw SQL or traditional ORMs

**Rationale:**
- Type-safe database access
- Excellent TypeScript integration
- Declarative schema management
- Automatic migrations
- Superior developer experience

### 4. Socket.IO for Real-Time

**Decision:** Use Socket.IO over Server-Sent Events or polling

**Rationale:**
- Bidirectional communication
- Automatic reconnection
- Room/namespace support
- Fallback mechanisms
- Wide browser support

### 5. JWT Authentication

**Decision:** JWT-based authentication with short-lived tokens

**Rationale:**
- Stateless authentication
- Scalability (no server-side sessions)
- Mobile-friendly
- Standard protocol
- Easy integration with third-party services

### 6. Dependency Injection

**Decision:** Use TSyringe for dependency injection

**Rationale:**
- Testability (easy mocking)
- Loose coupling
- Better code organization
- Lifecycle management
- Industry standard pattern

## Security Architecture

### Defense in Depth

1. **Network Level**
   - HTTPS/TLS encryption
   - CORS configuration
   - Rate limiting

2. **Application Level**
   - JWT authentication
   - CSRF protection
   - Input validation
   - SQL injection prevention (Prisma)
   - XSS prevention (React escaping)

3. **Data Level**
   - Password hashing (bcrypt)
   - Encrypted sensitive data
   - Database connection encryption
   - Audit logging

4. **File Security**
   - Virus scanning (ClamAV)
   - File type validation
   - Size limits
   - Secure file storage

## Scalability Considerations

### Horizontal Scaling

The application is designed to support horizontal scaling:

1. **Stateless Application**: JWT-based auth enables stateless servers
2. **Session Store**: Redis provides shared session storage
3. **File Storage**: Can be moved to S3/object storage
4. **Database**: Read replicas and connection pooling
5. **Load Balancer**: Nginx or cloud load balancers

### Performance Optimization

1. **Caching Strategy**
   - Redis for frequently accessed data
   - In-memory caching with TTL
   - HTTP caching headers

2. **Database Optimization**
   - Indexed queries
   - Connection pooling
   - Query optimization
   - Pagination

3. **Frontend Optimization**
   - Code splitting
   - Lazy loading
   - Asset optimization
   - CDN delivery

## Deployment Architecture

### Docker-Based Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Nginx       │  │  Application │  │  PostgreSQL  │     │
│  │  (Proxy)     │  │  (Node.js)   │  │  (Database)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Redis       │  │  ClamAV      │  │  Prometheus  │     │
│  │  (Cache)     │  │  (Scanner)   │  │  (Metrics)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐                                           │
│  │  Grafana     │                                           │
│  │  (Monitoring)│                                           │
│  └──────────────┘                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Health Monitoring

- Application health endpoint: `/health`
- Database connection check
- Redis connection check
- Service dependency checks
- Prometheus metrics: `/metrics`

## Data Flow Examples

### 1. User Authentication Flow

```
User → Frontend → POST /api/auth/login
                       ↓
                  Validate credentials
                       ↓
                  Generate JWT token
                       ↓
                  Store session in Redis
                       ↓
                  Return token + user data
                       ↓
                  Frontend stores token
                       ↓
                  Subsequent requests include token
```

### 2. Score Submission Flow

```
Judge → Frontend → POST /api/scores
                       ↓
                  Auth Middleware (verify JWT)
                       ↓
                  CSRF Middleware (verify token)
                       ↓
                  Validation Middleware
                       ↓
                  Controller → Service
                       ↓
                  Business Logic Validation
                       ↓
                  Repository → Database
                       ↓
                  Socket.IO Broadcast
                       ↓
                  Real-time update to clients
```

### 3. File Upload Flow

```
User → Frontend → POST /api/uploads
                       ↓
                  Multer (file handling)
                       ↓
                  File Validation
                       ↓
                  ClamAV Virus Scan
                       ↓
                  Store file metadata in DB
                       ↓
                  Return file reference
```

## Technology Versions

| Technology      | Version | Purpose                          |
|----------------|---------|----------------------------------|
| Node.js        | 20.x LTS| Runtime environment              |
| TypeScript     | 5.9.x   | Language                         |
| Express        | 4.21.x  | Web framework                    |
| React          | 18.2.x  | Frontend framework               |
| PostgreSQL     | 16.x    | Database                         |
| Prisma         | 6.18.x  | ORM                              |
| Redis          | 7.x     | Cache and session store          |
| Socket.IO      | 4.8.x   | Real-time communication          |
| ClamAV         | Latest  | Virus scanning                   |
| Nginx          | Alpine  | Reverse proxy                    |

## Related Documentation

- [Backend Architecture](./backend-architecture.md) - Detailed backend design
- [Frontend Architecture](./frontend-architecture.md) - Frontend structure
- [Database Schema](./database-schema.md) - Database design
- [Security Model](./security-model.md) - Security implementation
- [API Documentation](../07-api/README.md) - API reference
- [Deployment Guide](../05-deployment/README.md) - Deployment procedures

## Conclusion

The Event Manager architecture is designed for:
- **Reliability**: Error handling, logging, monitoring
- **Security**: Multiple layers of protection
- **Scalability**: Horizontal scaling capabilities
- **Maintainability**: Clean code, type safety, modular design
- **Performance**: Caching, optimization, efficient queries
- **Developer Experience**: TypeScript, modern tooling, clear patterns
