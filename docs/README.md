# Event Manager Documentation

Welcome to the complete documentation for Event Manager Contest System!

## Quick Links

- **[Documentation Index](INDEX.md)** - Start here for complete navigation
- **[AI UAT Handoff Template](testing/AI-UAT-Handoff-Template.md)** - Copy/paste prompt template for browser AI test execution
- **[Acceptance Test Guide (AI)](testing/Acceptance-Test-Guide.md)** - AI/browser-oriented UAT runbook
- **[Acceptance Test Guide v2 (Human)](testing/Acceptance-Test-Guide-v2.md)** - Human-friendly UAT guide
- **[Acceptance Test Quick Run](testing/Acceptance-Test-Quick-Run.md)** - 30-minute smoke checklist
- **[E2E Lifecycle Track](testing/E2E-Lifecycle-Track.md)** - Full lifecycle testing (empty or preseeded tenant)
- **[Getting Started](02-GETTING-STARTED.md)** - Installation and setup
- **[Architecture Overview](01-ARCHITECTURE.md)** - System design and technology
- **[API Reference](04-API-REFERENCE.md)** - Complete API documentation

## Documentation Files

1. **[INDEX.md](INDEX.md)** - Main documentation index and navigation
2. **[01-ARCHITECTURE.md](01-ARCHITECTURE.md)** - Complete system architecture
3. **[02-GETTING-STARTED.md](02-GETTING-STARTED.md)** - Installation and setup guide
4. **[03-FEATURES.md](03-FEATURES.md)** - Comprehensive feature documentation
5. **[04-API-REFERENCE.md](04-API-REFERENCE.md)** - REST and WebSocket API reference
6. **[05-DATABASE.md](05-DATABASE.md)** - Database schema and models
7. **[06-FRONTEND.md](06-FRONTEND.md)** - Frontend architecture and components
8. **[07-SECURITY.md](07-SECURITY.md)** - Security features and best practices
9. **[08-DEPLOYMENT.md](08-DEPLOYMENT.md)** - Production deployment guide
10. **[09-DEVELOPMENT.md](09-DEVELOPMENT.md)** - Developer workflow and guidelines
11. **[10-TROUBLESHOOTING.md](10-TROUBLESHOOTING.md)** - Common issues and solutions
12. **[11-DISASTER-RECOVERY.md](11-DISASTER-RECOVERY.md)** - Backup and recovery procedures
13. **[12-WORKFLOW-CUSTOMIZATION.md](12-WORKFLOW-CUSTOMIZATION.md)** - Workflow customization
14. **[13-ADMIN-GUIDE.md](13-ADMIN-GUIDE.md)** - System administration and monitoring
15. **[14-ADVANCED-FEATURES.md](14-ADVANCED-FEATURES.md)** - Advanced features and enterprise capabilities
16. **[AI-UAT-Handoff-Template.md](testing/AI-UAT-Handoff-Template.md)** - Browser AI run handoff template
17. **[Acceptance-Test-Guide.md](testing/Acceptance-Test-Guide.md)** - AI-centric acceptance testing runbook
18. **[Acceptance-Test-Guide-v2.md](testing/Acceptance-Test-Guide-v2.md)** - Human-centric UAT guide
19. **[Acceptance-Test-Quick-Run.md](testing/Acceptance-Test-Quick-Run.md)** - Human quick smoke checklist
20. **[E2E-Lifecycle-Track.md](testing/E2E-Lifecycle-Track.md)** - End-to-end lifecycle flow track

## Documentation Scope

- The in-app Help UI publishes the curated root guides defined by the application help access policy.
- `docs/operations/`, `docs/testing/`, `docs/adr/`, and `docs/operations/internal/` remain operator/developer reference material and are not published in the in-app Help UI unless explicitly promoted.
- Archived material is retained in `docs/outdated/` and is not published in the in-app Help UI.
- If code and docs diverge, treat code as source of truth and update docs in the same change set.

## What's Documented

### Architecture & Design
- High-level system architecture
- Technology stack and rationale
- Design patterns and best practices
- Backend and frontend architecture
- Database design and relationships

### Setup & Installation
- Prerequisites and requirements
- Step-by-step installation
- Environment configuration
- Database setup and migrations
- Docker deployment option

### Features & Usage
- All 9 user roles and capabilities
- Event, contest, and category management
- Scoring system and workflows
- Multi-stage certification process
- Score governance flows (un-certification, score throw-out requests)
- Reporting and analytics
- Administrative features

### API Documentation
- Complete REST API reference
- WebSocket real-time events
- Authentication and authorization
- Request/response formats
- Error codes and handling

### Database
- Complete schema overview
- All 60+ models documented
- Relationships and indexes
- Enums and constraints
- Migration strategies

### Frontend
- Component architecture
- State management patterns
- Routing and navigation
- API integration
- Real-time features
- Accessibility implementation

