# Notification System Investigation - Executive Summary

## Overview
The Event Manager has a **fully functional notification system** with real-time Socket.IO support, but **completely lacks user-initiated notification sending capabilities** with proper permissions.

## Current State

### What Works
✅ Database model fully supports notifications  
✅ NotificationService has all core logic (including `broadcastNotification`)  
✅ Real-time delivery via Socket.IO  
✅ Notification preferences management  
✅ 6 notification types (INFO, SUCCESS, WARNING, ERROR, SYSTEM)  
✅ Pagination, filtering, and read status tracking  
✅ Frontend notification display and management  

### What's Missing
❌ **NO API endpoint to send notifications** (createNotification in controller but not in routes)  
❌ **NO permission checks** for notification sending  
❌ **NO UI** to compose/send notifications  
❌ **NO audit logging** for notification sending  
❌ **NO permission matrix entries** for notifications  

## Current Capability

**Who can currently send notifications?**
- Only automated backend services (judges, scoring, certification, etc.)
- NO users can manually send notifications, regardless of role

**What notifications ARE sent?**
1. Score submissions
2. Contest certifications
3. Judge assignments/removals
4. Report generation completion
5. Certification requirements
6. User role changes
7. Event status changes
8. System maintenance announcements
9. System errors

**What notifications CAN'T be sent?**
- Ad-hoc messages from admins to users
- Broadcast announcements from organizers
- Board announcements
- Custom notifications for any purpose

## What Needs to Change

### 1. Permission Matrix (5 minutes)
**File:** `/var/www/event-manager/src/middleware/permissions.ts`

Add to ORGANIZER:
```
"notifications:write"       // Send to users
"notifications:broadcast"   // System broadcasts
```

Add to BOARD:
```
"notifications:write"       // Send to users
```

### 2. Backend Controllers & Routes (2-3 hours)
**Create:**
- `/var/www/event-manager/src/controllers/notificationSendingController.ts`
- `/var/www/event-manager/src/routes/notificationSendingRoutes.ts`

**Modify:**
- `/var/www/event-manager/src/services/NotificationService.ts` (add sending methods)

**Endpoints needed:**
```
POST /api/notifications/send              (single user)
POST /api/notifications/send-by-role      (to role)
POST /api/notifications/send-to-event     (to event participants)
POST /api/notifications/broadcast         (system-wide)
```

### 3. Frontend UI (2-3 hours)
**Create:**
- `/var/www/event-manager/frontend/src/pages/SendNotificationsPage.tsx`
- `/var/www/event-manager/frontend/src/utils/notificationPermissions.ts`

**Modify:**
- `/var/www/event-manager/frontend/src/pages/NotificationsPage.tsx` (add compose button)

### 4. Testing (2-3 hours)
- Unit tests for permission checking
- Integration tests for notification sending
- E2E tests for full workflow

### 5. Optional Enhancements
- Audit logging for all sends
- Rate limiting (max sends per hour)
- Notification history/sent folder
- Delayed/scheduled sending
- Notification templates

## Role Capabilities (Proposed)

| Role | Can Send | Can Broadcast | Can Send to Role | Resource-Scoped |
|------|----------|---------------|------------------|-----------------|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ❌ |
| ADMIN | ✅ | ✅ | ✅ | ❌ |
| ORGANIZER | ✅ | ❌ | ❌ | ✅ (events) |
| BOARD | ✅ | ❌ | ❌ | ✅ (limited) |
| JUDGE | ❌ | ❌ | ❌ | ❌ |
| CONTESTANT | ❌ | ❌ | ❌ | ❌ |
| EMCEE | ❌ | ❌ | ❌ | ❌ |
| TALLY_MASTER | ❌ | ❌ | ❌ | ❌ |
| AUDITOR | ❌ | ❌ | ❌ | ❌ |

## Key Files Reference

### Backend
- **Roles:** `/var/www/event-manager/src/constants/roles.ts`
- **Permissions:** `/var/www/event-manager/src/middleware/permissions.ts`
- **Auth:** `/var/www/event-manager/src/middleware/auth.ts`
- **Service:** `/var/www/event-manager/src/services/NotificationService.ts`
- **Routes:** `/var/www/event-manager/src/routes/notificationsRoutes.ts`
- **DB Schema:** `/var/www/event-manager/prisma/schema.prisma` (lines 722-749)

### Frontend
- **Page:** `/var/www/event-manager/frontend/src/pages/NotificationsPage.tsx`

## Estimated Implementation Time

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 1 | Update permissions matrix | 15 min | HIGH |
| 1 | Create controller & routes | 2-3 hrs | HIGH |
| 2 | Create frontend page & components | 2-3 hrs | HIGH |
| 3 | Unit & integration tests | 2-3 hrs | MEDIUM |
| 3 | Audit logging | 1-2 hrs | MEDIUM |
| 4 | Rate limiting | 1 hr | LOW |
| 4 | Advanced features | 2-4 hrs | LOW |

**Total (MVP):** 5-6 hours  
**Total (with testing & logging):** 8-10 hours

## Security Notes

1. **Resource Scoping:** Organizers can only send to users in their events
2. **Tenant Isolation:** All queries include tenantId filter (already in place)
3. **Audit Trail:** Recommended to log who sent, what, to whom, when
4. **Rate Limiting:** Prevent spam (suggest: 100 notifications/hour per user)
5. **Content Validation:** Sanitize message content
6. **Approval Workflow:** Optional for broadcast notifications

## Next Steps

1. Review and approve proposed role capabilities
2. Implement permission matrix changes
3. Create NotificationSendingController
4. Create API routes
5. Build frontend UI
6. Test thoroughly
7. Deploy

## Questions to Answer

1. Should ORGANIZER send to ALL event participants or just judges?
2. Should notifications sent by users require approval before sending?
3. Should we track "sent by" information in database?
4. Should there be rate limits? (suggested: 100/hour)
5. Should we implement notification templates?

---

For detailed information, see `NOTIFICATION_SYSTEM_INVESTIGATION.md`
