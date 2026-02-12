# Notification System & Permission Structure Investigation Report

## Executive Summary

The Event Manager application has a **fully implemented notification system** with real-time support via Socket.IO, but **lacks proper permission controls for sending notifications**. Currently, there is **no UI or API endpoint to allow admin, super admin, organizer, or board users to send notifications** to other users. Notifications are only created through specific backend events (scoring, certification, assignments, etc.), not through user-initiated actions.

---

## 1. Current Notification System Implementation

### 1.1 Database Model (Prisma)
**Location:** `/var/www/event-manager/prisma/schema.prisma` (lines 722-749)

**Notification Model:**
```
- id: String (CUID primary key)
- userId: String (recipient)
- type: NotificationType (INFO, SUCCESS, WARNING, ERROR, SYSTEM)
- title: String
- message: String
- link: String? (optional navigation link)
- read: Boolean (default: false)
- readAt: DateTime? (when marked as read)
- metadata: String? (JSON metadata)
- createdAt: DateTime
- updatedAt: DateTime
- tenantId: String (multi-tenant support)
- emailSent: Boolean (tracking email delivery)
- emailSentAt: DateTime?
- pushSent: Boolean (tracking push delivery)
- pushSentAt: DateTime?
- templateId: String? (notification template reference)
```

**Indexes:**
- `[tenantId]` - for tenant isolation
- `[tenantId, userId, read]` - for efficient filtering
- `[userId, createdAt]` - for timeline queries
- `[userId, read]` - for read status

### 1.2 Notification Types
**Location:** `/var/www/event-manager/prisma/schema.prisma` (lines 1956-1962)

```typescript
enum NotificationType {
  INFO      // General information
  SUCCESS   // Positive outcomes
  WARNING   // Important alerts
  ERROR     // Error states
  SYSTEM    // System-wide notifications
}
```

### 1.3 Backend Architecture

#### NotificationService
**Location:** `/var/www/event-manager/src/services/NotificationService.ts`

**Key Methods:**
1. `createNotification()` - Create single notification
2. `broadcastNotification()` - Send to multiple users
3. `getUserNotifications()` - Fetch user's notifications
4. `getUnreadCount()` - Count unread notifications
5. `markAsRead()` - Mark single as read
6. `markAllAsRead()` - Mark all as read
7. `deleteNotification()` - Delete notification
8. `cleanupOldNotifications()` - Cleanup old read notifications

**Specialized Methods (for specific events):**
- `notifyScoreSubmitted()` - Score submission notifications
- `notifyContestCertified()` - Contest certification
- `notifyAssignmentChange()` - Judge assignments
- `notifyReportReady()` - Report generation complete
- `notifyCertificationRequired()` - Certification workflow steps
- `notifyRoleChange()` - User role changes
- `notifyEventStatusChange()` - Event status updates
- `notifySystemMaintenance()` - System-wide announcements
- `notifyError()` - Error notifications

**Real-time Support:**
- Socket.IO integration for real-time notifications
- Rooms: `user:{userId}` for individual notifications
- Events: `notification:new`, `notification:read`, `notification:read-all`, `notification:deleted`

#### NotificationRepository
**Location:** `/var/www/event-manager/src/repositories/NotificationRepository.ts`

Handles all database operations:
- Create, read, update, delete operations
- Filtering by user, tenant, read status, type
- Batch operations (createMany for broadcasts)
- Cleanup operations

#### NotificationController
**Location:** `/var/www/event-manager/src/controllers/notificationsController.ts`

**Endpoints:**
- `getAllNotifications` - GET /api/notifications
- `getNotificationById` - NOT IMPLEMENTED
- `createNotification` - POST /api/notifications (GENERIC, NO PERMISSION CHECK)
- `updateNotification` - NOT IMPLEMENTED
- `deleteNotification` - DELETE /api/notifications/{id}
- `markAsRead` - PUT /api/notifications/{id}/read
- `markAllAsRead` - PUT /api/notifications/read-all

### 1.4 Notification Routes
**Location:** `/var/www/event-manager/src/routes/notificationsRoutes.ts`

**Current Routes:**
```
GET    /api/notifications                    - Get user's notifications (AUTHENTICATED)
GET    /api/notifications/unread-count       - Get unread count (AUTHENTICATED)
PUT    /api/notifications/{id}/read          - Mark as read (AUTHENTICATED)
PUT    /api/notifications/read-all           - Mark all as read (AUTHENTICATED)
DELETE /api/notifications/{id}               - Delete notification (AUTHENTICATED)
DELETE /api/notifications/read-all           - Delete old notifications (AUTHENTICATED)
```

