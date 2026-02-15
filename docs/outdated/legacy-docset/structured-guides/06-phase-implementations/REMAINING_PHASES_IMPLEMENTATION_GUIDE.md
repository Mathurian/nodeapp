# Remaining Phases Implementation Guide

**Date:** November 12, 2025
**Current Progress:** Phase 3.2 Complete (Notification Center)
**Remaining Work:** Phases 3.3, 3.4, 4.1, 4.2, 4.3

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 3.3: Bulk Operations](#phase-33-bulk-operations)
3. [Phase 3.4: Advanced Customization](#phase-34-advanced-customization)
4. [Phase 4.1: Multi-Tenancy](#phase-41-multi-tenancy)
5. [Phase 4.2: Event-Driven Architecture](#phase-42-event-driven-architecture)
6. [Phase 4.3: Disaster Recovery](#phase-43-disaster-recovery)
7. [Prioritization Strategy](#prioritization-strategy)
8. [Implementation Timeline](#implementation-timeline)

---

## Overview

### Completed Phases

✅ **Phase 1:** Foundation - Database, Auth, RBAC
✅ **Phase 2:** Core Enhancements - Caching, Monitoring, Performance
✅ **Phase 3.1:** User Onboarding - Tours, Help System, Tooltips
✅ **Phase 3.2:** Notification Center - Real-time notifications

### Remaining Phases

📋 **Phase 3.3:** Bulk Operations (12-16 hours)
📋 **Phase 3.4:** Advanced Customization (16-20 hours)
📋 **Phase 4.1:** Multi-Tenancy (16-20 hours)
📋 **Phase 4.2:** Event-Driven Architecture (8-12 hours)
📋 **Phase 4.3:** Disaster Recovery (6-8 hours)

**Total Remaining:** ~58-76 hours (7-10 business days)

---

## Phase 3.3: Bulk Operations

### Objective

Enable efficient management of multiple items through bulk actions and CSV import/export.

### Components

#### 1. Enhanced DataTable Component

**File:** `/frontend/src/components/DataTable.tsx`

**Features to Add:**
- Checkbox column for row selection
- "Select All" checkbox in header
- Select/deselect all rows
- Track selected items in state
- Show bulk action toolbar when items selected
- Keyboard shortcuts:
  - `Ctrl+A` / `Cmd+A` - Select all
  - `Escape` - Clear selection

**Implementation:**

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onSelectionChange?: (selectedIds: string[]) => void;
  bulkActions?: BulkAction[];
  selectableRows?: boolean;
}

interface BulkAction {
  label: string;
  icon?: React.ComponentType;
  onClick: (selectedIds: string[]) => void;
  variant?: 'primary' | 'danger' | 'secondary';
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}
```

**State Management:**
```typescript
const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
const [selectAll, setSelectAll] = useState(false);

const toggleSelectAll = () => {
  if (selectAll) {
    setSelectedRows(new Set());
  } else {
    setSelectedRows(new Set(data.map(item => item.id)));
  }
  setSelectAll(!selectAll);
};

const toggleSelectRow = (id: string) => {
  const newSelected = new Set(selectedRows);
  if (newSelected.has(id)) {
    newSelected.delete(id);
  } else {
    newSelected.add(id);
  }
  setSelectedRows(newSelected);
  setSelectAll(newSelected.size === data.length);
};
```

**Bulk Action Toolbar:**
```typescript
{selectedRows.size > 0 && (
  <div className="flex items-center space-x-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-b">
    <span className="text-sm font-medium">
      {selectedRows.size} item{selectedRows.size !== 1 ? 's' : ''} selected
    </span>
    {bulkActions?.map((action) => (
      <button
        key={action.label}
        onClick={() => handleBulkAction(action)}
        className={getButtonClass(action.variant)}
      >
        {action.icon && <action.icon className="h-4 w-4 mr-2" />}
        {action.label}
      </button>
    ))}
    <button onClick={() => setSelectedRows(new Set())}>
      Clear selection
    </button>
  </div>
)}
```

---

#### 2. BulkOperationService

**File:** `/src/services/BulkOperationService.ts`

**Purpose:** Generic bulk operation handler with transaction support

```typescript
import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';

@injectable()
export class BulkOperationService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  /**
   * Execute bulk update with transaction support
   */
  async bulkUpdate<T>(
    model: string,
    ids: string[],
    data: Partial<T>,
    userId?: string
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const errors: any[] = [];
    let success = 0;
    let failed = 0;

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const id of ids) {
          try {
            await (tx as any)[model].update({
              where: { id },
              data,
            });
            success++;
          } catch (error) {
            failed++;
            errors.push({ id, error: error.message });
          }
        }
      });
    } catch (error) {
      // Transaction failed - all operations rolled back
      throw new Error(`Bulk update transaction failed: ${error.message}`);
    }

    return { success, failed, errors };
  }

  /**
   * Execute bulk delete with transaction support
   */
  async bulkDelete(
    model: string,
    ids: string[],
    userId?: string
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const errors: any[] = [];
    let success = 0;
    let failed = 0;

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const id of ids) {
          try {
            await (tx as any)[model].delete({
              where: { id },
            });
            success++;
          } catch (error) {
            failed++;
            errors.push({ id, error: error.message });
          }
        }
      });
    } catch (error) {
      throw new Error(`Bulk delete transaction failed: ${error.message}`);
    }

    return { success, failed, errors };
  }

  /**
   * Execute bulk operation with progress tracking
   */
  async bulkOperationWithProgress<T>(
    items: string[],
    operation: (id: string) => Promise<T>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ results: T[]; errors: any[] }> {
    const results: T[] = [];
    const errors: any[] = [];
    const total = items.length;

    for (let i = 0; i < items.length; i++) {
      const id = items[i];
      try {
        const result = await operation(id);
        results.push(result);
      } catch (error) {
        errors.push({ id, error: error.message });
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    return { results, errors };
  }
}
```

---

#### 3. Bulk User Operations

**File:** `/src/controllers/BulkUserController.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { UserService } from '../services/UserService';
import { BulkOperationService } from '../services/BulkOperationService';
import { authenticate, requireRole } from '../middleware/auth';
import { NotificationService } from '../services/NotificationService';

const router = Router();

/**
 * Bulk activate users
 * POST /api/bulk/users/activate
 * Body: { ids: string[] }
 */
router.post('/activate', authenticate, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    const bulkService = container.resolve(BulkOperationService);
    const notificationService = container.resolve(NotificationService);

    const result = await bulkService.bulkUpdate('user', ids, { isActive: true });

    // Send notifications to activated users
    for (const id of ids) {
      await notificationService.createNotification({
        userId: id,
        type: 'INFO',
        title: 'Account Activated',
        message: 'Your account has been activated.',
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Bulk deactivate users
 */
router.post('/deactivate', authenticate, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    const bulkService = container.resolve(BulkOperationService);

    const result = await bulkService.bulkUpdate('user', ids, { isActive: false });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Bulk delete users
 */
router.delete('/', authenticate, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    const bulkService = container.resolve(BulkOperationService);

    const result = await bulkService.bulkDelete('user', ids);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Bulk change user roles
 */
router.post('/change-role', authenticate, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids, role } = req.body;
    const bulkService = container.resolve(BulkOperationService);
    const notificationService = container.resolve(NotificationService);

    const result = await bulkService.bulkUpdate('user', ids, { role });

    // Notify users of role change
    for (const id of ids) {
      await notificationService.notifyRoleChange(id, role);
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
```

**Register routes in `/src/config/routes.config.ts`:**
```typescript
import bulkUserRoutes from '../routes/bulkUserRoutes';
app.use('/api/bulk/users', bulkUserRoutes);
```

---

#### 4. CSV Service

**Install dependencies:**
```bash
npm install csv-parser csv-writer papaparse
npm install --save-dev @types/papaparse
```

**File:** `/src/services/CSVService.ts`

```typescript
import { injectable } from 'tsyringe';
import * as csv from 'csv-parser';
import { createReadStream, createWriteStream } from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import Papa from 'papaparse';

interface CSVImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; data: any; error: string }>;
}

@injectable()
export class CSVService {
  /**
   * Import users from CSV file
   */
  async importUsers(filePath: string): Promise<CSVImportResult> {
    return new Promise((resolve) => {
      const results: any[] = [];
      const errors: any[] = [];
      let rowNumber = 0;

      createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          rowNumber++;
          results.push({ rowNumber, data });
        })
        .on('end', async () => {
          let success = 0;
          let failed = 0;

          for (const { rowNumber, data } of results) {
            try {
              // Validate required fields
              if (!data.name || !data.email) {
                throw new Error('Missing required fields: name and email');
              }

              // Create user (call UserService)
              // await userService.create(data);
              success++;
            } catch (error) {
              failed++;
              errors.push({
                row: rowNumber,
                data,
                error: error.message,
              });
            }
          }

          resolve({ success, failed, errors });
        })
        .on('error', (error) => {
          resolve({ success: 0, failed: results.length, errors: [{ row: 0, data: {}, error: error.message }] });
        });
    });
  }

  /**
   * Export data to CSV
   */
  async exportToCSV<T>(
    data: T[],
    filePath: string,
    headers: Array<{ id: string; title: string }>
  ): Promise<void> {
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers,
    });

    await csvWriter.writeRecords(data);
  }

  /**
   * Parse CSV string to objects
   */
  parseCSVString(csvString: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error),
      });
    });
  }

  /**
   * Generate CSV string from objects
   */
  generateCSVString(data: any[]): string {
    return Papa.unparse(data);
  }
}
```

---

#### 5. Frontend CSV Import Component

**File:** `/frontend/src/components/BulkImportModal.tsx`

```typescript
import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import Papa from 'papaparse';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'users' | 'contestants' | 'judges';
  onImportComplete: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  entityType,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      previewCSV(selectedFile);
    }
  };

  const previewCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      preview: 5,
      complete: (results) => {
        setPreview(results.data);
      },
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/api/bulk/${entityType}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult(response.data);
      if (response.data.failed === 0) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import failed:', error);
      setResult({ success: 0, failed: 1, errors: [{ error: 'Import failed' }] });
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Import {entityType}</h2>

          {!result ? (
            <>
              <div className="mb-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Select CSV File
                </button>
                {file && (
                  <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                    {file.name}
                  </span>
                )}
              </div>

              {preview.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Preview (first 5 rows):</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr>
                          {Object.keys(preview[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((value: any, j) => (
                              <td key={j} className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2">Import Results:</h3>
                <p className="text-green-600">Successfully imported: {result.success}</p>
                <p className="text-red-600">Failed: {result.failed}</p>

                {result.errors && result.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Errors:</h4>
                    <div className="max-h-60 overflow-y-auto">
                      {result.errors.map((error: any, i: number) => (
                        <div key={i} className="text-sm text-red-600 mb-1">
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                    setPreview([]);
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
```

---

### Testing Phase 3.3

```typescript
describe('Bulk Operations', () => {
  it('should bulk update users', async () => {
    const result = await bulkService.bulkUpdate('user', ['id1', 'id2'], { isActive: true });
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('should handle partial failures', async () => {
    const result = await bulkService.bulkUpdate('user', ['id1', 'invalid'], { isActive: true });
    expect(result.success).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it('should import CSV users', async () => {
    const result = await csvService.importUsers('./test-users.csv');
    expect(result.success).toBeGreaterThan(0);
  });
});
```

---

## Phase 3.4: Advanced Customization

### Overview

Implement custom fields, notification rules, workflows, email templates, and theme customization.

### 1. Custom Fields System

**Database Schema:**

```prisma
model CustomField {
  id          String           @id @default(cuid())
  entityType  EntityType       // USER, EVENT, CONTEST, CONTESTANT, JUDGE
  fieldName   String
  fieldType   CustomFieldType  // TEXT, NUMBER, DATE, SELECT, CHECKBOX, TEXTAREA
  label       String
  placeholder String?
  required    Boolean          @default(false)
  options     String?          // JSON array for SELECT type
  order       Int              @default(0)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  values      CustomFieldValue[]

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
  field        CustomField @relation(fields: [fieldId], references: [id], onDelete: Cascade)

  @@unique([fieldId, entityId])
  @@map("custom_field_values")
}

enum CustomFieldType {
  TEXT
  NUMBER
  DATE
  SELECT
  CHECKBOX
  TEXTAREA
}

enum EntityType {
  USER
  EVENT
  CONTEST
  CONTESTANT
  JUDGE
}
```

**Service Implementation:** `/src/services/CustomFieldService.ts`

```typescript
@injectable()
export class CustomFieldService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async createField(data: CreateCustomFieldDTO): Promise<CustomField> {
    return this.prisma.customField.create({
      data: {
        entityType: data.entityType,
        fieldName: data.fieldName,
        fieldType: data.fieldType,
        label: data.label,
        placeholder: data.placeholder,
        required: data.required,
        options: data.options ? JSON.stringify(data.options) : null,
        order: data.order,
      },
    });
  }

  async getFieldsForEntity(entityType: EntityType): Promise<CustomField[]> {
    return this.prisma.customField.findMany({
      where: { entityType },
      orderBy: { order: 'asc' },
    });
  }

  async setFieldValue(
    fieldId: string,
    entityId: string,
    value: string
  ): Promise<CustomFieldValue> {
    return this.prisma.customFieldValue.upsert({
      where: {
        fieldId_entityId: { fieldId, entityId },
      },
      update: { value },
      create: { fieldId, entityId, value },
    });
  }

  async getEntityValues(entityId: string): Promise<CustomFieldValue[]> {
    return this.prisma.customFieldValue.findMany({
      where: { entityId },
      include: { field: true },
    });
  }
}
```

---

### 2. Notification Rules Engine

**Database Schema:**

```prisma
model NotificationRule {
  id          String              @id @default(cuid())
  name        String
  description String?
  trigger     NotificationTrigger // EVENT_CREATED, SCORE_SUBMITTED, etc.
  conditions  String              // JSON: [{ field, operator, value }]
  actions     String              // JSON: [{ type, params }]
  isActive    Boolean             @default(true)
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  @@map("notification_rules")
}

enum NotificationTrigger {
  EVENT_CREATED
  EVENT_STARTED
  EVENT_COMPLETED
  SCORE_SUBMITTED
  CONTEST_CERTIFIED
  ASSIGNMENT_CREATED
  USER_CREATED
  SCHEDULED
}
```

**Service:** `/src/services/NotificationRuleService.ts`

```typescript
@injectable()
export class NotificationRuleService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(NotificationService) private notificationService: NotificationService
  ) {}

  async evaluateRules(trigger: NotificationTrigger, data: any): Promise<void> {
    const rules = await this.prisma.notificationRule.findMany({
      where: { trigger, isActive: true },
    });

    for (const rule of rules) {
      if (this.evaluateConditions(rule.conditions, data)) {
        await this.executeActions(rule.actions, data);
      }
    }
  }

  private evaluateConditions(conditionsJSON: string, data: any): boolean {
    const conditions = JSON.parse(conditionsJSON);
    return conditions.every((condition: any) => {
      const value = this.getNestedValue(data, condition.field);
      return this.evaluateCondition(value, condition.operator, condition.value);
    });
  }

  private evaluateCondition(value: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expectedValue;
      case 'notEquals':
        return value !== expectedValue;
      case 'greaterThan':
        return value > expectedValue;
      case 'lessThan':
        return value < expectedValue;
      case 'contains':
        return String(value).includes(expectedValue);
      default:
        return false;
    }
  }

  private async executeActions(actionsJSON: string, data: any): Promise<void> {
    const actions = JSON.parse(actionsJSON);
    for (const action of actions) {
      switch (action.type) {
        case 'sendNotification':
          await this.notificationService.createNotification({
            userId: action.params.userId || data.userId,
            type: action.params.type,
            title: this.replaceVariables(action.params.title, data),
            message: this.replaceVariables(action.params.message, data),
            link: action.params.link,
          });
          break;
        case 'sendEmail':
          // TODO: Implement email sending
          break;
      }
    }
  }

  private replaceVariables(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return this.getNestedValue(data, key) || '';
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
```

---

## Phase 4.1: Multi-Tenancy

### Database Changes

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

// Add tenantId to all models
model User {
  // ... existing fields
  tenantId    String?
  tenant      Tenant? @relation(fields: [tenantId], references: [id])
}

model Event {
  // ... existing fields
  tenantId    String?
  tenant      Tenant? @relation(fields: [tenantId], references: [id])
}

// Repeat for all main models
```

### Tenant Middleware

**File:** `/src/middleware/tenantMiddleware.ts`

```typescript
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract tenant from:
    // 1. Subdomain (tenant.app.com)
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];

    // 2. Custom domain (tenant.com)
    const customDomain = host;

    // 3. Header (X-Tenant-ID)
    const headerTenantId = req.headers['x-tenant-id'] as string;

    // Resolve tenant
    let tenant = null;
    if (headerTenantId) {
      tenant = await prisma.tenant.findUnique({ where: { id: headerTenantId } });
    } else if (customDomain) {
      tenant = await prisma.tenant.findUnique({ where: { domain: customDomain } });
    } else if (subdomain) {
      tenant = await prisma.tenant.findUnique({ where: { slug: subdomain } });
    }

    if (!tenant || !tenant.isActive) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    next(error);
  }
};
```

---

## Phase 4.2: Event-Driven Architecture

### Event Bus

**File:** `/src/services/EventBusService.ts`

```typescript
@injectable()
export class EventBusService {
  private subscribers = new Map<string, Function[]>();

  publish(event: string, data: any): void {
    const handlers = this.subscribers.get(event) || [];
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error executing handler for ${event}:`, error);
      }
    });
  }

  subscribe(event: string, handler: Function): void {
    const handlers = this.subscribers.get(event) || [];
    handlers.push(handler);
    this.subscribers.set(event, handlers);
  }

  unsubscribe(event: string, handler: Function): void {
    const handlers = this.subscribers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.subscribers.set(event, handlers);
    }
  }
}
```

### Event Handlers

**File:** `/src/events/handlers/NotificationHandler.ts`

```typescript
export class NotificationEventHandler {
  constructor(
    private eventBus: EventBusService,
    private notificationService: NotificationService
  ) {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.eventBus.subscribe('score.submitted', this.handleScoreSubmitted.bind(this));
    this.eventBus.subscribe('contest.certified', this.handleContestCertified.bind(this));
  }

  private async handleScoreSubmitted(data: any): Promise<void> {
    await this.notificationService.notifyScoreSubmitted(
      data.judgeId,
      data.contestantName,
      data.categoryName
    );
  }

  private async handleContestCertified(data: any): Promise<void> {
    // Notify all users watching this contest
    const userIds = await this.getUsersWatchingContest(data.contestId);
    await this.notificationService.broadcastNotification(userIds, {
      type: 'SUCCESS',
      title: 'Contest Certified',
      message: `${data.contestName} has been certified.`,
      link: `/contests/${data.contestId}/results`,
    });
  }

  private async getUsersWatchingContest(contestId: string): Promise<string[]> {
    // Implementation to get users
    return [];
  }
}
```

---

## Phase 4.3: Disaster Recovery

### PostgreSQL PITR Setup

**Script:** `/scripts/setup-pitr.sh`

```bash
#!/bin/bash
# PostgreSQL Point-in-Time Recovery Setup

# Configure PostgreSQL for WAL archiving
sudo -u postgres psql -c "ALTER SYSTEM SET wal_level = replica;"
sudo -u postgres psql -c "ALTER SYSTEM SET archive_mode = on;"
sudo -u postgres psql -c "ALTER SYSTEM SET archive_command = 'cp %p /mnt/wal_archive/%f';"
sudo -u postgres psql -c "ALTER SYSTEM SET max_wal_senders = 3;"

# Create WAL archive directory
sudo mkdir -p /mnt/wal_archive
sudo chown postgres:postgres /mnt/wal_archive
sudo chmod 700 /mnt/wal_archive

# Restart PostgreSQL
sudo systemctl restart postgresql

echo "PITR setup complete. WAL archiving enabled."
```

### Enhanced Backup Script

**Script:** `/scripts/backup-full.sh`

```bash
#!/bin/bash
# Full backup with encryption and off-site storage

BACKUP_DIR="/var/backups/event-manager"
S3_BUCKET="s3://my-backups/event-manager"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
GPG_KEY="backup@example.com"

# Create backup directory
mkdir -p $BACKUP_DIR

# Full database backup
echo "Creating full database backup..."
pg_dump -h localhost -U postgres event_manager | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Encrypt backup
echo "Encrypting backup..."
gpg --encrypt --recipient $GPG_KEY $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Upload to S3
echo "Uploading to S3..."
aws s3 cp $BACKUP_DIR/db_$TIMESTAMP.sql.gz.gpg $S3_BUCKET/

# Filesystem backup
echo "Backing up file system..."
tar -czf $BACKUP_DIR/files_$TIMESTAMP.tar.gz /var/www/event-manager/uploads

# Upload files to S3
aws s3 cp $BACKUP_DIR/files_$TIMESTAMP.tar.gz $S3_BUCKET/

# Cleanup local backups older than 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.gpg" -mtime +7 -delete

# Verify backup integrity
if gunzip -t $BACKUP_DIR/db_$TIMESTAMP.sql.gz; then
  echo "Backup verified successfully"
  echo "Backup completed: $TIMESTAMP" | mail -s "Backup Success" admin@example.com
else
  echo "Backup verification failed!" | mail -s "Backup FAILED" admin@example.com
  exit 1
fi
```

---

## Prioritization Strategy

### High Priority (Implement First)

1. **Phase 3.3: Bulk Operations** - High admin productivity value
2. **Phase 4.3: Disaster Recovery** - Critical for production
3. **Phase 4.2: Event-Driven Architecture** - Improves scalability

### Medium Priority

4. **Phase 3.4: Advanced Customization** - Nice to have features

### Low Priority (Optional)

5. **Phase 4.1: Multi-Tenancy** - Only if multiple organizations needed

---

## Implementation Timeline

### Week 1
- **Day 1-2:** Phase 3.3 - Bulk Operations
- **Day 3:** Phase 4.3 - Disaster Recovery
- **Day 4-5:** Phase 4.2 - Event-Driven Architecture

### Week 2
- **Day 1-3:** Phase 3.4 - Advanced Customization
- **Day 4-5:** Phase 4.1 - Multi-Tenancy (if needed)

---

## Success Criteria

- [ ] All bulk operations work with transaction support
- [ ] CSV import/export functional
- [ ] Custom fields system operational
- [ ] Notification rules engine working
- [ ] Event-driven architecture implemented
- [ ] Disaster recovery procedures in place
- [ ] All tests passing
- [ ] Documentation complete

---

**Document Version:** 1.0
**Last Updated:** November 12, 2025
**Status:** Implementation Guide
