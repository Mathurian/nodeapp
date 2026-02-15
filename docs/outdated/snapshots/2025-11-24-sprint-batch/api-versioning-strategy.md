# API Versioning Strategy

**Date:** November 25, 2025
**Status:** Implemented
**Version:** 1.0

---

## Executive Summary

This document defines the API versioning strategy for the Event Manager application. We implement **URL-based versioning** to enable safe API evolution while maintaining backward compatibility.

---

## Versioning Approach: URL-Based

**Format:** `/api/v{version}/{resource}`

**Examples:**
- `/api/v1/events` - Version 1 events endpoint
- `/api/v1/auth/login` - Version 1 login endpoint
- `/api/v2/events` - Future version 2 events endpoint

**Current Version:** v1 (initial version)

---

## Why URL-Based Versioning?

### Advantages
✅ **Explicit and discoverable** - Version is visible in the URL
✅ **Browser-friendly** - Easy to test in browsers
✅ **Simple to implement** - Clear routing structure
✅ **Client-friendly** - Easy for clients to target specific versions
✅ **Caching-friendly** - Different versions can be cached independently

### Alternatives Considered
❌ **Header-based** - `Accept: application/vnd.api+json;version=1`
   - Harder to test, not browser-friendly
   - Invisible in URLs, harder to debug

❌ **Query parameter** - `/api/events?version=1`
   - Clutters query strings
   - Inconsistent with RESTful principles

---

## Implementation Strategy

### Phase 1: Initial Versioning (Current)

**Goal:** Introduce v1 while maintaining backward compatibility

**Approach:**
1. All current `/api/*` routes remain functional (legacy)
2. Add `/api/v1/*` routes as aliases to current implementation
3. Legacy routes internally map to v1 implementation
4. Set deprecation timeline for legacy routes

**Timeline:**
- **Now:** v1 available at `/api/v1/*`
- **Now:** Legacy `/api/*` routes still work
- **6 months:** Add deprecation warnings to legacy routes
- **12 months:** Legacy routes return 410 Gone with migration guide

### Phase 2: Breaking Changes (Future)

When breaking changes are needed:
1. Create `/api/v2/*` routes with new implementation
2. Keep `/api/v1/*` routes unchanged
3. Document migration path from v1 to v2
4. Support both versions for minimum 12 months

---

## Version Lifecycle Policy

### Support Window
- **Current version:** Full support, new features added
- **Previous version (N-1):** Maintenance only, security fixes
- **Older versions (N-2+):** Deprecated, no support

### Version Retention
- Minimum **12 months** support for deprecated versions
- **6 months** advance notice before version removal
- Clear migration documentation provided

### Deprecation Process
1. **Announcement:** 12 months before removal
2. **Warning Headers:** 6 months before removal
   - `X-API-Deprecated: true`
   - `X-API-Sunset: 2026-06-01`
   - `X-API-Migration-Guide: https://docs.example.com/api/v1-to-v2`
3. **410 Gone:** After sunset date, return proper error

---

## Version Numbering

### Semantic Versioning for API Versions

**Major Version (v1, v2, v3):** Breaking changes
- Changes to response structure
- Removal of fields or endpoints
- Changes to authentication
- Changes to error codes

**Examples of breaking changes:**
- Renaming a field from `userName` to `username`
- Removing an endpoint
- Changing date format from Unix timestamp to ISO 8601
- Changing 404 to 410 for deleted resources

**Not breaking changes (can be added to current version):**
- Adding new optional fields
- Adding new endpoints
- Adding new query parameters (optional)
- Adding new HTTP methods to existing endpoints
- More detailed error messages

---

## Request/Response Format

### Version in URL
```
GET /api/v1/events
GET /api/v1/auth/login
POST /api/v1/events
```

### Version Headers (informational)
```
X-API-Version: 1
X-API-Latest-Version: 1
X-API-Deprecated: false
```

### Error Response for Unsupported Version
```json
{
  "success": false,
  "error": "Unsupported API Version",
  "message": "API version v5 is not supported. Current version: v1. Latest version: v2.",
  "supportedVersions": ["v1", "v2"],
  "documentation": "https://docs.example.com/api/versioning"
}
```

### Deprecation Warning Response Headers
```
HTTP/1.1 200 OK
X-API-Version: 1
X-API-Deprecated: true
X-API-Sunset: 2026-06-01T00:00:00Z
X-API-Migration-Guide: https://docs.example.com/api/v1-to-v2
Warning: 299 - "API version 1 is deprecated and will be removed on 2026-06-01"
```

---

## Routing Implementation

### Current Implementation

**File:** `src/middleware/apiVersioning.ts`

All routes support both formats:
- `/api/{resource}` → Maps to v1 implementation (legacy)
- `/api/v1/{resource}` → Direct v1 implementation

**Route Registration:**
```typescript
// v1 routes (current implementation)
app.use('/api/v1/events', eventsRoutes)
app.use('/api/v1/auth', authRoutes)
// ... all other routes

// Legacy routes (backward compatibility)
app.use('/api/events', eventsRoutes)
app.use('/api/auth', authRoutes)
// ... all other routes
```