### Security
- Authentication mechanisms (JWT cookie session + MFA)
- Authorization and RBAC
- **Complete CRUD permissions matrix for all roles**
- Security middleware
- Input validation
- CSRF protection
- Audit logging

### Deployment
- Production deployment methods
- Server requirements
- Nginx configuration
- SSL/TLS setup
- Monitoring and logging
- Backup strategies

### Administration
- System monitoring and health checks
- Grafana and Prometheus setup
- Service management
- Database administration
- Backup and recovery procedures
- Security management
- Performance tuning
- Troubleshooting guides

### Development
- Development setup
- Coding standards
- Testing strategies
- Git workflow
- Common development tasks

### Troubleshooting
- Common issues and solutions
- Error code reference
- Performance troubleshooting
- Support resources

## How to Use This Documentation

### For New Users
1. Start with [Getting Started](02-GETTING-STARTED.md)
2. Review [Features Guide](03-FEATURES.md) for capabilities
3. Use [Acceptance Test Guide](testing/Acceptance-Test-Guide.md) for structured validation
4. Check [Troubleshooting](10-TROUBLESHOOTING.md) if issues arise

### For Developers
1. Review [Architecture](01-ARCHITECTURE.md) for system design
2. Read [Development Guide](09-DEVELOPMENT.md) for workflow
3. Use [API Reference](04-API-REFERENCE.md) for integration
4. Consult [Database Documentation](05-DATABASE.md) for schema

### For Administrators
1. Start with [Administrator Guide](13-ADMIN-GUIDE.md) for system management
2. Follow [Deployment Guide](08-DEPLOYMENT.md) for production setup
3. Review [Security Guide](07-SECURITY.md) for best practices
4. Check [Disaster Recovery](11-DISASTER-RECOVERY.md) for backup procedures
5. Monitor system health via Grafana dashboard

### For Integrators
1. Review [API Reference](04-API-REFERENCE.md)
2. Check [Authentication](07-SECURITY.md#authentication) requirements
3. Understand [Database Schema](05-DATABASE.md)
4. Review [WebSocket Events](04-API-REFERENCE.md#websocket-events)

### For Browser-AI UAT Runs
1. Open [AI UAT Handoff Template](testing/AI-UAT-Handoff-Template.md).
2. Fill in URL, tenant slug, and role credentials.
3. In the prompt, require `GET /api/v1/test-runner/uat-ids` to gather scenario IDs.
4. Run the case set from [Acceptance Test Guide (AI)](testing/Acceptance-Test-Guide.md) and `docs/testing/Acceptance-Test-Cases.json`.
5. Require PASS/FAIL by case ID plus blocker summary.
6. Set lifecycle mode (`PRESEEDED_TENANT` or `EMPTY_TENANT`) and run [E2E Lifecycle Track](testing/E2E-Lifecycle-Track.md).
7. If shell reset is available, run:
   - preseeded: `scripts/uat/reset-tenant-uat-state.sh --tenant-slug <slug> --apply --scenario preseeded`
   - empty-tenant: `scripts/uat/reset-tenant-uat-state.sh --tenant-slug <slug> --apply --scenario empty-tenant`

## Additional Resources

### System Access
- **Main Application**: http://conmgr.com/
- **In-App Help**: Help system at `/help`
- **API Explorer**: Swagger UI at http://conmgr.com/api-docs
- **System Health**: http://conmgr.com/health

### Monitoring & Tools
- **Grafana Dashboard (SSO)**: https://conmgr.com/monitoring/grafana/
- **Grafana Breakglass**: https://conmgr.com/monitoring/grafana-breakglass
- **Prometheus**: https://conmgr.com/monitoring/prometheus/
- **Metrics Endpoint**: https://conmgr.com/metrics
- **Database GUI**: Run `npx prisma studio`

### Development Tools
- **Playwright Test UI**: Run `npm run test:e2e:ui`
- **Test Reports**: Run `npm run test:e2e:report`
- **Code Generator**: Run `npm run test:e2e:codegen`

### UAT Data Discovery
- **Browser AI / API helper**: `GET /api/v1/test-runner/uat-ids` (roles: `SUPER_ADMIN`, `ADMIN`, `ORGANIZER`)
- **Operator fallback script**: `scripts/uat/export-uat-ids.sh --tenant-slug <slug>`

See [Administrator Guide](13-ADMIN-GUIDE.md) for complete details.

## Documentation Maintenance

This documentation is generated from the actual codebase and should be updated when:
- New features are added
- APIs change
- Database schema is modified
- Deployment procedures change
- Security practices are updated

## Version

- **Documentation Version**: rolling
- **Application Version**: see `package.json`
- **Last Updated**: February 17, 2026

---

**Start Reading**: [Documentation Index](INDEX.md)
