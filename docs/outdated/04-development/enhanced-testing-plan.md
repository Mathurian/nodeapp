# Enhanced Testing Plan

**Date:** November 12, 2025
**Author:** Claude Code (Sonnet 4.5)
**Project:** Event Manager Contest System
**Status:** Implementation Roadmap

---

## Executive Summary

This document provides a comprehensive testing strategy to increase code coverage from the current ~45% to the target 80%+ across all application layers. The plan addresses critical testing gaps while building on the existing robust integration and E2E testing foundation.

### Current State

| Test Type | Current | Target | Gap | Priority |
|-----------|---------|--------|-----|----------|
| Unit Tests (Services) | 11/75 (15%) | 60/75 (80%) | 49 tests | 🔴 Critical |
| Unit Tests (Controllers) | 0/64 (0%) | 48/64 (75%) | 48 tests | 🔴 Critical |
| Unit Tests (Middleware) | 1/18 (6%) | 14/18 (80%) | 13 tests | 🟡 High |
| Integration Tests | ~50 (78%) | ~55 (85%) | ~5 tests | 🟢 Medium |
| E2E Tests | ~18 (70%) | ~25 (85%) | ~7 tests | 🟢 Medium |
| Frontend Component Tests | 22/71 (31%) | 57/71 (80%) | 35 tests | 🔴 Critical |
| **Overall Coverage** | **~45%** | **80%+** | **157+ tests** | **🔴 Critical** |

### Strategic Approach

1. **Phase 1 (Weeks 1-2):** High-value service unit tests (40 tests)
2. **Phase 2 (Weeks 3-4):** Critical controller unit tests (30 tests)
3. **Phase 3 (Weeks 5-6):** Frontend component tests (35 tests)
4. **Phase 4 (Weeks 7-8):** Middleware and integration test gap closure (18 tests)
5. **Phase 5 (Weeks 9-10):** E2E coverage expansion and coverage verification

**Total Estimated Effort:** 160-200 hours over 10 weeks

---

## 1. Current Testing Infrastructure Review

### 1.1 Strengths

**Excellent Foundation:**
- ✅ Jest configured with comprehensive coverage thresholds
- ✅ Playwright configured for E2E testing
- ✅ Test helper utilities well-established
- ✅ Integration tests cover ~78% of API endpoints
- ✅ E2E tests cover major user workflows
- ✅ Load testing infrastructure available (Artillery)

**Well-Designed Test Helpers:**
- seedData.ts - Database seeding
- databaseHelpers.ts - Database operations
- mockData.ts - Mock data generation
- authHelpers.ts - Authentication utilities
- apiHelpers.ts - API testing utilities

**Configuration Quality:**
```javascript
// jest.config.js highlights
- Coverage thresholds: 80% global, 85% services
- Path aliases configured
- Proper timeout settings (30s)
- Force exit enabled for cleanup
- Detect open handles for debugging
```

### 1.2 Critical Gaps

**Unit Test Coverage:**
- Only 11 service unit tests (15% of 75 services)
- Zero controller unit tests (0% of 64 controllers)
- Minimal middleware unit tests (6% of 18 middleware)
- Limited frontend component tests (31% of 71+ components)

**Missing Test Categories:**
- Repository layer unit tests
- Utility function tests
- Hook tests (frontend)
- Context tests (frontend)
- Error boundary tests
- Custom validation tests

### 1.3 Test Distribution Analysis

**Existing Tests (102 total):**
```
tests/
├── unit/
│   ├── services/ (11 tests) ✅ Good quality, needs expansion
│   └── middleware/ (1 test) ⚠️ Critically low
├── integration/ (50 tests) ✅ Excellent coverage
├── e2e/ (18 tests) ✅ Good workflow coverage
│   └── comprehensive/ (7 tests) ✅ Advanced scenarios
├── load/ (1 test) ✅ Performance baseline
└── helpers/ (10 files) ✅ Well-organized utilities
```

**Frontend Tests (22 total):**
- Scattered component tests
- No systematic test coverage
- Missing context provider tests
- Missing custom hook tests

---

## 2. Testing Gaps Analysis

### 2.1 Backend Service Testing Gaps

**Services With Unit Tests (11):** ✅
1. AdminService.test.ts
2. CacheService.test.ts
3. CategoryService.test.ts
4. ContestService.test.ts
5. EventService.test.ts
6. JudgeContestantCertificationService.test.ts
7. SettingsService.test.ts
8. TallyMasterService.test.ts
9. UserService.test.ts
10. SecretManager.test.ts
11. LocalSecretStore.test.ts