**CRITICAL FINDING:** There is **NO endpoint to send/create notifications** at `/POST /api/notifications/send` or similar. The `createNotification` endpoint exists in the controller but:
1. Is not exposed in routes
2. Has no permission checks
3. Has no UI for users

### 1.5 Frontend Implementation
**Location:** `/var/www/event-manager/frontend/src/pages/NotificationsPage.tsx`

**Features:**
- Display notifications with filtering (all/unread/read)
- Mark as read/unread
- Delete notifications
- Notification preferences management
- Real-time Socket.IO integration

**MISSING:**
- No UI to compose and send notifications
- No permission-based notification sending form
- No admin interface for system-wide announcements

### 1.6 Notification Preferences
**Location:**
- Controller: `/var/www/event-manager/src/controllers/notificationPreferencesController.ts`
- Routes: `/var/www/event-manager/src/routes/notificationPreferencesRoutes.ts`

**Preferences Tracked:**
- `emailEnabled` / `pushEnabled` / `inAppEnabled`
- `emailDigestFrequency`
- `emailTypes` / `pushTypes` / `inAppTypes` (arrays)
- `quietHoursStart` / `quietHoursEnd`

---

## 2. Current Permission Structure

### 2.1 Role Definitions
**Location:** `/var/www/event-manager/src/constants/roles.ts`

**Available Roles:**
```typescript
ADMIN       - ADMIN (full access)
ORGANIZER   - ORGANIZER (event/contest management)
BOARD       - BOARD (approval/reporting)
JUDGE       - JUDGE (scoring)
CONTESTANT  - CONTESTANT (competition participation)
EMCEE       - EMCEE (event announcements)
TALLY_MASTER - TALLY_MASTER (result tallying)
AUDITOR     - AUDITOR (audit trail reading)
```

**Note:** No "SUPER_ADMIN" role defined in constants/roles.ts, but referenced in auth middleware and permissions.

### 2.2 Permission Matrix
**Location:** `/var/www/event-manager/src/middleware/permissions.ts`

**Current Permission Model:**
```javascript
PERMISSIONS = {
  SUPER_ADMIN: ["*"],                    // All permissions
  ADMIN: ["*"],                          // All permissions
  ORGANIZER: [
    "events:*", "contests:*", "categories:*", "users:*", "reports:*",
    "templates:*", "settings:*", "backup:*", "emcee:*", "category-types:*",
    "assignments:*", "results:*"
  ],
  BOARD: [
    "events:read", "contests:read", "results:*", "reports:*", "approvals:*",
    "users:read", "settings:read", "emcee:read", "category-types:read",
    "assignments:*"
  ],
  JUDGE: [
    "scores:write", "scores:read", "results:read", "commentary:write",
    "events:read", "contests:read", "categories:read"
  ],
  CONTESTANT: [
    "events:read", "contests:read", "categories:read", "results:read",
    "scores:read", "commentary:read", "profile:read", "profile:write"
  ],
  EMCEE: [
    "events:read", "contests:read", "categories:read", "results:read",
    "scores:read", "announcements:write"
  ],
  TALLY_MASTER: [
    "scores:*", "results:*", "events:read", "contests:read", "categories:read",
    "reports:read", "tracker:*"
  ],
  AUDITOR: [
    "events:read", "contests:read", "categories:read", "results:read",
    "scores:read", "reports:read", "activity-logs:read", "audit-logs:read", "tracker:*"
  ]
}
```

**CRITICAL FINDING:** 
- **No "notifications:*" or "notifications:write" permission exists** for any role
- No permission checking for notification sending

### 2.3 Authentication & Authorization Middleware
**Location:** `/var/www/event-manager/src/middleware/auth.ts`

**Key Functions:**
1. `authenticateToken()` - Validates JWT and sets `req.user`
2. `requireRole(roles[])` - Checks if user has required role
   - SUPER_ADMIN/ADMIN: Always pass (unrestricted)
   - ORGANIZER: Resource scoping via `checkOrganizerPermission()`
   - Others: Exact role match
3. `requirePermission(action)` - Checks permission matrix
4. `optionalAuth()` - Sets user if valid token, allows anonymous
5. `checkOrganizerPermission()` - Verifies organizer has assignment for resource

