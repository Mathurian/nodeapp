# Event Manager - Documentation Index

**Last Updated:** February 15, 2026
**Application Version:** 2.0 (Phase 2 in progress)
**Documentation Version:** 2.0

---

## Quick Links

### Normalized Archive Layout

- `legacy-docset/structured-guides/` - original numbered 00-10 documentation sets
- `legacy-docset/program-tracking/` - reports, investigations, phase tracking, session notes
- `snapshots/` - date-stamped archive batches
- `root-archive/` - legacy root files grouped by type


- **[Quick Start Guide](./QUICK_START.md)** - Get up and running in 5 minutes
- **[Main README](../README.md)** - Project overview and features
- **[Quick Reference](./legacy-docset/structured-guides/10-reference/quick-reference.md)** - Common commands and tasks
- **[API Reference](./legacy-docset/structured-guides/07-api/rest-api.md)** - API endpoints documentation

### Root Archive Buckets (Secondary Pass)

Legacy root-level files were grouped into:
- **[Status](./root-archive/status/README.md)** - historical implementation/project status snapshots
- **[Plans](./root-archive/plans/README.md)** - legacy implementation and phase plans
- **[Readiness](./root-archive/readiness/README.md)** - production readiness/security assessment snapshots
- **[Reports](./root-archive/reports/README.md)** - completion and summary reports
- **[Sessions](./root-archive/sessions/README.md)** - session-level completion notes
- **[Technical Debt](./root-archive/technical-debt/README.md)** - TODO investigations and technical debt snapshots

---

## Documentation Sections

### 📚 00. Getting Started

Start here if you're new to Event Manager.

- **[README](./legacy-docset/structured-guides/00-getting-started/README.md)** - Getting started overview
- **[Quick Start](./legacy-docset/structured-guides/00-getting-started/quick-start.md)** - Step-by-step setup guide
- **[Installation Overview](./legacy-docset/structured-guides/00-getting-started/installation.md)** - Installation options
- **[Docker Setup](./legacy-docset/structured-guides/00-getting-started/setup-docker.md)** - Docker-based installation
- **[Native Setup](./legacy-docset/structured-guides/00-getting-started/setup-native.md)** - Manual installation without Docker

**Best for:** New users, first-time installation, quick setup

---

### 🏗️ 01. Architecture

Understand the system design and technical architecture.

- **[README](./legacy-docset/structured-guides/01-architecture/README.md)** - Architecture overview
- **[System Overview](./legacy-docset/structured-guides/01-architecture/overview.md)** - High-level architecture
- **[Architecture Review (Nov 2025)](./legacy-docset/structured-guides/01-architecture/architecture-review-november-2025.md)** - Current state analysis
- **[Implementation Plan (Nov 2025)](./legacy-docset/structured-guides/01-architecture/implementation-plan-november-2025.md)** - Enhancement roadmap
- **[Backend Architecture](./legacy-docset/structured-guides/01-architecture/backend-architecture.md)** - Backend design patterns
- **[Frontend Architecture](./legacy-docset/structured-guides/01-architecture/frontend-architecture.md)** - Frontend structure
- **[Database Schema](./legacy-docset/structured-guides/01-architecture/database-schema.md)** - Database design
- **[Security Model](./legacy-docset/structured-guides/01-architecture/security-model.md)** - Security architecture

**Best for:** Developers, architects, technical decision-makers

---

### ✨ 02. Features

Learn about specific features and how to use them.

- **[README](./legacy-docset/structured-guides/02-features/README.md)** - Features overview
- **[Authentication](./legacy-docset/structured-guides/02-features/authentication.md)** - Login and session management
- **[Authorization](./legacy-docset/structured-guides/02-features/authorization.md)** - Role-based access control
- **[Event Management](./legacy-docset/structured-guides/02-features/event-management.md)** - Creating and managing events
- **[Scoring System](./legacy-docset/structured-guides/02-features/scoring-system.md)** - Scoring workflows
- **[Certification Workflow](./legacy-docset/structured-guides/02-features/certification-workflow.md)** - Multi-stage certification
- **[Real-time Updates](./legacy-docset/structured-guides/02-features/real-time-updates.md)** - WebSocket features
- **[File Uploads](./legacy-docset/structured-guides/02-features/file-uploads.md)** - File handling and virus scanning
- **[Theme Customization](./legacy-docset/structured-guides/02-features/theme-customization.md)** - Theme settings