**High-Priority Services Needing Tests (30):** 🔴

**Tier 1 - Core Business Logic (10 tests):**
1. ScoringService - Critical scoring calculations
2. ResultsService - Results processing
3. WinnerService - Winner determination
4. AssignmentService - Assignment logic
5. CertificationService - Certification workflows
6. AuthService - Authentication/authorization
7. ContestService - Additional test scenarios
8. CategoryService - Additional test scenarios
9. EventService - Additional test scenarios
10. UserService - Additional test scenarios

**Tier 2 - Advanced Features (10 tests):**
11. BulkOperationService - Bulk operations orchestration
12. CSVService - CSV parsing and generation
13. CustomFieldService - Custom field management
14. EmailTemplateService - Template processing
15. NotificationService - Notification dispatch
16. QueueService - Job queue management
17. EventBusService - Event handling
18. BackupMonitoringService - Backup monitoring
19. HealthCheckService - Health checks
20. MetricsService - Metrics collection

**Tier 3 - Specialized Services (10 tests):**
21. CategoryCertificationService
22. ContestCertificationService
23. AuditorCertificationService
24. JudgeUncertificationService
25. BulkCertificationResetService
26. AdvancedReportingService
27. ReportGenerationService
28. FileService
29. VirusScanService
30. EmailService

**Medium-Priority Services (19 tests):** 🟡
31. ReportExportService
32. ReportTemplateService
33. PrintService
34. ExportService
35. RedisCacheService
36. PerformanceService
37. FileBackupService
38. FileManagementService
39. UploadService
40. ScoreFileService
41. SMSService
42. EmceeService
43. AuditorService
44. BoardService
45. JudgeService
46. BioService
47. CommentaryService
48. DeductionService
49. RestrictionService

**Lower-Priority Services (15 tests):** 🟢
50-64. Remaining specialized services

### 2.2 Controller Testing Gaps

**Controllers Needing Unit Tests (48 high-priority):** 🔴

**Tier 1 - Core Controllers (15):**
1. authController - Authentication flows
2. usersController - User CRUD
3. eventsController - Event management
4. contestsController - Contest management
5. categoriesController - Category management
6. scoringController - Scoring operations
7. resultsController - Results processing
8. winnersController - Winner selection
9. assignmentsController - Assignment management
10. certificationController - Certification workflows
11. adminController - Admin operations
12. settingsController - Settings management
13. reportsController - Report generation
14. uploadController - File uploads
15. notificationsController - Notifications

**Tier 2 - Advanced Controllers (15):**
16. BulkUserController
17. BulkEventController
18. BulkContestController
19. BulkAssignmentController
20. CustomFieldController
21. EmailTemplateController
22. categoryCertificationController
23. contestCertificationController
24. auditorCertificationController
25. judgeContestantCertificationController
26. advancedReportingController
27. backupController
28. BackupAdminController
29. cacheController
30. cacheAdminController

**Tier 3 - Specialized Controllers (18):**
31. emceeController
32. tallyMasterController
33. auditorController
34. boardController
35. judgeController
36. bioController
37. commentaryController
38. deductionController
39. restrictionController
40. trackerController
41. performanceController
42. exportController
43. printController
44. logFilesController
45. databaseBrowserController
46. virusScanAdminController
47. scoreFileController
48. bulkCertificationResetController

### 2.3 Middleware Testing Gaps

**Middleware Needing Unit Tests (13):** 🟡

**High Priority (7):**
1. permissions.ts - RBAC logic
2. rateLimiting.ts - Rate limit enforcement
3. csrf.ts - CSRF protection
4. errorHandler.ts - Error handling
5. validation.ts - Input validation
6. virusScanMiddleware.ts - Virus scanning
7. cacheMiddleware.ts - Caching logic

**Medium Priority (6):**
8. adminOnly.ts - Admin access control
9. assignmentValidation.ts - Assignment validation
10. passwordValidation.ts - Password strength
11. requestLogger.ts - Request logging
12. metrics.ts - Metrics collection
13. queryMonitoring.ts - Query monitoring

**Already Tested (1):**
- auth.ts ✅

### 2.4 Frontend Testing Gaps

**Components Needing Tests (35 high-priority):** 🔴

**Tier 1 - Core UI Components (12):**
1. Layout.tsx
2. DataTable.tsx
3. ResponsiveDataTable.tsx
4. Pagination.tsx
5. SearchFilter.tsx
6. FormField.tsx
7. Modal.tsx
8. ErrorBoundary.tsx
9. ProtectedRoute.tsx
10. RoleProtectedRoute.tsx
11. LoadingSpinner.tsx
12. Tooltip.tsx

