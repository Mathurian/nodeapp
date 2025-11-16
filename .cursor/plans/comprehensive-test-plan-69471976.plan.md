<!-- 69471976-b094-44d2-a91c-bf22ec79708b ff62f2bc-80f7-48e6-a8e0-ab4c425cd874 -->
# Event Manager Comprehensive Test Plan

## Overview

This test plan covers all configured views, functionality, and capabilities of the Event Manager application to ensure current-state functionality is operational.

## Test Environment

- **Application URL**: http://192.168.80.246
- **Test Roles**: ADMIN, ORGANIZER, BOARD, JUDGE, CONTESTANT, EMCEE, TALLY_MASTER, AUDITOR
- **Browser**: Playwright automation

## 1. Authentication & Authorization Testing

### 1.1 Login Functionality

- Test login with valid credentials for each role
- Test login with invalid credentials
- Test password visibility toggle
- Verify JWT token storage
- Test session timeout
- Test logout functionality

### 1.2 Role-Based Access Control

- Verify ADMIN has access to all features (wildcard permission)
- Verify ORGANIZER permissions: events, contests, categories, users, reports, templates, settings, backup, emcee
- Verify BOARD permissions: read-only access to events/contests, full results/reports/approvals access
- Verify JUDGE permissions: scoring, commentary, read-only event data
- Verify CONTESTANT permissions: view events/contests/categories/results, manage profile
- Verify EMCEE permissions: view data, create announcements
- Verify TALLY_MASTER permissions: full score/results management
- Verify AUDITOR permissions: read-only access to all data, audit logs

## 2. Dashboard Testing (Route: `/dashboard`)

### 2.1 Role-Specific Dashboards

- **ADMIN/ORGANIZER/BOARD**: System overview, stats, quick actions
- **JUDGE**: Assigned categories, scoring status
- **CONTESTANT**: Registered events, scores, results
- **EMCEE**: Event schedule, announcements
- **TALLY_MASTER**: Score certification workflow
- **AUDITOR**: Audit logs, certification status

### 2.2 Dashboard Components

- System status indicators (WebSocket, Database, API)
- Statistics cards (users, events, contests, categories)
- Quick action buttons
- Recent activity feed
- Real-time updates via WebSocket

## 3. Events Management (Route: `/events`)

### 3.1 Event CRUD Operations

- **Create Event**: Test form validation (name, dates, location, maxContestants)
- **Read Events**: List view with pagination, search, filters
- **Update Event**: Edit existing event details
- **Delete Event**: Remove event with confirmation
- **Archive Event**: Move event to archive

### 3.2 Event Features

- Event status management (DRAFT, ACTIVE, COMPLETED, ARCHIVED)
- Location field
- Max contestants limit
- Start/end date validation
- Contest association
- Event templates

## 4. Contests Management (Route: `/events/:eventId/contests`)

### 4.1 Contest CRUD Operations

- Create contest within event
- List contests for event
- Update contest details
- Delete contest
- Contest type selection

### 4.2 Contest Features

- Category association
- Contestant registration
- Judge assignments
- Contest status tracking

## 5. Categories Management (Route: `/contests/:contestId/categories`)

### 5.1 Category CRUD Operations

- Create category with criteria
- Update category details
- Delete category
- Category templates

### 5.2 Criteria Management

- Add/edit/delete scoring criteria
- Set max scores per criterion
- Define time limits
- Weight/priority settings

### 5.3 Category Templates

- Create reusable templates
- Apply templates to contests
- Custom category types
- Template library

## 6. Scoring Interface (Route: `/scoring`)

### 6.1 Judge Scoring

- Select category and contestant
- Score each criterion
- Add commentary per score
- Submit scores
- Edit submitted scores
- Delete scores (with approval workflow)
- Timer functionality for timed criteria

### 6.2 Score Certification

- Judge certification
- Tally Master certification
- Auditor final certification
- Multi-signature workflow

### 6.3 Deduction Management

- Request point deductions
- Multi-role approval workflow (Head Judge, Tally Master, Auditor, Board)
- Approve/reject deductions
- Deduction history

