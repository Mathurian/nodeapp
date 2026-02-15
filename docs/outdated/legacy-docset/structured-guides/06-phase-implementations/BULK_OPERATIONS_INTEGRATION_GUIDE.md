# Bulk Operations Integration Guide

**Date**: 2025-11-12
**Phase**: 3.3 - Bulk Operations
**Status**: Components Created, Integration Guide Provided

---

## Overview

The Bulk Operations system has been implemented with reusable frontend components. This guide shows how to integrate them into your pages.

## Components Created

### 1. BulkActionToolbar

**Location**: `/var/www/event-manager/frontend/src/components/bulk/BulkActionToolbar.tsx`

**Purpose**: Displays selected count, action buttons, and handles bulk operations execution.

**Features**:
- Responsive design
- Action-specific buttons based on entity type
- Confirmation modals for destructive actions
- Progress tracking
- CSV export functionality
- Error handling with toast notifications

**Props**:
```typescript
interface BulkActionToolbarProps {
  selectedIds: string[];           // Array of selected item IDs
  selectedItems: any[];             // Array of full selected items
  entityType: 'user' | 'event' | 'contest' | 'assignment';
  onActionComplete: () => void;     // Callback after successful operation
  onClearSelection: () => void;     // Callback to clear selection
}
```

### 2. BulkImportModal

**Location**: `/var/www/event-manager/frontend/src/components/bulk/BulkImportModal.tsx`

**Purpose**: Modal for CSV import with template download, validation, and results display.

**Features**:
- CSV file upload
- Template download
- Import validation
- Results display with error details
- Auto-close on success
- Dark mode support

**Props**:
```typescript
interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'user' | 'contestant' | 'judge';
  onImportComplete: () => void;
}
```

---

## Backend API Endpoints

All bulk operations use the `/api/bulk/*` endpoints:

### User Operations
- `POST /api/bulk/users/activate` - Activate users
- `POST /api/bulk/users/deactivate` - Deactivate users
- `POST /api/bulk/users/delete` - Delete users
- `POST /api/bulk/users/change-role` - Change user roles
- `POST /api/bulk/users/import` - Import users from CSV
- `GET /api/bulk/users/export?ids=id1,id2` - Export users to CSV
- `GET /api/bulk/users/template` - Download CSV template

### Event Operations
- `POST /api/bulk/events/delete` - Delete events
- `POST /api/bulk/events/clone` - Clone events
- `POST /api/bulk/events/import` - Import events (if implemented)
- `GET /api/bulk/events/export?ids=id1,id2` - Export events
- `GET /api/bulk/events/template` - Download template

### Contest Operations
- `POST /api/bulk/contests/certify` - Certify contests
- `POST /api/bulk/contests/delete` - Delete contests
- `GET /api/bulk/contests/export?ids=id1,id2` - Export contests
- `GET /api/bulk/contests/template` - Download template

### Assignment Operations
- `POST /api/bulk/assignments/delete` - Delete assignments
- `GET /api/bulk/assignments/export?ids=id1,id2` - Export assignments
- `GET /api/bulk/assignments/template` - Download template

---

## Integration Examples

### Example 1: Simple Integration (New Page)

```typescript
import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { BulkActionToolbar } from '../components/bulk/BulkActionToolbar';
import { BulkImportModal } from '../components/bulk/BulkImportModal';
import DataTable from '../components/DataTable';
import { api } from '../services/api';

const MyEntityPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const { data: entities, isLoading } = useQuery(
    'entities',
    () => api.get('/api/entities').then(res => res.data)
  );

  const handleActionComplete = () => {
    // Refresh data after bulk operation
    queryClient.invalidateQueries('entities');
  };

  const handleImportComplete = () => {
    queryClient.invalidateQueries('entities');
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created' }
  ];

  const selectedItems = entities?.filter(e => selectedIds.includes(e.id)) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1>My Entities</h1>
        <button
          onClick={() => setShowImportModal(true)}
          className="btn-primary"
        >
          Import CSV
        </button>
      </div>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedIds={selectedIds}
        selectedItems={selectedItems}
        entityType="user" // or 'event', 'contest', 'assignment'
        onActionComplete={handleActionComplete}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Data Table with Selection */}
      <DataTable
        data={entities || []}
        columns={columns}
        loading={isLoading}
        selectable={true}
        onSelectionChange={setSelectedIds}
      />

      {/* Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        entityType="user" // or 'contestant', 'judge'
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default MyEntityPage;
```