**Current Gaps:**
- No middleware for notification-specific permissions
- No per-recipient validation
- No authorization to send notifications to users/groups

---

## 3. Who Currently Can Send Notifications

### 3.1 Direct API Calls
Currently **NO ONE can directly send notifications via API** because:
1. The `createNotification` endpoint is in the controller but **NOT exposed** in routes
2. Even if exposed, it would have no permission checks
3. No frontend UI exists for sending notifications

### 3.2 System-Generated Notifications
Notifications are only created by **backend services and event handlers**:

**Event Handlers** that create notifications:
1. Judge scoring → `notifyScoreSubmitted()`
2. Contest certification → `notifyContestCertified()`
3. Judge assignments → `notifyAssignmentChange()`
4. Report generation → `notifyReportReady()`
5. Certification requirements → `notifyCertificationRequired()`
6. User role changes → `notifyRoleChange()`
7. Event status changes → `notifyEventStatusChange()`
8. System maintenance → `notifySystemMaintenance()`
9. System errors → `notifyError()`

**These are triggered automatically, not by user action.**

### 3.3 Manual Sending Limitation
There is **NO interface for users to manually send notifications**, regardless of role.

---

## 4. What Needs to Change

### 4.1 Backend Changes Required

#### A. Add Notification Permissions to Matrix
**File:** `/var/www/event-manager/src/middleware/permissions.ts`

**Changes Needed:**
```typescript
PERMISSIONS = {
  SUPER_ADMIN: ["*"],  // All permissions
  ADMIN: ["*"],        // All permissions
  ORGANIZER: [
    // ... existing ...
    "notifications:write",     // ← ADD: Send to users
    "notifications:broadcast"  // ← ADD: System-wide broadcasts
  ],
  BOARD: [
    // ... existing ...
    "notifications:read",      // ← ADD: View all notifications (optional)
    "notifications:write"      // ← ADD: Send to users
  ],
  JUDGE: [
    // ... existing ...
    // No notification sending
  ],
  // ... others remain unchanged
}
```

#### B. Create NotificationSendingController
**New File:** `/var/www/event-manager/src/controllers/notificationSendingController.ts`

**Methods Needed:**
```typescript
sendNotification()        // Send to single user
broadcastNotification()   // Send to multiple users/roles
sendToRole()             // Send to all users with specific role
sendToEvent()            // Send to users related to event
sendToContest()          // Send to users related to contest
```

**Permission Checks:**
- SUPER_ADMIN/ADMIN: No restrictions
- ORGANIZER: Can send to users in their events/contests
- BOARD: Can send to users (full list)
- Others: Forbidden

#### C. Create NotificationSendingRoutes
**New File:** `/var/www/event-manager/src/routes/notificationSendingRoutes.ts`

**Routes Needed:**
```
POST /api/notifications/send              - Send to single user (requirePermission("notifications:write"))
POST /api/notifications/broadcast         - Send to multiple users (requirePermission("notifications:broadcast"))
POST /api/notifications/send-by-role      - Send to users with role (requirePermission("notifications:broadcast"))
POST /api/notifications/send-to-event     - Send to event participants (requirePermission("notifications:write"))
POST /api/notifications/announcements     - Create system announcements (requireRole(["SUPER_ADMIN", "ADMIN"]))
```

#### D. Update NotificationService
**File:** `/var/www/event-manager/src/services/NotificationService.ts`

**Add Methods:**
```typescript
async sendNotificationToUser(...)        // Send to specific user
async sendNotificationToUsers(...)       // Send to user list
async sendNotificationToRole(role: string, ...)  // Send to role
async sendNotificationToEvent(eventId: string, ...)
async sendSystemAnnouncement(...)       // System-wide
```

#### E. Add Validation
**New File or extend existing:** Notification DTO validation
```typescript
interface SendNotificationDTO {
  recipientId?: string           // For single user
  recipientIds?: string[]        // For multiple users
  recipientRole?: UserRole       // For role-based
  eventId?: string               // For event participants
  contestId?: string             // For contest participants
  type: NotificationType
  title: string
  message: string
  link?: string
  metadata?: Record<string, any>
}
```

#### F. Add Audit Logging
**File:** Extend error handler middleware or create new handler

Log all notification sending attempts with:
- Who sent (userId, role)
- What was sent (content)
- Who received (recipient list size, roles)
- When (timestamp)
- Success/failure