## 7. Results & Winners (Routes: `/results`, `/winners`)

### 7.1 Results Display

- View results by category
- View results by contest
- View results by event
- Contestant-specific results
- Real-time score updates

### 7.2 Winners Management

- Calculate winners per category
- Certification workflow
- Board signature requirement
- Winner announcements
- Winner certificates

## 8. User Management (Route: `/users`)

### 8.1 User CRUD Operations

- Create user with role assignment
- Update user profile
- Delete user
- Reset password
- Bulk user operations

### 8.2 User Features

- Role filtering (ADMIN, ORGANIZER, JUDGE, CONTESTANT, etc.)
- Status filtering (Active/Inactive)
- Search functionality
- User image upload
- Bio field
- Last login tracking

### 8.3 Bulk Operations

- CSV import/export
- Bulk user creation
- Bulk user deletion
- Template download

## 9. Admin Dashboard (Route: `/admin`)

### 9.1 Admin Tabs

- **Overview**: System health, stats, database info
- **Activity Logs**: User actions, filters, search
- **Security**: Security features, recommendations, status
- **Backup**: Create/restore/download/delete backups
- **System**: System tests (database, email, backup)
- **Settings**: System configuration
- **Emcee Scripts**: Upload/manage/toggle scripts

### 9.2 Admin Features

- System statistics
- Active users monitoring
- Database size tracking
- Performance metrics
- Certification counts
- Connection testing

## 10. Emcee Management (Route: `/emcee`)

### 10.1 Script Management

- Upload emcee scripts
- Edit script details
- Delete scripts
- Toggle script active status
- View script history

### 10.2 Emcee Features

- Event schedule view
- Category progression
- Contestant information
- Announcement creation

## 11. Templates Management (Route: `/templates`)

### 11.1 Template Types

- Category templates
- Contest templates
- Event templates
- Email templates
- Print templates

### 11.2 Template Operations

- Create template
- Edit template
- Delete template
- Apply template
- Template usage history

## 12. Reports & Analytics (Route: `/reports`)

### 12.1 Report Types

- Event reports
- Contest results reports
- Judge performance reports
- Contestant reports
- Audit reports

### 12.2 Export Formats

- PDF generation
- Excel export
- CSV export
- Print functionality

### 12.3 Report Features

- Date range filtering
- Custom report parameters
- Scheduled reports
- Report templates

## 13. Settings (Route: `/settings`)

### 13.1 Settings Categories

- General settings
- Email configuration
- Security settings
- Database settings
- Notification settings
- Backup settings
- Password policy

### 13.2 Settings Features

- SMTP configuration
- Security feature toggles
- Session timeout configuration
- JWT expiration settings
- Theme customization

## 14. Profile Management (Route: `/profile`)

### 14.1 Profile Features

- Update personal information
- Change password
- Upload profile image
- Update bio
- View activity history
- Notification preferences

## 15. Archive Management

### 15.1 Archive Operations

- Archive events
- Restore archived events
- Delete archived items
- View archive history
- Archive search/filter

## 16. File Management

### 16.1 File Operations

- Upload files (images, documents, scripts)
- File type validation
- File size limits
- Delete files
- View file metadata

### 16.2 File Types

- User images
- Emcee scripts
- Event documents
- Report exports
- Backup files

## 17. Real-Time Features

### 17.1 WebSocket Functionality

- Real-time score updates
- Live notifications
- Connection status indicator
- Automatic reconnection
- Event broadcasting

### 17.2 Notifications

- In-app notifications
- Email notifications
- SMS notifications (if configured)
- Notification preferences

## 18. Security Features

### 18.1 Security Mechanisms

- CSRF protection
- Rate limiting
- Session security
- Input validation
- SQL injection protection
- XSS protection

### 18.2 Security Testing

- Test rate limiting thresholds
- Verify CSRF token validation
- Test input sanitization
- Verify SQL parameterization

## 19. Backup & Recovery

### 19.1 Backup Operations

