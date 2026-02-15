# Test Suite Documentation - Event Manager

This document provides a comprehensive overview of all test suites, what functionality they test, and how to run them.

## Table of Contents

1. [Test Types Overview](#test-types-overview)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [End-to-End (E2E) Tests](#end-to-end-e2e-tests)
5. [Running Tests](#running-tests)
6. [Test Configuration](#test-configuration)

---

## Test Types Overview

The Event Manager application has three types of tests:

| Test Type | Count | Purpose | Execution Time |
|-----------|-------|---------|----------------|
| **Unit Tests** | 154 tests | Test individual service methods in isolation | ~5-10 seconds |
| **Integration Tests** | 411 tests | Test API endpoints end-to-end with database | ~3-5 minutes |
| **E2E Tests** | 60 scenarios | Test full user workflows via browser | ~10-15 minutes |

**Total: 625+ tests**

---

## Unit Tests

**Location:** `tests/unit/`  
**Framework:** Jest  
**Purpose:** Test individual service methods with mocked dependencies

### Test Suites

#### 1. **EventService.test.ts** (35 tests)
Tests the `EventService` class methods:
- ✅ `createEvent()` - Event creation with validation
- ✅ `getEventById()` - Retrieving events by ID
- ✅ `getAllEvents()` - Listing all events with filters
- ✅ `getUpcomingEvents()` - Filtering upcoming events
- ✅ `getOngoingEvents()` - Filtering currently active events
- ✅ `getPastEvents()` - Filtering completed events
- ✅ `getActiveEvents()` - Filtering non-archived events
- ✅ `getArchivedEvents()` - Filtering archived events
- ✅ `updateEvent()` - Updating event details
- ✅ `deleteEvent()` - Deleting events
- ✅ `archiveEvent()` - Archiving events
- ✅ `unarchiveEvent()` - Unarchiving events
- ✅ `searchEvents()` - Searching events by name/description
- ✅ `getEventStats()` - Calculating event statistics
- ✅ Input validation and error handling
- ✅ Cache invalidation on updates

#### 2. **ContestService.test.ts** (26 tests)
Tests the `ContestService` class methods:
- ✅ `createContest()` - Contest creation
- ✅ `getContestById()` - Retrieving contests
- ✅ `getContestsByEvent()` - Filtering contests by event
- ✅ `updateContest()` - Updating contest details
- ✅ `deleteContest()` - Deleting contests
- ✅ `getContestStats()` - Contest statistics
- ✅ Validation and error handling

#### 3. **CategoryService.test.ts** (25 tests)
Tests the `CategoryService` class methods:
- ✅ `createCategory()` - Category creation
- ✅ `getCategoryById()` - Retrieving categories
- ✅ `getCategoriesByContest()` - Filtering by contest
- ✅ `updateCategory()` - Updating categories
- ✅ `deleteCategory()` - Deleting categories
- ✅ Score cap validation
- ✅ Validation and error handling

#### 4. **CacheService.test.ts** (All tests passed)
Tests the `CacheService` class methods:
- ✅ `get()` - Retrieving cached values
- ✅ `set()` - Setting cache values
- ✅ `del()` - Deleting cache entries
- ✅ `invalidatePattern()` - Pattern-based invalidation
- ✅ `exists()` - Checking cache existence
- ✅ `expire()` - Setting expiration
- ✅ `ttl()` - Getting time-to-live
- ✅ `flushAll()` - Clearing all cache
- ✅ `getStats()` - Cache statistics
- ✅ Redis fallback behavior

#### 5. **UserService.test.ts** (26/28 tests passed)
Tests the `UserService` class methods:
- ✅ `createUser()` - User creation
- ✅ `getUserById()` - Retrieving users
- ✅ `getAllUsers()` - Listing users
- ✅ `updateUser()` - Updating user details
- ✅ `deleteUser()` - Deleting users
- ✅ `changePassword()` - Password changes
- ✅ `deactivateUser()` - Deactivating users
- ✅ `activateUser()` - Activating users
- ✅ Validation and error handling

**Note:** 2 tests have known issues related to test setup, not production code.

---

## Integration Tests

**Location:** `tests/integration/`  
**Framework:** Jest + Supertest  
**Purpose:** Test API endpoints with real database connections

### Test Suites (48 files, 411 tests)

#### Authentication & Authorization (27 tests)
**File:** `auth.test.ts`
- ✅ `POST /api/auth/login` - User login
- ✅ `POST /api/auth/register` - User registration
- ✅ `POST /api/auth/logout` - User logout
- ✅ `POST /api/auth/forgot-password` - Password reset request
- ✅ `POST /api/auth/reset-password` - Password reset
- ✅ `POST /api/auth/refresh-token` - Token refresh
- ✅ `GET /api/auth/me` - Current user info
- ✅ JWT token validation
- ✅ Password hashing and validation
- ✅ Session management
- ✅ Invalid credentials handling
- ✅ Account lockout after failed attempts

#### User Management (27 tests)
**File:** `users.test.ts`
- ✅ `GET /api/users` - List all users
- ✅ `GET /api/users/:id` - Get user by ID
- ✅ `POST /api/users` - Create new user
- ✅ `PUT /api/users/:id` - Update user
- ✅ `DELETE /api/users/:id` - Delete user
- ✅ `PATCH /api/users/:id/activate` - Activate user
- ✅ `PATCH /api/users/:id/deactivate` - Deactivate user
- ✅ Role-based access control
- ✅ User search and filtering
- ✅ Pagination

#### Event Management (18 tests)
**File:** `events.test.ts`
- ✅ `GET /api/events` - List events
- ✅ `GET /api/events/:id` - Get event details
- ✅ `POST /api/events` - Create event
- ✅ `PUT /api/events/:id` - Update event
- ✅ `DELETE /api/events/:id` - Delete event
- ✅ `PATCH /api/events/:id/archive` - Archive event
- ✅ Event filtering (upcoming, ongoing, past, archived)
- ✅ Event search
- ✅ Date range filtering

#### Contest Management (10 tests)
**File:** `contests.test.ts`
- ✅ `GET /api/contests` - List contests
- ✅ `GET /api/contests/:id` - Get contest details
- ✅ `POST /api/contests` - Create contest
- ✅ `PUT /api/contests/:id` - Update contest
- ✅ `DELETE /api/contests/:id` - Delete contest
- ✅ Filtering contests by event

#### Category Management (8 tests)
**File:** `categories.test.ts`
- ✅ `GET /api/categories` - List categories
- ✅ `GET /api/categories/:id` - Get category details
- ✅ `POST /api/categories` - Create category
- ✅ `PUT /api/categories/:id` - Update category
- ✅ `DELETE /api/categories/:id` - Delete category
- ✅ Score cap validation

#### Scoring System (12 tests)
**File:** `scoring.test.ts`
- ✅ `POST /api/scores` - Submit score
- ✅ `GET /api/scores` - List scores
- ✅ `GET /api/scores/:id` - Get score details
- ✅ `PUT /api/scores/:id` - Update score
- ✅ `DELETE /api/scores/:id` - Delete score
- ✅ Judge assignment validation
- ✅ Score calculation
- ✅ Score validation (within cap)

#### Results Calculation (10 tests)
**File:** `results.test.ts`
- ✅ `GET /api/results` - Get results
- ✅ `GET /api/results/event/:eventId` - Event results
- ✅ `GET /api/results/contest/:contestId` - Contest results
- ✅ `GET /api/results/category/:categoryId` - Category results
- ✅ Result ranking calculation
- ✅ Tie-breaking logic

#### Administrative Functions (91 tests)
**Files:** `admin.test.ts`, `settings.test.ts`, `backup.test.ts`, `cache.test.ts`, `databaseBrowser.test.ts`, `logFiles.test.ts`

**Admin API (`admin.test.ts`):**
- ✅ `GET /api/admin/stats` - System statistics
- ✅ `GET /api/admin/dashboard` - Dashboard data
- ✅ `GET /api/admin/activity-logs` - Activity logs
- ✅ `GET /api/admin/email-logs` - Email logs
- ✅ `GET /api/admin/active-users` - Active users
- ✅ `GET /api/admin/database/tables` - Database tables
- ✅ `GET /api/admin/database/tables/:table/structure` - Table structure
- ✅ `GET /api/admin/database/tables/:table/data` - Table data
- ✅ `POST /api/admin/database/query` - Execute queries
- ✅ `GET /api/admin/test-connection` - Test connections

**Settings API (`settings.test.ts`):**
- ✅ `GET /api/settings` - Get all settings
- ✅ `GET /api/settings/:key` - Get setting by key
- ✅ `POST /api/settings` - Create setting
- ✅ `PUT /api/settings/:key` - Update setting
- ✅ `DELETE /api/settings/:key` - Delete setting
- ✅ `GET /api/settings/category/:category` - Get by category

**Backup API (`backup.test.ts`):**
- ✅ `POST /api/backup/create` - Create backup
- ✅ `GET /api/backup` - List backups
- ✅ `GET /api/backup/:id/download` - Download backup
- ✅ `POST /api/backup/:id/restore` - Restore backup
- ✅ `GET /api/backup/settings` - Backup settings
- ✅ `POST /api/backup/settings` - Configure backups

**Cache API (`cache.test.ts`):**
- ✅ `GET /api/cache/stats` - Cache statistics
- ✅ `POST /api/cache/clear` - Clear cache
- ✅ `POST /api/cache/invalidate` - Invalidate pattern

**Database Browser (`databaseBrowser.test.ts`):**
- ✅ Table listing
- ✅ Table structure viewing
- ✅ Table data browsing
- ✅ Query execution (SELECT only)

**Log Files (`logFiles.test.ts`):**
- ✅ `GET /api/log-files/files` - List log files
- ✅ `GET /api/log-files/:filename` - Get log file contents
- ✅ Log file filtering

#### Role-Specific Operations (78 tests)
**Files:** `roleAssignment.test.ts`, `assignments.test.ts`, `judges.test.ts`, `board.test.ts`, `tallyMaster.test.ts`, `emcee.test.ts`

**Role Assignments (`roleAssignment.test.ts`):**
- ✅ `POST /api/role-assignments` - Assign role
- ✅ `GET /api/role-assignments/user/:userId` - Get user roles
- ✅ `GET /api/role-assignments/role/:role` - Get users by role
- ✅ `DELETE /api/role-assignments/:id` - Remove role

**Judge Assignments (`assignments.test.ts`):**
- ✅ `POST /api/assignments` - Assign judge to category
- ✅ `GET /api/assignments` - List assignments
- ✅ `DELETE /api/assignments/:id` - Remove assignment

**Board Operations (`board.test.ts`):**
- ✅ `POST /api/board/approve-certification` - Approve certification
- ✅ `POST /api/board/reject-certification` - Reject certification
- ✅ `GET /api/board/pending-certifications` - Pending certifications

**Tally Master (`tallyMaster.test.ts`):**
- ✅ `POST /api/tally/certify` - Certify scores
- ✅ `POST /api/tally/uncertify` - Uncertify scores
- ✅ `GET /api/tally/pending` - Pending certifications

**Emcee (`emcee.test.ts`):**
- ✅ `GET /api/emcee/scripts` - Get scripts
- ✅ `POST /api/emcee/scripts` - Create script
- ✅ `PUT /api/emcee/scripts/:id` - Update script

#### Certification Workflows (58 tests)
**Files:** `certification.test.ts`, `auditorCertification.test.ts`, `categoryCertification.test.ts`, `contestCertification.test.ts`, `judgeContestantCertification.test.ts`, `judgeUncertification.test.ts`, `scoreRemoval.test.ts`

- ✅ Score certification process
- ✅ Auditor verification
- ✅ Category-level certification
- ✅ Contest-level certification
- ✅ Judge-contestant certification
- ✅ Uncertification workflows
- ✅ Score removal requests

#### Communication (31 tests)
**Files:** `notifications.test.ts`, `email.test.ts`, `sms.test.ts`

**Notifications (`notifications.test.ts`):**
- ✅ `GET /api/notifications` - Get notifications
- ✅ `POST /api/notifications` - Create notification
- ✅ `PUT /api/notifications/:id/read` - Mark as read
- ✅ `DELETE /api/notifications/:id` - Delete notification

**Email (`email.test.ts`):**
- ✅ `GET /api/email/templates` - List templates
- ✅ `POST /api/email/templates` - Create template
- ✅ `POST /api/email/send` - Send email
- ✅ `GET /api/email/logs` - Email logs

**SMS (`sms.test.ts`):**
- ✅ `GET /api/sms/settings` - SMS settings
- ✅ `POST /api/sms/send` - Send SMS
- ✅ `GET /api/sms/logs` - SMS logs

#### File & Template Management (69 tests)
**Files:** `templates.test.ts`, `fileManagement.test.ts`, `upload.test.ts`, `eventTemplate.test.ts`

- ✅ Template CRUD operations
- ✅ File upload handling
- ✅ File download
- ✅ File deletion
- ✅ Event template management

#### Data Management (57 tests)
**Files:** `archive.test.ts`, `export.test.ts`, `print.test.ts`, `advancedReporting.test.ts`, `reports.test.ts`, `winners.test.ts`, `tracker.test.ts`

- ✅ Data archiving
- ✅ Data export (CSV, JSON, Excel)
- ✅ Print report generation
- ✅ Advanced reporting
- ✅ Winner calculation
- ✅ Score tracking

#### System Operations (33 tests)
**Files:** `security.test.ts`, `audit.test.ts`, `performance.test.ts`

**Security (`security.test.ts`):**
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS prevention

**Audit (`audit.test.ts`):**
- ✅ `GET /api/audit/logs` - Audit logs
- ✅ Activity tracking
- ✅ Log filtering

**Performance (`performance.test.ts`):**
- ✅ Response time validation
- ✅ Load handling
- ✅ Cache performance

---

## End-to-End (E2E) Tests

**Location:** `tests/e2e/`  
**Framework:** Playwright  
**Purpose:** Test complete user workflows through browser automation

### Test Suites (10 files, 60 scenarios)

#### 1. **auth.e2e.test.ts** (8 scenarios)
- ✅ User login flow
- ✅ User logout flow
- ✅ Password reset flow
- ✅ Registration flow (if enabled)
- ✅ Invalid credentials handling
- ✅ Session persistence
- ✅ Token expiration handling

#### 2. **scoring.e2e.test.ts** (7 scenarios)
- ✅ Judge login
- ✅ Navigate to scoring page
- ✅ Select category
- ✅ Select contestant
- ✅ Enter scores
- ✅ Submit scores
- ✅ View submitted scores

#### 3. **admin.e2e.test.ts** (9 scenarios)
- ✅ Admin login
- ✅ Navigate to admin dashboard
- ✅ View system statistics
- ✅ View activity logs
- ✅ Manage users
- ✅ Configure settings
- ✅ View backups
- ✅ Database browser
- ✅ Log file viewer

#### 4. **contestant.e2e.test.ts** (6 scenarios)
- ✅ Contestant login
- ✅ View own scores
- ✅ View results
- ✅ View rankings
- ✅ View event information
- ✅ Profile management

#### 5. **eventManagement.e2e.test.ts** (6 scenarios)
- ✅ Create event
- ✅ Create contest
- ✅ Create category
- ✅ Assign judges
- ✅ View event details
- ✅ Archive event

#### 6. **reports.e2e.test.ts** (5 scenarios)
- ✅ Generate event report
- ✅ Generate contest report
- ✅ Generate category report
- ✅ Export reports (CSV, JSON)
- ✅ Print reports

#### 7. **certification.e2e.test.ts** (4 scenarios)
- ✅ Tally master certification flow
- ✅ Auditor verification flow
- ✅ Board approval flow
- ✅ Uncertification flow

#### 8. **board.e2e.test.ts** (3 scenarios)
- ✅ View pending certifications
- ✅ Approve certification
- ✅ Reject certification

#### 9. **tallyMaster.e2e.test.ts** (3 scenarios)
- ✅ View pending scores
- ✅ Certify scores
- ✅ Uncertify scores

#### 10. **auditor.e2e.test.ts** (3 scenarios)
- ✅ View certified scores
- ✅ Verify scores
- ✅ Report discrepancies

---

## Running Tests

### Quick Reference: Watch Mode Commands

| Test Type | Watch Command | Description |
|-----------|--------------|-------------|
| **Unit Tests** | `npm run test:watch` | Jest watch mode - auto-reruns on file changes |
| **Integration Tests** | `npm run test:watch -- tests/integration` | Jest watch mode for integration tests |
| **E2E Tests** | `npm run test:e2e:watch` | Playwright UI mode - interactive test runner |
| **E2E Tests (Remote)** | `npm run test:e2e:remote` | Run tests against remote servers (see Remote Testing section) |
| **E2E Tests (Terminal)** | `npm run test:e2e:verbose` | Terminal output showing test progress (for non-GUI servers) |
| **E2E Tests (Remote UI)** | `npm run test:e2e:ui:host` | UI mode accessible from remote browser |

### Prerequisites

1. **Database Setup:**
   ```bash
   # Ensure test database is configured
   export DATABASE_URL="postgresql://user:password@localhost:5432/event_manager_test"
   ```

2. **Environment Variables:**
   ```bash
   export NODE_ENV=test
   export JWT_SECRET=test-jwt-secret-key-for-testing
   ```

### Running All Tests

```bash
# Run all tests (unit + integration)
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Running Specific Test Types

#### Unit Tests Only
```bash
# Run all unit tests
npm run test:unit

# Run specific unit test file
npm run test:unit -- EventService.test.ts

# Run with coverage
npm run test:unit -- --coverage
```

#### Integration Tests Only
```bash
# Run all integration tests
npm run test:integration

# Run specific integration test file
npm run test:integration -- auth.test.ts

# Run with verbose output
npm run test:integration -- --verbose
```

#### E2E Tests Only
```bash
# Start the application server first
npm run dev

# In another terminal, run E2E tests
npm run test:e2e

# Run specific E2E test file
npm run test:e2e -- auth.e2e.test.ts

# Run E2E tests in headed mode (see browser)
npm run test:e2e -- --headed

# Run E2E tests with UI mode (interactive) - BEST FOR WATCHING TESTS
npm run test:e2e:watch
# OR
npm run test:e2e:ui
```

### Watching E2E Tests (Similar to `test:watch`)

**Recommended: Use Playwright UI Mode** (equivalent to Jest's watch mode):

```bash
# Start interactive UI mode - BEST OPTION
npm run test:e2e:watch
```

The UI mode provides:
- ✅ **Interactive test runner** - See all tests in a sidebar
- ✅ **Run individual tests** - Click to run specific tests
- ✅ **Real-time results** - See pass/fail status immediately
- ✅ **Rerun easily** - Click "Rerun" button for any test
- ✅ **Filter tests** - Search and filter by name
- ✅ **Time travel debugging** - Step through test execution
- ✅ **Screenshots & traces** - View on failure

**Alternative: Headed Mode** (see browser but no interactive UI):

```bash
# Run with visible browser
npm run test:e2e:headed
```

**Note:** Playwright doesn't have automatic file watching like Jest. The UI mode is the recommended way to watch and rerun e2e tests interactively.

### Terminal Output for E2E Tests (Non-GUI Servers)

For servers without a GUI, Playwright provides terminal reporters that show test progress:

```bash
# Default: List reporter (shows each test as it runs)
npm run test:e2e

# Verbose output (detailed test information)
npm run test:e2e:verbose

# Dot reporter (compact: shows dots for each test)
npm run test:e2e:dot

# With remote server
FRONTEND_URL=http://192.168.1.100:5173 SKIP_WEB_SERVER=true npm run test:e2e:verbose
```

**Reporter Types:**
- `list` - Shows each test file and test as it runs (default)
- `dot` - Compact output with dots (`.`) for passed tests
- `verbose` - Detailed output with test names and timing
- `html` - Generates HTML report (always included)

### Remote UI Mode (Access UI from Local Browser)

**Important:** Playwright UI mode requires HTTPS or localhost due to Service Worker browser restrictions. Direct IP access will fail with: `Service workers are not supported.`

**You MUST use SSH port forwarding for remote access:**

**On the server (non-GUI machine):**
```bash
# Start UI mode bound to all interfaces (automatically skips webServer)
# IMPORTANT: Set FRONTEND_URL to your actual frontend URL
# If served through Nginx on port 80:
FRONTEND_URL=http://192.168.80.246 npm run test:e2e:ui:host

# Or if using domain name:
FRONTEND_URL=http://conmgr.com npm run test:e2e:ui:host

# Or with remote application servers
FRONTEND_URL=http://192.168.1.100 BACKEND_URL=http://192.168.1.100:3000 npm run test:e2e:ui:host

# Or manually specify host and port
SKIP_WEB_SERVER=true FRONTEND_URL=http://192.168.80.246 playwright test --ui --ui-host=0.0.0.0 --ui-port=9323
```

**Note:** 
- The `test:e2e:ui:host` script automatically sets `SKIP_WEB_SERVER=true` to prevent webServer startup errors when using remote servers.
- **You MUST set `FRONTEND_URL`** to point to where your frontend server is actually running.
- If frontend is served through Nginx on port 80, use `http://192.168.80.246` (port 80 is default).
- If frontend dev server is running on port 5173, use `http://192.168.80.246:5173`.
- If `FRONTEND_URL` is not set, tests will try to connect to `http://localhost:5173` which won't work if servers aren't running locally.

**On your local machine:**
1. Note the port shown in server terminal (e.g., `Listening on http://0.0.0.0:34129`)
2. **Create SSH tunnel (REQUIRED):**
   ```bash
   ssh -L 9323:localhost:34129 mat@192.168.80.246
   ```
3. Keep the SSH tunnel terminal open
4. Open `http://localhost:9323` in your local browser
5. The Playwright UI will work correctly via localhost

**Why SSH Tunnel is Required:**
- Playwright UI uses Service Workers which browsers only allow over HTTPS or localhost
- Direct IP access (`http://192.168.80.246:34129`) violates this security restriction
- SSH tunnel makes the connection appear as localhost, satisfying the requirement

**Troubleshooting Blank Page:**

The server is accessible (curl works), but browser shows blank page. This is due to **Service Worker restrictions**:

**Error:** `Service workers are not supported. Make sure to serve the website via HTTPS or localhost.`

**Root Cause:**
- Playwright UI mode uses Service Workers for functionality
- Browsers only allow Service Workers over HTTPS or localhost (security restriction)
- Accessing via IP address (http://192.168.80.246:34129) doesn't meet this requirement

**Solution: Use SSH Tunnel (Required for Remote Access)**

Since Service Workers require localhost, you MUST use SSH port forwarding:

**On your local machine:**
```bash
# Create SSH tunnel (replace 34129 with actual Playwright port from server)
ssh -L 9323:localhost:34129 mat@192.168.80.246

# Keep this terminal open, then in your browser:
# Open http://localhost:9323
```

This makes the connection appear as localhost, satisfying the Service Worker requirement.

**Alternative: Use HTTPS (More Complex)**

If you need direct IP access, you'd need to:
1. Set up HTTPS with valid certificate
2. Configure Playwright to use HTTPS
3. Access via `https://192.168.80.246:34129`

However, SSH tunnel is much simpler and recommended.

**Troubleshooting "Process from config.webServer exited early" Error:**

This error occurs when Playwright tries to start the backend/frontend servers but they fail. Solutions:

1. **If using remote servers (most common):**
   ```bash
   # Set FRONTEND_URL to your remote server (port 80 if served through Nginx)
   FRONTEND_URL=http://192.168.80.246 npm run test:e2e:ui:host
   
   # Or manually:
   SKIP_WEB_SERVER=true FRONTEND_URL=http://192.168.80.246 npm run test:e2e:ui:host
   ```

2. **If servers should be running locally, check:**
   - Backend server is accessible: `curl http://localhost:3000/health`
   - Frontend server is accessible: `curl http://localhost:5173`
   - Ports are not already in use
   - Database is accessible and configured
   - Check terminal output for specific error messages

3. **"No tests found" message:**
   - This is normal if webServer failed - tests can't run without servers
   - Once webServer error is fixed, tests will appear
   - Ensure test files exist in `tests/e2e/` directory

**Troubleshooting "ERR_CONNECTION_REFUSED" Error:**

This error means tests can't connect to the frontend server:

1. **Set FRONTEND_URL environment variable:**
   ```bash
   # If frontend is served through Nginx on port 80 (production):
   FRONTEND_URL=http://192.168.80.246 npm run test:e2e:ui:host
   
   # Or if using domain name:
   FRONTEND_URL=http://conmgr.com npm run test:e2e:ui:host
   
   # If frontend dev server is running on port 5173:
   FRONTEND_URL=http://192.168.80.246:5173 npm run test:e2e:ui:host
   ```

2. **Verify frontend server is running:**
   ```bash
   # Test connectivity (port 80 is default)
   curl http://192.168.80.246
   
   # Or if dev server on 5173:
   curl http://192.168.80.246:5173
   ```

3. **Check how frontend is served:**
   - **Production:** Usually served through Nginx on port 80 (no port number needed)
   - **Development:** Vite dev server on port 5173
   - Check Nginx config: `cat /etc/nginx/sites-available/event-manager`
   - Check if Vite is running: `ps aux | grep vite`

**Firewall Configuration:**
```bash
# Allow Playwright UI port (default: 9323, shown in terminal)
sudo ufw allow 9323/tcp

# Or check what port Playwright is using
netstat -tlnp | grep playwright
```

**Example:**
```bash
# Server terminal shows:
#   UI Mode started at http://0.0.0.0:9323

# From local machine browser, access:
#   http://192.168.1.100:9323
```

### Running E2E Tests from a Different Machine

You can run e2e tests from a different machine than where the application servers are running. This is useful for:
- Testing against staging/production environments
- Distributed testing setups
- CI/CD pipelines where servers run on different hosts

#### Prerequisites

1. **Application servers must be running** on the remote machine:
   - Backend server (default: port 3000)
   - Frontend server (default: port 5173)

2. **Network access** from test machine to application servers:
   - Ensure firewall allows connections
   - Backend must be accessible (e.g., `http://192.168.1.100:3000`)
   - Frontend must be accessible (e.g., `http://192.168.1.100:5173`)

3. **CORS configuration** (if testing cross-origin):
   - Backend must allow requests from test machine's origin
   - Check `CORS_ORIGINS` environment variable on server

#### Method 1: Using Environment Variables (Recommended)

```bash
# Set remote server URLs
export BACKEND_URL=http://192.168.1.100:3000
export FRONTEND_URL=http://192.168.1.100:5173
export SKIP_WEB_SERVER=true

# Run tests
npm run test:e2e:remote

# Or with UI mode
FRONTEND_URL=http://192.168.1.100:5173 SKIP_WEB_SERVER=true npm run test:e2e:watch
```

#### Method 2: Using the Remote Script

```bash
# Quick command (uses default localhost URLs)
BACKEND_URL=http://192.168.1.100:3000 FRONTEND_URL=http://192.168.1.100:5173 npm run test:e2e:remote
```

#### Method 3: One-Line Command

```bash
# All in one command
BACKEND_URL=http://192.168.1.100:3000 FRONTEND_URL=http://192.168.1.100:5173 SKIP_WEB_SERVER=true npm run test:e2e
```

#### Configuration Details

**Environment Variables:**
- `BACKEND_URL` - Backend server URL (default: `http://localhost:3000`)
- `FRONTEND_URL` - Frontend server URL (default: `http://localhost:5173`)
- `SKIP_WEB_SERVER` - Set to `true` to skip starting servers locally

**Example Scenarios:**

```bash
# Test against staging server
BACKEND_URL=https://staging.example.com FRONTEND_URL=https://staging.example.com SKIP_WEB_SERVER=true npm run test:e2e

# Test against local network server
BACKEND_URL=http://192.168.1.100:3000 FRONTEND_URL=http://192.168.1.100:5173 SKIP_WEB_SERVER=true npm run test:e2e:ui

# Test specific test file against remote server
FRONTEND_URL=http://192.168.1.100:5173 SKIP_WEB_SERVER=true npm run test:e2e -- auth.e2e.test.ts
```

#### Troubleshooting Remote Testing

**Connection Issues:**
```bash
# Test connectivity to backend
curl http://192.168.1.100:3000/health

# Test connectivity to frontend
curl http://192.168.1.100:5173
```

**CORS Errors:**
- Ensure backend `CORS_ORIGINS` includes test machine's origin
- Check backend logs for CORS rejection messages

**Timeout Issues:**
- Increase timeout in `playwright.config.ts` if network is slow
- Ensure servers are accessible from test machine

**Firewall Configuration:**
```bash
# On server machine, allow connections (example for Ubuntu)
sudo ufw allow 3000/tcp  # Backend
sudo ufw allow 5173/tcp  # Frontend
```

### Running Specific Test Suites

```bash
# Run tests matching a pattern
npm test -- --testNamePattern="Auth"

# Run tests in a specific file
npm test -- auth.test.ts

# Run tests matching a describe block
npm test -- --testNamePattern="should successfully login"
```

### Running Tests in Parallel

```bash
# Run tests in parallel (default)
npm test -- --maxWorkers=4

# Run tests sequentially
npm test -- --runInBand
```

### Debugging Tests

```bash
# Run tests with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run tests with verbose output
npm test -- --verbose

# Run tests and show console output
npm test -- --verbose --no-coverage
```

### Test Coverage

```bash
# Generate coverage report
npm test -- --coverage

# View coverage report
open coverage/lcov-report/index.html

# Coverage thresholds (configured in jest.config.js)
# - Statements: 80%
# - Branches: 75%
# - Functions: 80%
# - Lines: 80%
```

---

## Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts'
  ],
  coverageThresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  }
}
```

### Playwright Configuration (`playwright.config.ts`)

```typescript
{
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120000
  }
}
```

### Test Database

Tests use a separate test database to avoid affecting production data:
- **Database:** `event_manager_test`
- **Auto-cleanup:** Tests clean up after themselves
- **Isolation:** Each test suite runs in isolation

### Test Data

Test data is created and cleaned up automatically:
- **Prefixes:** Test data uses specific prefixes (e.g., `@authtest.com`, `test-event-`)
- **Cleanup:** `beforeAll` and `afterAll` hooks handle cleanup
- **Isolation:** Each test suite uses unique test data

---

## Test Results Summary

### Latest Test Run (2025-11-07)

| Test Type | Total | Passed | Failed | Pass Rate |
|-----------|-------|--------|--------|-----------|
| Unit Tests | 154 | 152 | 2 | 98.7% |
| Integration Tests | 411 | 411 | 0 | 100% |
| E2E Tests | 60 | N/A* | N/A* | N/A* |
| **TOTAL** | **625** | **563** | **2** | **99.7%** |

*E2E tests require manual execution with running server

### Known Issues

1. **UserService.test.ts** - 2 tests fail due to test setup issues (not production code)
   - `createUser › should create user with valid data`
   - `changePassword › should change password successfully`

---

## Continuous Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:e2e
```

---

## Best Practices

1. **Write tests before fixing bugs** - Helps prevent regressions
2. **Keep tests isolated** - Each test should be independent
3. **Use descriptive test names** - Makes failures easier to understand
4. **Clean up test data** - Always clean up in `afterAll` hooks
5. **Mock external dependencies** - Unit tests should be fast and isolated
6. **Test error cases** - Don't just test happy paths
7. **Keep tests up to date** - Update tests when code changes

---

## Additional Resources

- **Test Examples:** `tests/examples/complete-auth-test.example.ts`
- **Test Helpers:** `tests/helpers/seedData.ts`
- **Test Results:** `TEST_RESULTS_2025-11-07.md`
- **Jest Documentation:** https://jestjs.io/
- **Playwright Documentation:** https://playwright.dev/


