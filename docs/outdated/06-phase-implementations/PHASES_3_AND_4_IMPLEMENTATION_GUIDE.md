# Phases 3 & 4: Complete Implementation Guide

**Document Version:** 1.0
**Date:** November 12, 2025
**Status:** Implementation Guide for Remaining Work

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Work Completed](#work-completed)
3. [Phase 3 Remaining Work](#phase-3-remaining-work)
4. [Phase 4 Implementation](#phase-4-implementation)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Procedures](#deployment-procedures)
7. [Performance Considerations](#performance-considerations)

---

## Executive Summary

### What's Complete

**Phase 1:** ✅ Foundation - COMPLETE (100%)
**Phase 2:** ✅ Core Enhancements - COMPLETE (100%)
**Phase 3.1:** ✅ User Onboarding - COMPLETE (100%)
**Phase 3.2:** 🔄 Notification Center - 60% Complete
**Phase 3.3:** ⏳ Bulk Operations - Not Started
**Phase 3.4:** ⏳ Advanced Customization - Not Started
**Phase 4:** ⏳ Scaling & Enterprise - Not Started

### Overall Progress

- **Total Completion:** ~35%
- **Files Created:** 20+ files
- **Documentation:** 2 complete phase docs, this guide
- **Lines of Code:** ~4,000+ lines

---

## Work Completed

### Phase 3.1: User Onboarding (COMPLETE)

#### Packages Installed
```bash
cd frontend
npm install shepherd.js --save
```

#### Files Created (13 files)

1. **TourService** - `/frontend/src/services/TourService.ts`
   - Wraps Shepherd.js
   - Theme-aware tours (light/dark)
   - Tour completion tracking
   - Keyboard navigation
   - 270 lines

2. **Admin Tour** - `/frontend/src/services/tours/adminTour.ts`
   - 12 steps covering admin features
   - User management, events, categories, assignments, reports, settings
   - 175 lines

3. **Judge Tour** - `/frontend/src/services/tours/judgeTour.ts`
   - 10 steps covering scoring workflow
   - Assignments, rubrics, certification
   - 150 lines

4. **Contestant Tour** - `/frontend/src/services/tours/contestantTour.ts`
   - 8 steps covering contestant features
   - Schedule, results, profile
   - 120 lines

5. **Emcee Tour** - `/frontend/src/services/tours/emceeTour.ts`
   - 10 steps covering emcee functions
   - Scripts, tracker, bios
   - 145 lines

6. **Tours Index** - `/frontend/src/services/tours/index.ts`
   - Central tour exports
   - Initialize all tours function
   - 20 lines

7. **Tooltip** - `/frontend/src/components/Tooltip.tsx`
   - Accessible tooltips
   - Keyboard support
   - Position control
   - 120 lines

8. **HelpButton** - `/frontend/src/components/HelpButton.tsx`
   - Contextual help
   - Modal with video support
   - Related resources
   - 95 lines

9. **EmptyState** - `/frontend/src/components/EmptyState.tsx`
   - User-friendly empty states
   - Action buttons
   - Icon library
   - 85 lines

10. **HelpSystem** - `/frontend/src/components/HelpSystem.tsx`
    - Global help (? shortcut)
    - Searchable topics
    - Role-based filtering
    - 220 lines

11. **OnboardingChecklist** - `/frontend/src/components/OnboardingChecklist.tsx`
    - 6-step setup checklist
    - Progress tracking
    - Expandable/dismissible
    - 180 lines

12. **useKeyboardShortcut** - `/frontend/src/hooks/useKeyboardShortcut.ts`
    - Keyboard shortcut hook
    - Multiple shortcuts support
    - Modifier keys
    - 80 lines

13. **Shepherd Theme** - `/frontend/src/styles/shepherd-theme.css`
    - Custom theme
    - Dark mode support
    - Animations
    - 200 lines

#### Integration Pending

**To integrate Phase 3.1 components:**

1. **Update `/frontend/src/main.tsx`:**
```typescript
import 'shepherd.js/dist/css/shepherd.css';
import './styles/shepherd-theme.css';
import { initializeAllTours } from './services/tours';

// After app renders
initializeAllTours();
```

2. **Update `/frontend/src/components/Layout.tsx`:**
```typescript
import HelpSystem from './HelpSystem';

// Add before closing </div>
<HelpSystem />
```

3. **Update `/frontend/src/pages/AdminPage.tsx`:**
```typescript
import OnboardingChecklist from '../components/OnboardingChecklist';

// Add at top of dashboard
<OnboardingChecklist />
```

4. **Add EmptyState to list pages:**
```typescript
import EmptyState from '../components/EmptyState';

{items.length === 0 && (
  <EmptyState
    icon="document"
    title="No Events Found"
    description="Get started by creating your first event."
    action={{
      label: "Create Event",
      onClick: () => navigate('/admin/events/create')
    }}
  />
)}
```

5. **Add Tooltips where needed:**
```typescript
import Tooltip from '../components/Tooltip';

<Tooltip content="Enter the contestant's full name">
  <label>Name</label>
</Tooltip>
```

### Phase 3.2: Notification Center (60% Complete)

#### Database Changes

1. **Schema Updated** - `/prisma/schema.prisma`
   - Added Notification model
   - Added NotificationType enum
   - Renamed User.notifications to User.notificationSettings
   - Added indexes

2. **Migration Created** - `/prisma/migrations/20251112_add_notification_system/migration.sql`
   - Creates notifications table
   - Adds enum type
   - Creates indexes
   - **STATUS:** Not yet run

#### Backend Files Created (1 file)

1. **NotificationRepository** - `/src/repositories/NotificationRepository.ts`
   - Complete CRUD operations
   - Bulk create (broadcast)
   - Query with filters
   - Unread count
   - Mark as read
   - Cleanup old notifications
   - 180 lines

#### Backend Files to Update (1 file)

1. **NotificationService** - `/src/services/NotificationService.ts`
   - **EXISTS** but uses old schema
   - **NEEDS:** Complete rewrite with new schema
   - See section below for implementation

---

## Phase 3 Remaining Work

### Phase 3.2: Notification Center (40% remaining)

#### Step 1: Update NotificationService

**File:** `/src/services/NotificationService.ts`

**Implementation:** Replace entire file with:

```typescript
import { injectable, inject } from 'tsyringe';
import { Notification, NotificationType } from '@prisma/client';
import { NotificationRepository, CreateNotificationDTO } from '../repositories/NotificationRepository';
import { Server as SocketIOServer } from 'socket.io';

@injectable()
export class NotificationService {
  private io: SocketIOServer | null = null;

  constructor(
    @inject(NotificationRepository)
    private notificationRepository: NotificationRepository
  ) {}

  setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  async createNotification(data: CreateNotificationDTO): Promise<Notification> {
    const notification = await this.notificationRepository.create(data);

    if (this.io) {
      this.io.to(`user:${data.userId}`).emit('notification:new', notification);
    }

    return notification;
  }

  async broadcastNotification(
    userIds: string[],
    notification: Omit<CreateNotificationDTO, 'userId'>
  ): Promise<number> {
    const count = await this.notificationRepository.createMany(userIds, notification);

    if (this.io) {
      userIds.forEach((userId) => {
        this.io?.to(`user:${userId}`).emit('notification:new', notification);
      });
    }

    return count;
  }

  async getUserNotifications(userId: string, limit = 50, offset = 0) {
    return this.notificationRepository.findByUser({
      userId,
      limit,
      offset,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId);
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.markAsRead(id, userId);

    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:read', { id });
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const count = await this.notificationRepository.markAllAsRead(userId);

    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:read-all');
    }

    return count;
  }

  async deleteNotification(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.delete(id, userId);

    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:deleted', { id });
    }

    return notification;
  }

  // Specific notification creators
  async notifyScoreSubmitted(userId: string, contestantName: string, categoryName: string) {
    return this.createNotification({
      userId,
      type: 'SUCCESS',
      title: 'Score Submitted',
      message: `Your score for ${contestantName} in ${categoryName} has been submitted.`,
      link: '/judge/scoring',
    });
  }

  async notifyContestCertified(userId: string, contestName: string) {
    return this.createNotification({
      userId,
      type: 'SUCCESS',
      title: 'Contest Certified',
      message: `The contest "${contestName}" has been certified.`,
      link: '/results',
    });
  }

  async notifyAssignmentChange(userId: string, contestName: string, action: 'assigned' | 'removed') {
    return this.createNotification({
      userId,
      type: 'INFO',
      title: action === 'assigned' ? 'New Assignment' : 'Assignment Removed',
      message: action === 'assigned'
        ? `You have been assigned to judge "${contestName}".`
        : `You have been removed from judging "${contestName}".`,
      link: '/judge/assignments',
    });
  }

  async notifyReportReady(userId: string, reportName: string, reportId: string) {
    return this.createNotification({
      userId,
      type: 'SUCCESS',
      title: 'Report Ready',
      message: `Your requested report "${reportName}" is ready for download.`,
      link: `/reports/${reportId}`,
    });
  }

  async notifyCertificationRequired(userId: string, contestName: string, level: number) {
    const levels = ['', 'Judge Review', 'Tally Master Review', 'Board Approval'];
    return this.createNotification({
      userId,
      type: 'WARNING',
      title: 'Certification Required',
      message: `Your action is required for ${levels[level]} of "${contestName}".`,
      link: '/certification',
    });
  }
}
```

#### Step 2: Create Notification Routes

**File:** `/src/routes/notifications.ts` (NEW)

```typescript
import { Router } from 'express';
import { container } from 'tsyringe';
import { NotificationService } from '../services/NotificationService';
import { authenticate } from '../middleware/auth';

const router = Router();
const notificationService = container.resolve(NotificationService);

// Get user notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const notifications = await notificationService.getUserNotifications(userId, limit, offset);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Mark as read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const notification = await notificationService.markAsRead(id, userId);
    res.json(notification);
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const count = await notificationService.markAllAsRead(userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await notificationService.deleteNotification(id, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Register routes in `/src/server.ts`:**

```typescript
import notificationRoutes from './routes/notifications';

app.use('/api/notifications', notificationRoutes);
```

#### Step 3: Create Frontend Components

**1. NotificationBell Component**

**File:** `/frontend/src/components/NotificationBell.tsx` (NEW)

```typescript
import React, { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import { api } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import NotificationDropdown from './NotificationDropdown';

const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification:new', () => {
      setUnreadCount((prev) => prev + 1);
    });

    socket.on('notification:read', () => {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });

    socket.on('notification:read-all', () => {
      setUnreadCount(0);
    });

    return () => {
      socket.off('notification:new');
      socket.off('notification:read');
      socket.off('notification:read-all');
    };
  }, [socket]);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/notifications/unread');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return (
    <div className="relative" data-tour="notifications">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        {unreadCount > 0 ? (
          <BellIconSolid className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
          onUnreadCountChange={setUnreadCount}
        />
      )}
    </div>
  );
};

