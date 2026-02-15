# Event Manager Architecture

This section contains technical architecture documentation for Event Manager.

---

## Overview

Event Manager is a modern, full-stack TypeScript application built with:
- **Backend:** Node.js + Express + Prisma + PostgreSQL
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Real-time:** Socket.IO for WebSocket communication
- **Database:** PostgreSQL with Prisma ORM
- **Caching:** Redis (optional)
- **Security:** JWT authentication, RBAC, CSRF protection

---

## Architecture Documents

### High-Level Architecture
- **[System Overview](./overview.md)** - Architecture diagram and components
- **[Architecture Review (Nov 2025)](./architecture-review-november-2025.md)** - Current state analysis
- **[Implementation Plan (Nov 2025)](./implementation-plan-november-2025.md)** - Enhancement roadmap (4 phases)

### Component Architecture
- **[Backend Architecture](./backend-architecture.md)** - Node.js backend design
- **[Frontend Architecture](./frontend-architecture.md)** - React frontend structure
- **[Database Schema](./database-schema.md)** - Prisma models and relationships
- **[Security Model](./security-model.md)** - Authentication and authorization

---

## Key Architectural Patterns

### Backend Patterns
- **Dependency Injection:** IoC container for service management
- **Repository Pattern:** Data access abstraction
- **Middleware Chain:** Express middleware for cross-cutting concerns
- **Controller-Service-Repository:** Layered architecture
- **Event-Driven:** WebSocket for real-time updates

### Frontend Patterns
- **Component-Based:** React functional components
- **Context API:** Global state management
- **Custom Hooks:** Reusable logic encapsulation
- **Route-Based Code Splitting:** Optimized loading (Phase 2)
- **Progressive Web App:** Offline capabilities (Phase 2)

### Database Patterns
- **ORM:** Prisma for type-safe database access
- **Migrations:** Version-controlled schema changes
- **Relationships:** Normalized relational design
- **Indexes:** Optimized query performance (Phase 2)

---

## Technology Stack

### Backend
```
Node.js 18+
├── Express.js (Web framework)
├── Prisma (ORM)
├── Socket.IO (WebSockets)
├── JWT (Authentication)
├── bcrypt (Password hashing)
├── Winston (Logging)
├── Redis (Caching - optional)
└── BullMQ (Background jobs - Phase 2)
```

### Frontend
```
React 18
├── TypeScript (Type safety)
├── Vite (Build tool)
├── Tailwind CSS (Styling)
├── React Router (Routing)
├── React Query (Data fetching)
├── React Hook Form (Forms)
├── Socket.IO Client (Real-time)
├── Recharts (Visualization - Phase 2)
└── Workbox (PWA - Phase 2)
```

### Infrastructure
```
PostgreSQL 15 (Database)
├── Redis (Caching)
├── Nginx (Reverse proxy)
├── Docker (Containerization)
├── Prometheus (Metrics)
├── Grafana (Dashboards)
└── ClamAV (Virus scanning)
```

---

## System Components

### Core Services
1. **Authentication Service:** JWT-based auth with session management
2. **Authorization Service:** Role-based access control (8 roles)
3. **Event Service:** Event and contest management
4. **Scoring Service:** Score submission and certification
5. **User Service:** User profile and management
6. **File Service:** Upload handling and virus scanning
7. **Notification Service:** Real-time updates via WebSocket
8. **Cache Service:** Redis-based caching (optional)

### Frontend Modules
1. **Auth Context:** Authentication state and token management
2. **Socket Context:** WebSocket connection and event handling
3. **Theme Context:** Dynamic theme customization
4. **Toast Context:** User notifications
5. **Pages:** Role-specific dashboards and views
6. **Components:** Reusable UI components
7. **Services:** API client and data fetching

---

## Data Flow

### Request Flow (Backend)
```
Client Request
    ↓
Nginx (Reverse Proxy)
    ↓
Express Middleware Chain
    ├── CORS Handler
    ├── Security Headers
    ├── Body Parser
    ├── Authentication (JWT)
    ├── Authorization (RBAC)
    └── CSRF Protection
    ↓
Route Handler
    ↓
Controller
    ↓
Service Layer
    ↓
Repository (Prisma)
    ↓
PostgreSQL Database
    ↓
Response
    ↓
Client
```