**Tier 2 - Feature Components (12):**
13. CertificationWorkflow.tsx
14. CategoryCertificationView.tsx
15. ContestCertificationView.tsx
16. FileUpload.tsx
17. BackupManager.tsx
18. SecurityDashboard.tsx
19. AuditLog.tsx
20. ActiveUsers.tsx
21. RealTimeNotifications.tsx
22. BulkActionToolbar.tsx
23. BulkImportModal.tsx
24. PasswordStrengthMeter.tsx

**Tier 3 - Page Components (11):**
25. LoginPage.tsx
26. EventsPage.tsx
27. ContestsPage.tsx
28. CategoriesPage.tsx
29. UsersPage.tsx
30. ScoringPage.tsx
31. ResultsPage.tsx
32. ReportsPage.tsx
33. SettingsPage.tsx
34. AdminPage.tsx
35. NotificationsPage.tsx

**Contexts Needing Tests (4):** 🟡
1. AuthContext.tsx
2. ThemeContext.tsx
3. SocketContext.tsx
4. ToastContext.tsx

**Hooks Needing Tests (7):** 🟡
1. useErrorHandler.ts
2. usePermissions.ts
3. useOnlineStatus.ts
4. useKeyboardShortcut.ts
5. useDisplayName.ts
6. useAppTitle.ts
7. useA11y.ts

---

## 3. Testing Strategy & Patterns

### 3.1 Service Testing Pattern

**Template for Service Unit Tests:**

```typescript
// tests/unit/services/ExampleService.test.ts
import { container } from 'tsyringe';
import { ExampleService } from '@/services/ExampleService';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

describe('ExampleService', () => {
  let service: ExampleService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    // Create mock Prisma client
    prismaMock = mockDeep<PrismaClient>();

    // Register mock in container
    container.registerInstance(PrismaClient, prismaMock);

    // Resolve service with mocked dependencies
    service = container.resolve(ExampleService);
  });

  afterEach(() => {
    mockReset(prismaMock);
    container.clearInstances();
  });

  describe('methodName', () => {
    it('should handle successful operation', async () => {
      // Arrange
      const input = { /* test data */ };
      const expectedOutput = { /* expected result */ };
      prismaMock.model.method.mockResolvedValue(expectedOutput);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(expectedOutput);
      expect(prismaMock.model.method).toHaveBeenCalledWith(
        expect.objectContaining(input)
      );
    });

    it('should handle error conditions', async () => {
      // Arrange
      const error = new Error('Database error');
      prismaMock.model.method.mockRejectedValue(error);

      // Act & Assert
      await expect(service.methodName({})).rejects.toThrow('Database error');
    });

    it('should validate input', async () => {
      // Arrange
      const invalidInput = { /* invalid data */ };

      // Act & Assert
      await expect(service.methodName(invalidInput)).rejects.toThrow(
        'Validation error'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty results', async () => {
      prismaMock.model.findMany.mockResolvedValue([]);
      const result = await service.getAll();
      expect(result).toEqual([]);
    });

    it('should handle large datasets', async () => {
      const largeDataset = Array(1000).fill({ /* data */ });
      prismaMock.model.findMany.mockResolvedValue(largeDataset);
      const result = await service.getAll();
      expect(result.length).toBe(1000);
    });
  });
});
```

### 3.2 Controller Testing Pattern

**Template for Controller Unit Tests:**

```typescript
// tests/unit/controllers/ExampleController.test.ts
import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { ExampleController } from '@/controllers/exampleController';
import { ExampleService } from '@/services/ExampleService';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

describe('ExampleController', () => {
  let controller: ExampleController;
  let serviceMock: DeepMockProxy<ExampleService>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    // Create mocks
    serviceMock = mockDeep<ExampleService>();
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-1', role: 'admin' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    // Register mocks
    container.registerInstance(ExampleService, serviceMock);
    controller = container.resolve(ExampleController);
  });

  afterEach(() => {
    mockReset(serviceMock);
    container.clearInstances();
  });

  describe('create', () => {
    it('should create resource successfully', async () => {
      // Arrange
      const input = { name: 'Test' };
      const created = { id: '1', ...input };
      req.body = input;
      serviceMock.create.mockResolvedValue(created);

      // Act
      await controller.create(req as Request, res as Response);

      // Assert
      expect(serviceMock.create).toHaveBeenCalledWith(input);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it('should handle validation errors', async () => {
      // Arrange
      req.body = { /* invalid data */ };
      const error = new Error('Validation failed');
      serviceMock.create.mockRejectedValue(error);

      // Act
      await controller.create(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should handle authorization', async () => {
      // Arrange
      req.user = { id: 'user-1', role: 'contestant' };

      // Act
      await controller.create(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
```