export default NotificationBell;
```

**2. NotificationDropdown Component**

**File:** `/frontend/src/components/NotificationDropdown.tsx` (NEW)

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface Props {
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

const NotificationDropdown: React.FC<Props> = ({ onClose, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification:new', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    return () => {
      socket.off('notification:new');
    };
  }, [socket]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications?limit=10');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      onUnreadCountChange(notifications.filter((n) => !n.read).length - 1);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onUnreadCountChange(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'ERROR':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'SYSTEM':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      default:
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notifications
        </h3>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
              }`}
              onClick={() => {
                if (!notification.read) {
                  handleMarkAsRead(notification.id);
                }
                if (notification.link) {
                  window.location.href = notification.link;
                }
              }}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                    !notification.read ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${getTypeColor(
                        notification.type
                      )}`}
                    >
                      {notification.type}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                    {notification.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <a
          href="/notifications"
          className="block text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          View all notifications
        </a>
      </div>
    </div>
  );
};

export default NotificationDropdown;
```

**3. Add NotificationBell to Layout**

Update `/frontend/src/components/Layout.tsx`:

```typescript
import NotificationBell from './NotificationBell';

// Add next to user menu
<NotificationBell />
```

#### Step 4: Integrate Notifications Throughout App

**Update services to create notifications:**