### Real-Time Flow (WebSocket)
```
Client Event
    ↓
Socket.IO Client
    ↓
Socket.IO Server
    ↓
Authentication Check
    ↓
Event Handler
    ↓
Broadcast to Rooms
    ↓
Socket.IO Client
    ↓
Client Update
```

---

## Security Architecture

### Authentication Flow
1. User submits credentials
2. Server validates against database (bcrypt)
3. Server generates JWT token
4. Server creates session record
5. Client stores token (httpOnly cookie + localStorage)
6. Client includes token in subsequent requests
7. Server validates token on each request

### Authorization Model
- **8 User Roles:** ADMIN, ORGANIZER, JUDGE, CONTESTANT, EMCEE, TALLY_MASTER, AUDITOR, BOARD
- **Permission Mapping:** Each role has specific permissions
- **Route Protection:** Middleware checks role permissions
- **Data Isolation:** Users see only authorized data

### Security Features
- JWT with secure secret rotation
- bcrypt password hashing (12 rounds)
- CSRF protection on all mutating routes
- Rate limiting (configurable)
- Input validation and sanitization
- SQL injection prevention (Prisma)
- XSS protection (CSP headers)
- Secrets management (AWS/Vault)
- Virus scanning (ClamAV)
- Audit logging

---

## Scalability Considerations

### Current Capacity
- **Users:** 100-1000 concurrent users
- **Events:** Dozens of events simultaneously
- **Database:** Optimized for 100k+ records
- **Response Time:** <100ms average

### Phase 2-4 Enhancements
- **Code Splitting:** 60% reduction in initial bundle
- **Database Indexes:** Faster queries
- **Connection Pooling:** Better resource utilization
- **Background Jobs:** Async processing
- **CDN Integration:** Static asset delivery
- **Redis Caching:** Reduced database load

### Future Scalability (Phase 4)
- **Microservices:** Service decomposition
- **Horizontal Scaling:** Multiple backend instances
- **Read Replicas:** Database read scaling
- **Multi-Tenancy:** Isolated customer instances
- **Message Queue:** Event-driven architecture

---

## Performance Metrics

### Current Baseline
- **Time to Interactive:** ~6 seconds
- **Initial Bundle:** 1.34MB
- **Lighthouse Score:** 75/100 (Performance)
- **API Response:** <100ms (average)
- **Database Query:** <50ms (average)

### Phase 2 Targets
- **Time to Interactive:** <3 seconds (50% improvement)
- **Initial Bundle:** <200KB (85% reduction)
- **Lighthouse Score:** 90+/100 (20% improvement)
- **API Response:** <50ms (50% improvement)
- **Database Query:** <25ms (50% improvement)

---

## Best Practices

### Code Organization
- **Clear separation:** Controllers, Services, Repositories
- **Single Responsibility:** Each module does one thing well
- **Dependency Injection:** Testable and maintainable
- **Type Safety:** 100% TypeScript coverage
- **Error Handling:** Comprehensive error boundaries

### Database Design
- **Normalized:** Proper relational structure
- **Indexed:** Fast queries on common fields
- **Constraints:** Data integrity enforced
- **Migrations:** Version-controlled schema
- **Backups:** Regular automated backups

### Security Practices
- **Principle of Least Privilege:** Minimal permissions
- **Defense in Depth:** Multiple security layers
- **Secrets Management:** Never hardcode secrets
- **Input Validation:** Always validate user input
- **Logging:** Comprehensive audit trail

---

## Further Reading

- **[Backend Architecture Details](./backend-architecture.md)**
- **[Frontend Architecture Details](./frontend-architecture.md)**
- **[Database Schema Reference](./database-schema.md)**
- **[Security Model Documentation](./security-model.md)**
- **[Implementation Plan (4 Phases)](./implementation-plan-november-2025.md)**
- **[Architecture Review](./architecture-review-november-2025.md)**

---

**For Developers:** This architecture supports modern development practices, type safety, and scalability.

**For Architects:** The modular design allows for incremental enhancements and future growth.

**For DevOps:** The containerized architecture simplifies deployment and scaling.
