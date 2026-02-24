# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant event and contest management system. Supports scoring competitions with judges, multi-stage certification workflows (Tally Master → Auditor → Board), role-based access for 9 roles, and real-time updates via Socket.IO.

## Development Commands

### Backend
```bash
npm run dev              # Start backend dev server with nodemon (port 3000)
npm run build            # Compile TypeScript to dist/
npm start                # Run production server from dist/
```

### Frontend
```bash
cd frontend && npm run dev    # Vite dev server (port 3002, proxies /api to backend)
cd frontend && npm run build  # Production build with PWA
```

### Testing
```bash
npm test                           # All backend tests (Jest, --runInBand)
npm run test:unit                  # Unit tests only (tests/unit/)
npm run test:integration           # Integration tests only (tests/integration/)
npm run test:contracts             # Contract tests (tests/contracts/)
npm run test:coverage              # With coverage report
jest --testPathPatterns=<pattern>  # Run specific test files
npm run test:e2e:pw                # Playwright E2E tests
npm run test:e2e:headed            # Playwright in headed browser
npm run test:typecheck             # TypeScript type checking (tsconfig.test.json)
```

### Database
```bash
npx prisma migrate deploy   # Apply migrations
npx prisma generate         # Regenerate Prisma Client after schema changes
npx prisma studio           # GUI database browser
npm run test:db:setup        # Set up test database
```

### Tenant Security Audits
```bash
npm run test:tenant-guardrails     # Full tenant isolation audit
npm run audit:tenant-segregation   # Verify all models have tenantId
```

### Health Checks
```bash
npm run health:check   # API health (curl localhost:3000/health)
npm run health:db      # PostgreSQL connectivity
npm run health:redis   # Redis connectivity
```

## Architecture

### Backend (`/src`)
- **Express.js + TypeScript** (ES2022 target, strict mode)
- **Prisma ORM** with PostgreSQL (`/prisma/schema.prisma` — 2200+ lines, 40+ models)
- **Redis** for caching (ioredis), falls back to in-memory (NodeCache)
- **tsyringe** for dependency injection — services decorated with `@injectable()`, registered in `/src/config/container.ts`
- **JWT auth** with httpOnly cookies, MFA via speakeasy TOTP, session versioning for invalidation

### Frontend (`/frontend/src`)
- **React 18 + TypeScript + Vite**
- **Tailwind CSS** with dark mode (`darkMode: 'class'`), CSS variables for theming
- **React Query** for server state, **React Hook Form + Zod** for forms
- **React Router v6** with tenant-scoped routes (`/:slug/events`) and global routes (`/events`)
- **Lazy-loaded pages** (60+) with `lazyWithRetry()` for network resilience

### Shared
- `/shared/types` — TypeScript types shared between frontend and backend

## Project Structure

```
src/
├── server.ts              # Entry point, middleware stack, graceful shutdown
├── config/                # Database, DI container, routes, env, socket, swagger
├── controllers/           # HTTP request handlers (70+)
├── services/              # Business logic (50+), DI-injectable
├── repositories/          # Data access layer (BaseRepository pattern)
├── routes/                # Express route definitions (87 files)
├── middleware/             # Auth, tenant, CSRF, rate limiting, error handling
├── types/                 # TypeScript interfaces
├── utils/                 # Utilities (logger, cache, password validation)
├── jobs/                  # Background job definitions
└── templates/             # Email templates

frontend/src/
├── pages/                 # Route page components (60+)
├── components/            # UI components (form/, ui/, users/)
├── services/              # API client (apiClient.ts, api.ts — 25+ endpoint modules)
├── contexts/              # AuthContext, TenantContext, ThemeContext, SocketContext
├── hooks/                 # Custom hooks (useApi, useAuth, useSocket)
├── lib/validation/        # Zod schemas for form validation
└── config/                # Frontend configuration

prisma/                    # Schema and migrations (35+)
tests/                     # unit/, integration/, contracts/, e2e/, load/
docs/                      # 14 documentation files (architecture through admin guide)
scripts/ops/               # Tenant audit and deployment scripts
```

## Key Architectural Patterns

### Multi-Tenancy
Every data model includes `tenantId`. Tenant is identified per-request via subdomain, custom domain, `X-Tenant-ID` header, or JWT claim. The `tenantMiddleware` (`/src/middleware/tenantMiddleware.ts`) sets `req.tenantId` and `req.tenant`. All database queries must filter by `tenantId` — there are 60+ tenant-scoped models. SUPER_ADMIN is the only role that can cross tenant boundaries.

### Service Layer with DI
Services in `/src/services/` are `@injectable()` classes registered in `/src/config/container.ts`. They receive Prisma and other services via `@inject()`. Controllers call services; services call repositories or Prisma directly.

### Route Registration
All routes registered centrally in `/src/config/routes.config.ts` via `registerRoute(app, path, router)` which mounts both `/api/v1/<path>` and `/api/<path>` (legacy compatibility).

### Scoring System
Two scoring types: **STRAIGHT** (average all judges) and **OLYMPIC** (drop highest/lowest, average remaining — requires 3+ judges). Scores flow through a certification pipeline: Judge submits → Tally Master certifies → Auditor verifies → Board approves.

### API Response Format
```json
{ "success": true/false, "data": {...}, "error": "message if failed" }
```

### Frontend API Client
Two Axios instances in `/frontend/src/services/apiClient.ts`: `apiClient` (authenticated, with CSRF) and `publicApi` (unauthenticated). Response interceptors handle 401 redirects and CSRF token refresh on 403.

## Testing Notes

- **Jest config** (`jest.config.js`): maxWorkers=2 (prevents DB pool exhaustion), forceExit=true, 30s timeout
- **Path aliases in tests**: `@/` → `src/`, `@services/` → `src/services/`, etc. (via Jest `moduleNameMapper`, not tsconfig paths)
- **Global mocks**: `tests/jest.globalMocks.ts` runs before setup — mocks jsonwebtoken and other modules globally
- **Coverage thresholds**: 85% for services, 80% for middleware/repos, 75% for controllers
- **E2E tests**: Playwright (`tests/e2e/`), excluded from Jest. Backend runs on port 3005, frontend on 5173
- **Test DB**: Separate database configured via `.env.test`, setup with `npm run test:db:setup`

## Important Conventions

- **Backend imports**: Relative paths (`./config/database`, `../middleware/auth`), not path aliases
- **TypeScript**: Strict mode with `noUncheckedIndexedAccess`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`
- **Decorators**: `experimentalDecorators` + `emitDecoratorMetadata` enabled for tsyringe DI
- **Soft deletes**: Event, Contest, Category models use `deletedAt`/`deletedBy` fields; Prisma middleware auto-filters
- **Audit logging**: `ActivityLog` and `AuditLog` models track changes with user, IP, and JSON diffs
- **Environment config**: Type-safe via `/src/config/env.ts`; `.env.example` has 100+ documented variables
- **Error tracking**: Sentry integration initialized first in `server.ts`; correlation IDs propagated via AsyncLocalStorage
