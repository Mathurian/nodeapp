# Notification System Implementation Checklist

## Phase 1: Backend Foundation

### 1.1 Update Permission Matrix
- [ ] Open `/var/www/event-manager/src/middleware/permissions.ts`
- [ ] Add to ORGANIZER permissions:
  ```typescript
  "notifications:write",
  "notifications:broadcast"
  ```
- [ ] Add to BOARD permissions:
  ```typescript
  "notifications:write"
  ```
- [ ] Verify SUPER_ADMIN and ADMIN have ["*"]
- [ ] Verify other roles don't have notification permissions
- [ ] Test with `npm run test` or `npm run test:unit`

### 1.2 Create NotificationSendingController
- [ ] Create `/var/www/event-manager/src/controllers/notificationSendingController.ts`
- [ ] Implement `sendNotification()` method
  - Input: single recipientId
  - Validate user exists
  - Check sender has permission
  - Call NotificationService.createNotification()
  - Return created notification
- [ ] Implement `sendNotificationToUsers()` method
  - Input: recipientIds array
  - Validate recipients exist
  - Check sender has permission
  - Call NotificationService.broadcastNotification()
  - Return count
- [ ] Implement `sendNotificationToRole()` method
  - Input: role string
  - Only ADMIN/SUPER_ADMIN allowed
  - Get all users with role
  - Call broadcastNotification()
  - Return count
- [ ] Implement `sendNotificationToEvent()` method
  - Input: eventId
  - Get event participants
  - Check organizer has permission for event
  - Call broadcastNotification()
  - Return count
- [ ] Add input validation (DTO validation)
- [ ] Add error handling
- [ ] Add logging

### 1.3 Update NotificationService
- [ ] Add method `async sendToUser(userId, tenantId, notification)` 
  - Wraps createNotification()
- [ ] Add method `async sendToUsers(userIds, tenantId, notification)`
  - Wraps broadcastNotification()
- [ ] Add method `async sendToRole(role, tenantId, notification)`
  - Query users with role
  - Call sendToUsers()
- [ ] Add method `async sendToEventParticipants(eventId, tenantId, notification)`
  - Query event participants
  - Call sendToUsers()

### 1.4 Create NotificationSendingRoutes
- [ ] Create `/var/www/event-manager/src/routes/notificationSendingRoutes.ts`
- [ ] Route: `POST /notifications/send`
  - Middleware: `authenticateToken, requirePermission("notifications:write")`
  - Controller: `sendNotification`
  - Body: { recipientId, type, title, message, link?, metadata? }
  - Response: 201 with notification

- [ ] Route: `POST /notifications/send-multiple`
  - Middleware: `authenticateToken, requirePermission("notifications:write")`
  - Controller: `sendNotificationToUsers`
  - Body: { recipientIds[], type, title, message, link?, metadata? }
  - Response: 200 with { count, success }

- [ ] Route: `POST /notifications/send-by-role`
  - Middleware: `authenticateToken, requirePermission("notifications:broadcast")`
  - Controller: `sendNotificationToRole`
  - Body: { role, type, title, message, link?, metadata? }
  - Response: 200 with { count, success }

- [ ] Route: `POST /notifications/send-to-event`
  - Middleware: `authenticateToken, requirePermission("notifications:write")`
  - Controller: `sendNotificationToEvent`
  - Body: { eventId, type, title, message, link?, metadata? }
  - Response: 200 with { count, success }

- [ ] Route: `POST /notifications/broadcast` (ADMIN/SUPER_ADMIN only)
  - Middleware: `authenticateToken, requireRole(["SUPER_ADMIN", "ADMIN"])`
  - Controller: `sendNotificationToRole` with role="*" or getAllUsers
  - Body: { type, title, message, link?, metadata? }
  - Response: 200 with { count, success }

### 1.5 Register Routes in Server
- [ ] Open `/var/www/event-manager/src/server.ts`
- [ ] Import notificationSendingRoutes
- [ ] Add: `app.use('/api/notifications', notificationSendingRoutes)`
- [ ] Ensure it's after other auth middleware but before error handlers

### 1.6 Create/Update DTOs and Types
- [ ] Create `/var/www/event-manager/src/types/notificationSending.ts`
- [ ] Define `SendNotificationDTO`:
  ```typescript
  interface SendNotificationDTO {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  }
  
  interface SendToUserDTO extends SendNotificationDTO {
    recipientId: string;
  }
  
  interface SendToUsersDTO extends SendNotificationDTO {
    recipientIds: string[];
  }
  
  interface SendToRoleDTO extends SendNotificationDTO {
    role: UserRole;
  }
  
  interface SendToEventDTO extends SendNotificationDTO {
    eventId: string;
  }
  ```