1. **ScoreService** - After score submission:
```typescript
await notificationService.notifyScoreSubmitted(userId, contestantName, categoryName);
```

2. **CertificationService** - When certification required:
```typescript
await notificationService.notifyCertificationRequired(userId, contestName, level);
```

3. **AssignmentService** - When judge assigned:
```typescript
await notificationService.notifyAssignmentChange(judgeId, contestName, 'assigned');
```

4. **UserService** - When role changed:
```typescript
// Add after role update
await notificationService.createNotification({
  userId,
  type: 'INFO',
  title: 'Role Updated',
  message: `Your role has been changed to ${newRole}.`,
  link: '/profile',
});
```

#### Step 5: Run Database Migration

```bash
# Run migration
npm run migrate

# Or manually
psql -h localhost -U your_user -d event_manager -f prisma/migrations/20251112_add_notification_system/migration.sql

# Regenerate Prisma client
npx prisma generate
```

### Phase 3.3: Bulk Operations

#### Overview

Implement bulk operations for efficient management of multiple items.

#### Step 1: Enhance DataTable Component

**Update `/frontend/src/components/DataTable.tsx`:**

Add checkbox selection:
- Add checkbox column
- Track selected items
- Show bulk action toolbar
- Keyboard shortcuts (Ctrl+A, Escape)

