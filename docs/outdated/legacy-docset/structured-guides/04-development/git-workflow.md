# Git Workflow

## Overview


Branching strategy and commit conventions.

## Branches
- `main` - Production
- `develop` - Development
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Production hotfixes

## Commit Messages
Format: `type(scope): message`

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Tests
- chore: Maintenance

Example: `feat(scoring): add bulk score import`

## Pull Requests
- Create PR from feature branch to develop
- Require 1 approval
- Run tests before merge
- Squash commits on merge

## Release Process
1. Create release branch from develop
2. Update version in package.json
3. Update CHANGELOG.md
4. Merge to main
5. Tag release


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