### 1.7 Add Validation
- [ ] Create validator function `validateNotificationPayload()`
- [ ] Check required fields (title, message, type)
- [ ] Check field lengths (title max 255, message max 5000)
- [ ] Validate NotificationType enum
- [ ] Sanitize HTML/XSS in message
- [ ] Validate link is valid URL (optional)

### 1.8 Backend Testing
- [ ] Create unit tests: `/var/www/event-manager/tests/unit/controllers/notificationSendingController.test.ts`
  - Test each endpoint
  - Test permission checks
  - Test error cases
- [ ] Create integration tests: `/var/www/event-manager/tests/integration/notificationSending.test.ts`
  - Test sending to single user
  - Test broadcasting to role
  - Test event participant sending
  - Verify database records created
  - Verify Socket.IO events emitted
- [ ] Run: `npm run test`
- [ ] Run: `npm run test:integration`

---

## Phase 2: Frontend UI

### 2.1 Create Permission Utilities
- [ ] Create `/var/www/event-manager/frontend/src/utils/notificationPermissions.ts`
- [ ] Export `canSendNotifications(role: string): boolean`
- [ ] Export `getNotificationCapabilities(role: string)` returning object:
  ```typescript
  {
    canSendToUser: boolean,
    canSendToUsers: boolean,
    canSendToRole: boolean,
    canSendToEvent: boolean,
    canBroadcast: boolean
  }
  ```

### 2.2 Create SendNotificationsPage Component
- [ ] Create `/var/www/event-manager/frontend/src/pages/SendNotificationsPage.tsx`
- [ ] Implement role-based form fields:
  - All roles: recipient selection, type, title, message, link
  - BOARD: additional event participant targeting
  - ORGANIZER: limited to their events
  - ADMIN/SUPER_ADMIN: all options available

- [ ] Form sections:
  1. Recipient Selection
     - Radio buttons: Single User / Multiple Users / By Role / By Event
     - Conditional rendering based on selection
     - User search dropdown for single user
     - Role selector for broadcast
     - Event selector for event-based
  
  2. Notification Details
     - Type dropdown (INFO, SUCCESS, WARNING, ERROR, SYSTEM)
     - Title input (max 255 chars)
     - Message textarea (max 5000 chars)
     - Optional link input
     - Character counter
  
  3. Preview
     - Show how notification will appear
     - Display selected recipients count
  
  4. Actions
     - Send button
     - Cancel button
     - Clear button

- [ ] State management:
  ```typescript
  const [recipientType, setRecipientType] = useState<'user'|'users'|'role'|'event'>('user');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [notificationType, setNotificationType] = useState<NotificationType>('INFO');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  ```

- [ ] API calls:
  ```typescript
  const sendNotification = async () => {
    try {
      setLoading(true);
      let response;
      
      if (recipientType === 'user') {
        response = await api.post('/notifications/send', {
          recipientId: selectedRecipient,
          type: notificationType,
          title,
          message,
          link: link || undefined
        });
      } else if (recipientType === 'users') {
        response = await api.post('/notifications/send-multiple', {
          recipientIds: selectedRecipients,
          type: notificationType,
          title,
          message,
          link: link || undefined
        });
      } else if (recipientType === 'role') {
        response = await api.post('/notifications/send-by-role', {
          role: selectedRole,
          type: notificationType,
          title,
          message,
          link: link || undefined
        });
      } else if (recipientType === 'event') {
        response = await api.post('/notifications/send-to-event', {
          eventId: selectedEvent,
          type: notificationType,
          title,
          message,
          link: link || undefined
        });
      }
      
      setSuccess(true);
      // Clear form
      setTimeout(() => {
        setTitle('');
        setMessage('');
        setLink('');
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };
  ```

- [ ] Error handling
- [ ] Loading states
- [ ] Success feedback
- [ ] Validation on form submission

### 2.3 Update NotificationsPage
- [ ] Open `/var/www/event-manager/frontend/src/pages/NotificationsPage.tsx`
- [ ] Import canSendNotifications utility
- [ ] Add "Send Notification" button in header:
  ```typescript
  {canSendNotifications(user?.role) && (
    <button
      onClick={() => navigate('/send-notifications')}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      <PencilIcon className="h-5 w-5 inline mr-2" />
      Send Notification
    </button>
  )}
  ```
- [ ] Conditionally show based on user role
- [ ] Navigate to SendNotificationsPage on click

### 2.4 Update Routing
- [ ] Open main routing file (likely `main.tsx` or `App.tsx`)
- [ ] Import SendNotificationsPage
- [ ] Add route:
  ```typescript
  {
    path: '/send-notifications',
    element: <SendNotificationsPage />,
    requiredRoles: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD']
  }
  ```

- [ ] Or add to navigation menu if applicable

### 2.5 Frontend Testing
- [ ] Create component test: `/var/www/event-manager/frontend/src/pages/__tests__/SendNotificationsPage.test.tsx`
  - Test form rendering
  - Test permission checks (UI visibility)
  - Test form submission
  - Test error handling
  - Test success feedback

