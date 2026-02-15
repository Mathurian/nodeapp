# Production Deployment Guide

## Overview


Complete guide for deploying to production.

## Deployment Options
1. Docker Deployment (recommended)
2. Native Deployment
3. Cloud Platforms (AWS, Azure, Google Cloud)

## Pre-Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Secrets properly secured
- [ ] SSL certificates obtained
- [ ] Backup system configured
- [ ] Monitoring enabled

## Quick Start
```bash
# Docker deployment
docker-compose -f docker-compose.yml up -d

# Or native
npm run build
npm start
```

See [Docker Deployment](./docker-deployment.md) for Docker-specific instructions.
See [Native Deployment](./native-deployment.md) for native setup.


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
