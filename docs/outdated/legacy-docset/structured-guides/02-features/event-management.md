# Event Management

**Feature Category:** Core Functionality
**Status:** ✅ Complete
**Version:** 2.0

---

## Overview

The Event Manager provides comprehensive event lifecycle management, from creation through archival. Events are the top-level organizational unit, containing contests, categories, judges, and contestants. The system supports multiple concurrent events with advanced features including caching, locking, archiving, and real-time updates.

---

## Event Data Model

### Event Structure

Each event record contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique event identifier (CUID) |
| `name` | String | Event name (required) |
| `description` | String? | Detailed event description |
| `startDate` | DateTime | Event start date and time |
| `endDate` | DateTime | Event end date and time |
| `location` | String? | Physical or virtual location |
| `maxContestants` | Int? | Maximum number of contestants |
| `contestantNumberingMode` | Enum | AUTO or MANUAL numbering |
| `archived` | Boolean | Archive status (default: false) |
| `isLocked` | Boolean | Edit lock status (default: false) |
| `lockedAt` | DateTime? | Lock timestamp |
| `lockVerifiedBy` | String? | User who locked the event |
| `contestantViewRestricted` | Boolean | Restrict contestant score viewing |
| `contestantViewReleaseDate` | DateTime? | Score release date for contestants |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

### Event Relationships

Events have one-to-many relationships with:
- **Contests** - Sub-competitions within the event
- **Assignments** - Judge assignments
- **Certifications** - Certification records
- **Files** - Event-related file uploads
- **Role Assignments** - Dynamic role assignments
- **Winner Signatures** - Winner approval signatures

---

## Event Lifecycle

### 1. Draft Status

**Characteristics:**
- Event exists but has not started
- Current date is before startDate
- Editable by ADMIN, ORGANIZER, BOARD
- Can be modified, deleted, or archived

**Use Case:** Planning and setup phase

### 2. Active Status

**Characteristics:**
- Current date is between startDate and endDate
- Event is in progress
- Scoring and judging active
- Limited editing (based on lock status)

**Use Case:** Live event operations

### 3. Completed Status

**Characteristics:**
- Current date is after endDate
- Event has finished
- Results can be certified and finalized
- Can be archived for long-term storage

**Use Case:** Post-event processing and archival

### 4. Archived Status

**Characteristics:**
- Explicitly archived by administrator
- Read-only access
- Hidden from default listings
- Preserved for historical records

**Use Case:** Long-term storage and reporting

---

## Creating Events

### API Endpoint

**Create Event**

**Endpoint:** `POST /api/events`

**Required Role:** ADMIN, ORGANIZER, BOARD

**Request Body:**
```json
{
  "name": "Summer Festival 2025",
  "description": "Annual summer talent showcase",
  "startDate": "2025-07-15T09:00:00Z",
  "endDate": "2025-07-17T18:00:00Z",
  "location": "Outdoor Arena, Main Stage",
  "maxContestants": 100,
  "contestantNumberingMode": "AUTO"
}
```

**Field Validation:**

| Field | Required | Validation |
|-------|----------|------------|
| `name` | ✅ Yes | Non-empty string |
| `startDate` | ✅ Yes | Valid ISO 8601 date |
| `endDate` | ✅ Yes | Must be after startDate |
| `description` | ❌ No | Optional string |
| `location` | ❌ No | Optional string |
| `maxContestants` | ❌ No | Positive integer |
| `contestantNumberingMode` | ❌ No | AUTO or MANUAL (default: MANUAL) |

**Date Validation:**
```typescript
// End date must be after start date
if (endDate < startDate) {
  throw new ValidationError('End date must be after start date');
}

// Date parsing validation
const startDate = new Date(data.startDate);
if (isNaN(startDate.getTime())) {
  throw new ValidationError('Invalid start date format');
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": "clxxx123",
    "name": "Summer Festival 2025",
    "description": "Annual summer talent showcase",
    "startDate": "2025-07-15T09:00:00.000Z",
    "endDate": "2025-07-17T18:00:00.000Z",
    "location": "Outdoor Arena, Main Stage",
    "maxContestants": 100,
    "contestantNumberingMode": "AUTO",
    "archived": false,
    "isLocked": false,
    "createdAt": "2025-11-12T10:30:00.000Z",
    "updatedAt": "2025-11-12T10:30:00.000Z"
  }
}
```

---

## Retrieving Events

### Get All Events

Retrieve list of events with optional filtering.