**Best for:** End users, administrators, feature discovery

---

### 🔧 03. Administration

System administration and management tasks.

- **[README](./legacy-docset/structured-guides/03-administration/README.md)** - Administration overview
- **[User Management](./legacy-docset/structured-guides/03-administration/user-management.md)** - Managing users and roles
- **[System Settings](./legacy-docset/structured-guides/03-administration/system-settings.md)** - Configuration options
- **[Backup & Restore](./legacy-docset/structured-guides/03-administration/backup-restore.md)** - Data backup procedures
- **[Monitoring (Docker)](./legacy-docset/structured-guides/03-administration/monitoring-docker.md)** - Docker monitoring setup
- **[Monitoring (Native)](./legacy-docset/structured-guides/03-administration/monitoring-native.md)** - Native monitoring setup

**Best for:** System administrators, DevOps engineers

---

### 💻 04. Development

Development guides and coding standards.

- **[README](./legacy-docset/structured-guides/04-development/README.md)** - Development overview
- **[Getting Started](./legacy-docset/structured-guides/04-development/getting-started.md)** - Dev environment setup
- **[Coding Standards](./legacy-docset/structured-guides/04-development/coding-standards.md)** - Code style and conventions

**Testing Documentation:**
- **[Testing Guide](./legacy-docset/structured-guides/04-development/testing-guide.md)** - Comprehensive testing guide
- **[Testing Standards](./legacy-docset/structured-guides/04-development/testing-standards.md)** - Quality requirements and patterns
- **[Testing Quick Reference](./legacy-docset/structured-guides/04-development/testing-quick-reference.md)** - Command cheat sheet
- **[Testing Coverage Report](./legacy-docset/structured-guides/04-development/testing-coverage-report.md)** - Current test coverage status
- **[Testing Examples](./legacy-docset/structured-guides/04-development/testing-examples.md)** - Detailed annotated examples
- **[Testing Workflows](./legacy-docset/structured-guides/04-development/testing-workflows.md)** - Development workflows
- **[Test Documentation](./legacy-docset/structured-guides/04-development/test-documentation.md)** - Legacy test suite documentation
- **[Test Execution Guide](./legacy-docset/structured-guides/04-development/test-execution-guide.md)** - Legacy execution guide

**Other Guides:**
- **[Debugging](./legacy-docset/structured-guides/04-development/debugging.md)** - Debugging techniques
- **[Git Workflow](./legacy-docset/structured-guides/04-development/git-workflow.md)** - Branching and commit strategy

**Best for:** Developers, contributors, QA engineers

---

### 🚀 05. Deployment

Production deployment and CI/CD.

- **[README](./legacy-docset/structured-guides/05-deployment/README.md)** - Deployment overview
- **[Production Deployment](./legacy-docset/structured-guides/05-deployment/production-deployment.md)** - Production setup guide
- **[Docker Deployment](./legacy-docset/structured-guides/05-deployment/docker-deployment.md)** - Docker production setup
- **[Native Deployment](./legacy-docset/structured-guides/05-deployment/native-deployment.md)** - Native production setup
- **[CI/CD Pipeline](./legacy-docset/structured-guides/05-deployment/ci-cd.md)** - Continuous integration/deployment
- **[Troubleshooting](./legacy-docset/structured-guides/05-deployment/troubleshooting.md)** - Common deployment issues

**Best for:** DevOps engineers, deployment managers

---

### 📊 06. Phase Implementations

Implementation progress and phase reports.

