# Testing Implementation Guide

## Quick Start

You now have **351+ test files** created with comprehensive templates. Here's how to implement and run them:

## Step 1: Review Generated Tests

### Backend Tests
```bash
# View generated service tests
ls tests/unit/services/*.test.ts | wc -l  # Should show 75

# View generated controller tests
ls tests/unit/controllers/*.test.ts | wc -l  # Should show 65

# View generated middleware tests
ls tests/unit/middleware/*.test.ts | wc -l  # Should show 17
```

### Frontend Tests
```bash
# View generated component tests
find frontend/src/components -name "*.test.tsx" | wc -l  # Should show 71

# View generated page tests
ls frontend/src/pages/__tests__/*.test.tsx | wc -l  # Should show 41

# View generated hook tests
ls frontend/src/hooks/__tests__/*.test.ts | wc -l  # Should show 7

# View generated context tests
ls frontend/src/contexts/__tests__/*.test.tsx | wc -l  # Should show 4
```

## Step 2: Install Test Dependencies

```bash
# Backend dependencies (if not already installed)
npm install --save-dev jest ts-jest @types/jest jest-mock-extended @faker-js/faker

# Frontend dependencies (if not already installed)
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

## Step 3: Run Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Backend unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Frontend tests only
cd frontend && npm test

# Run with coverage
npm run test:coverage
```

### Run Individual Test Files
```bash
# Run specific service test
npm test -- tests/unit/services/ScoringService.test.ts

# Run specific component test
cd frontend && npm test -- src/components/__tests__/Layout.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should submit a score"
```

## Step 4: Implement Test Logic

### Priority Order for Implementation

#### Phase 1: Critical Services (Week 1-2)
Already implemented:
- ✅ ScoringService.test.ts
- ✅ ResultsService.test.ts
- ✅ WinnerService.test.ts
- ✅ AssignmentService.test.ts

Next to implement:
1. **BulkOperationService.test.ts** - Critical for bulk operations
2. **CSVService.test.ts** - Data import/export
3. **CustomFieldService.test.ts** - Custom field management
4. **EmailTemplateService.test.ts** - Email functionality
5. **NotificationService.test.ts** - Real-time notifications
6. **QueueService.test.ts** - Background job processing
7. **EventBusService.test.ts** - Event handling
8. **AuthService.test.ts** - Authentication
9. **CertificationService.test.ts** - Certification workflows
10. **BackupMonitoringService.test.ts** - Backup monitoring

#### Phase 2: Controllers (Week 3-4)
Start with high-traffic endpoints:
1. **authController.test.ts** - Login, logout, token refresh
2. **usersController.test.ts** - User CRUD
3. **eventsController.test.ts** - Event management
4. **scoringController.test.ts** - Score submission
5. **resultsController.test.ts** - Results retrieval
6. **winnersController.test.ts** - Winner queries
7. **BulkUserController.test.ts** - Bulk user operations
8. **CustomFieldController.test.ts** - Custom field API
9. **notificationsController.test.ts** - Notification API
10. **advancedReportingController.test.ts** - Report generation

#### Phase 3: Frontend Components (Week 5-6)
Start with core UI:
1. **Layout.test.tsx** - Main layout
2. **DataTable.test.tsx** - Data display
3. **Modal.test.tsx** - Dialogs
4. **FormField.test.tsx** - Form inputs
5. **ErrorBoundary.test.tsx** - Error handling
6. **ProtectedRoute.test.tsx** - Route protection
7. **AuthContext.test.tsx** - Auth state
8. **ThemeContext.test.tsx** - Theme management

Then feature components:
9. **CertificationWorkflow.test.tsx**
10. **BulkActionToolbar.test.tsx**
11. **BulkImportModal.test.tsx**
12. **FileUpload.test.tsx**

#### Phase 4: Pages (Week 7-8)
Key pages:
1. **LoginPage.test.tsx**
2. **EventsPage.test.tsx**
3. **ContestsPage.test.tsx**
4. **UsersPage.test.tsx**
5. **ScoringPage.test.tsx**
6. **ReportsPage.test.tsx**

#### Phase 5: Middleware & Integration (Week 9-10)
Complete all middleware tests and fill integration gaps.

## Step 5: Implementation Pattern

### For Service Tests

Open a placeholder test file:
```bash
code tests/unit/services/BulkOperationService.test.ts
```

1. **Review the Service File**
   ```bash
   code src/services/BulkOperationService.ts
   ```
   - Identify all public methods
   - Note dependencies
   - Understand business logic

2. **Update Test Template**
   Replace placeholder with actual tests:

   ```typescript
   describe('methodName', () => {
     it('should handle successful operation', async () => {
       // Arrange
       const input = { /* test data */ };
       mockPrisma.model.method.mockResolvedValue(expectedResult);

       // Act
       const result = await service.methodName(input);

       // Assert
       expect(result).toEqual(expectedResult);
       expect(mockPrisma.model.method).toHaveBeenCalledWith(
         expect.objectContaining(input)
       );
     });

     it('should handle error conditions', async () => {
       mockPrisma.model.method.mockRejectedValue(new Error('Database error'));
       await expect(service.methodName({})).rejects.toThrow('Database error');
     });

     it('should validate input', async () => {
       await expect(service.methodName(null)).rejects.toThrow('Validation error');
     });
   });
   ```

