# WebSocket API Reference

**Base URL:** `ws://localhost:3000` (Development) | `wss://your-domain.com` (Production)
**Protocol:** Socket.IO v4
**Version:** 2.0
**Last Updated:** November 12, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Connection](#connection)
3. [Authentication](#authentication)
4. [Events](#events)
5. [Client Events (Emit)](#client-events-emit)
6. [Server Events (Listen)](#server-events-listen)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Overview

The Event Manager WebSocket API provides real-time bidirectional communication between the server and clients. It's built on Socket.IO and provides automatic reconnection, room-based messaging, and authentication integration.

### Features

- ✅ **Real-time score updates** - Live score submissions and updates
- ✅ **Certification notifications** - Instant certification status changes
- ✅ **User presence tracking** - Online/offline status
- ✅ **System notifications** - Important system messages
- ✅ **Live contest updates** - Contest and category changes
- ✅ **Automatic reconnection** - Handles network interruptions
- ✅ **Room-based messaging** - Targeted updates by event/contest/category
- ✅ **Authentication required** - JWT token validation

---

## Connection

### Establishing Connection

**JavaScript/TypeScript:**
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

// Connection successful
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// Connection error
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

// Disconnected
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### Connection States

- **`connecting`** - Attempting to establish connection
- **`connected`** - Successfully connected
- **`disconnected`** - Connection lost or closed
- **`reconnecting`** - Attempting to reconnect

---

## Authentication

### Token-Based Authentication

All WebSocket connections require a valid JWT token passed during connection.

**Connection with Auth:**
```typescript
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('token')
  }
});
```

**Authentication Events:**

```typescript
// Authentication successful
socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data.user);
  // data.user contains: { id, name, email, role }
});

// Authentication failed
socket.on('unauthorized', (error) => {
  console.error('Authentication failed:', error.message);
  socket.disconnect();
});
```

### Re-authentication

If your token expires during a connection, you'll receive an `unauthorized` event. Refresh your token and reconnect:

```typescript
socket.on('unauthorized', async () => {
  const newToken = await refreshToken();
  socket.auth.token = newToken;
  socket.connect();
});
```

---

## Events

### Event Naming Convention

Events follow a hierarchical naming pattern:

```
<entity>:<action>
```

**Examples:**
- `score:submitted` - Score was submitted
- `contest:certified` - Contest was certified
- `user:online` - User came online
- `notification:new` - New notification

---

## Client Events (Emit)

Events that clients send to the server.

### Join Rooms

Subscribe to specific event/contest/category updates.

**Event:** `join:room`

**Payload:**
```typescript
{
  type: 'event' | 'contest' | 'category',
  id: string
}
```

**Example:**
```typescript
// Join event room to receive all event-related updates
socket.emit('join:room', {
  type: 'event',
  id: 'clxxx456'
});

// Join category room for specific category updates
socket.emit('join:room', {
  type: 'category',
  id: 'clxxx222'
});
```

**Response:**
```typescript
socket.on('joined:room', (data) => {
  console.log('Joined room:', data.room);
  // data: { room: 'event:clxxx456', members: 5 }
});
```

### Leave Rooms

Unsubscribe from room updates.

**Event:** `leave:room`

**Payload:**
```typescript
{
  type: 'event' | 'contest' | 'category',
  id: string
}
```

**Example:**
```typescript
socket.emit('leave:room', {
  type: 'event',
  id: 'clxxx456'
});
```

### Ping

Check connection status.

**Event:** `ping`

**Example:**
```typescript
socket.emit('ping');

socket.on('pong', (data) => {
  console.log('Latency:', data.latency, 'ms');
});
```

### Request User List

Get list of online users in a room.

**Event:** `users:list`

**Payload:**
```typescript
{
  room: string  // e.g., 'event:clxxx456'
}
```

**Example:**
```typescript
socket.emit('users:list', { room: 'event:clxxx456' });

socket.on('users:list:response', (data) => {
  console.log('Online users:', data.users);
  // data: { room: 'event:clxxx456', users: [...], count: 12 }
});
```

---

## Server Events (Listen)

Events that the server sends to clients.

### Score Events

#### Score Submitted

Emitted when a judge submits a new score.

**Event:** `score:submitted`

**Payload:**
```typescript
{
  id: string;
  categoryId: string;
  judgeId: string;
  contestantId: string;
  rawScore: number;
  finalScore: number;
  judge: {
    id: string;
    name: string;
  };
  contestant: {
    id: string;
    name: string;
    contestantNumber: number;
  };
  timestamp: string;
}
```

**Example:**
```typescript
socket.on('score:submitted', (data) => {
  console.log(`New score: ${data.finalScore} for ${data.contestant.name}`);
  // Update UI with new score
  updateScoreDisplay(data);
});
```

#### Score Updated

Emitted when an existing score is modified.

**Event:** `score:updated`

**Payload:** Same as `score:submitted` plus `previousScore`

```typescript
socket.on('score:updated', (data) => {
  console.log(`Score updated: ${data.previousScore} → ${data.finalScore}`);
});
```

#### Score Deleted

Emitted when a score is deleted.

**Event:** `score:deleted`

**Payload:**
```typescript
{
  id: string;
  categoryId: string;
  judgeId: string;
  contestantId: string;
  reason: string;
  deletedBy: {
    id: string;
    name: string;
  };
  timestamp: string;
}
```

### Certification Events

#### Category Certified

Emitted when a category's scores are certified.

**Event:** `category:certified`

**Payload:**
```typescript
{
  categoryId: string;
  categoryName: string;
  contestId: string;
  certifiedBy: {
    id: string;
    name: string;
    role: string;
  };
  certificationLevel: 'JUDGE' | 'TALLY' | 'AUDITOR' | 'BOARD';
  timestamp: string;
  stats: {
    totalScores: number;
    certifiedScores: number;
  };
}
```

**Example:**
```typescript
socket.on('category:certified', (data) => {
  console.log(`Category "${data.categoryName}" certified by ${data.certifiedBy.name}`);
  showNotification(`Category certified at ${data.certificationLevel} level`);
});
```

#### Contest Certified

Emitted when an entire contest is certified.

**Event:** `contest:certified`

**Payload:**
```typescript
{
  contestId: string;
  contestName: string;
  eventId: string;
  certifiedBy: {
    id: string;
    name: string;
  };
  timestamp: string;
  stats: {
    totalCategories: number;
    certifiedCategories: number;
  };
}
```

#### Final Certification

Emitted when final board certification is complete.

**Event:** `certification:final`

**Payload:**
```typescript
{
  eventId: string;
  contestId: string;
  categoryId: string;
  status: 'APPROVED' | 'REJECTED';
  certifiedBy: {
    id: string;
    name: string;
  };
  comments: string;
  timestamp: string;
}
```

### User Events

#### User Online

Emitted when a user connects.

**Event:** `user:online`

**Payload:**
```typescript
{
  userId: string;
  name: string;
  role: string;
  timestamp: string;
}
```

**Example:**
```typescript
socket.on('user:online', (data) => {
  console.log(`${data.name} is now online`);
  updateUserStatus(data.userId, 'online');
});
```

#### User Offline

Emitted when a user disconnects.

**Event:** `user:offline`

**Payload:**
```typescript
{
  userId: string;
  name: string;
  timestamp: string;
}
```

#### User Activity

Emitted when a user performs a significant action.

**Event:** `user:activity`

**Payload:**
```typescript
{
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
}
```

### Notification Events

#### New Notification

Emitted when a user receives a notification.

**Event:** `notification:new`

**Payload:**
```typescript
{
  id: string;
  userId: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}
```

**Example:**
```typescript
socket.on('notification:new', (notification) => {
  showToast(notification.title, notification.message, notification.type);

  if (notification.priority === 'URGENT') {
    playAlertSound();
  }
});
```

#### Notification Read

Broadcast when a notification is marked as read.

**Event:** `notification:read`

**Payload:**
```typescript
{
  notificationId: string;
  userId: string;
  timestamp: string;
}
```

### Contest & Event Events

#### Contest Updated

Emitted when contest details change.

**Event:** `contest:updated`

**Payload:**
```typescript
{
  contestId: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  updatedBy: {
    id: string;
    name: string;
  };
  timestamp: string;
}
```

#### Event Status Changed

Emitted when event status changes (started, paused, completed).

**Event:** `event:status`

**Payload:**
```typescript
{
  eventId: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  previousStatus: string;
  timestamp: string;
}
```

### Assignment Events

#### Judge Assigned

Emitted when a judge is assigned to a category.

**Event:** `assignment:created`

**Payload:**
```typescript
{
  assignmentId: string;
  judgeId: string;
  judgeName: string;
  categoryId: string;
  categoryName: string;
  contestId: string;
  timestamp: string;
}
```

#### Assignment Removed

Emitted when an assignment is removed.

**Event:** `assignment:removed`

**Payload:**
```typescript
{
  assignmentId: string;
  judgeId: string;
  categoryId: string;
  reason: string;
  timestamp: string;
}
```

### System Events

#### System Notification

Broadcast system-wide announcements.

**Event:** `system:notification`

**Payload:**
```typescript
{
  type: 'MAINTENANCE' | 'UPDATE' | 'ALERT' | 'INFO';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  action: {
    label: string;
    link: string;
  } | null;
  timestamp: string;
}
```

**Example:**
```typescript
socket.on('system:notification', (data) => {
  if (data.severity === 'CRITICAL') {
    showModal(data.title, data.message);
  } else {
    showBanner(data.message);
  }
});
```

#### Maintenance Mode

Emitted when system enters/exits maintenance mode.

**Event:** `system:maintenance`

**Payload:**
```typescript
{
  active: boolean;
  scheduledStart: string | null;
  estimatedDuration: number;  // minutes
  message: string;
}
```

---

## Error Handling

### Error Event

All errors are emitted through a standardized error event.

**Event:** `error`

**Payload:**
```typescript
{
  code: string;
  message: string;
  details: any;
  timestamp: string;
}
```

**Example:**
```typescript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);

  switch (error.code) {
    case 'AUTH_FAILED':
      // Handle authentication failure
      redirectToLogin();
      break;

    case 'RATE_LIMIT':
      // Handle rate limiting
      showRateLimitWarning();
      break;

    case 'INVALID_DATA':
      // Handle invalid data
      showValidationError(error.details);
      break;

    default:
      showGenericError(error.message);
  }
});
```

### Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `AUTH_FAILED` | Authentication failed | Re-login required |
| `TOKEN_EXPIRED` | JWT token expired | Refresh token |
| `UNAUTHORIZED` | Insufficient permissions | Check user role |
| `RATE_LIMIT` | Too many requests | Slow down requests |
| `INVALID_DATA` | Invalid event data | Check payload format |
| `ROOM_NOT_FOUND` | Room doesn't exist | Verify room ID |
| `CONNECTION_LOST` | Server connection lost | Automatic reconnect |

---

## Best Practices

### 1. Handle Reconnection

Always implement reconnection logic:

```typescript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server initiated disconnect, reconnect manually
    socket.connect();
  }
  // else: automatic reconnection will occur
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Re-join rooms after reconnection
  rejoinRooms();
});
```

### 2. Clean Up Listeners

Remove event listeners when components unmount:

```typescript
useEffect(() => {
  socket.on('score:submitted', handleScoreSubmit);

  return () => {
    socket.off('score:submitted', handleScoreSubmit);
  };
}, []);
```

### 3. Join Relevant Rooms Only

Only subscribe to updates you need:

```typescript
// ✅ Good: Join specific rooms
socket.emit('join:room', { type: 'category', id: currentCategoryId });

// ❌ Bad: Join all rooms unnecessarily
```

### 4. Handle Offline Mode

Implement graceful degradation when WebSocket is unavailable:

```typescript
const [isOnline, setIsOnline] = useState(false);

socket.on('connect', () => setIsOnline(true));
socket.on('disconnect', () => setIsOnline(false));

// Show offline indicator
{!isOnline && <OfflineBanner />}
```

### 5. Throttle Updates

Prevent UI thrashing with frequent updates:

```typescript
import { throttle } from 'lodash';

const handleScoreUpdate = throttle((data) => {
  updateScoreDisplay(data);
}, 500);  // Max once per 500ms

socket.on('score:updated', handleScoreUpdate);
```

### 6. Validate Server Data

Always validate data received from the server:

```typescript
socket.on('score:submitted', (data) => {
  if (!data.id || !data.finalScore || !data.contestant) {
    console.error('Invalid score data:', data);
    return;
  }

  updateScoreDisplay(data);
});
```

### 7. Use TypeScript Types

Define types for all WebSocket events:

```typescript
interface ScoreSubmittedEvent {
  id: string;
  categoryId: string;
  judgeId: string;
  contestantId: string;
  rawScore: number;
  finalScore: number;
  judge: {
    id: string;
    name: string;
  };
  contestant: {
    id: string;
    name: string;
    contestantNumber: number;
  };
  timestamp: string;
}

socket.on('score:submitted', (data: ScoreSubmittedEvent) => {
  // Type-safe handling
});
```

---

## Connection Lifecycle

```
┌─────────────┐
│   Offline   │
└──────┬──────┘
       │ socket.connect()
       ▼
┌─────────────┐
│ Connecting  │──┐ Connection error
└──────┬──────┘  │
       │         │ Retry
       │ Success │
       ▼         │
┌─────────────┐◄─┘
│  Connected  │
└──────┬──────┘
       │
       │ Authenticate
       ▼
┌─────────────┐
│Authenticated│
└──────┬──────┘
       │
       │ Join rooms
       ▼
┌─────────────┐
│   Active    │◄──┐ Receive events
└──────┬──────┘   │
       │          │
       │          │
       ▼          │
┌─────────────┐   │
│Disconnected │───┘ Reconnect
└─────────────┘
```

---

## Rate Limiting

WebSocket events are rate-limited to prevent abuse:

- **General events:** 100 per minute
- **Join/Leave rooms:** 20 per minute
- **User list requests:** 10 per minute

Exceeding limits results in temporary suspension and an error event.

---

## Security Considerations

1. **Authentication Required:** All connections must provide valid JWT token
2. **Authorization Checks:** Server validates permissions for each event
3. **Room Isolation:** Users only receive updates for rooms they've joined
4. **Data Sanitization:** All outgoing data is sanitized
5. **Rate Limiting:** Prevents abuse and DoS attacks
6. **TLS/SSL:** Use WSS in production for encrypted connections

---

## Testing WebSocket Events

### Using Browser Console

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-token' }
});

socket.on('connect', () => console.log('Connected'));
socket.on('score:submitted', (data) => console.log('Score:', data));
socket.emit('join:room', { type: 'event', id: 'test-event-id' });
```

### Using Postman or Socket.IO Client Tools

Postman supports WebSocket testing with Socket.IO protocol.

---

## Support

- **Documentation:** https://docs.eventmanager.local/websocket
- **Socket.IO Docs:** https://socket.io/docs/v4/
- **Support:** api-support@eventmanager.local

---

## Changelog

- **2025-11-12:** Initial WebSocket API documentation

---

**Last Updated:** November 12, 2025
**API Version:** 2.0
**Socket.IO Version:** 4.x
