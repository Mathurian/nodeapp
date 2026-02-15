# Event Manager Documentation Index

Welcome to the Event Manager Contest System comprehensive documentation. This documentation covers all aspects of the application including architecture, features, API reference, deployment, and development.

## Quick Navigation

### Getting Started
- **[Getting Started Guide](02-GETTING-STARTED.md)** - Installation, setup, and configuration
- **[AI UAT Handoff Template](testing/AI-UAT-Handoff-Template.md)** - Copy/paste brief for browser AI testing
- **[Acceptance Test Guide (AI)](testing/Acceptance-Test-Guide.md)** - AI/browser-oriented runbook
- **[Acceptance Test Guide v2 (Human)](testing/Acceptance-Test-Guide-v2.md)** - Human-friendly manual UAT
- **[Acceptance Test Quick Run](testing/Acceptance-Test-Quick-Run.md)** - 30-minute smoke checklist

### Core Documentation
1. **[Architecture Overview](01-ARCHITECTURE.md)** - System architecture, technology stack, and design patterns
2. **[Getting Started](02-GETTING-STARTED.md)** - Installation, configuration, and local setup
3. **[Features Guide](03-FEATURES.md)** - Comprehensive feature documentation for all user roles
4. **[API Reference](04-API-REFERENCE.md)** - Complete REST and WebSocket API documentation
5. **[Database Documentation](05-DATABASE.md)** - Schema, models, relationships, and migrations
6. **[Frontend Architecture](06-FRONTEND.md)** - React components, state management, and UI patterns
7. **[Security Guide](07-SECURITY.md)** - Authentication, authorization, and security practices
8. **[Deployment Guide](08-DEPLOYMENT.md)** - Production deployment and configuration
9. **[Development Guide](09-DEVELOPMENT.md)** - Developer workflow and contribution guidelines
10. **[Troubleshooting](10-TROUBLESHOOTING.md)** - Common issues and solutions
11. **[Disaster Recovery](11-DISASTER-RECOVERY.md)** - Backup, recovery, and failover procedures
12. **[Workflow Customization](12-WORKFLOW-CUSTOMIZATION.md)** - Customizing certification workflows
13. **[Administrator Guide](13-ADMIN-GUIDE.md)** - System administration, monitoring, and maintenance
14. **[Advanced Features](14-ADVANCED-FEATURES.md)** - Feature flags, webhooks, custom fields, and 14 more advanced features

### Planning & Operations
- **[Outstanding Tasks](operations/OUTSTANDING-TASKS.md)** - Current backlog: contract tests, Phase 5 deployment, GraphQL/CQRS evaluation, A/B testing
- **[Next Steps (Phase 5)](operations/NEXT-STEPS.md)** - Final testing and production deployment checklist
- **[Deployment Guide](operations/DEPLOYMENT-GUIDE.md)** - Full production deployment procedures
- **[Testing Guide](testing/testing-guide.md)** - Testing infrastructure and coverage targets
- **[Database Optimization](operations/DATABASE-OPTIMIZATION.md)** - Query optimization and indexing
- **[Migration Guide](operations/MIGRATION-GUIDE.md)** - Database migration procedures

### Additional Resources
- **[Accessibility Testing](testing/ACCESSIBILITY-TESTING.md)** - WCAG 2.1 AA compliance testing
- **[CDN Setup](operations/CDN-SETUP.md)** - CDN configuration guide
- **[Database Read Replicas](operations/DATABASE-READ-REPLICAS.md)** - Read replica setup
- **[Visual Regression Testing](testing/VISUAL-REGRESSION-TESTING.md)** - Chromatic/screenshot testing

## About Event Manager

Event Manager is a comprehensive, enterprise-grade contest management system designed to handle complex scoring workflows, multi-stage certifications, and real-time collaboration across multiple user roles.

### Key Features
- **Multi-Stage Certification Workflow** - Judge, Tally Master, Auditor, and Board approval process
- **Role-Based Access Control** - 9 distinct user roles with granular permissions
- **Real-Time Updates** - WebSocket-based live score updates and notifications
- **Multi-Tenancy** - Full tenant isolation with domain-based routing
- **Tenant-Aware Routing** - Slug-prefixed and canonicalized user routing
- **Role-Scoped Navigation** - Menu and command palette filtered by effective permissions
- **Comprehensive Reporting** - Advanced analytics and export capabilities
- **Accessibility** - WCAG 2.1 AA compliant with keyboard navigation
- **Security** - MFA policy controls, CSRF protection, rate limiting, and audit logging

### Technology Stack
- **Backend**: Node.js 18+, Express, TypeScript
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Real-Time**: Socket.IO for WebSocket communication
- **Caching**: Redis with memory fallback
- **Authentication**: JWT with session versioning
- **Testing**: Jest, Playwright, React Testing Library

## Project Statistics

- **Backend Files**: 301 TypeScript files
- **Frontend Files**: 295 TypeScript/TSX files
- **Routes**: 69 route modules
- **Controllers**: 70 controller modules
- **Services**: 79 service modules
- **Database Models**: 60+ Prisma models
- **Frontend Pages**: 40+ page components
- **Reusable Components**: 80+ UI components
- **Test Coverage**: 90%+ (unit + integration)

## System Roles

1. **SUPER_ADMIN** - Platform-wide access across all tenants
2. **ADMIN** - Full system access and configuration within tenant
3. **ORGANIZER** - Event management and oversight
4. **BOARD** - Final approval authority
5. **JUDGE** - Score entry and certification
6. **CONTESTANT** - View assigned events and results
7. **EMCEE** - Access to scripts and event flow
8. **TALLY_MASTER** - Score verification and certification
9. **AUDITOR** - Independent score audit and review

See [Security Guide - Permission Matrix](07-SECURITY.md#permission-matrix) for complete CRUD permissions breakdown by role.

## System Access & Tools

### Application Access
- **Main Application**: http://conmgr.com/
- **API Docs**: Swagger UI at http://conmgr.com/api-docs
- **Help System**: In-app help at `/help`
- **Health Check**: http://conmgr.com/health

### Monitoring & Metrics (Production)
- **Grafana Dashboard**: http://conmgr.com/monitoring/grafana/ (admin/admin)
- **Prometheus**: http://conmgr.com/monitoring/prometheus/
- **Metrics Endpoint**: http://conmgr.com/metrics

### Development Tools
- **Playwright Test UI**: Run `npm run test:e2e:ui` (interactive testing)
- **Test Reports**: Run `npm run test:e2e:report` (HTML test results)
- **Database GUI**: Run `npx prisma studio` (http://localhost:5555)
- **Code Generator**: Run `npm run test:e2e:codegen` (record tests)
- **Browser UAT IDs API**: `GET /api/v1/test-runner/uat-ids` (roles: `SUPER_ADMIN`, `ADMIN`, `ORGANIZER`)
- **AI Handoff Template**: `docs/testing/AI-UAT-Handoff-Template.md`

See [Administrator Guide](13-ADMIN-GUIDE.md) for complete system administration documentation.

---

**Next Steps:**
1. **New Users**: Start with [Getting Started](02-GETTING-STARTED.md)
2. **Developers**: Review [Architecture](01-ARCHITECTURE.md) and [Development Guide](09-DEVELOPMENT.md)
3. **Administrators**: Check [Administrator Guide](13-ADMIN-GUIDE.md), [Deployment Guide](08-DEPLOYMENT.md), and [Security Guide](07-SECURITY.md)
4. **Troubleshooting**: See [Troubleshooting Guide](10-TROUBLESHOOTING.md) for common issues
