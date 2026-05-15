# Event Manager Documentation Index

This index separates the small public Help set from the broader repo documentation used by administrators, operators, developers, and testers.

## Public Help

These guides are appropriate for public or general event-user audiences and are the main `/help` articles exposed without sign-in:

1. **[Getting Started](02-GETTING-STARTED.md)** - Sign in, understand role-based behavior, install the mobile app, and find the right help
2. **[Troubleshooting](10-TROUBLESHOOTING.md)** - Common sign-in, scoring, results, browser, and support questions

## Admin & Operator Guides

These guides remain in authenticated Help for admin audiences and should not be treated as public help:

1. **[03-FEATURES.md](03-FEATURES.md)** - Broad feature and capability guide
2. **[12-WORKFLOW-CUSTOMIZATION.md](12-WORKFLOW-CUSTOMIZATION.md)** - Workflow configuration reference
3. **[13-ADMIN-GUIDE.md](13-ADMIN-GUIDE.md)** - Administration, monitoring, and maintenance
4. **[14-ADVANCED-FEATURES.md](14-ADVANCED-FEATURES.md)** - Advanced configuration and capabilities

## Technical Reference

These guides remain authenticated admin/reference material in Help:

1. **[01-ARCHITECTURE.md](01-ARCHITECTURE.md)** - System architecture and design
2. **[04-API-REFERENCE.md](04-API-REFERENCE.md)** - API route reference
3. **[05-DATABASE.md](05-DATABASE.md)** - Schema and model reference
4. **[06-FRONTEND.md](06-FRONTEND.md)** - Frontend architecture and UI implementation
5. **[09-DEVELOPMENT.md](09-DEVELOPMENT.md)** - Local development workflow

## Security, Deployment & Recovery

These guides remain authenticated admin/reference material in Help:

1. **[07-SECURITY.md](07-SECURITY.md)** - Security model and permissions guidance; the live Permissions page remains the authoritative current access reference
2. **[08-DEPLOYMENT.md](08-DEPLOYMENT.md)** - Deployment and runtime guidance
3. **[11-DISASTER-RECOVERY.md](11-DISASTER-RECOVERY.md)** - Disaster recovery and failover guidance

### Testing and UAT

- **[AI UAT Handoff Template](testing/AI-UAT-Handoff-Template.md)**
- **[Acceptance Test Guide (AI)](testing/Acceptance-Test-Guide.md)**
- **[Acceptance Test Guide v2 (Human)](testing/Acceptance-Test-Guide-v2.md)**
- **[Acceptance Test Quick Run](testing/Acceptance-Test-Quick-Run.md)**
- **[E2E Lifecycle Track](testing/E2E-Lifecycle-Track.md)**
- **[Testing Guide](testing/testing-guide.md)**

## Repo-Only Reference

These materials are intentionally outside the Help taxonomy:

- **[Deployment Guide](operations/DEPLOYMENT-GUIDE.md)** - Production deployment runbook
- **[15-STRUCTURE-REUSE-GUIDE.md](15-STRUCTURE-REUSE-GUIDE.md)** - Admin/operator structure reuse workflow, kept repo-only for now
- **[Contest/Category Copy Plan](CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md)** - Internal implementation plan, not public Help content
- **[CDN Setup](operations/CDN-SETUP.md)** - Operational infrastructure reference

## Scope Notes

- The app Help UI publishes only the guides defined in the docs access policy.
- Public `/help` is intentionally narrow and should stay suitable for non-technical users.
- Authenticated Help may expose admin/reference sections, but those should remain clearly labeled as restricted documentation.
- Testing, operations, and implementation-plan materials remain repo reference unless intentionally promoted.
- If code and docs diverge, treat code as the source of truth and update the documentation.

## Recommended Starting Points

1. **General users and public visitors**: [Getting Started](02-GETTING-STARTED.md)
2. **Users with an active issue**: [Troubleshooting](10-TROUBLESHOOTING.md)
3. **Administrators and operators**: [13-ADMIN-GUIDE.md](13-ADMIN-GUIDE.md)
4. **Developers**: [01-ARCHITECTURE.md](01-ARCHITECTURE.md) and [09-DEVELOPMENT.md](09-DEVELOPMENT.md)
