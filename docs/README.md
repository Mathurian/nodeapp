# Event Manager Documentation

This directory contains both the curated Help content exposed in the app and the broader repo-only reference set used by administrators, operators, developers, and testers.

## Start Here

- **[Documentation Index](INDEX.md)** - Main navigation for this repo documentation set
- **[Getting Started](02-GETTING-STARTED.md)** - Public-friendly guidance for signing in, using the app, installing it on mobile, and finding role-relevant help
- **[Troubleshooting](10-TROUBLESHOOTING.md)** - Public-friendly support article for common sign-in, scoring, results, and browser issues

## Published Help Taxonomy

The app Help UI uses the section model below.

### Public Help

These guides are appropriate for public or general event-user audiences and are part of the unauthenticated `/help` experience:

- **[Getting Started](02-GETTING-STARTED.md)**
- **[Troubleshooting](10-TROUBLESHOOTING.md)**

### Admin & Operator Guides

These guides are published only for authenticated admin audiences:

- **[Features Overview](03-FEATURES.md)** - Broad feature and role overview
- **[Workflow Customization](12-WORKFLOW-CUSTOMIZATION.md)** - Workflow configuration reference
- **[Admin Guide](13-ADMIN-GUIDE.md)** - Administration, monitoring, and runtime operations
- **[Advanced Features](14-ADVANCED-FEATURES.md)** - Advanced configuration and capabilities

### Technical Reference

These guides stay in the Help taxonomy for authenticated admins but are not public Help content:

- **[System Architecture](01-ARCHITECTURE.md)**
- **[API Reference](04-API-REFERENCE.md)**
- **[Database Schema](05-DATABASE.md)**
- **[Frontend Guide](06-FRONTEND.md)**
- **[Development Setup](09-DEVELOPMENT.md)**

### Security, Deployment & Recovery

These guides are authenticated admin/reference material:

- **[Security Guide](07-SECURITY.md)**
- **[Deployment Guide](08-DEPLOYMENT.md)**
- **[Disaster Recovery](11-DISASTER-RECOVERY.md)**

## Repo-Only Reference

These materials remain in the repository for internal teams or authenticated operators and are not part of the Help taxonomy above:

- **[Structure Reuse Guide](15-STRUCTURE-REUSE-GUIDE.md)** - kept repo-only for now
- Testing runbooks under [docs/testing](testing/)
- Operations runbooks under [docs/operations](operations/)
- ADRs and internal notes under `docs/adr/` and `docs/operations/internal/`
- Implementation-plan material such as [CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md](CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md)

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