**Endpoint:** `GET /api/events?archived=false&search=summer`

**Required Role:** Any authenticated user

**Query Parameters:**
- `archived` (optional) - Filter by archived status (true/false)
- `search` (optional) - Search by name or description

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx123",
      "name": "Summer Festival 2025",
      "startDate": "2025-07-15T09:00:00.000Z",
      "endDate": "2025-07-17T18:00:00.000Z",
      "location": "Outdoor Arena",
      "archived": false,
      "status": "DRAFT",
      "createdAt": "2025-11-12T10:30:00.000Z"
    }
  ]
}
```

**Status Calculation:**
```typescript
const now = new Date();
let status = 'DRAFT';

if (event.archived) {
  status = 'ARCHIVED';
} else if (new Date(event.startDate) <= now && new Date(event.endDate) >= now) {
  status = 'ACTIVE';
} else if (new Date(event.endDate) < now) {
  status = 'COMPLETED';
}
```

### Get Event by ID

**Endpoint:** `GET /api/events/:id`

**Required Role:** Any authenticated user

**Response:** Single event object with full details

### Get Event with Full Details

Includes all related data (contests, categories, judges, contestants).

**Endpoint:** `GET /api/events/:id/details`

**Required Role:** ADMIN, ORGANIZER, BOARD, TALLY_MASTER, AUDITOR

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx123",
    "name": "Summer Festival 2025",
    "startDate": "2025-07-15T09:00:00.000Z",
    "endDate": "2025-07-17T18:00:00.000Z",
    "contests": [
      {
        "id": "clxxx456",
        "name": "Vocal Performance",
        "categories": [ /* array of categories */ ],
        "contestants": [ /* array of contestants */ ],
        "judges": [ /* array of judges */ ]
      }
    ],
    "assignments": [ /* array of judge assignments */ ],
    "certifications": [ /* array of certifications */ ]
  }
}
```

**Caching:** Results cached for 30 minutes

### Get Upcoming Events

Events scheduled in the future.

**Endpoint:** `GET /api/events/upcoming`

**Required Role:** Any authenticated user

**Query:** `startDate > NOW() AND archived = false`

**Response:** Array of upcoming events sorted by startDate

**Caching:** 5 minutes

### Get Ongoing Events

Events currently in progress.

**Endpoint:** `GET /api/events/ongoing`

**Required Role:** Any authenticated user

**Query:** `startDate <= NOW() <= endDate AND archived = false`

**Response:** Array of active events

**Caching:** 2 minutes (more frequent updates for active events)

### Get Past Events

Completed events.

**Endpoint:** `GET /api/events/past`

**Required Role:** Any authenticated user

**Query:** `endDate < NOW() AND archived = false`

**Response:** Array of past events sorted by endDate descending