### 3.3 Middleware Testing Pattern

**Template for Middleware Unit Tests:**

```typescript
// tests/unit/middleware/exampleMiddleware.test.ts
import { Request, Response, NextFunction } from 'express';
import { exampleMiddleware } from '@/middleware/exampleMiddleware';

describe('exampleMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      body: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  it('should pass valid requests', () => {
    // Arrange
    req.headers = { 'x-valid-header': 'value' };

    // Act
    exampleMiddleware(req as Request, res as Response, next);

    // Assert
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject invalid requests', () => {
    // Arrange - missing required header

    // Act
    exampleMiddleware(req as Request, res as Response, next);

    // Assert
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

### 3.4 Frontend Component Testing Pattern

**Template for Component Tests:**

```typescript
// frontend/src/components/__tests__/ExampleComponent.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExampleComponent } from '../ExampleComponent';
import { AuthContext } from '@/contexts/AuthContext';

describe('ExampleComponent', () => {
  const mockAuthContext = {
    user: { id: '1', role: 'admin', email: 'admin@test.com' },
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
  };

  const renderWithContext = (component: React.ReactElement) => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        {component}
      </AuthContext.Provider>
    );
  };

  it('should render component', () => {
    renderWithContext(<ExampleComponent />);
    expect(screen.getByText('Example')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const onSubmit = vi.fn();
    renderWithContext(<ExampleComponent onSubmit={onSubmit} />);

    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  it('should display error state', () => {
    renderWithContext(<ExampleComponent error="Test error" />);
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    renderWithContext(<ExampleComponent loading={true} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### 3.5 Custom Hook Testing Pattern

**Template for Hook Tests:**

```typescript
// frontend/src/hooks/__tests__/useExample.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useExample } from '../useExample';

describe('useExample', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useExample());
    expect(result.current.value).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  it('should update state on action', async () => {
    const { result } = renderHook(() => useExample());

    act(() => {
      result.current.fetchData();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.value).toBeDefined();
    });
  });
});
```

---

## 4. Implementation Roadmap

### Phase 1: High-Value Service Tests (Weeks 1-2)

**Goal:** Add 40 service unit tests
**Priority:** 🔴 Critical
**Estimated Effort:** 40-50 hours

**Week 1 - Core Services (20 tests):**

Day 1-2:
- ScoringService.test.ts (comprehensive scoring logic)
- ResultsService.test.ts (result calculation and processing)
- WinnerService.test.ts (winner determination algorithms)

Day 3-4:
- AssignmentService.test.ts (assignment logic and validation)
- CertificationService.test.ts (certification workflow)
- AuthService.test.ts (authentication/authorization)

Day 5:
- Expand existing EventService.test.ts (add 10+ scenarios)
- Expand existing ContestService.test.ts (add 10+ scenarios)

**Week 2 - Advanced Services (20 tests):**

Day 1-2:
- BulkOperationService.test.ts (bulk operations orchestration)
- CSVService.test.ts (CSV parsing, generation, validation)
- CustomFieldService.test.ts (custom field types and validation)

Day 3-4:
- EmailTemplateService.test.ts (template processing, variables)
- NotificationService.test.ts (notification dispatch, preferences)
- QueueService.test.ts (job queue management)

Day 5:
- EventBusService.test.ts (event handling, pub/sub)
- BackupMonitoringService.test.ts (backup monitoring logic)
- HealthCheckService.test.ts (health check aggregation)
- MetricsService.test.ts (metrics collection and formatting)

**Success Criteria:**
- 40 new service test files created
- Service coverage increases from 15% to 60%+
- All tests pass with >85% coverage per service
- Edge cases and error handling tested

### Phase 2: Critical Controller Tests (Weeks 3-4)

**Goal:** Add 30 controller unit tests
**Priority:** 🔴 Critical
**Estimated Effort:** 30-40 hours

**Week 3 - Core Controllers (15 tests):**

Day 1-2:
- authController.test.ts (login, logout, token refresh)
- usersController.test.ts (CRUD operations, validation)
- eventsController.test.ts (event lifecycle management)

Day 3-4:
- contestsController.test.ts (contest management)
- categoriesController.test.ts (category operations)
- scoringController.test.ts (score submission, validation)

Day 5:
- resultsController.test.ts (results processing)
- winnersController.test.ts (winner selection)
- assignmentsController.test.ts (assignment CRUD)

**Week 4 - Advanced Controllers (15 tests):**

Day 1-2:
- certificationController.test.ts (certification workflow)
- BulkUserController.test.ts (bulk user operations)
- BulkEventController.test.ts (bulk event operations)

Day 3-4:
- CustomFieldController.test.ts (custom field management)
- EmailTemplateController.test.ts (template CRUD)
- notificationsController.test.ts (notification management)

Day 5:
- advancedReportingController.test.ts (report generation)
- backupController.test.ts (backup operations)
- adminController.test.ts (admin functions)

**Success Criteria:**
- 30 new controller test files created
- Controller coverage increases from 0% to 50%+
- Request/response handling tested
- Authorization checks tested
- Error handling verified

### Phase 3: Frontend Component Tests (Weeks 5-6)

**Goal:** Add 35 component tests
**Priority:** 🔴 Critical
**Estimated Effort:** 35-45 hours

**Week 5 - Core UI Components (17 tests):**

Day 1:
- Layout.test.tsx (responsive layout, navigation)
- DataTable.test.tsx (sorting, filtering, pagination)
- ResponsiveDataTable.test.tsx (mobile responsiveness)

Day 2:
- Pagination.test.tsx (page navigation, limits)
- SearchFilter.test.tsx (search, filter interactions)
- FormField.test.tsx (validation, error display)

Day 3:
- Modal.test.tsx (open/close, escape handling)
- ErrorBoundary.test.tsx (error catching, fallback)
- ProtectedRoute.test.tsx (auth redirects)

Day 4:
- RoleProtectedRoute.test.tsx (role-based access)
- LoadingSpinner.test.tsx (display states)
- Tooltip.test.tsx (hover interactions)

Day 5:
- Add context tests:
  - AuthContext.test.tsx
  - ThemeContext.test.tsx
  - SocketContext.test.tsx
  - ToastContext.test.tsx

**Week 6 - Feature & Page Components (18 tests):**

Day 1-2:
- CertificationWorkflow.test.tsx (multi-step workflow)
- CategoryCertificationView.test.tsx
- ContestCertificationView.test.tsx
- FileUpload.test.tsx (drag-drop, validation)

Day 3:
- BackupManager.test.tsx (backup operations UI)
- SecurityDashboard.test.tsx (security metrics)
- AuditLog.test.tsx (log display, filtering)
- ActiveUsers.test.tsx (real-time updates)

Day 4:
- RealTimeNotifications.test.tsx (toast notifications)
- BulkActionToolbar.test.tsx (bulk selection)
- BulkImportModal.test.tsx (CSV upload)
- PasswordStrengthMeter.test.tsx (strength calculation)

Day 5:
- LoginPage.test.tsx (login flow)
- EventsPage.test.tsx (event list, CRUD)
- UsersPage.test.tsx (user management)
- SettingsPage.test.tsx (settings form)

**Success Criteria:**
- 35 new component test files created
- Component coverage increases from 31% to 80%+
- User interactions tested
- Accessibility verified
- Error states tested

### Phase 4: Middleware & Integration Gap Closure (Weeks 7-8)

**Goal:** Add 18 tests (middleware + integration)
**Priority:** 🟡 High
**Estimated Effort:** 18-24 hours

**Week 7 - Middleware Tests (13 tests):**

Day 1-2:
- permissions.test.ts (RBAC logic, role checks)
- rateLimiting.test.ts (rate limit enforcement)
- csrf.test.ts (CSRF token validation)

Day 3-4:
- errorHandler.test.ts (error formatting, logging)
- validation.test.ts (input validation schemas)
- virusScanMiddleware.test.ts (file scanning)

Day 5:
- cacheMiddleware.test.ts (cache hit/miss)
- adminOnly.test.ts (admin access control)
- assignmentValidation.test.ts (assignment validation)
- passwordValidation.test.ts (password strength)
- requestLogger.test.ts (request logging)
- metrics.test.ts (metrics collection)
- queryMonitoring.test.ts (query monitoring)

**Week 8 - Integration Test Gaps (5 tests):**

Day 1-2:
- bulk-operations.test.ts (end-to-end bulk flows)
- custom-fields.test.ts (custom field CRUD and usage)
- email-templates.test.ts (template creation and sending)

Day 3-4:
- notifications-integration.test.ts (notification workflows)
- backup-integration.test.ts (backup and restore flows)

**Success Criteria:**
- 18 new test files created
- Middleware coverage increases to 80%+
- Integration test coverage increases to 85%+
- Edge cases covered
- Error handling verified

### Phase 5: E2E Coverage & Verification (Weeks 9-10)

**Goal:** Add 7 E2E tests + verify all coverage
**Priority:** 🟢 Medium
**Estimated Effort:** 20-30 hours

**Week 9 - E2E Tests (7 tests):**

Day 1-2:
- bulk-operations-workflow.e2e.test.ts (complete bulk flow)
- custom-fields-workflow.e2e.test.ts (field creation and usage)
- email-templates-workflow.e2e.test.ts (template authoring)

Day 3-4:
- notification-center.e2e.test.ts (notification management)
- backup-restore.e2e.test.ts (full backup/restore cycle)

Day 5:
- advanced-reporting.e2e.test.ts (report generation)
- multi-role-collaboration.e2e.test.ts (cross-role workflows)

**Week 10 - Coverage Verification & Optimization:**

Day 1-2:
- Run full test suite with coverage
- Identify remaining gaps
- Add targeted tests for uncovered lines

Day 3-4:
- Optimize slow tests
- Fix flaky tests
- Update test documentation

Day 5:
- Final coverage report
- Documentation update
- CI/CD integration verification

**Success Criteria:**
- 7 new E2E test files created
- E2E coverage increases to 85%+
- Overall code coverage reaches 80%+
- All tests pass reliably
- CI/CD integration complete

---

## 5. Test Coverage Goals

### 5.1 Target Coverage by Layer

| Layer | Current | Week 2 | Week 4 | Week 6 | Week 8 | Week 10 (Target) |
|-------|---------|--------|--------|--------|--------|------------------|
| Services | 15% | 60% | 65% | 70% | 75% | 80%+ |
| Controllers | 0% | 10% | 50% | 55% | 60% | 75%+ |
| Middleware | 6% | 10% | 15% | 20% | 80% | 80%+ |
| Frontend Components | 31% | 35% | 40% | 80% | 82% | 80%+ |
| Integration | 78% | 80% | 82% | 83% | 85% | 85%+ |
| E2E | 70% | 72% | 74% | 76% | 80% | 85%+ |
| **Overall** | **~45%** | **55%** | **65%** | **72%** | **77%** | **80%+** |

### 5.2 Coverage Metrics Definition

**Line Coverage:**
- Measures percentage of code lines executed during tests
- Target: 80% minimum, 85% for critical paths

**Branch Coverage:**
- Measures percentage of decision branches tested
- Target: 80% minimum, 85% for critical paths

**Function Coverage:**
- Measures percentage of functions called during tests
- Target: 80% minimum, 85% for services

**Statement Coverage:**
- Measures percentage of statements executed
- Target: 80% minimum, 85% for critical paths

### 5.3 Critical Path Coverage

**Must Have 90%+ Coverage:**
- Authentication and authorization
- Scoring calculations
- Results processing
- Winner determination
- Certification workflows
- Backup and restore operations
- Payment processing (if applicable)
- Data export/import

---

## 6. Testing Tools & Configuration

### 6.1 Backend Testing Stack

**Core Framework:**
```json
{
  "jest": "^29.x",
  "ts-jest": "^29.x",
  "@types/jest": "^29.x"
}
```

**Mocking:**
```json
{
  "jest-mock-extended": "^3.x",
  "@faker-js/faker": "^8.x"
}
```

**Test Utilities:**
```json
{
  "supertest": "^6.x",
  "@types/supertest": "^2.x"
}
```

### 6.2 Frontend Testing Stack

**Core Framework:**
```json
{
  "vitest": "^1.x",
  "@testing-library/react": "^14.x",
  "@testing-library/jest-dom": "^6.x",
  "@testing-library/user-event": "^14.x"
}
```

**Component Testing:**
```json
{
  "jsdom": "^23.x",
  "@testing-library/react-hooks": "^8.x"
}
```

### 6.3 E2E Testing Stack

**Playwright (Current):**
```json
{
  "@playwright/test": "^1.40.x"
}
```

### 6.4 Code Coverage Tools

**Coverage Reporter:**
```json
{
  "c8": "^8.x", // For Vitest
  "jest-coverage": "Built-in"
}
```

**Coverage Visualization:**
```json
{
  "codecov": "^3.x" // Optional for CI integration
}
```

### 6.5 Configuration Updates Needed

**Update jest.config.js:**
```javascript
module.exports = {
  // ... existing config

  // Add coverage reporters for better visualization
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
    'clover' // Add for better CI integration
  ],

  // Add custom reporters for better output
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
    }]
  ],

  // Increase test timeout for integration tests
  testTimeout: 30000,

  // Add coverage paths
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/**/*.interface.ts',
    '!src/config/**',
    '!src/server.ts'
  ]
};
```

**Add vitest.config.ts for frontend:**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

---

## 7. Test Data Management

### 7.1 Test Database Strategy

**Separate Test Database:**
- Use dedicated PostgreSQL database for tests
- Reset database state before each test suite
- Use transactions for test isolation

**Setup:**
```typescript
// tests/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL
    }
  }
});

beforeAll(async () => {
  // Run migrations
  await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA public');
  // Run migrations here
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

### 7.2 Mock Data Factories

**Enhance existing mockData.ts:**
```typescript
// tests/helpers/factories.ts
import { faker } from '@faker-js/faker';

export const userFactory = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  password: faker.internet.password(),
  role: 'contestant',
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  ...overrides
});

export const eventFactory = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name() + ' Contest',
  startDate: faker.date.future(),
  endDate: faker.date.future(),
  location: faker.location.city(),
  ...overrides
});

export const scoreFactory = (overrides = {}) => ({
  id: faker.string.uuid(),
  value: faker.number.int({ min: 0, max: 100 }),
  categoryId: faker.string.uuid(),
  contestantId: faker.string.uuid(),
  judgeId: faker.string.uuid(),
  ...overrides
});
```

### 7.3 Seeding Test Data

**Enhanced seedData.ts:**
```typescript
// tests/helpers/seedData.ts
import { PrismaClient } from '@prisma/client';
import { userFactory, eventFactory, scoreFactory } from './factories';

export async function seedTestData(prisma: PrismaClient) {
  // Create users
  const admin = await prisma.user.create({
    data: userFactory({ role: 'admin', email: 'admin@test.com' })
  });

  const judge = await prisma.user.create({
    data: userFactory({ role: 'judge', email: 'judge@test.com' })
  });

  const contestant = await prisma.user.create({
    data: userFactory({ role: 'contestant', email: 'contestant@test.com' })
  });

  // Create event
  const event = await prisma.event.create({
    data: eventFactory()
  });

  // Create contest and categories...

  return { admin, judge, contestant, event };
}

export async function cleanupTestData(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.score.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.category.deleteMany(),
    prisma.contest.deleteMany(),
    prisma.event.deleteMany(),
    prisma.user.deleteMany()
  ]);
}
```

---

## 8. Continuous Integration

### 8.1 GitHub Actions Workflow

**Create .github/workflows/test.yml:**
```yaml
name: Test Suite