3. **Add Edge Cases**
   - Empty inputs
   - Large datasets
   - Boundary conditions
   - Concurrent operations
   - Error scenarios

4. **Run and Verify**
   ```bash
   npm test -- tests/unit/services/BulkOperationService.test.ts
   ```

### For Controller Tests

```typescript
describe('create', () => {
  it('should create resource successfully', async () => {
    // Arrange
    req.body = { name: 'Test', value: 'test' };
    serviceMock.create.mockResolvedValue(createdResource);

    // Act
    await controller.create(req as Request, res as Response);

    // Assert
    expect(serviceMock.create).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdResource);
  });

  it('should handle validation errors', async () => {
    req.body = { /* invalid data */ };
    serviceMock.create.mockRejectedValue(new ValidationError('Invalid input'));

    await controller.create(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should check authorization', async () => {
    req.user = { id: 'user-1', role: 'CONTESTANT' };

    await controller.create(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

### For Component Tests

```typescript
describe('ComponentName', () => {
  it('should render with props', () => {
    renderWithProviders(<ComponentName title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should handle button click', async () => {
    const onClick = vi.fn();
    renderWithProviders(<ComponentName onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('should display loading state', () => {
    renderWithProviders(<ComponentName loading={true} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display error message', () => {
    renderWithProviders(<ComponentName error="Error message" />);
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
```

## Step 6: Coverage Analysis

### Run Coverage Report
```bash
npm run test:coverage
```

### View Coverage Report
```bash
# HTML report (recommended)
open coverage/lcov-report/index.html

# Terminal summary
npm run test:coverage -- --verbose
```

### Identify Gaps
Look for files with:
- Lines coverage < 80%
- Branch coverage < 80%
- Function coverage < 80%

### Fill Gaps
Add tests for:
- Uncovered lines (red in HTML report)
- Uncovered branches (yellow in HTML report)
- Untested functions
- Edge cases

## Step 7: Continuous Testing

### Watch Mode
```bash
# Run tests on file changes
npm run test:watch

# Frontend watch mode
cd frontend && npm run test:watch
```

### Pre-commit Hook
```bash
# Add to .husky/pre-commit
npm run test:changed -- --bail
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Step 8: Test Quality Checklist

For each test file, ensure:

- [ ] All public methods tested
- [ ] Success cases covered
- [ ] Error cases covered
- [ ] Edge cases covered
- [ ] Input validation tested
- [ ] Authorization checked (where applicable)
- [ ] Proper mocking used
- [ ] Clear test descriptions
- [ ] Arrange-Act-Assert pattern
- [ ] No hardcoded values
- [ ] Cleanup in afterEach/afterAll
- [ ] Tests are independent
- [ ] Tests run quickly (<100ms each)

## Troubleshooting

### Common Issues

#### "Cannot find module" errors
```bash
# Check tsconfig paths
# Ensure jest.config.js has moduleNameMapper

# Example fix:
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1'
}
```

#### Mock not working
```typescript
// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
  // or
  mockReset(mockPrisma);
});
```

#### Tests timing out
```typescript
// Increase timeout
it('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

#### Database connection issues
```typescript
// Use test database
beforeAll(async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});
```

## Best Practices

### 1. Follow AAA Pattern
```typescript
it('should do something', () => {
  // Arrange
  const input = setupTestData();

  // Act
  const result = doSomething(input);

  // Assert
  expect(result).toBe(expected);
});
```

### 2. Use Descriptive Names
```typescript
// Good
it('should return 404 when user does not exist', () => {});

// Bad
it('test user', () => {});
```

### 3. Test One Thing
```typescript
// Good - focused test
it('should validate email format', () => {});
it('should reject empty email', () => {});

// Bad - testing multiple things
it('should validate user input', () => {
  // tests email, password, name...
});
```

### 4. Mock External Dependencies
```typescript
// Mock API calls
vi.mock('@/services/api');

// Mock environment
process.env.NODE_ENV = 'test';

// Mock date/time
vi.useFakeTimers();
```

### 5. Clean Up After Tests
```typescript
afterEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

## Progress Tracking

Create a checklist:

```markdown
## Service Tests
- [x] ScoringService
- [x] ResultsService
- [x] WinnerService
- [x] AssignmentService
- [ ] BulkOperationService
- [ ] CSVService
...

## Controller Tests
- [ ] authController
- [ ] usersController
...

## Component Tests
- [ ] Layout
- [ ] DataTable
...
```

## Resources

- **Jest Documentation:** https://jestjs.io/
- **Vitest Documentation:** https://vitest.dev/
- **Testing Library:** https://testing-library.com/
- **Playwright:** https://playwright.dev/

## Getting Help

1. Check existing comprehensive tests for patterns:
   - `tests/unit/services/ScoringService.test.ts`
   - `tests/unit/services/ResultsService.test.ts`
   - `tests/e2e/bulk-operations-workflow.spec.ts`

2. Review test templates in:
   - `scripts/generate-tests.ts`
   - `scripts/generate-frontend-tests.ts`

3. See test documentation:
   - `TEST_COVERAGE_REPORT.md`
   - `TESTING_SUMMARY.md`
   - `docs/04-development/enhanced-testing-plan.md`

---

**Happy Testing! 🧪**

Remember: Good tests are an investment. They catch bugs early, document behavior, and give you confidence to refactor.