### Example 2: Integration with Existing State

For pages that already have selection state (like the current UsersPage):

```typescript
// In your existing page component:

import { BulkActionToolbar } from '../components/bulk/BulkActionToolbar';
import { BulkImportModal } from '../components/bulk/BulkImportModal';

// ... existing code ...

// Add state for import modal
const [showNewBulkImport, setShowNewBulkImport] = useState(false);

// Add handlers
const handleBulkActionComplete = () => {
  queryClient.invalidateQueries('users');
  // or refetch: refetch();
};

// In your JSX, add the toolbar:
<BulkActionToolbar
  selectedIds={selectedUsers}
  selectedItems={users.filter(u => selectedUsers.includes(u.id))}
  entityType="user"
  onActionComplete={handleBulkActionComplete}
  onClearSelection={() => setSelectedUsers([])}
/>

// Add import button in header:
<button
  onClick={() => setShowNewBulkImport(true)}
  className="btn-secondary"
>
  Import CSV (New)
</button>

// Add import modal:
<BulkImportModal
  isOpen={showNewBulkImport}
  onClose={() => setShowNewBulkImport(false)}
  entityType="user"
  onImportComplete={handleBulkActionComplete}
/>
```

---

## Available Actions by Entity Type

### User Actions
- **Activate**: Set `isActive = true` for selected users
- **Deactivate**: Set `isActive = false` for selected users
- **Delete**: Permanently delete users (with confirmation)
- **Export CSV**: Download selected users as CSV

### Event Actions
- **Delete**: Delete events (with confirmation)
- **Clone**: Create copies of events
- **Export CSV**: Download selected events as CSV

### Contest Actions
- **Certify**: Mark contests as certified
- **Delete**: Delete contests (with confirmation)
- **Export CSV**: Download selected contests as CSV

### Assignment Actions
- **Delete**: Delete assignments (with confirmation)
- **Export CSV**: Download selected assignments as CSV

---

## Styling

Components use Tailwind CSS classes and respect dark mode via `dark:` prefixes.

**Color Scheme**:
- Primary actions: Blue (`bg-blue-600`)
- Success actions: Green (`bg-green-600`)
- Warning actions: Yellow (`bg-yellow-600`)
- Danger actions: Red (`bg-red-600`)
- Secondary actions: Gray (`bg-gray-600`)

**Responsive Design**:
- Toolbar wraps on small screens
- Modal is full-screen on mobile
- Buttons stack vertically when needed

---

## Error Handling

### Frontend
- Toast notifications for all operations
- Detailed error messages from API
- Console logging for debugging
- Loading states prevent double-submission

