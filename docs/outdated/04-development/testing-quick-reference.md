# Testing Quick Reference

**Last Updated:** November 13, 2025
**Purpose:** One-page cheat sheet for common testing tasks

---

## Quick Command Reference

### Running Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Single file
npm test -- tests/unit/services/AuthService.test.ts

# Pattern matching
npm test -- --testPathPattern=Auth

# Verbose output
npm run test:verbose

# Update snapshots
npm test -- -u

# Only failed tests
npm test -- --onlyFailures

# Run in band (sequential)
npm run test:all
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# UI mode (visual debugger)
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Specific test
npx playwright test tests/e2e/auth.e2e.test.ts

# Generate report
npx playwright show-report
```

### Coverage Commands

```bash
# Generate coverage
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Coverage for specific path
npm run test:coverage -- --collectCoverageFrom=src/services/**/*.ts

# Text summary only
npm run test:coverage -- --coverageReporters=text-summary
```

---

## Test Code Snippets

### Service Test Template

```typescript
import 'reflect-metadata';
import { ServiceName } from '@/services/ServiceName';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('ServiceName', () => {
  let service: ServiceName;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ServiceName(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { /* data */ };
      mockPrisma.model.method.mockResolvedValue({ /* result */ } as any);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual({ /* expected */ });
    });

    it('should handle error case', async () => {
      mockPrisma.model.method.mockRejectedValue(new Error('DB error'));

      await expect(service.methodName({}))
        .rejects.toThrow('DB error');
    });
  });
});
```

### Controller Test Template

```typescript
import { Request, Response, NextFunction } from 'express';
import { ControllerName } from '@/controllers/ControllerName';
import { ServiceName } from '@/services/ServiceName';
import { mock, MockProxy } from 'jest-mock-extended';