- Manual backup creation
- Scheduled backups
- Backup download
- Backup restoration
- Backup deletion

### 19.2 Backup Types

- Full database backup
- Incremental backups
- File system backups
- Configuration backups

## 20. Certification Workflows

### 20.1 Score Certification

- Judge certification
- Tally Master certification
- Auditor certification
- Multi-signature requirements

### 20.2 Winner Certification

- Category winner certification
- Board signature requirement
- Certification status tracking

## 21. Integration Testing

### 21.1 API Integration

- Test all REST endpoints
- Verify authentication headers
- Test error responses
- Verify data consistency

### 21.2 Database Integration

- Test CRUD operations
- Verify transactions
- Test foreign key constraints
- Verify data integrity

## 22. UI/UX Testing

### 22.1 Responsive Design

- Test on desktop (1920x1080, 1366x768)
- Test on tablet (768x1024)
- Test on mobile (375x667)

### 22.2 Theme Testing

- Light mode functionality
- Dark mode functionality
- Theme toggle
- Color consistency

### 22.3 Accessibility

- Keyboard navigation
- Screen reader compatibility
- ARIA labels
- Focus indicators

## 23. Performance Testing

### 23.1 Load Testing

- Test with 100+ events
- Test with 1000+ users
- Test with 10000+ scores
- Pagination performance

### 23.2 Response Times

- Page load times < 2s
- API response times < 500ms
- Search/filter response < 1s

## Test Execution Strategy

### Phase 1: Critical Path Testing (Priority: HIGH)

1. Authentication & login
2. Dashboard loading
3. Events CRUD
4. Users CRUD
5. Scoring functionality
6. Results display

### Phase 2: Feature Testing (Priority: MEDIUM)

1. Templates management
2. Reports generation
3. Admin features
4. Emcee management
5. Archive operations

### Phase 3: Advanced Features (Priority: LOW)

1. Bulk operations
2. File management
3. Certification workflows
4. Real-time features
5. Backup/restore

### Phase 4: Non-Functional Testing

1. Performance testing
2. Security testing
3. Accessibility testing
4. Responsive design testing

## Test Data Requirements

- 7 test users (one per role)
- 10+ sample events
- 20+ contests
- 50+ categories
- 100+ contestants
- 500+ scores
- Multiple templates
- Archive data

## Expected Outcomes

- All CRUD operations functional
- Role-based permissions enforced correctly
- No console errors
- No broken links
- All forms validate properly
- Data persists correctly
- Real-time updates work
- Export functions generate valid files
- Backup/restore operations successful

## Test Tools

- Playwright for browser automation
- Manual testing for UX validation
- Network monitoring for API testing
- Database queries for data verification

### To-dos

- [ ] Test authentication and role-based access for all 8 user roles
- [ ] Test dashboard loading and role-specific content for each role
- [ ] Test Events CRUD operations (create, read, update, delete, archive)
- [ ] Test Users CRUD operations and bulk import/export
- [ ] Test scoring interface, score submission, and certification workflow
- [ ] Test results display by category, contest, event, and contestant
- [ ] Test template creation, editing, deletion, and application
- [ ] Test report generation in PDF, Excel, and CSV formats
- [ ] Test all admin tabs (Overview, Logs, Security, Backup, System, Settings)
- [ ] Test emcee script upload, management, and toggle functionality
- [ ] Test archive operations (archive, restore, delete, search)
- [ ] Test bulk user operations (CSV import, bulk delete, template download)
- [ ] Test file upload, validation, deletion for all file types
- [ ] Test multi-signature certification workflows for scores and winners
- [ ] Test WebSocket connectivity, real-time updates, and notifications
- [ ] Test backup creation, download, restoration, and deletion
- [ ] Test page load times, API response times, and pagination with large datasets
- [ ] Test CSRF protection, rate limiting, input validation, and XSS/SQL injection prevention
- [ ] Test keyboard navigation, screen reader compatibility, and ARIA labels
- [ ] Test responsive design on desktop, tablet, and mobile viewports