#### Step 2: Create BulkOperationService

**File:** `/src/services/BulkOperationService.ts` (NEW)

```typescript
import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';

@injectable()
export class BulkOperationService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async bulkUpdate<T>(
    model: string,
    ids: string[],
    data: Partial<T>
  ): Promise<number> {
    const result = await this.prisma[model].updateMany({
      where: { id: { in: ids } },
      data,
    });

    return result.count;
  }

  async bulkDelete(model: string, ids: string[]): Promise<number> {
    const result = await this.prisma[model].deleteMany({
      where: { id: { in: ids } },
    });

    return result.count;
  }
}
```

#### Step 3: Implement Bulk User Operations

**Create routes in `/src/routes/users.ts`:**

```typescript
// Bulk activate users
router.put('/bulk/activate', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { ids } = req.body;
  const count = await userService.bulkUpdate(ids, { isActive: true });
  res.json({ count });
});

// Bulk deactivate users
router.put('/bulk/deactivate', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { ids } = req.body;
  const count = await userService.bulkUpdate(ids, { isActive: false });
  res.json({ count });
});

// Bulk delete users
router.delete('/bulk', authenticate, requireRole('ADMIN'), async (req, res) => {
  const { ids } = req.body;
  const count = await userService.bulkDelete(ids);
  res.json({ count });
});
```

#### Step 4: CSV Import/Export

**Install dependencies:**

```bash
npm install csv-parser csv-writer --save
npm install @types/csv-parser --save-dev
```

**Create `/src/services/CsvService.ts`:**

```typescript
import { injectable } from 'tsyringe';
import * as csv from 'csv-parser';
import { createReadStream } from 'fs';
import { createObjectCsvWriter } from 'csv-writer';

@injectable()
export class CsvService {
  async importUsers(filePath: string): Promise<{ success: number; errors: any[] }> {
    const results: any[] = [];
    const errors: any[] = [];

    return new Promise((resolve) => {
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          // Validate and import users
          for (const row of results) {
            try {
              // Validate row
              // Create user
            } catch (error) {
              errors.push({ row, error });
            }
          }

          resolve({ success: results.length - errors.length, errors });
        });
    });
  }

  async exportUsers(users: any[], filePath: string): Promise<void> {
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'role', title: 'Role' },
        // ... more fields
      ],
    });

    await csvWriter.writeRecords(users);
  }
}
```

### Phase 3.4: Advanced Customization

#### Step 1: Custom Fields System

**Add to Prisma schema:**

```prisma
model CustomField {
  id          String           @id @default(cuid())
  entityType  EntityType       // USER, EVENT, CONTEST, CONTESTANT, JUDGE
  fieldName   String
  fieldType   CustomFieldType  // TEXT, NUMBER, DATE, SELECT, CHECKBOX
  label       String
  placeholder String?
  required    Boolean          @default(false)
  options     String?          // JSON array for SELECT type
  order       Int              @default(0)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@unique([entityType, fieldName])
  @@map("custom_fields")
}

model CustomFieldValue {
  id           String      @id @default(cuid())
  fieldId      String
  entityId     String      // ID of User, Event, Contest, etc.
  value        String
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  field        CustomField @relation(fields: [fieldId], references: [id])

  @@unique([fieldId, entityId])
  @@map("custom_field_values")
}

enum CustomFieldType {
  TEXT
  NUMBER
  DATE
  SELECT
  CHECKBOX
}

enum EntityType {
  USER
  EVENT
  CONTEST
  CONTESTANT
  JUDGE
}
```

#### Step 2: Workflow Customization