- [ ] Create utility test: `/var/www/event-manager/frontend/src/utils/__tests__/notificationPermissions.test.ts`
  - Test each role's capabilities
  - Test permission checking functions

- [ ] Run: `npm run test:frontend`

### 2.6 E2E Tests
- [ ] Create E2E test: `/var/www/event-manager/tests/e2e/sendNotifications.spec.ts`
- [ ] Test as ADMIN:
  - Navigate to send notifications
  - Fill form
  - Send to single user
  - Verify recipient receives it
  - Send broadcast
  - Verify all users receive it
  
- [ ] Test as ORGANIZER:
  - Navigate to send notifications
  - Verify role/broadcast options hidden
  - Send to event participants
  - Verify permission restriction
  
- [ ] Test as JUDGE:
  - Verify send notifications page not accessible
  - Verify button doesn't appear

---

## Phase 3: Enhancements

### 3.1 Add Audit Logging
- [ ] Update notificationSendingController to log all sends
- [ ] Log fields: who, what, to whom, when, success/failure
- [ ] Store in audit_logs table
- [ ] Add activity log middleware or create separate handler

### 3.2 Implement Rate Limiting
- [ ] Add rate limit middleware for notification endpoints
- [ ] Limit: 100 notifications per hour per user
- [ ] Use Redis or in-memory store
- [ ] Return 429 (Too Many Requests) when exceeded

### 3.3 Add Notification History
- [ ] Create "Sent Notifications" page showing history
- [ ] Show: who sent, what, to whom, when
- [ ] Filter by date range, recipient, status
- [ ] Permission: can only see own sent notifications (except ADMIN)

### 3.4 Input Validation & Sanitization
- [ ] Use sanitization library (e.g., DOMPurify on frontend)
- [ ] Validate lengths and format
- [ ] Prevent XSS attacks
- [ ] Test with malicious input

---

## Phase 4: Optional Advanced Features

### 4.1 Scheduled/Delayed Sending
- [ ] Add `scheduledFor` field to notification send DTO
- [ ] Create background job to send at specified time
- [ ] Store draft/scheduled notifications separately
- [ ] Show queue of scheduled sends

### 4.2 Notification Templates
- [ ] Create templates for common messages
- [ ] Template variables (e.g., {userName}, {eventName})
- [ ] Template management UI
- [ ] Quick template selection in compose form

### 4.3 Approval Workflow (Optional)
- [ ] For broadcasts, require admin approval
- [ ] Organizer sends -> pending approval
- [ ] Admin approves -> notification sent
- [ ] Add approval queue UI

### 4.4 Analytics
- [ ] Track notification metrics
- [ ] Delivery rate
- [ ] Read rate
- [ ] Dashboard showing stats

---

## Validation Checklist

Before marking complete:

### Backend
- [ ] All 5 API endpoints working
- [ ] Permission checks enforced on each endpoint
- [ ] Requests without permission get 403
- [ ] Socket.IO emits real-time events
- [ ] Database records created correctly
- [ ] Tenant isolation verified
- [ ] All tests passing (unit + integration)
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Error handling works
- [ ] Logging implemented

### Frontend
- [ ] SendNotificationsPage renders
- [ ] Form validation works
- [ ] Permission-based UI visibility correct
- [ ] API calls succeed
- [ ] Errors handled gracefully
- [ ] Success feedback shown
- [ ] Loading states working
- [ ] Works in all browsers
- [ ] Mobile responsive
- [ ] All tests passing
- [ ] No console errors

### Integration
- [ ] Send from ADMIN, receive as user
- [ ] Real-time notification appears
- [ ] Organizer can only send to own events
- [ ] Board can send to users
- [ ] Judge cannot send
- [ ] Audit logs created
- [ ] Rate limiting works
- [ ] No infinite loops or memory leaks

---

## Rollback Plan

If issues occur:

1. Revert permission matrix changes
2. Disable new routes in server.ts
3. Hide SendNotificationsPage from routing
4. Remove send notification button from NotificationsPage
5. Rollback database migration (if any)
6. Clear browser cache

All changes are backward compatible - no breaking changes to existing notification system.

---

## Performance Considerations

- [ ] Batch operations for large broadcasts
- [ ] Add pagination to recipient lists
- [ ] Optimize database queries with indexes
- [ ] Cache role → user lookups
- [ ] Implement rate limiting to prevent abuse
- [ ] Monitor notifications table size and archive old records if needed

---

## Security Considerations

- [ ] Validate all inputs on backend
- [ ] Sanitize message content
- [ ] Verify recipients belong to user's tenant
- [ ] Verify organizers only send to their events
- [ ] Log all sending attempts
- [ ] Monitor for suspicious patterns
- [ ] Use HTTPS for all API calls
- [ ] Implement CSRF protection
- [ ] Rate limit API endpoints

---

End of Checklist
