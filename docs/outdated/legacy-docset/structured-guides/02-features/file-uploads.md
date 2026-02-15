# File Upload System

## Overview


The Event Manager implements secure file upload functionality with virus scanning, type validation, and size limits.

## Features
- **Virus Scanning**: ClamAV integration for malware detection
- **Type Validation**: MIME type and extension checking
- **Size Limits**: Configurable per file category
- **Storage**: Organized by type (contestant images, judge images, documents)
- **Access Control**: Role-based file access permissions

## Implementation
See `/var/www/event-manager/src/routes/uploadRoutes.ts` and `/var/www/event-manager/src/config/virus-scan.config.ts`

## Configuration
- MAX_FILE_SIZE: Default 10MB
- CLAMAV_ENABLED: true
- Upload directory: ./uploads/

For detailed virus scanning documentation, see [Virus Scanning](../08-security/virus-scanning.md)


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