**Add to Prisma schema:**

```prisma
model Workflow {
  id          String         @id @default(cuid())
  name        String
  type        WorkflowType   // CERTIFICATION, APPROVAL, CUSTOM
  steps       String         // JSON array of steps
  isActive    Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@map("workflows")
}

enum WorkflowType {
  CERTIFICATION
  APPROVAL
  CUSTOM
}
```

**Create `/src/services/WorkflowService.ts`:**

```typescript
@injectable()
export class WorkflowService {
  async executeWorkflow(workflowId: string, data: any): Promise<void> {
    const workflow = await this.getWorkflow(workflowId);
    const steps = JSON.parse(workflow.steps);

    for (const step of steps) {
      await this.executeStep(step, data);
    }
  }

  private async executeStep(step: any, data: any): Promise<void> {
    // Execute workflow step
    // Send notifications
    // Wait for approvals if needed
  }
}
```

---

## Phase 4 Implementation

### Phase 4.1: Multi-Tenancy Architecture

#### Overview

Implement tenant isolation with schema-per-tenant or database-per-tenant approach.

#### Implementation Steps

**1. Add Tenant Model**

```prisma
model Tenant {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  domain      String?  @unique
  settings    String?  // JSON
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("tenants")
}
```

**2. Create Tenant Middleware**

```typescript
export const tenantMiddleware = async (req, res, next) => {
  // Extract tenant from:
  // 1. Subdomain (tenant.app.com)
  // 2. Custom domain (tenant.com)
  // 3. Header (X-Tenant-ID)

  const tenantId = extractTenantId(req);

  // Validate tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant || !tenant.isActive) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  req.tenant = tenant;
  next();
};
```

**3. Tenant-Aware Prisma Client**

```typescript
export function getTenantPrismaClient(tenantId: string) {
  // Create Prisma client with tenant-specific connection
  // Or apply tenant filter to all queries
  return new PrismaClient({
    datasources: {
      db: {
        url: getTenantDatabaseUrl(tenantId)
      }
    }
  });
}
```

### Phase 4.2: Event-Driven Architecture

#### Implementation Steps

**1. Choose Message Broker**

Option A: Use existing BullMQ (simpler)
Option B: Add RabbitMQ or Kafka (more robust)

**2. Create Event Bus**

```typescript
@injectable()
export class EventBus {
  private subscribers = new Map<string, Function[]>();

  publish(event: string, data: any): void {
    const handlers = this.subscribers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  subscribe(event: string, handler: Function): void {
    const handlers = this.subscribers.get(event) || [];
    handlers.push(handler);
    this.subscribers.set(event, handlers);
  }
}
```

**3. Define Application Events**

```typescript
// User events
eventBus.publish('user.created', { userId, email, role });
eventBus.publish('user.updated', { userId, changes });
eventBus.publish('user.deleted', { userId });

// Event events
eventBus.publish('event.created', { eventId, name });
eventBus.publish('event.started', { eventId });
eventBus.publish('event.completed', { eventId });

// Score events
eventBus.publish('score.submitted', { scoreId, judgeId, contestantId });
eventBus.publish('score.validated', { scoreId });

// Contest events
eventBus.publish('contest.certified', { contestId, level });
```

**4. Create Event Handlers**

```typescript
// Email handler
eventBus.subscribe('score.submitted', async (data) => {
  await emailService.sendScoreConfirmation(data.judgeId);
});

// Notification handler
eventBus.subscribe('contest.certified', async (data) => {
  await notificationService.notifyContestCertified(data.contestId);
});

// Audit log handler
eventBus.subscribe('user.*', async (data) => {
  await auditLogService.log('user', data);
});
```

### Phase 4.3: Disaster Recovery

#### Step 1: Point-in-Time Recovery (PITR)

**Configure PostgreSQL WAL archiving:**

```bash
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /mnt/wal_archive/%f'
max_wal_senders = 3
```

**Create restore script:**

```bash
#!/bin/bash
# restore-pitr.sh

BACKUP_DIR="/mnt/backups"
RECOVERY_TARGET_TIME="2025-11-12 14:30:00"

# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore base backup
tar -xzf $BACKUP_DIR/base.tar.gz -C /var/lib/postgresql/data

# Create recovery.conf
cat > /var/lib/postgresql/data/recovery.conf <<EOF
restore_command = 'cp /mnt/wal_archive/%f %p'
recovery_target_time = '$RECOVERY_TARGET_TIME'
EOF

# Start PostgreSQL
sudo systemctl start postgresql
```

