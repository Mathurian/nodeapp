# User Management

## Overview


Comprehensive guide to managing users, roles, and permissions.

## User Roles
- ADMIN, ORGANIZER, BOARD, JUDGE, CONTESTANT, EMCEE, TALLY_MASTER, AUDITOR

## Operations
- Creating users
- Assigning roles
- Managing permissions
- Activating/deactivating accounts
- Password resets

## API Endpoints
- POST /api/users - Create user
- PUT /api/users/:id - Update user
- DELETE /api/users/:id - Delete user
- POST /api/users/:id/activate - Activate/deactivate

See `/var/www/event-manager/src/routes/usersRoutes.ts`


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