### 4.2 Frontend Changes Required

#### A. Create Notification Sending Component
**New File:** `/var/www/event-manager/frontend/src/pages/SendNotificationsPage.tsx`

**Features:**
```typescript
- Role-based permission check (show/hide UI)
- Form to compose notification:
  - Recipient selection (user, role, event, all)
  - Notification type dropdown
  - Title input
  - Message textarea
  - Link input (optional)
  - Preview
- Send button with loading state
- Success/error handling
- Notification history (optional)
```

#### B. Add to Navigation
**Files:** 
- `/var/www/event-manager/frontend/src/navigation.ts` or routing file
- Layout components

**Routes to add:**
```
/admin/send-notifications        (ADMIN, SUPER_ADMIN)
/organizer/send-notifications    (ORGANIZER)
/board/send-notifications        (BOARD)
```

#### C. Update NotificationsPage
**File:** `/var/www/event-manager/frontend/src/pages/NotificationsPage.tsx`

**Add:**
- "Compose Notification" button (if user has permission)
- Navigate to SendNotificationsPage

#### D. Add Permission Checks
**New file:** `/var/www/event-manager/frontend/src/utils/notificationPermissions.ts`

```typescript
export const canSendNotifications = (role: UserRole): boolean => {
  return ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'].includes(role);
};

export const getNotificationSendingCapabilities = (role: UserRole) => {
  if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return { canBroadcast: true, canSendToRole: true, canSendToEvent: true };
  }
  if (role === 'ORGANIZER') {
    return { canBroadcast: false, canSendToRole: false, canSendToEvent: true };
  }
  if (role === 'BOARD') {
    return { canBroadcast: true, canSendToRole: false, canSendToEvent: false };
  }
  return { canBroadcast: false, canSendToRole: false, canSendToEvent: false };
};
```

### 4.3 Database Changes Required

**No schema changes needed** - existing Notification model supports all requirements

Optional enhancements:
- Add `sentById` field to track who sent notification
- Add `sentVia` field (manual, automatic, broadcast)
- Add `readByCount` for broadcast tracking

### 4.4 Testing Required

**Unit Tests:**
- Permission middleware for each role
- NotificationService methods
- Validation logic

**Integration Tests:**
- End-to-end notification sending flows
- Permission enforcement across roles
- Real-time delivery verification

**E2E Tests:**
- Frontend form submission
- Permission-based UI visibility
- Success/error handling

---

## 5. Files That Need to be Modified/Created

### To Modify:
1. **`/var/www/event-manager/src/middleware/permissions.ts`**
   - Add notification permissions to ORGANIZER, BOARD

2. **`/var/www/event-manager/src/services/NotificationService.ts`**
   - Add methods for user-initiated notification sending
   - Add validation and permission checks

3. **`/var/www/event-manager/src/routes/notificationsRoutes.ts`**
   - Add new routes for sending notifications

4. **`/var/www/event-manager/frontend/src/pages/NotificationsPage.tsx`**
   - Add button to compose notifications
   - Add permission-based visibility

5. **`/var/www/event-manager/src/config/container.ts`** (if using DI)
   - Register new services

### To Create:
1. **`/var/www/event-manager/src/controllers/notificationSendingController.ts`**
   - Controller for notification sending endpoints

2. **`/var/www/event-manager/src/routes/notificationSendingRoutes.ts`**
   - Routes for sending notifications

3. **`/var/www/event-manager/frontend/src/pages/SendNotificationsPage.tsx`**
   - UI for composing and sending notifications

4. **`/var/www/event-manager/frontend/src/utils/notificationPermissions.ts`**
   - Permission helper utilities

5. **`/var/www/event-manager/src/types/notificationSending.ts`** (optional)
   - TypeScript interfaces and DTOs

6. **Tests:**
   - `/var/www/event-manager/tests/unit/services/NotificationSendingService.test.ts`
   - `/var/www/event-manager/tests/integration/notificationSending.test.ts`

---

## 6. Role Capabilities Summary

### SUPER_ADMIN
- ✅ Send notifications to any user
- ✅ Send to users by role
- ✅ Send system-wide broadcasts
- ✅ No resource restrictions
- ✅ See all notification audit logs

### ADMIN
- ✅ Send notifications to any user
- ✅ Send to users by role
- ✅ Send system-wide broadcasts
- ✅ No resource restrictions
- ✅ See all notification audit logs

