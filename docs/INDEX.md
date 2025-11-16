# Event Manager Documentation Index

Welcome to the Event Manager Contest System comprehensive documentation. This documentation covers all aspects of the application including architecture, features, API reference, deployment, and development.

## Quick Navigation

### Getting Started
- **[Getting Started Guide](02-GETTING-STARTED.md)** - Installation, setup, and configuration
- **[Quick Start (Root)](../QUICK_START.md)** - 5-minute quick start guide

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

### Additional Resources
- **[Security Policy](../SECURITY.md)** - Security features and best practices
- **[Testing Guide](../TESTING_SUMMARY.md)** - Testing infrastructure and coverage
- **[Production Readiness](../PRODUCTION_READY_SUMMARY.md)** - Production deployment checklist
- **[Multi-Tenancy Guide](../MULTI_TENANCY_QUICK_START.md)** - Multi-tenant setup and usage

## About Event Manager

Event Manager is a comprehensive, enterprise-grade contest management system designed to handle complex scoring workflows, multi-stage certifications, and real-time collaboration across multiple user roles.

### Key Features
- **Multi-Stage Certification Workflow** - Judge, Tally Master, Auditor, and Board approval process
- **Role-Based Access Control** - 8 distinct user roles with granular permissions
- **Real-Time Updates** - WebSocket-based live score updates and notifications
- **Multi-Tenancy** - Full tenant isolation with domain-based routing
- **Offline Capability** - Progressive Web App (PWA) with offline support
- **Comprehensive Reporting** - Advanced analytics and export capabilities
- **Accessibility** - WCAG 2.1 AA compliant with full keyboard navigation
- **Security** - MFA, CSRF protection, rate limiting, and audit logging

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

1. **ADMIN** - Full system access and configuration
2. **ORGANIZER** - Event management and oversight
3. **BOARD** - Final approval authority
4. **JUDGE** - Score entry and certification
5. **CONTESTANT** - View assigned events and results
6. **EMCEE** - Access to scripts and event flow
7. **TALLY_MASTER** - Score verification and certification
8. **AUDITOR** - Independent score audit and review

## Support

- **API Docs**: In-app Swagger UI at `/api-docs`
- **Help System**: In-app help at `/help`
- **Monitoring**: Prometheus metrics at `/metrics`
- **Health Check**: System health at `/health`

---

**Next Steps:**
1. New users: Start with [Getting Started](02-GETTING-STARTED.md)
2. Developers: Review [Architecture](01-ARCHITECTURE.md) and [Development Guide](09-DEVELOPMENT.md)
3. Administrators: Check [Deployment Guide](08-DEPLOYMENT.md) and [Security Guide](07-SECURITY.md)