#### Step 2: Enhanced Automated Backups

**Update `/scripts/backup.sh`:**

```bash
#!/bin/bash
# Enhanced backup script with off-site storage

BACKUP_DIR="/var/backups/event-manager"
S3_BUCKET="s3://my-backups/event-manager"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Full database backup
pg_dump -h localhost -U postgres event_manager | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Incremental WAL backup
rsync -av /mnt/wal_archive/ $BACKUP_DIR/wal/

# Filesystem backup
tar -czf $BACKUP_DIR/files_$TIMESTAMP.tar.gz /var/www/event-manager/uploads

# Upload to S3
aws s3 sync $BACKUP_DIR $S3_BUCKET

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Verify backup integrity
if gunzip -t $BACKUP_DIR/db_$TIMESTAMP.sql.gz; then
  echo "Backup verified successfully"
else
  echo "Backup verification failed!" | mail -s "Backup Alert" admin@example.com
fi
```

#### Step 3: Backup Monitoring

**Create monitoring script:**

```bash
#!/bin/bash
# check-backup-health.sh

BACKUP_DIR="/var/backups/event-manager"
ALERT_EMAIL="admin@example.com"

# Check if backup ran today
LATEST_BACKUP=$(ls -t $BACKUP_DIR/db_*.sql.gz | head -1)
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y $LATEST_BACKUP)) / 3600 ))

if [ $BACKUP_AGE -gt 24 ]; then
  echo "Backup is $BACKUP_AGE hours old!" | mail -s "Backup Alert" $ALERT_EMAIL
fi

# Check backup size
BACKUP_SIZE=$(stat -c %s $LATEST_BACKUP)
MIN_SIZE=1000000  # 1MB minimum

if [ $BACKUP_SIZE -lt $MIN_SIZE ]; then
  echo "Backup size suspiciously small: $BACKUP_SIZE bytes" | mail -s "Backup Alert" $ALERT_EMAIL
fi
```

#### Step 4: High Availability Setup (Optional)

**PostgreSQL Replication:**

```bash
# On primary server (postgresql.conf)
wal_level = replica
max_wal_senders = 5
hot_standby = on

# On standby server
standby_mode = on
primary_conninfo = 'host=primary_server port=5432 user=replicator'
trigger_file = '/tmp/postgresql.trigger.5432'
```

**Application Load Balancing:**

```nginx
upstream event_manager {
  server app1.example.com:3000;
  server app2.example.com:3000;
  least_conn;
}

server {
  listen 443 ssl;
  server_name example.com;

  location / {
    proxy_pass http://event_manager;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// Test NotificationService
describe('NotificationService', () => {
  it('should create notification', async () => {
    const notification = await notificationService.createNotification({
      userId: 'user123',
      type: 'INFO',
      title: 'Test',
      message: 'Test message',
    });

    expect(notification).toBeDefined();
    expect(notification.title).toBe('Test');
  });

  it('should broadcast to multiple users', async () => {
    const count = await notificationService.broadcastNotification(
      ['user1', 'user2', 'user3'],
      {
        type: 'SYSTEM',
        title: 'Announcement',
        message: 'System maintenance',
      }
    );

    expect(count).toBe(3);
  });
});
```

### Integration Tests

```typescript
// Test notification endpoints
describe('Notification API', () => {
  it('GET /api/notifications should return user notifications', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('PUT /api/notifications/:id/read should mark as read', async () => {
    const response = await request(app)
      .put(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.read).toBe(true);
  });
});
```

### E2E Tests

```typescript
// Test notification flow
test('User receives notification when assigned to contest', async ({ page }) => {
  // Login as admin
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Assign judge to contest
  await page.goto('/admin/assignments');
  await page.click('button:text("Add Assignment")');
  await page.selectOption('[name="judgeId"]', 'judge123');
  await page.selectOption('[name="contestId"]', 'contest123');
  await page.click('button:text("Save")');

  // Login as judge
  await page.goto('/logout');
  await page.goto('/login');
  await page.fill('[name="email"]', 'judge@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Check notification bell
  await page.waitForSelector('[data-tour="notifications"]');
  const unreadCount = await page.textContent('[data-tour="notifications"] .badge');
  expect(parseInt(unreadCount!)).toBeGreaterThan(0);
});
```

