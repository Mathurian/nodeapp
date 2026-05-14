# Event Manager Documentation

This directory contains both the curated Help content exposed in the app and the broader repo-only reference set used by administrators, operators, developers, and testers.

## Start Here

- **[Documentation Index](INDEX.md)** - Main navigation for this repo documentation set
- **[Getting Started](02-GETTING-STARTED.md)** - Public-friendly guidance for signing in, using the app, installing it on mobile, and finding role-relevant help
- **[Troubleshooting](10-TROUBLESHOOTING.md)** - Public-friendly support article for common sign-in, scoring, results, and browser issues

## Public Help vs Repo-Only Reference

### Published in Public Help

These guides are appropriate for public or general event-user audiences and are part of the unauthenticated `/help` experience:

- **[Getting Started](02-GETTING-STARTED.md)**
- **[Troubleshooting](10-TROUBLESHOOTING.md)**

Additional documents may appear in Help after sign-in when they are intentionally published for an authenticated role.

### Repo-Only or Restricted Reference

These materials remain in the repository for internal teams or authenticated operators and are not part of the public Help experience:

- Architecture, API, database, frontend, security, deployment, and development references
- Admin/operator guides such as [13-ADMIN-GUIDE.md](13-ADMIN-GUIDE.md) and [15-STRUCTURE-REUSE-GUIDE.md](15-STRUCTURE-REUSE-GUIDE.md)
- Testing runbooks under [docs/testing](testing/)
- Operations runbooks under [docs/operations](operations/)
- ADRs and internal notes under `docs/adr/` and `docs/operations/internal/`
- Implementation-plan material such as [CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md](CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md)

## Repo Documentation Map

### Product and Platform Guides

1. **[01-ARCHITECTURE.md](01-ARCHITECTURE.md)** - System architecture and platform structure
2. **[02-GETTING-STARTED.md](02-GETTING-STARTED.md)** - Public-friendly getting started guide
3. **[03-FEATURES.md](03-FEATURES.md)** - Broad feature and capability guide
4. **[04-API-REFERENCE.md](04-API-REFERENCE.md)** - REST and WebSocket route reference
5. **[05-DATABASE.md](05-DATABASE.md)** - Database schema and model reference
6. **[06-FRONTEND.md](06-FRONTEND.md)** - Frontend architecture and UI implementation notes
7. **[07-SECURITY.md](07-SECURITY.md)** - Security and permissions guidance
8. **[08-DEPLOYMENT.md](08-DEPLOYMENT.md)** - Deployment and runtime guidance
9. **[09-DEVELOPMENT.md](09-DEVELOPMENT.md)** - Local development workflow
10. **[10-TROUBLESHOOTING.md](10-TROUBLESHOOTING.md)** - Public-friendly common issues guide
11. **[11-DISASTER-RECOVERY.md](11-DISASTER-RECOVERY.md)** - Disaster recovery and failover guidance
12. **[12-WORKFLOW-CUSTOMIZATION.md](12-WORKFLOW-CUSTOMIZATION.md)** - Workflow configuration reference
13. **[13-ADMIN-GUIDE.md](13-ADMIN-GUIDE.md)** - Administration, monitoring, and runtime operations
14. **[14-ADVANCED-FEATURES.md](14-ADVANCED-FEATURES.md)** - Advanced features and configuration
15. **[15-STRUCTURE-REUSE-GUIDE.md](15-STRUCTURE-REUSE-GUIDE.md)** - Admin/operator structure-cloning workflow

### Testing and UAT

- **[AI UAT Handoff Template](testing/AI-UAT-Handoff-Template.md)**
- **[Acceptance Test Guide (AI)](testing/Acceptance-Test-Guide.md)**
- **[Acceptance Test Guide v2 (Human)](testing/Acceptance-Test-Guide-v2.md)**
- **[Acceptance Test Quick Run](testing/Acceptance-Test-Quick-Run.md)**
- **[E2E Lifecycle Track](testing/E2E-Lifecycle-Track.md)**

### Operations and Internal Planning

- **[Deployment Guide](operations/DEPLOYMENT-GUIDE.md)** - Full production deployment runbook
- **[Structure Reuse Guide](15-STRUCTURE-REUSE-GUIDE.md)** - Shipped operator workflow
- **[Contest/Category Copy Plan](CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md)** - Implementation plan, kept repo-only

## Scope Notes

- The app Help UI publishes only the guides allowed by the docs access policy.
- Public `/help` is intentionally limited to end-user/operator-friendly material.
- If code and docs diverge, treat code as the source of truth and update docs in the same change set.

## Last Updated

- **Documentation Version**: rolling
- **Application Version**: see `package.json`
- **Last Updated**: May 14, 2026