- **[README](./legacy-docset/structured-guides/06-phase-implementations/README.md)** - Phases overview
- **[Phase 1: Foundation Complete](./legacy-docset/structured-guides/06-phase-implementations/phase1-foundation-complete.md)** - Phase 1 report
- **[Phase 2: Foundation Complete](./legacy-docset/structured-guides/06-phase-implementations/phase2-foundation-complete.md)** - Phase 2 foundation
- **[Phase 2: Implementation Guide](./legacy-docset/structured-guides/06-phase-implementations/phase2-implementation-guide.md)** - Phase 2 detailed guide
- **[Phase 2: Implementation Summary](./legacy-docset/structured-guides/06-phase-implementations/PHASE2_IMPLEMENTATION_SUMMARY.md)** - Complete Phase 2 summary
- **[Phase 2: Files Created](./legacy-docset/structured-guides/06-phase-implementations/PHASE2_FILES_CREATED.txt)** - List of Phase 2 files
- **[Phase 2: Current Status](./legacy-docset/structured-guides/06-phase-implementations/phase2-status.md)** - Phase 2 progress
- **[Phase 3: Progress Report](./legacy-docset/structured-guides/06-phase-implementations/PHASE3_PROGRESS.md)** - Phase 3 detailed progress
- **[Phases 3 & 4: Implementation Guide](./legacy-docset/structured-guides/06-phase-implementations/PHASES_3_AND_4_IMPLEMENTATION_GUIDE.md)** - Complete guide for remaining work
- **[Session Summary Nov 12, 2025](./legacy-docset/structured-guides/06-phase-implementations/SESSION_SUMMARY_2025-11-12.md)** - Latest session work
- **[Enhancements Executive Summary](./legacy-docset/structured-guides/06-phase-implementations/enhancements-executive-summary.md)** - Enhancement overview
- **[Enhancements Implementation Report](./legacy-docset/structured-guides/06-phase-implementations/enhancements-implementation-report.md)** - Implementation details

**Best for:** Project managers, stakeholders, developers

---

### 🔌 07. API

API documentation and integration guides.

- **[README](./legacy-docset/structured-guides/07-api/README.md)** - API overview
- **[REST API](./legacy-docset/structured-guides/07-api/rest-api.md)** - REST endpoints reference
- **[WebSocket API](./legacy-docset/structured-guides/07-api/websocket-api.md)** - Real-time WebSocket events
- **[Authentication](./legacy-docset/structured-guides/07-api/authentication.md)** - API authentication
- **[Rate Limiting](./legacy-docset/structured-guides/07-api/rate-limiting.md)** - Rate limit policies

**Best for:** API consumers, integration developers

---

### 🔒 08. Security

Security features and best practices.

- **[README](./legacy-docset/structured-guides/08-security/README.md)** - Security overview
- **[Secrets Management](./legacy-docset/structured-guides/08-security/secrets-management.md)** - Managing secrets securely
- **[Secrets Quick Start](./legacy-docset/structured-guides/08-security/secrets-quick-start.md)** - Quick secrets guide
- **[Virus Scanning](./legacy-docset/structured-guides/08-security/virus-scanning.md)** - File virus scanning with ClamAV
- **[Security Best Practices](./legacy-docset/structured-guides/08-security/security-best-practices.md)** - Security guidelines
- **[Audit Logging](./legacy-docset/structured-guides/08-security/audit-logging.md)** - Audit trail
- **[Vulnerability Management](./legacy-docset/structured-guides/08-security/vulnerability-management.md)** - Security updates

**Best for:** Security engineers, compliance officers, administrators

---

### ⚡ 09. Performance

Performance optimization and monitoring.

- **[README](./legacy-docset/structured-guides/09-performance/README.md)** - Performance overview
- **[Caching Strategy](./legacy-docset/structured-guides/09-performance/caching-strategy.md)** - Redis caching guide
- **[Database Optimization](./legacy-docset/structured-guides/09-performance/database-optimization.md)** - Database performance
- **[Frontend Optimization](./legacy-docset/structured-guides/09-performance/frontend-optimization.md)** - Frontend performance
- **[Performance Monitoring](./legacy-docset/structured-guides/09-performance/performance-monitoring.md)** - Monitoring tools

**Best for:** Performance engineers, developers, DevOps

---

### 📖 10. Reference

Quick reference materials and glossaries.

- **[README](./legacy-docset/structured-guides/10-reference/README.md)** - Reference overview
- **[Quick Reference](./legacy-docset/structured-guides/10-reference/quick-reference.md)** - Command cheat sheet
- **[Configuration Reference](./legacy-docset/structured-guides/10-reference/configuration.md)** - All config options
- **[CLI Commands](./legacy-docset/structured-guides/10-reference/cli-commands.md)** - Command-line reference
- **[Environment Variables](./legacy-docset/structured-guides/10-reference/environment-variables.md)** - Environment variable reference
- **[Glossary](./legacy-docset/structured-guides/10-reference/glossary.md)** - Terms and definitions