**Caching:** 1 hour (past events don't change)

---

## Updating Events

### Update Event

**Endpoint:** `PUT /api/events/:id`

**Required Role:** ADMIN, ORGANIZER, BOARD

**Request Body:** Partial event object
```json
{
  "name": "Summer Festival 2025 - Updated",
  "location": "Indoor Arena",
  "maxContestants": 150
}
```

**Lock Check:**
```typescript
const isLocked = await restrictionService.isLocked(eventId);
if (isLocked) {
  throw new ForbiddenError('Event is locked and cannot be edited');
}
```

**Date Validation:** If updating dates, same validation as creation applies

**Cache Invalidation:** All event caches invalidated after update

**Success Response (200):**
```json
{
  "success": true,
  "message": "Event updated successfully",
  "data": { /* updated event object */ }
}
```

---

## Event Archiving

### Archive Event

Move event to archived status.

**Endpoint:** `PATCH /api/events/:id/archive`

**Required Role:** ADMIN, ORGANIZER, BOARD

**Effects:**
- Sets `archived = true`
- Event hidden from default listings
- Event status becomes 'ARCHIVED'
- Event remains accessible via direct ID lookup
- All related data preserved

**Use Cases:**
- Long-term storage
- Decluttering active event lists
- Historical record keeping
- Data retention compliance

**Response:**
```json
{
  "success": true,
  "message": "Event archived successfully",
  "data": {
    "id": "clxxx123",
    "name": "Summer Festival 2025",
    "archived": true
  }
}
```

### Unarchive Event

Restore archived event to active status.

**Endpoint:** `PATCH /api/events/:id/unarchive`

**Required Role:** ADMIN, ORGANIZER, BOARD

**Effects:**
- Sets `archived = false`
- Event appears in default listings again
- Status recalculated based on dates

**Response:** Updated event object with `archived = false`

---

## Event Deletion

### Delete Event

**Endpoint:** `DELETE /api/events/:id`

**Required Role:** ADMIN, ORGANIZER

**Restrictions:**
- Event must not be locked
- Cascade deletes all related data:
  - Contests
  - Categories
  - Scores
  - Assignments
  - Certifications

**Lock Check:**
```typescript
const isLocked = await restrictionService.isLocked(eventId);
if (isLocked) {
  throw new ForbiddenError('Event is locked and cannot be deleted');
}
```

**Success Response (204):** No content

**Warning:** Deletion is permanent and cannot be undone!

---

## Event Locking

### Lock Mechanism

Events can be locked to prevent editing during critical operations.

**Purpose:**
- Prevent changes during final certification
- Protect data during report generation
- Maintain data integrity during audits
- Freeze configuration for scoring

### Lock Event

**Endpoint:** `POST /api/events/:id/lock`

**Required Role:** TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Request Body:**
```json
{
  "verifiedBy": "clxxx999"
}
```

**Implementation:**
```typescript
await prisma.event.update({
  where: { id: eventId },
  data: {
    isLocked: true,
    lockedAt: new Date(),
    lockVerifiedBy: verifiedBy
  }
});
```

**Effects:**
- Cannot update event details
- Cannot delete event
- Can still view event data
- Scoring may continue (based on configuration)

### Unlock Event

**Endpoint:** `POST /api/events/:id/unlock`

**Required Role:** TALLY_MASTER, AUDITOR, BOARD, ORGANIZER, ADMIN

**Requirement:** Must be unlocked by user with appropriate role

**Implementation:**
```typescript
await prisma.event.update({
  where: { id: eventId },
  data: {
    isLocked: false,
    lockedAt: null,
    lockVerifiedBy: null
  }
});
```

---

## Event Statistics

### Get Event Statistics

**Endpoint:** `GET /api/events/:id/stats`

**Required Role:** ADMIN, ORGANIZER, BOARD, TALLY_MASTER, AUDITOR

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "clxxx123",
    "eventName": "Summer Festival 2025",
    "totalContests": 5,
    "totalCategories": 15,
    "totalContestants": 87,
    "totalJudges": 12,
    "totalScores": 1305,
    "certifiedScores": 1100,
    "uncertifiedScores": 205,
    "completionPercentage": 84.3,
    "contestStats": [
      {
        "contestId": "clxxx456",
        "contestName": "Vocal Performance",
        "categories": 3,
        "contestants": 28,
        "scores": 336,
        "certified": 300
      }
    ]
  }
}
```

**Caching:** 5 minutes

---

## Contestant View Restrictions

### Restrict Contestant Access

Prevent contestants from viewing scores until a specific date.

**Endpoint:** `POST /api/events/:id/restrict-contestant-view`

**Required Role:** ADMIN, ORGANIZER, BOARD

**Request Body:**
```json
{
  "restricted": true,
  "releaseDate": "2025-07-17T20:00:00Z"
}
```

**Effects:**
- Contestants cannot view scores until releaseDate
- Applies to all contests in the event
- Judges and administrators can still view scores

**Use Cases:**
- Hide scores during judging
- Scheduled result release
- Prevent premature disclosure

### Release Scores to Contestants

**Option 1:** Set `restricted = false`

```json
{
  "restricted": false
}
```

**Option 2:** Wait for releaseDate to pass

System automatically allows access when:
```typescript
const now = new Date();
const canView = !restricted || (releaseDate && now >= releaseDate);
```

---

## Event Search

### Search Events

Full-text search across event names and descriptions.

**Endpoint:** `GET /api/events/search?q=summer`

**Required Role:** Any authenticated user

**Query Parameters:**
- `q` - Search query string

**Search Implementation:**
```typescript
// Searches name and description fields
const events = await prisma.event.findMany({
  where: {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } }
    ]
  }
});
```

**Response:** Array of matching events

**Caching:** 5 minutes per unique query

---

## Event Date Range Queries

### Get Events by Date Range

**Endpoint:** `GET /api/events/range?startDate=2025-07-01&endDate=2025-07-31`

**Required Role:** Any authenticated user

**Query Parameters:**
- `startDate` - Range start (ISO 8601)
- `endDate` - Range end (ISO 8601)

**Query Logic:**
```typescript
// Events that overlap with the date range
const events = await prisma.event.findMany({
  where: {
    OR: [
      // Event starts within range
      {
        startDate: {
          gte: startDate,
          lte: endDate
        }
      },
      // Event ends within range
      {
        endDate: {
          gte: startDate,
          lte: endDate
        }
      },
      // Event spans entire range
      {
        AND: [
          { startDate: { lte: startDate } },
          { endDate: { gte: endDate } }
        ]
      }
    ]
  }
});
```

**Response:** Array of events in date range

**Caching:** 10 minutes per unique range

---

## Caching Strategy

### Cache Keys

Event data is cached with the following keys:

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `event:{id}` | 1 hour | Single event by ID |
| `event:details:{id}` | 30 min | Event with full relations |
| `events:list:{filters}` | 5 min | Filtered event lists |
| `events:upcoming` | 5 min | Upcoming events |
| `events:ongoing` | 2 min | Active events |
| `events:past` | 1 hour | Past events |
| `events:stats:{id}` | 5 min | Event statistics |
| `events:search:{query}` | 5 min | Search results |

### Cache Invalidation

Cache is automatically invalidated on:
- Event creation - List caches cleared
- Event update - All related caches cleared
- Event deletion - All related caches cleared
- Event archiving - List caches cleared

**Invalidation Patterns:**
```typescript
await cacheService.invalidatePattern('events:list:*');
await cacheService.invalidatePattern('events:stats:*');
await cacheService.del(`event:${id}`);
await cacheService.del(`event:details:${id}`);
```

---

## Real-Time Updates

### WebSocket Events

Events broadcast real-time updates via Socket.IO.

**Event Created:**
```typescript
socket.on('event:created', (data) => {
  console.log('New event created:', data);
  // { id, name, startDate, endDate }
});
```

**Event Updated:**
```typescript
socket.on('event:updated', (data) => {
  console.log('Event updated:', data);
  // { id, name, updatedFields: ['location', 'maxContestants'] }
});
```

**Event Deleted:**
```typescript
socket.on('event:deleted', (data) => {
  console.log('Event deleted:', data.id);
});
```

**Event Status Changed:**
```typescript
socket.on('event:statusChanged', (data) => {
  console.log('Event status:', data);
  // { id, oldStatus: 'DRAFT', newStatus: 'ACTIVE' }
});
```

### Room-Based Broadcasting

Subscribe to event-specific updates:
```typescript
socket.emit('join:room', { room: `event:${eventId}` });
```

---

## Common Use Cases

### 1. Create and Setup Event

```typescript
// 1. Create event
const event = await fetch('/api/events', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Summer Festival 2025',
    startDate: '2025-07-15T09:00:00Z',
    endDate: '2025-07-17T18:00:00Z',
    location: 'Main Arena'
  })
});

