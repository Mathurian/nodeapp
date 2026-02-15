# Getting Started with Development

## Overview


Setup guide for developers.

## Prerequisites
- Node.js 20.x LTS
- PostgreSQL 16
- Redis 7 (optional)
- Git

## Installation

```bash
# Clone repository
git clone <repository-url>
cd event-manager

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run migrate

# Start development servers
npm run dev              # Backend
cd frontend && npm run dev  # Frontend
```

## Project Structure
See [Backend Architecture](../01-architecture/backend-architecture.md) and [Frontend Architecture](../01-architecture/frontend-architecture.md)


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