### ORGANIZER
- ✅ Send notifications to users in their events/contests
- ✅ Send event-specific announcements
- ✅ Cannot send system-wide broadcasts
- ✅ Cannot send to arbitrary roles
- ⚠️ Resource-scoped (only their events)

### BOARD
- ✅ Send notifications to any user
- ✅ Cannot send system-wide broadcasts
- ✅ Cannot send to by role
- ✅ Can send event-specific announcements
- ⚠️ Limited to event participants

### JUDGE
- ❌ Cannot send notifications

### CONTESTANT
- ❌ Cannot send notifications

### EMCEE
- ⚠️ Can use existing announcement system
- ❌ Cannot access new notification system

### TALLY_MASTER
- ❌ Cannot send notifications

### AUDITOR
- ❌ Cannot send notifications

---

## 7. Security Considerations

### 7.1 Current Security Gaps
1. **No audit trail** for notification sending
2. **No rate limiting** on broadcast notifications
3. **No content validation** for harmful content
4. **No recipient verification** before sending
5. **No permission enforcement** on creating notifications

### 7.2 Recommended Mitigations
1. ✅ Add audit logging for all notification sending
2. ✅ Implement rate limiting (max notifications per hour)
3. ✅ Add content validation/sanitization
4. ✅ Verify recipients exist and belong to tenant
5. ✅ Enforce strict permission checks on all routes
6. ✅ Add logging for failed authorization attempts
7. ✅ Implement notification approval workflow for broadcasts (optional)

---

## 8. Implementation Roadmap

### Phase 1: Backend Foundation (Priority: HIGH)
1. Update permission matrix with notification permissions
2. Create NotificationSendingController
3. Create NotificationSendingRoutes
4. Add validation and error handling
5. Unit tests
6. Integration tests

### Phase 2: Frontend UI (Priority: HIGH)
1. Create SendNotificationsPage
2. Add permission checks
3. Create form component
4. Connect to backend APIs
5. E2E tests

### Phase 3: Enhancement (Priority: MEDIUM)
1. Add audit logging
2. Implement rate limiting
3. Add notification history
4. Add scheduling/delayed sending
5. Add templates

### Phase 4: Advanced Features (Priority: LOW)
1. Notification approval workflow
2. A/B testing
3. Analytics dashboard
4. Integration with email/SMS

---

## 9. API Examples

### Send to Single User
```
POST /api/notifications/send

{
  "recipientId": "user-id-123",
  "type": "INFO",
  "title": "Event Updated",
  "message": "The event 'Singing Competition' has been updated",
  "link": "/events/comp-123"
}

Response: 201 Created
{
  "id": "notif-456",
  "userId": "user-id-123",
  "type": "INFO",
  "title": "Event Updated",
  "message": "The event 'Singing Competition' has been updated",
  "link": "/events/comp-123",
  "read": false,
  "createdAt": "2025-12-01T10:30:00Z"
}
```

### Broadcast to Role
```
POST /api/notifications/send-by-role

{
  "role": "JUDGE",
  "type": "WARNING",
  "title": "Certification Deadline",
  "message": "Certification deadline is in 48 hours",
  "link": "/certification"
}

Response: 200 OK
{
  "success": true,
  "message": "Notification sent to 23 judges",
  "count": 23
}
```

### Send to Event Participants
```
POST /api/notifications/send-to-event

{
  "eventId": "event-789",
  "type": "SUCCESS",
  "title": "Results Published",
  "message": "Results for the event are now available",
  "link": "/results/event-789"
}

Response: 200 OK
{
  "success": true,
  "message": "Notification sent to 156 participants",
  "count": 156
}
```

---

## 10. Conclusion

The Event Manager application has a **solid, working notification system** with real-time support, but it **lacks user-initiated notification sending capabilities**. To enable admin, super admin, organizer, and board users to send notifications:

1. **Add notification permissions** to the permission matrix
2. **Create sending API endpoints** with proper authorization
3. **Build frontend UI** for composing and sending notifications
4. **Add audit logging** for security and compliance
5. **Implement validation** and rate limiting

The implementation is straightforward since:
- The database model supports everything needed
- The NotificationService has the core logic (broadcastNotification)
- The authentication/authorization infrastructure exists
- Permission middleware is already in place

**Estimated effort:** 2-3 days for basic implementation, 4-5 days with full testing and audit logging.