describe('ControllerName', () => {
  let controller: ControllerName;
  let mockService: MockProxy<ServiceName>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockService = mock<ServiceName>();
    controller = new ControllerName(mockService);

    mockReq = { body: {}, params: {}, query: {}, user: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('handleRequest', () => {
    it('should return 200 with data', async () => {
      mockReq.params = { id: '1' };
      mockService.getData.mockResolvedValue({ id: '1', name: 'Test' });

      await controller.handleRequest(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith({ id: '1', name: 'Test' });
    });
  });
});
```

### Component Test Template

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ComponentName } from './ComponentName';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('ComponentName', () => {
  it('should render correctly', () => {
    renderWithProviders(<ComponentName />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    renderWithProviders(<ComponentName />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should complete workflow', async ({ page }) => {
    await page.goto('/path');

    await page.fill('[name="field"]', 'value');
    await page.click('button[type="submit"]');

    await expect(page.locator('.success')).toBeVisible();
    await expect(page).toHaveURL('/next-page');
  });

  test('should handle error', async ({ page }) => {
    await page.goto('/path');

    await page.fill('[name="field"]', 'invalid');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error')).toBeVisible();
  });
});
```

---

## Mock Setup Patterns

### Mock Prisma

```typescript
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

let mockPrisma: DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockPrisma = mockDeep<PrismaClient>();
});

// Mock successful query
mockPrisma.user.findUnique.mockResolvedValue({
  id: '1',
  email: 'test@example.com'
} as any);

// Mock error
mockPrisma.user.create.mockRejectedValue(new Error('DB error'));

// Mock empty result
mockPrisma.user.findMany.mockResolvedValue([]);

// Mock count
mockPrisma.user.count.mockResolvedValue(10);
```

### Mock External Services

```typescript
// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
  })
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    expire: jest.fn()
  }));
});

// Mock JWT
jest.mock('jsonwebtoken');
const mockJwt = jwt as jest.Mocked<typeof jwt>;
mockJwt.sign.mockReturnValue('token' as any);
mockJwt.verify.mockReturnValue({ userId: '1' } as any);

// Mock bcrypt
jest.mock('bcryptjs');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
mockBcrypt.hash.mockResolvedValue('$2a$10$hash' as never);
mockBcrypt.compare.mockResolvedValue(true as never);
```

### Mock React Contexts

```typescript
const mockAuthContext = {
  user: { id: '1', role: 'ADMIN', email: 'admin@test.com' },
  login: vi.fn(),
  logout: vi.fn(),
  loading: false,
  isAuthenticated: true
};

const mockThemeContext = {
  theme: 'light',
  toggleTheme: vi.fn()
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <ThemeContext.Provider value={mockThemeContext}>
          {component}
        </ThemeContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};
```

---

## Common Assertions

### Jest/Vitest Assertions

```typescript
// Equality
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toStrictEqual(expected);

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(10);
expect(value).toBeGreaterThanOrEqual(10);
expect(value).toBeLessThan(10);
expect(value).toBeLessThanOrEqual(10);
expect(value).toBeCloseTo(0.3, 2); // Floating point

// Strings
expect(value).toMatch(/pattern/);
expect(value).toContain('substring');
expect(value).toHaveLength(10);

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(5);
expect(array).toEqual(expect.arrayContaining([1, 2]));

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('key', 'value');
expect(obj).toMatchObject({ key: 'value' });

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenLastCalledWith(arg1, arg2);

// Promises
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(error);

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);
expect(() => fn()).toThrow('error message');

// Types
expect(value).toBeInstanceOf(Class);
expect(typeof value).toBe('string');
```

### Testing Library Assertions

```typescript
// Queries
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email');
screen.getByText('Hello World');
screen.getByPlaceholderText('Enter name');
screen.getByTestId('submit-btn');

// Async queries (wait for elements)
await screen.findByText('Success');
await screen.findByRole('alert');

// Query variants
screen.queryByText('Not found'); // Returns null if not found
screen.getAllByRole('button'); // Returns array

// Assertions
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveValue('text');
expect(element).toHaveAttribute('href', '/path');
expect(element).toHaveClass('active');
expect(element).toHaveTextContent('Hello');
```

### Playwright Assertions

```typescript
// Page
await expect(page).toHaveURL('/path');
await expect(page).toHaveTitle('Title');

// Locator
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();
await expect(locator).toHaveText('text');
await expect(locator).toContainText('partial');
await expect(locator).toHaveValue('value');
await expect(locator).toHaveAttribute('attr', 'value');
await expect(locator).toHaveClass(/class-name/);
await expect(locator).toHaveCount(5);

// Custom timeout
await expect(locator).toBeVisible({ timeout: 10000 });
```

---

## Test Data Factories

```typescript
// User factory
const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER' as const,
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides
});

// Event factory
const createMockEvent = (overrides = {}) => ({
  id: 'event-1',
  name: 'Test Event',
  startDate: new Date('2025-12-01'),
  endDate: new Date('2025-12-02'),
  location: 'Test Venue',
  isActive: true,
  ...overrides
});

// Score factory
const createMockScore = (overrides = {}) => ({
  id: 'score-1',
  contestantId: 'contestant-1',
  judgeId: 'judge-1',
  categoryId: 'category-1',
  score: 95,
  createdAt: new Date(),
  ...overrides
});

// Usage
it('should process admin user event', async () => {
  const admin = createMockUser({ role: 'ADMIN' });
  const event = createMockEvent({ createdBy: admin.id });

  // Test logic
});
```

---

## Debugging Tips

### Debug Commands

```bash
# Run specific test with debug
node --inspect-brk node_modules/.bin/jest --runInBand tests/unit/services/AuthService.test.ts

# Run test by name
npm test -- -t "should authenticate user"

# Verbose output
npm test -- --verbose

# Show test names
npm test -- --listTests

# Clear cache
npm test -- --clearCache
```

### Debug Code

```typescript
// Print mock calls
console.log(mockService.method.mock.calls);

// Print mock results
console.log(mockService.method.mock.results);

// Print received arguments
console.log(mockService.method.mock.calls[0]);

// Debug specific value
console.log('Debug:', value);

// Breakpoint (when debugging)
debugger;

// Get all mock information
console.log(mockService.method.mock);
```

### VS Code Launch Config

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "${file}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## Common Patterns

### AAA Pattern

```typescript
it('should do something', async () => {
  // Arrange - Set up test data
  const input = { id: '1' };
  mockService.getData.mockResolvedValue({ id: '1', name: 'Test' });

  // Act - Execute the code
  const result = await service.process(input);

  // Assert - Verify the result
  expect(result.name).toBe('Test');
});
```

### Test Each Case

```typescript
describe.each([
  [1, 2, 3],
  [10, 20, 30],
  [-5, 5, 0],
])('add(%i, %i)', (a, b, expected) => {
  it(`should return ${expected}`, () => {
    expect(add(a, b)).toBe(expected);
  });
});
```

### Async Testing

```typescript
// Async/await
it('should handle async', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// Promise resolves
it('should resolve', () => {
  return expect(promise).resolves.toBe(value);
});

// Promise rejects
it('should reject', () => {
  return expect(promise).rejects.toThrow();
});

// Callback
it('should call callback', (done) => {
  callback((result) => {
    expect(result).toBe('value');
    done();
  });
});
```

### Error Testing

```typescript
// Sync errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);
expect(() => fn()).toThrow('message');

// Async errors
await expect(asyncFn()).rejects.toThrow();
await expect(asyncFn()).rejects.toThrow(Error);
await expect(asyncFn()).rejects.toThrow('message');

// Try/catch for detailed assertions
try {
  await fn();
  fail('Should have thrown');
} catch (error) {
  expect(error).toBeInstanceOf(CustomError);
  expect(error.code).toBe('ERR_CODE');
}
```

---

## File Paths

### Test Locations

```
Backend Unit Tests:
/var/www/event-manager/tests/unit/services/
/var/www/event-manager/tests/unit/controllers/
/var/www/event-manager/tests/unit/repositories/
/var/www/event-manager/tests/unit/middleware/
/var/www/event-manager/tests/unit/utils/

Integration Tests:
/var/www/event-manager/tests/integration/

E2E Tests:
/var/www/event-manager/tests/e2e/

Frontend Tests:
/var/www/event-manager/frontend/src/components/__tests__/
/var/www/event-manager/frontend/src/pages/__tests__/
/var/www/event-manager/frontend/src/hooks/__tests__/
/var/www/event-manager/frontend/src/contexts/__tests__/
```

### Config Files

```
/var/www/event-manager/jest.config.js
/var/www/event-manager/playwright.config.ts
/var/www/event-manager/tests/setup.ts
/var/www/event-manager/frontend/vitest.config.ts
```

---

## Coverage Thresholds

```
Global:           80% (branches, functions, lines, statements)
Services:         85%+
Middleware:       80%+
Controllers:      75%+
Repositories:     80%+
```

---

## Quick Links

- [Testing Guide](./testing-guide.md) - Full testing documentation
- [Testing Standards](./testing-standards.md) - Quality requirements
- [Testing Examples](./testing-examples.md) - Detailed examples
- [Testing Workflows](./testing-workflows.md) - Development workflows
- [Coverage Report](./testing-coverage-report.md) - Current coverage

---

**Last Updated:** November 13, 2025
**Print this page for quick reference during development**