// 2. Create contests under event
const contests = await Promise.all([
  createContest(event.id, 'Vocal Performance'),
  createContest(event.id, 'Dance'),
  createContest(event.id, 'Talent')
]);

// 3. Set up categories for each contest
for (const contest of contests) {
  await createCategories(contest.id);
}

// 4. Assign judges
await assignJudges(event.id);
```

### 2. Monitor Event Progress

```typescript
// Get event statistics
const stats = await fetch(`/api/events/${eventId}/stats`);

console.log(`Completion: ${stats.completionPercentage}%`);
console.log(`Certified: ${stats.certifiedScores}/${stats.totalScores}`);

// Subscribe to real-time updates
socket.emit('join:room', { room: `event:${eventId}` });

socket.on('score:submitted', (data) => {
  updateProgressBar(data);
});
```

### 3. Lock Event for Final Certification

```typescript
// Lock event before final review
await fetch(`/api/events/${eventId}/lock`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ verifiedBy: userId })
});

// Perform final certification
await certifyAllScores(eventId);

// Unlock after completion
await fetch(`/api/events/${eventId}/unlock`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 4. Archive Completed Event

```typescript
// Get past events
const pastEvents = await fetch('/api/events/past');

// Archive each completed event
for (const event of pastEvents.data) {
  if (shouldArchive(event)) {
    await fetch(`/api/events/${event.id}/archive`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
}
```

---

## Security Considerations

### 1. Access Control

- ✅ Event creation restricted to ADMIN, ORGANIZER, BOARD
- ✅ Event deletion restricted to ADMIN, ORGANIZER
- ✅ Event locking restricted to senior roles
- ✅ Contestant view restrictions enforced

### 2. Data Validation

- ✅ Required fields enforced
- ✅ Date range validation (endDate > startDate)
- ✅ Lock status checked before modifications
- ✅ Cascade delete prevention for active events

### 3. Audit Trail

All event operations logged:
```typescript
logInfo('Event created', { eventId, createdBy: userId });
logInfo('Event updated', { eventId, updatedBy: userId, changes });
logInfo('Event archived', { eventId, archivedBy: userId });
logInfo('Event deleted', { eventId, deletedBy: userId });
```

---

## Performance Optimization

### Database Indexes

Events are optimized with indexes on:
- Primary key (id)
- Timestamps (createdAt, updatedAt)
- Status fields (archived, isLocked)
- Date ranges (startDate, endDate)

### Query Optimization

**Efficient Event Listing:**
```typescript
// Include only necessary fields
const events = await prisma.event.findMany({
  select: {
    id: true,
    name: true,
    startDate: true,
    endDate: true,
    location: true,
    archived: true
  }
});
```

**Batch Operations:**
```typescript
// Archive multiple events in single transaction
await prisma.$transaction(
  eventIds.map(id =>
    prisma.event.update({
      where: { id },
      data: { archived: true }
    })
  )
);
```

---

## Testing

### Test Event Creation

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "startDate": "2025-12-01T09:00:00Z",
    "endDate": "2025-12-03T18:00:00Z",
    "location": "Test Venue"
  }'
