# Coding Standards

## Overview


Code style and conventions for the project.

## TypeScript
- Use strict mode
- Avoid `any` type
- Prefer interfaces over types for objects
- Use meaningful variable names

## Code Organization
- Controllers: Request handling only
- Services: Business logic
- Repositories: Data access
- Utils: Shared utilities

## Naming Conventions
- Files: camelCase for TS, PascalCase for React components
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase

## Comments
- Use JSDoc for public APIs
- Inline comments for complex logic
- Avoid obvious comments

## Testing
- Unit tests for services
- Integration tests for APIs
- E2E tests for critical workflows

See [Testing Guide](./testing-guide.md)


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