---

## Deployment Procedures

### Step 1: Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database migration tested
- [ ] Backup created

### Step 2: Database Migration

```bash
# Backup database first
pg_dump event_manager > backup_before_migration.sql

# Run migration
npm run migrate

# Verify migration
psql event_manager -c "\dt notifications"

# Rollback if needed
psql event_manager < backup_before_migration.sql
```

### Step 3: Deploy Backend

```bash
# Build TypeScript
npm run build

# Install production dependencies
npm install --production

# Restart application
pm2 restart event-manager

# Check logs
pm2 logs event-manager
```

### Step 4: Deploy Frontend

```bash
cd frontend

# Build production bundle
npm run build

# Deploy to static hosting
aws s3 sync dist/ s3://my-bucket/

# Or copy to web server
rsync -av dist/ /var/www/html/
```

### Step 5: Post-Deployment Verification

```bash
# Check application health
curl https://example.com/health

# Check database connection
psql event_manager -c "SELECT count(*) FROM notifications;"

# Check Socket.IO
# Open browser console and check WebSocket connection

# Monitor logs
tail -f /var/log/event-manager/error.log
```

---

## Performance Considerations

### Database Optimization

**1. Notification Indexes:**
- `(userId, read)` - Fast unread count
- `(userId, createdAt)` - Fast recent notifications
- Already included in migration

**2. Query Optimization:**
```typescript
// Use pagination
const notifications = await prisma.notification.findMany({
  where: { userId },
  take: 50,
  skip: offset,
  orderBy: { createdAt: 'desc' }
});

// Use count instead of loading all
const unreadCount = await prisma.notification.count({
  where: { userId, read: false }
});
```

**3. Cleanup Old Notifications:**
```typescript
// Run daily via cron
async function cleanupOldNotifications() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  await prisma.notification.deleteMany({
    where: {
      read: true,
      readAt: { lt: thirtyDaysAgo }
    }
  });
}
```

### Socket.IO Optimization

**1. Use Rooms:**
```typescript
// Join user-specific room
socket.join(`user:${userId}`);

// Emit only to specific user
io.to(`user:${userId}`).emit('notification:new', data);
```

**2. Redis Adapter (for multiple servers):**
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### Frontend Optimization

**1. Debounce Notification Fetches:**
```typescript
const debouncedFetch = debounce(fetchNotifications, 500);
```

**2. Virtual Scrolling for Long Lists:**
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={notifications.length}
  itemSize={80}
>
  {NotificationItem}
</FixedSizeList>
```

**3. Service Worker for Push Notifications:**
```typescript
// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Request notification permission
Notification.requestPermission();
```

---

## Summary

### Total Scope

- **Phase 3.1:** ✅ COMPLETE (13 files, ~1,800 lines)
- **Phase 3.2:** 🔄 60% Complete (3 files created, 4-5 files to create)
- **Phase 3.3:** ⏳ Not Started (~8-10 files)
- **Phase 3.4:** ⏳ Not Started (~10-12 files)
- **Phase 4.1:** ⏳ Not Started (~6-8 files)
- **Phase 4.2:** ⏳ Not Started (~5-6 files)
- **Phase 4.3:** ⏳ Not Started (~4-5 files, script updates)

### Estimated Effort

- **Phase 3.2 Completion:** 4-6 hours
- **Phase 3.3:** 12-16 hours
- **Phase 3.4:** 16-20 hours
- **Phase 4.1:** 16-20 hours
- **Phase 4.2:** 8-12 hours
- **Phase 4.3:** 6-8 hours

**Total Remaining:** 62-82 hours

### Priority Recommendations

**High Priority:**
1. Complete Phase 3.2 (Notifications) - High user value
2. Phase 3.3 (Bulk Operations) - High admin productivity
3. Phase 4.3 (Disaster Recovery) - Critical for production

**Medium Priority:**
4. Phase 3.4 (Advanced Customization) - Nice to have
5. Phase 4.2 (Event-Driven) - Improves scalability

**Low Priority (Optional):**
6. Phase 4.1 (Multi-Tenancy) - Only if multiple organizations needed

---

**Document Status:** Complete Implementation Guide
**Last Updated:** November 12, 2025
**Version:** 1.0
