# Native Deployment

## Overview


Native (non-Docker) production deployment.

## System Requirements
- Ubuntu 22.04 LTS or similar
- Node.js 20.x LTS
- PostgreSQL 16
- Redis 7
- Nginx (optional)
- ClamAV (optional)

## Installation Steps

1. **Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Install PostgreSQL**:
```bash
sudo apt-get install postgresql-16
```

3. **Install Redis**:
```bash
sudo apt-get install redis-server
```

4. **Clone and build**:
```bash
git clone <repo>
cd event-manager
npm install
npm run build
```

5. **Configure systemd service**:
Create `/etc/systemd/system/event-manager.service`

6. **Start service**:
```bash
sudo systemctl enable event-manager
sudo systemctl start event-manager
```


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
