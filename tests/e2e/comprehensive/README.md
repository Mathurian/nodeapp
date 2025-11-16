# Comprehensive E2E Test Suites

This directory contains comprehensive end-to-end test suites for each user role in the Event Manager application. These tests simulate all possible clicks, field entries, views, and functions available to each user type.

## Test Files

### 1. `admin.e2e.test.ts` - ADMIN/ORGANIZER Role
**Total Tests: ~50+**

Covers:
- **Events Management**: Create, edit, delete events with all fields
- **Contests Management**: Create and manage contests
- **Categories Management**: Create and manage categories
- **Users Management**: Create, edit, change roles, delete users
- **Assignments**: Assign judges and contestants to categories
- **Admin Dashboard**: System statistics, database browser, backup manager, log files
- **Templates**: Create, edit, delete templates
- **Reports**: Generate reports, export to PDF/Excel
- **Settings**: Profile, database, notification settings
- **Results & Winners**: View and filter results and winners
- **Deductions**: Create and manage deductions
- **Tracker**: View certification status
- **Emcee**: View contestant and judge bios
- **Help**: View help page and FAQ

### 2. `judge.e2e.test.ts` - JUDGE Role
**Total Tests: ~20+**

Covers:
- **Scoring Interface**: Navigate, select categories, view contestants and criteria
- **Score Submission**: Submit scores, add comments, validate inputs (min/max)
- **Scoring History**: View past scores
- **Results Viewing**: View results, filter by category
- **Winners**: View winners page
- **Judge Bios**: View judge bios list
- **Certification**: View certification status, certify scores
- **Profile**: View and update profile information
- **Access Restrictions**: Verify cannot access admin/users pages

### 3. `contestant.e2e.test.ts` - CONTESTANT Role
**Total Tests: ~20+**

Covers:
- **Home Page**: View dashboard, welcome message, assigned events
- **Results**: View own scores, filter by category/contest, view ranking/placement
- **Winners**: View winners if allowed (with permission check)
- **Profile**: View and update profile information, update bio
- **Settings**: Access settings page
- **Help**: View help page
- **Access Restrictions**: Verify cannot access admin, scoring, users, assignments, templates, reports

### 4. `tallyMaster.e2e.test.ts` - TALLY_MASTER Role
**Total Tests: ~20+**

Covers:
- **Dashboard**: Navigate to tally master dashboard
- **Certification Queue**: View pending certifications
- **Score Review**: Review scores for categories and contests
- **Certification**: Certify totals for categories
- **Score Removal Requests**: View, create (category and contest-wide), approve/deny
- **Bias Checking**: Use bias checking tools
- **Results**: View and filter results
- **Reports**: Generate certification reports
- **Settings**: Access settings page
- **Help**: View help page

### 5. `auditor.e2e.test.ts` - AUDITOR Role
**Total Tests: ~15+**

Covers:
- **Dashboard**: Navigate to auditor dashboard
- **Pending Audits**: View pending audits
- **Completed Audits**: View completed audits
- **Score Verification**: Verify scores, view details, add audit notes
- **Final Certification**: Submit final certification
- **Certification Status**: View certification status
- **Audit Logs**: View and filter audit logs by date
- **Results**: View and filter results
- **Reports**: Generate audit reports
- **Settings**: Access settings page
- **Help**: View help page

### 6. `board.e2e.test.ts` - BOARD Role
**Total Tests: ~15+**

Covers:
- **Dashboard**: Navigate to board dashboard
- **Certifications**: View certifications and certification status
- **Approval Workflow**: Approve or reject certifications with reasons
- **Score Removal Requests**: View, approve, or deny score removal requests
- **Results**: View results and winners
- **Reports**: Generate board reports
- **Emcee Access**: View contestant and judge bios
- **Settings**: Access settings page
- **Help**: View help page

### 7. `emcee.e2e.test.ts` - EMCEE Role
**Total Tests: ~15+**