### Backend
- Returns `{ success: number, failed: number, errors: [] }`
- Continues on error (doesn't stop entire batch)
- Detailed error reporting with row numbers
- Transaction support for data integrity

---

## Testing Checklist

### Manual Testing

#### Bulk Actions
- [ ] Select 1 item, perform action
- [ ] Select multiple items, perform action
- [ ] Test each action type for each entity
- [ ] Verify confirmation modals for destructive actions
- [ ] Check loading states and progress
- [ ] Verify data refresh after operation
- [ ] Test CSV export downloads correctly

#### Bulk Import
- [ ] Download CSV template
- [ ] Import valid CSV file
- [ ] Import CSV with errors
- [ ] Verify error messages are clear
- [ ] Check success/failure counts
- [ ] Verify data is created correctly
- [ ] Test file size/type validation

#### Responsive Design
- [ ] Test on desktop (1920px)
- [ ] Test on tablet (768px)
- [ ] Test on mobile (375px)
- [ ] Verify toolbar wraps properly
- [ ] Check modal is usable on all sizes

#### Dark Mode
- [ ] Toggle dark mode
- [ ] Verify all text is readable
- [ ] Check button colors
- [ ] Verify modal backgrounds
- [ ] Test toasts in dark mode

---

## API Request/Response Format

### Request Format
```typescript
// Bulk operation
POST /api/bulk/users/activate
Content-Type: application/json

{
  "ids": ["user-id-1", "user-id-2", "user-id-3"]
}
```

### Response Format
```typescript
{
  "success": 2,
  "failed": 1,
  "errors": [
    {
      "id": "user-id-3",
      "message": "User not found"
    }
  ]
}
```

### Import Format
```typescript
POST /api/bulk/users/import
Content-Type: multipart/form-data

FormData {
  file: File (CSV)
}

// Response
{
  "success": 10,
  "failed": 2,
  "errors": [
    {
      "row": 5,
      "message": "Invalid email format"
    },
    {
      "row": 8,
      "message": "Duplicate email"
    }
  ]
}
```

---

## Customization

### Adding New Entity Types

1. **Add to BulkActionToolbar**:
```typescript
// In getActions() method
case 'myentity':
  return [
    { id: 'custom-action', label: 'Custom Action', variant: 'primary', destructive: false },
    { id: 'delete', label: 'Delete', variant: 'danger', destructive: true },
    { id: 'export', label: 'Export CSV', variant: 'secondary', destructive: false }
  ];
```

2. **Create Backend Controller**:
```typescript
// src/controllers/BulkMyEntityController.ts
export class BulkMyEntityController {
  async customAction(req: Request, res: Response) {
    const { ids } = req.body;
    const results = await bulkOperationService.executeBulkOperation(
      ids,
      async (id) => {
        // Your custom logic here
        await myEntityService.doSomething(id);
      }
    );
    res.json(results);
  }
}
```

3. **Register Routes**:
```typescript
// In src/routes/bulkRoutes.ts
router.post('/myentities/custom-action', bulkMyEntityController.customAction);
```

### Adding New Actions

To add a new action to an existing entity:

1. Add action definition in `getActions()`
2. Handle action in `executeAction()` method
3. Create backend endpoint
4. Update this documentation

---

## Performance Considerations

- **Batch Size**: Default 10 items per batch
- **Timeout**: 30 seconds per batch
- **CSV Size**: Max 5MB upload
- **Export**: Streams large datasets
- **Progress**: Updates every batch completion

---

## Security

- All operations require authentication
- Most operations require ADMIN role
- CSRF protection enabled
- File upload validation (CSV only)
- XSS protection (sanitized inputs)
- No SQL injection (Prisma ORM)

---

## Common Issues

### Issue: "Action not working"
**Solution**: Check browser console for errors. Verify API endpoint exists and user has permission.

### Issue: "CSV import failing"
**Solution**: Download template and compare format. Check file encoding is UTF-8.

### Issue: "Export returns 404"
**Solution**: Ensure `api.defaults.baseURL` is set correctly in api.ts

### Issue: "Selection not persisting"
**Solution**: Ensure `onSelectionChange` is updating state correctly.

---

## Future Enhancements

- [ ] Progress bars during execution
- [ ] Undo/redo functionality
- [ ] Scheduled bulk operations
- [ ] Email notifications on completion
- [ ] Advanced CSV mapping
- [ ] Bulk edit (not just actions)
- [ ] Dry-run mode
- [ ] Operation history/audit

---

## Support

For issues or questions:
1. Check this guide
2. Review backend logs: `logs/app.log`
3. Check frontend console for errors
4. Review API documentation: `/api-docs`

---

**Last Updated**: 2025-11-12
**Version**: 1.0