on:
  push:
    branches: [main, develop, node_react]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: event_manager_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/event_manager_test

      - name: Run unit tests
        run: npm run test:unit -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/event_manager_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: event_manager_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/event_manager_test

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/event_manager_test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: event_manager_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/event_manager_test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/event_manager_test
          REDIS_URL: redis://localhost:6379

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### 8.2 Pre-commit Hooks

**Update .husky/pre-commit:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run type check
npm run type-check

# Run linting
npm run lint

# Run unit tests for changed files
npm run test:changed -- --bail --findRelatedTests

# If all pass, allow commit
exit 0
```

### 8.3 Coverage Enforcement

**Add to package.json:**
```json
{
  "scripts": {
    "test:coverage": "jest --coverage --coverageThreshold='{\"global\":{\"lines\":80,\"functions\":80,\"branches\":80,\"statements\":80}}'",
    "test:changed": "jest --onlyChanged",
    "test:watch": "jest --watch",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "playwright test"
  }
}
```

---

## 9. Success Metrics & Monitoring

### 9.1 Key Performance Indicators

**Coverage Metrics:**
- Overall coverage: Target 80%+ (current: ~45%)
- Service coverage: Target 85%+ (current: 15%)
- Controller coverage: Target 75%+ (current: 0%)
- Frontend coverage: Target 80%+ (current: 31%)

**Quality Metrics:**
- Test reliability: >99% pass rate
- Test execution time: <5 minutes for unit tests
- E2E execution time: <15 minutes
- Zero flaky tests

**Velocity Metrics:**
- Tests written per week: 20-30
- Coverage increase per week: 5-10%
- Time to fix failing tests: <2 hours

### 9.2 Weekly Progress Tracking

**Week 1-2 Targets:**
- 40 service tests added
- Service coverage: 60%+
- Zero regressions in existing tests

**Week 3-4 Targets:**
- 30 controller tests added
- Controller coverage: 50%+
- All new endpoints tested

**Week 5-6 Targets:**
- 35 component tests added
- Frontend coverage: 80%+
- All critical components tested

**Week 7-8 Targets:**
- 18 middleware/integration tests added
- Middleware coverage: 80%+
- Integration coverage: 85%+

**Week 9-10 Targets:**
- 7 E2E tests added
- Overall coverage: 80%+
- All critical paths tested

### 9.3 Quality Gates

**Pull Request Requirements:**
1. All tests must pass
2. Coverage must not decrease
3. New code must have >80% coverage
4. No new warnings or errors
5. All E2E tests pass

**Merge to Main Requirements:**
1. All tests pass (unit, integration, E2E)
2. Overall coverage >80%
3. Performance tests pass
4. Security scan passes
5. Code review approved

---

## 10. Risk Mitigation

### 10.1 Potential Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Test execution too slow | Medium | High | Parallelize tests, use faster mocks |
| Flaky tests | Medium | High | Use deterministic data, proper cleanup |
| Incomplete coverage | Low | High | Regular reviews, coverage reports |
| Test maintenance burden | Medium | Medium | DRY principles, helper utilities |
| Breaking changes | Low | High | Comprehensive regression suite |

### 10.2 Mitigation Strategies

**Performance:**
- Run unit tests in parallel
- Mock external dependencies
- Use in-memory database for unit tests
- Cache test fixtures

**Reliability:**
- Reset database state between tests
- Use deterministic test data
- Avoid time-dependent tests
- Implement proper cleanup

**Maintainability:**
- Follow testing patterns consistently
- Create reusable test utilities
- Document complex test scenarios
- Regular refactoring

---

## 11. Documentation & Training

### 11.1 Testing Documentation

**Create:**
1. testing-best-practices.md
2. test-writing-guide.md
3. mock-data-guide.md
4. e2e-testing-guide.md
5. troubleshooting-tests.md

**Update:**
1. testing-guide.md (existing)
2. test-documentation.md (existing)
3. test-execution-guide.md (existing)

### 11.2 Team Training

**Topics:**
1. Jest fundamentals and mocking
2. Testing React components
3. Writing effective E2E tests
4. Test-driven development (TDD)
5. Coverage analysis and interpretation

**Resources:**
- Internal wiki with examples
- Recorded training sessions
- Pair programming sessions
- Code review guidelines

---

## 12. Conclusion

### 12.1 Expected Outcomes

**After 10 Weeks:**
- ✅ 157+ new test files created
- ✅ Overall coverage increased from ~45% to 80%+
- ✅ Service coverage: 80%+
- ✅ Controller coverage: 75%+
- ✅ Frontend coverage: 80%+
- ✅ Middleware coverage: 80%+
- ✅ Integration coverage: 85%+
- ✅ E2E coverage: 85%+

**Quality Improvements:**
- Fewer production bugs
- Faster development cycles
- Easier refactoring
- Better documentation through tests
- Increased confidence in deployments

**Business Impact:**
- Reduced time to production
- Lower maintenance costs
- Higher code quality
- Better developer experience
- Improved system reliability

### 12.2 Next Steps

**Immediate Actions:**
1. Review and approve this testing plan
2. Allocate development resources
3. Set up CI/CD enhancements
4. Begin Phase 1 implementation

**Ongoing:**
1. Weekly progress reviews
2. Coverage report analysis
3. Test quality assessment
4. Continuous improvement

### 12.3 Long-term Vision

**Beyond 80% Coverage:**
- Mutation testing to verify test quality
- Visual regression testing for UI
- Performance regression testing
- Contract testing for APIs
- Chaos engineering for resilience

**Continuous Improvement:**
- Regular test suite optimization
- Test automation enhancements
- Coverage goal adjustments
- New testing techniques adoption

---

**Plan Prepared:** November 12, 2025
**Target Completion:** Week of January 21, 2026 (10 weeks)
**Estimated Total Effort:** 160-200 hours
**Expected ROI:** High (reduced bugs, faster development, easier maintenance)

---

**Appendix A: Test File Templates**

Available in repository at:
- `/tests/templates/service.test.template.ts`
- `/tests/templates/controller.test.template.ts`
- `/tests/templates/middleware.test.template.ts`
- `/tests/templates/component.test.template.tsx`
- `/tests/templates/hook.test.template.ts`

**Appendix B: Quick Reference Commands**

```bash
# Run all tests with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests for changed files
npm run test:changed

# Generate coverage report
npm run test:coverage -- --coverageReporters=html
```

---

**End of Enhanced Testing Plan**