Covers:
- **Dashboard**: Navigate to emcee page
- **Contestant Bios**: View, filter by event, view individual bio details
- **Judge Bios**: View, filter by event, view individual bio details
- **Scripts**: View scripts, filter by event, view script details
- **Results**: View results and winners
- **Profile**: Update profile information
- **Settings**: Access settings page
- **Help**: View help page
- **Access Restrictions**: Verify cannot access admin, scoring, users pages

## Test Coverage Summary

Each test suite covers:

1. **Navigation**: All pages accessible to the role
2. **CRUD Operations**: Create, Read, Update, Delete where applicable
3. **Form Interactions**: All input fields, dropdowns, checkboxes, textareas
4. **Button Clicks**: All action buttons (submit, save, delete, approve, etc.)
5. **Filtering**: All filter options (by event, contest, category, date, etc.)
6. **Viewing**: All data displays (tables, lists, cards, details)
7. **Workflows**: Complete multi-step processes (certification, approval, etc.)
8. **Access Control**: Verification of restricted pages
9. **Error Handling**: Validation errors, empty states
10. **Success Feedback**: Toast notifications, success messages

## Running the Tests

### Run All Comprehensive Tests
```bash
npm run test:e2e -- tests/e2e/comprehensive
```

### Run Tests for Specific Role
```bash
# Admin/Organizer
npm run test:e2e -- tests/e2e/comprehensive/admin.e2e.test.ts

# Judge
npm run test:e2e -- tests/e2e/comprehensive/judge.e2e.test.ts

# Contestant
npm run test:e2e -- tests/e2e/comprehensive/contestant.e2e.test.ts

# Tally Master
npm run test:e2e -- tests/e2e/comprehensive/tallyMaster.e2e.test.ts

# Auditor
npm run test:e2e -- tests/e2e/comprehensive/auditor.e2e.test.ts

# Board
npm run test:e2e -- tests/e2e/comprehensive/board.e2e.test.ts

# Emcee
npm run test:e2e -- tests/e2e/comprehensive/emcee.e2e.test.ts
```

### Run in Watch Mode
```bash
npm run test:e2e:watch -- tests/e2e/comprehensive
```

### Run in UI Mode
```bash
npm run test:e2e:ui:host -- tests/e2e/comprehensive
```

## Test Structure

Each test file follows this structure:

```typescript
test.describe('Comprehensive [Role] E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as role-specific user
  });

  test.afterEach(async ({ page }) => {
    // Logout to prevent data contamination
  });

  // Tests organized by feature area
  test.describe('Feature Area', () => {
    test('should perform specific action', async ({ page }) => {
      // Test implementation
    });
  });
});
```

## Key Features

1. **Comprehensive Coverage**: Tests cover all pages, functions, and interactions for each role
2. **Realistic Scenarios**: Tests simulate actual user workflows
3. **Error Handling**: Tests handle empty states, missing data, and error conditions gracefully
4. **Access Control**: Verifies that users cannot access restricted pages
5. **Data Isolation**: Each test logs out after completion to prevent data contamination
6. **Flexible Assertions**: Tests check for multiple success indicators (toasts, URL changes, form resets)

## Notes

- Tests use the standard test credentials from seed data:
  - `admin@eventmanager.com` / `password123`
  - `judge@eventmanager.com` / `password123`
  - `contestant@eventmanager.com` / `password123`
  - `tallymaster@eventmanager.com` / `password123`
  - `auditor@eventmanager.com` / `password123`
  - `board@eventmanager.com` / `password123`
  - `emcee@eventmanager.com` / `password123`

- Tests are designed to pass even when no data exists (empty states)
- Tests handle timing issues with appropriate waits and timeouts
- Tests use flexible selectors to accommodate UI changes

## Maintenance

When adding new features or pages:
1. Add corresponding tests to the appropriate role test file
2. Ensure tests follow the same structure and patterns
3. Update this documentation with new test coverage
4. Run tests to ensure they pass with the new features