**Best for:** All users, quick lookups

---

## Documentation by Audience

### For New Users
1. [Quick Start Guide](./QUICK_START.md)
2. [Getting Started](./legacy-docset/structured-guides/00-getting-started/README.md)
3. [Features Overview](./legacy-docset/structured-guides/02-features/README.md)
4. [Quick Reference](./legacy-docset/structured-guides/10-reference/quick-reference.md)

### For Developers
1. [Architecture Overview](./legacy-docset/structured-guides/01-architecture/README.md)
2. [Development Guide](./legacy-docset/structured-guides/04-development/README.md)
3. [API Reference](./legacy-docset/structured-guides/07-api/README.md)
4. [Testing Guide](./legacy-docset/structured-guides/04-development/testing-guide.md)

### For Administrators
1. [Administration Guide](./legacy-docset/structured-guides/03-administration/README.md)
2. [Deployment Guide](./legacy-docset/structured-guides/05-deployment/README.md)
3. [Security Guide](./legacy-docset/structured-guides/08-security/README.md)
4. [Monitoring Setup](./legacy-docset/structured-guides/03-administration/monitoring-docker.md)

### For DevOps Engineers
1. [Deployment Guide](./legacy-docset/structured-guides/05-deployment/README.md)
2. [Docker Setup](./legacy-docset/structured-guides/00-getting-started/setup-docker.md)
3. [Performance Guide](./legacy-docset/structured-guides/09-performance/README.md)
4. [CI/CD Pipeline](./legacy-docset/structured-guides/05-deployment/ci-cd.md)

### For Security Officers
1. [Security Overview](./legacy-docset/structured-guides/08-security/README.md)
2. [Secrets Management](./legacy-docset/structured-guides/08-security/secrets-management.md)
3. [Audit Logging](./legacy-docset/structured-guides/08-security/audit-logging.md)
4. [Security Best Practices](./legacy-docset/structured-guides/08-security/security-best-practices.md)

---

## Common Tasks

### Installation & Setup
- [Install with Docker](./legacy-docset/structured-guides/00-getting-started/setup-docker.md)
- [Install without Docker](./legacy-docset/structured-guides/00-getting-started/setup-native.md)
- [Configure secrets](./legacy-docset/structured-guides/08-security/secrets-quick-start.md)
- [Set up monitoring](./legacy-docset/structured-guides/03-administration/monitoring-docker.md)

### Development
- [Set up dev environment](./legacy-docset/structured-guides/04-development/getting-started.md)
- [Write and run tests](./legacy-docset/structured-guides/04-development/testing-guide.md)
- [Check test coverage](./legacy-docset/structured-guides/04-development/testing-coverage-report.md)
- [Debug issues](./legacy-docset/structured-guides/04-development/debugging.md)
- [Follow coding standards](./legacy-docset/structured-guides/04-development/coding-standards.md)

### Administration
- [Manage users](./legacy-docset/structured-guides/03-administration/user-management.md)
- [Configure system settings](./legacy-docset/structured-guides/03-administration/system-settings.md)
- [Backup data](./legacy-docset/structured-guides/03-administration/backup-restore.md)
- [Monitor system health](./legacy-docset/structured-guides/03-administration/monitoring-docker.md)

### Deployment
- [Deploy to production](./legacy-docset/structured-guides/05-deployment/production-deployment.md)
- [Set up CI/CD](./legacy-docset/structured-guides/05-deployment/ci-cd.md)
- [Troubleshoot deployment](./legacy-docset/structured-guides/05-deployment/troubleshooting.md)

### Performance
- [Set up caching](./legacy-docset/structured-guides/09-performance/caching-strategy.md)
- [Optimize database](./legacy-docset/structured-guides/09-performance/database-optimization.md)
- [Monitor performance](./legacy-docset/structured-guides/09-performance/performance-monitoring.md)

---

## Contributing to Documentation

Documentation is a living resource. If you find errors, outdated information, or have suggestions for improvement:

1. Check the [Development Guide](../09-DEVELOPMENT.md)
2. Follow the [Coding Standards](./legacy-docset/structured-guides/04-development/coding-standards.md)
3. Submit documentation updates via pull request
4. Update the relevant section's README
5. Keep documentation current with code changes

---

## Documentation Standards

All documentation in this project follows these standards:

- **Format:** Markdown (.md)
- **Style:** Clear, concise, actionable
- **Structure:** Hierarchical with README files in each folder
- **Links:** Relative links within documentation
- **Updates:** Documentation updated with each feature change
- **Version:** Documentation version matches application version

---

## Getting Help

Can't find what you're looking for?

1. **Search:** Use your editor's search to find keywords
2. **Index:** This page lists all available documentation
3. **README:** Check the README in each section
4. **Issues:** Report missing documentation via GitHub Issues
5. **Quick Reference:** Check the [Quick Reference](./legacy-docset/structured-guides/10-reference/quick-reference.md)

---

## Documentation Map

```
docs/
├── INDEX.md (this file)
├── QUICK_START.md
├── 00-getting-started/
│   ├── README.md
│   ├── quick-start.md
│   ├── installation.md
│   ├── setup-docker.md
│   └── setup-native.md
├── 01-architecture/
│   ├── README.md
│   ├── overview.md
│   ├── architecture-review-november-2025.md
│   ├── implementation-plan-november-2025.md
│   ├── backend-architecture.md
│   ├── frontend-architecture.md
│   ├── database-schema.md
│   └── security-model.md
├── 02-features/
│   ├── README.md
│   ├── authentication.md
│   ├── authorization.md
│   ├── event-management.md
│   ├── scoring-system.md
│   ├── certification-workflow.md
│   ├── real-time-updates.md
│   ├── file-uploads.md
│   └── theme-customization.md
├── 03-administration/
│   ├── README.md
│   ├── user-management.md
│   ├── system-settings.md
│   ├── backup-restore.md
│   ├── monitoring-docker.md
│   └── monitoring-native.md
├── 04-development/
│   ├── README.md
│   ├── getting-started.md
│   ├── coding-standards.md
│   ├── testing-guide.md
│   ├── testing-standards.md
│   ├── testing-quick-reference.md
│   ├── testing-coverage-report.md
│   ├── testing-examples.md
│   ├── testing-workflows.md
│   ├── test-documentation.md (legacy)
│   ├── test-execution-guide.md (legacy)
│   ├── debugging.md
│   └── git-workflow.md
├── 05-deployment/
│   ├── README.md
│   ├── production-deployment.md
│   ├── docker-deployment.md
│   ├── native-deployment.md
│   ├── ci-cd.md
│   └── troubleshooting.md
├── 06-phase-implementations/
│   ├── README.md
│   ├── phase1-foundation-complete.md
│   ├── phase2-foundation-complete.md
│   ├── phase2-implementation-guide.md
│   ├── PHASE2_IMPLEMENTATION_SUMMARY.md
│   ├── PHASE2_FILES_CREATED.txt
│   ├── phase2-status.md
│   ├── PHASE3_PROGRESS.md
│   ├── PHASES_3_AND_4_IMPLEMENTATION_GUIDE.md
│   ├── SESSION_SUMMARY_2025-11-12.md
│   ├── enhancements-executive-summary.md
│   └── enhancements-implementation-report.md
├── 07-api/
│   ├── README.md
│   ├── rest-api.md
│   ├── websocket-api.md
│   ├── authentication.md
│   └── rate-limiting.md
├── 08-security/
│   ├── README.md
│   ├── secrets-management.md
│   ├── secrets-quick-start.md
│   ├── virus-scanning.md
│   ├── security-best-practices.md
│   ├── audit-logging.md
│   └── vulnerability-management.md
├── 09-performance/
│   ├── README.md
│   ├── caching-strategy.md
│   ├── database-optimization.md
│   ├── frontend-optimization.md
│   └── performance-monitoring.md
└── 10-reference/
    ├── README.md
    ├── quick-reference.md
    ├── configuration.md
    ├── cli-commands.md
    ├── environment-variables.md
    └── glossary.md
```

---

**Last Updated:** November 12, 2025
**Maintained By:** Event Manager Development Team
**Feedback:** Submit documentation issues via GitHub Issues