### Future Versions

When v2 is needed:
```typescript
// v2 routes (new implementation)
app.use('/api/v2/events', eventsV2Routes)

// v1 routes (maintained)
app.use('/api/v1/events', eventsRoutes)

// Legacy routes still point to v1
app.use('/api/events', eventsRoutes)
```

---

## Client Migration Guide

### For Frontend Applications

**Current (working):**
```typescript
const response = await fetch('/api/events')
```

**Recommended (explicit versioning):**
```typescript
const response = await fetch('/api/v1/events')
```

**When migrating to v2:**
```typescript
const response = await fetch('/api/v2/events')
```

### API Client Configuration

**Recommended approach:**
```typescript
// src/services/api.ts
const API_VERSION = 'v1' // Centralized version

export const apiClient = axios.create({
  baseURL: `/api/${API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Usage
apiClient.get('/events') // Automatically uses /api/v1/events
```

---

## Monitoring & Analytics

### Metrics to Track
- Requests per API version
- Deprecated endpoint usage
- Version adoption rate
- Migration completion percentage

### Alerts
- Spike in deprecated endpoint usage
- Zero usage of old version (safe to remove)
- High error rate on new version (migration issues)

---

## Documentation

### API Documentation Updates

**Swagger/OpenAPI:**
- Separate specifications per version
- `/api/docs/v1` - v1 documentation
- `/api/docs/v2` - v2 documentation
- `/api/docs` - Latest version

**Migration Guides:**
- Detailed changelog for each version
- Code examples for common migrations
- Breaking changes highlighted
- Timeline for deprecations

---

## Testing Strategy

### Version-Specific Tests

```typescript
describe('API v1', () => {
  it('should return events in v1 format', async () => {
    const res = await request(app).get('/api/v1/events')
    expect(res.status).toBe(200)
    // v1-specific assertions
  })
})

describe('API v2', () => {
  it('should return events in v2 format', async () => {
    const res = await request(app).get('/api/v2/events')
    expect(res.status).toBe(200)
    // v2-specific assertions
  })
})
```

### Backward Compatibility Tests

```typescript
it('should support legacy routes', async () => {
  const legacyRes = await request(app).get('/api/events')
  const v1Res = await request(app).get('/api/v1/events')
  expect(legacyRes.body).toEqual(v1Res.body)
})
```

---

## Example Scenarios

### Scenario 1: Adding a New Field (Non-Breaking)

**Change:** Add `createdBy` field to events

**Implementation:**
- Add field to v1 endpoints
- No new version needed
- Document in v1 changelog

**Client Impact:** None (additive change)

### Scenario 2: Renaming a Field (Breaking)

**Change:** Rename `userName` to `username`

**Implementation:**
1. Create v2 endpoints with `username`
2. Keep v1 endpoints with `userName`
3. Announce v1 deprecation
4. Support both for 12 months

**Client Impact:** Must migrate to v2

### Scenario 3: Removing an Endpoint (Breaking)

**Change:** Remove `/api/legacy-feature`

**Implementation:**
1. Mark as deprecated in v1
2. Remove from v2
3. Return 410 Gone after sunset
4. Provide migration guide

---

## Migration Checklist

When creating a new API version:

- [ ] Create new route files for breaking changes
- [ ] Update OpenAPI/Swagger documentation
- [ ] Add version detection middleware
- [ ] Configure deprecation warnings for old version
- [ ] Write migration guide
- [ ] Update client libraries
- [ ] Add monitoring for version usage
- [ ] Schedule deprecation announcement
- [ ] Set sunset date (12+ months)
- [ ] Write backward compatibility tests

---

## Best Practices

### DO ✅
- Always use explicit version in client code
- Document all breaking changes
- Provide migration examples
- Give ample deprecation notice
- Monitor version usage
- Test backward compatibility

### DON'T ❌
- Make breaking changes to current version
- Remove old versions without notice
- Change version numbering scheme
- Skip migration documentation
- Ignore deprecation warnings
- Force immediate migration

---

## Current Status

**Implemented:**
- ✅ URL-based versioning with `/api/v1/` prefix
- ✅ Version detection middleware
- ✅ Legacy route support (backward compatibility)
- ✅ Version headers in responses
- ✅ Centralized version configuration

**Not Yet Implemented:**
- ⏳ Deprecation warning headers (when needed)
- ⏳ Version-specific documentation (when v2 created)
- ⏳ Frontend API client update (pending)
- ⏳ Swagger documentation split by version (when v2 created)

---

## References

- [Roy Fielding's API Versioning](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)
- [Stripe API Versioning](https://stripe.com/docs/api/versioning)
- [GitHub API Versioning](https://docs.github.com/en/rest/overview/api-versions)
- [Semantic Versioning](https://semver.org/)

---

*Document created: November 25, 2025*
*Last updated: November 25, 2025*
*Next review: When v2 is needed*