```

### Test Event Update

```bash
curl -X PUT http://localhost:3000/api/events/EVENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Event",
    "maxContestants": 200
  }'
```

### Test Event Archiving

```bash
curl -X PATCH http://localhost:3000/api/events/EVENT_ID/archive \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### Issue: "End date must be after start date"

**Cause:** Invalid date range in request.

**Solution:**
- Verify endDate > startDate
- Check date format (ISO 8601)
- Ensure timezone is included

### Issue: "Event is locked and cannot be edited"

**Cause:** Event is locked by another user or process.

**Solution:**
- Check lock status: `GET /api/events/:id`
- Unlock event: `POST /api/events/:id/unlock`
- Verify you have appropriate role for unlocking

### Issue: "Cache not invalidating"

**Cause:** Redis connection issue or cache service error.

**Solution:**
- Check Redis connection: `redis-cli ping`
- Clear all event caches: `redis-cli KEYS "events:*" | xargs redis-cli DEL`
- Restart cache service

---

## API Endpoints Summary

| Endpoint | Method | Description | Required Role |
|----------|--------|-------------|---------------|
| `/api/events` | GET | List events | Any |
| `/api/events` | POST | Create event | ADMIN, ORGANIZER, BOARD |
| `/api/events/:id` | GET | Get event by ID | Any |
| `/api/events/:id` | PUT | Update event | ADMIN, ORGANIZER, BOARD |
| `/api/events/:id` | DELETE | Delete event | ADMIN, ORGANIZER |
| `/api/events/:id/details` | GET | Get full event details | ADMIN, ORGANIZER, BOARD, TALLY_MASTER, AUDITOR |
| `/api/events/:id/stats` | GET | Get event statistics | ADMIN, ORGANIZER, BOARD, TALLY_MASTER, AUDITOR |
| `/api/events/:id/archive` | PATCH | Archive event | ADMIN, ORGANIZER, BOARD |
| `/api/events/:id/unarchive` | PATCH | Unarchive event | ADMIN, ORGANIZER, BOARD |
| `/api/events/:id/lock` | POST | Lock event | TALLY_MASTER+ |
| `/api/events/:id/unlock` | POST | Unlock event | TALLY_MASTER+ |
| `/api/events/upcoming` | GET | Get upcoming events | Any |
| `/api/events/ongoing` | GET | Get ongoing events | Any |
| `/api/events/past` | GET | Get past events | Any |
| `/api/events/search` | GET | Search events | Any |
| `/api/events/range` | GET | Get events by date range | Any |

---

## Related Documentation

- [Contest Management](./contest-management.md) - Managing contests within events
- [Certification Workflow](./certification-workflow.md) - Event certification process
- [Real-Time Updates](./real-time-updates.md) - WebSocket event documentation
- [Caching Strategy](../08-architecture/caching.md) - Cache implementation details
- [API Reference](../07-api/rest-api.md#events) - Complete API documentation

---

**Last Updated:** November 12, 2025
**Version:** 2.0
