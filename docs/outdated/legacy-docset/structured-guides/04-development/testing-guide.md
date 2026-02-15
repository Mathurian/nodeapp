# Testing Guide

**Last Updated:** November 13, 2025
**Application Version:** 2.0
**Test Coverage:** 51/76 Services | 228 Total Test Files

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Philosophy](#testing-philosophy)
3. [Testing Layers](#testing-layers)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Testing Patterns](#testing-patterns)
7. [Mocking Strategies](#mocking-strategies)
8. [Common Scenarios](#common-scenarios)
9. [Debugging Tests](#debugging-tests)
10. [CI/CD Integration](#cicd-integration)
11. [Coverage Goals](#coverage-goals)
12. [Test Organization](#test-organization)
13. [Troubleshooting](#troubleshooting)

---

## Overview

The Event Manager project uses a comprehensive testing strategy to ensure reliability and maintainability. Our test suite includes:

- **Unit Tests** - 228 test files (Jest + Vitest)
- **Integration Tests** - API and database integration
- **E2E Tests** - 11 end-to-end scenarios (Playwright)
- **Component Tests** - React component testing (Vitest + Testing Library)

### Current Test Coverage

```
Backend Tests:
├── Services:      51/76 implemented (26,082 LOC)
├── Controllers:   65 scaffolds created
├── Repositories:  Scaffold templates ready
└── Middleware:    Scaffold templates ready

Frontend Tests:
└── Components:    123 scaffold files created

E2E Tests:
└── Workflows:     11 comprehensive scenarios
```

### Technology Stack

- **Backend Testing:** Jest, ts-jest, jest-mock-extended, Supertest
- **Frontend Testing:** Vitest, @testing-library/react, @testing-library/user-event
- **E2E Testing:** Playwright
- **Coverage:** Jest coverage with HTML/LCOV reports

---

## Testing Philosophy

Our testing approach follows these principles:

### 1. Test Behavior, Not Implementation

Focus on what the code does, not how it does it:

```typescript
// Good - Tests behavior
it('should return user by email', async () => {
  const user = await authService.login({ email: 'test@example.com', password: 'pass' });
  expect(user.email).toBe('test@example.com');
});

// Avoid - Tests implementation
it('should call findUnique with correct parameters', async () => {
  await authService.login({ email: 'test@example.com', password: 'pass' });
  expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' }});
});
```

### 2. Write Tests You Can Trust

Tests should be:
- **Deterministic** - Same input always produces same output
- **Isolated** - Tests don't depend on each other
- **Fast** - Quick feedback during development
- **Clear** - Easy to understand what failed

### 3. Maintainability Over Coverage

A few well-written tests are better than many brittle tests. Aim for:
- Critical path coverage
- Edge case handling
- Error scenarios
- User-facing functionality

### 4. Test at the Right Level

```
E2E Tests (5-10%)     - Critical user journeys
Integration Tests (15-20%) - API endpoints, database operations
Unit Tests (70-80%)   - Business logic, utilities, services
```

---

## Testing Layers

### Unit Tests

Test individual units of code in isolation.

**Location:** `/var/www/event-manager/tests/unit/`

**What to Test:**
- Services (business logic)
- Utilities (helper functions)
- Validators (input validation)
- Formatters (data transformation)

**Example:**
```typescript
describe('AuthService', () => {
  it('should hash password on registration', async () => {
    const result = await authService.register({
      email: 'test@example.com',
      password: 'plaintext'
    });
    expect(result.password).not.toBe('plaintext');
  });
});
```

### Integration Tests

Test how components work together.

**Location:** `/var/www/event-manager/tests/integration/`

**What to Test:**
- API endpoints with database
- Service interactions
- External service integrations
- Queue processing

**Example:**
```typescript
describe('POST /api/auth/login', () => {
  it('should authenticate user and return token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

### Component Tests

Test React components in isolation.

**Location:** `/var/www/event-manager/frontend/src/components/__tests__/`

**What to Test:**
- Component rendering
- User interactions
- State management
- Props handling
- Accessibility

**Example:**
```typescript
describe('LoginPage', () => {
  it('should submit login form', async () => {
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    });
  });
});
```

### E2E Tests

Test complete user workflows.

**Location:** `/var/www/event-manager/tests/e2e/`

**What to Test:**
- Critical user journeys
- Multi-page workflows
- Authentication flows
- Complex interactions

**Example:**
```typescript
test('complete scoring workflow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'judge@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.goto('/scoring');
  await page.selectOption('[name="event"]', '1');
  await page.fill('[name="score"]', '95');
  await page.click('button[type="submit"]');

  await expect(page.locator('.success-message')).toBeVisible();
});
```

---

## Running Tests

### All Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with verbose output
npm run test:verbose
```

### Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Frontend component tests
cd frontend && npm test
```

### Specific Test Files

```bash
# Single test file
npm test -- tests/unit/services/AuthService.test.ts

# Pattern matching
npm test -- --testPathPattern=Auth

# Watch mode
npm run test:watch
```

### Test Options

```bash
# Run tests with coverage
npm run test:coverage

# Run in band (sequential)
npm run test:all

# Update snapshots
npm test -- -u

# Show test names
npm test -- --verbose

# Only failed tests
npm test -- --onlyFailures
```

### E2E Test Options

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run headed (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Specific browser
npx playwright test --project=chromium
```

---

## Writing Tests

### Test Structure

Every test file follows this structure:

```typescript
/**
 * [ComponentName] Tests
 * Description of what this test suite covers
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ServiceClass } from '@/services/ServiceClass';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('ServiceClass', () => {
  let service: ServiceClass;
  let mockDependency: DeepMockProxy<DependencyClass>;

  beforeEach(() => {
    // Setup
    mockDependency = mockDeep<DependencyClass>();
    service = new ServiceClass(mockDependency);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
    jest.restoreAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { /* test data */ };
      mockDependency.method.mockResolvedValue({ /* mock response */ });

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual({ /* expected output */ });
      expect(mockDependency.method).toHaveBeenCalledWith(input);
    });

    it('should handle error case', async () => {
      // Arrange
      mockDependency.method.mockRejectedValue(new Error('Test error'));

      // Act & Assert
      await expect(service.methodName({})).rejects.toThrow('Test error');
    });

    it('should handle edge case', async () => {
      // Test edge cases
    });
  });
});
```

### Service Tests

```typescript
import 'reflect-metadata';
import { AuthService } from '@/services/AuthService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new AuthService(mockPrisma as any);
  });

  describe('login', () => {
    it('should authenticate valid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'password' };
      const mockUser = { id: '1', email: 'test@example.com', password: '$2a$10$hash' };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('token');

      const result = await service.login(credentials);

      expect(result).toBeDefined();
      expect(result.token).toBe('token');
    });

    it('should reject invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
    });
  });
});
```

### Controller Tests

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { AuthService } from '@/services/AuthService';
import { mock, MockProxy } from 'jest-mock-extended';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: MockProxy<AuthService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockAuthService = mock<AuthService>();
    controller = new AuthController(mockAuthService);

    mockReq = { body: {}, params: {}, query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('login', () => {
    it('should return token on successful login', async () => {
      mockReq.body = { email: 'test@example.com', password: 'password' };
      mockAuthService.login.mockResolvedValue({ token: 'jwt-token', user: {} as any });

      await controller.login(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        token: 'jwt-token',
        user: expect.any(Object)
      });
    });
  });
});
```

### Component Tests

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LoginPage } from '@/pages/LoginPage';
import { BrowserRouter } from 'react-router-dom';

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  it('should render login form', () => {
    renderWithRouter(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    renderWithRouter(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.user-name')).toContainText('Admin');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });
});
```

---

## Testing Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should calculate total score', () => {
  // Arrange - Set up test data
  const scores = [95, 87, 92, 88];

  // Act - Execute the code under test
  const total = calculateTotalScore(scores);

  // Assert - Verify the result
  expect(total).toBe(362);
});
```

### Setup and Teardown

```typescript
describe('Database operations', () => {
  beforeAll(async () => {
    // Runs once before all tests
    await database.connect();
  });

  beforeEach(async () => {
    // Runs before each test
    await database.clear();
    await database.seed();
  });

  afterEach(async () => {
    // Runs after each test
    await database.clear();
  });

  afterAll(async () => {
    // Runs once after all tests
    await database.disconnect();
  });
});
```

### Test Data Builders

```typescript
// Test data factory
const createMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  isActive: true,
  ...overrides
});

it('should update user profile', async () => {
  const user = createMockUser({ role: 'ADMIN' });
  mockPrisma.user.findUnique.mockResolvedValue(user as any);

  const result = await service.updateProfile(user.id, { name: 'New Name' });

  expect(result.name).toBe('New Name');
});
```

### Parameterized Tests

```typescript
describe.each([
  ['admin@example.com', true],
  ['user@example.com', true],
  ['invalid-email', false],
  ['', false],
])('validateEmail(%s)', (email, expected) => {
  it(`should return ${expected}`, () => {
    expect(validateEmail(email)).toBe(expected);
  });
});
```

---

## Mocking Strategies

### Mocking Prisma

```typescript
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

let mockPrisma: DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockPrisma = mockDeep<PrismaClient>();
});

// Mock successful query
mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' } as any);

// Mock error
mockPrisma.user.create.mockRejectedValue(new Error('Database error'));

// Mock empty result
mockPrisma.user.findMany.mockResolvedValue([]);
```

### Mocking Redis

```typescript
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn()
  }));
});
```

### Mocking External Services

```typescript
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
  })
}));
```

### Mocking File System

```typescript
import fs from 'fs';
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;
mockFs.readFileSync.mockReturnValue('file contents');
```

### Mocking JWT

```typescript
import jwt from 'jsonwebtoken';
jest.mock('jsonwebtoken');

const mockJwt = jwt as jest.Mocked<typeof jwt>;
mockJwt.sign.mockReturnValue('mock-token' as any);
mockJwt.verify.mockReturnValue({ userId: '1' } as any);
```

### Mocking Bcrypt

```typescript
import bcrypt from 'bcryptjs';
jest.mock('bcryptjs');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
mockBcrypt.hash.mockResolvedValue('$2a$10$hashedpassword' as never);
mockBcrypt.compare.mockResolvedValue(true as never);
```

---

## Common Scenarios

### Testing Async Functions

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

it('should handle async errors', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message');
});
```

### Testing Promises

```typescript
it('should resolve promise', () => {
  return expect(promiseFunction()).resolves.toBe('value');
});

it('should reject promise', () => {
  return expect(promiseFunction()).rejects.toThrow();
});
```

### Testing Callbacks

```typescript
it('should call callback', (done) => {
  functionWithCallback((result) => {
    expect(result).toBe('value');
    done();
  });
});
```

### Testing Error Handling

```typescript
it('should throw error for invalid input', () => {
  expect(() => validateInput(null)).toThrow('Input is required');
});

it('should handle service errors', async () => {
  mockService.method.mockRejectedValue(new Error('Service error'));

  await expect(controller.method()).rejects.toThrow('Service error');
});
```

### Testing Timeouts

```typescript
it('should timeout after 5 seconds', async () => {
  jest.useFakeTimers();

  const promise = delayedFunction();
  jest.advanceTimersByTime(5000);

  await expect(promise).rejects.toThrow('Timeout');

  jest.useRealTimers();
});
```

---

## Debugging Tests

### Running Single Tests

```bash
# Run specific test file
npm test -- AuthService.test.ts

# Run specific test case
npm test -- -t "should authenticate user"

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Playwright Debugging

```bash
# Debug mode (step through)
npx playwright test --debug

# UI mode (visual debugger)
npm run test:e2e:ui

# Headed mode (watch browser)
npm run test:e2e:headed
```

### Common Debug Commands

```typescript
// Print to console
console.log('Debug value:', value);

// Debug specific mock calls
console.log(mockService.method.mock.calls);

// Check mock results
console.log(mockService.method.mock.results);

// Breakpoint in test
debugger;
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run test:coverage

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Coverage Reports

```bash
# Generate coverage
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Upload to Codecov
bash <(curl -s https://codecov.io/bash)
```

---

## Coverage Goals

### Target Coverage

```
Global:
├── Branches:    80%
├── Functions:   80%
├── Lines:       80%
└── Statements:  80%

Services:        85%+ (critical business logic)
Middleware:      80%+ (security-critical)
Controllers:     75%+ (API layer)
Repositories:    80%+ (data access)
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage summary
npm run test:coverage -- --coverageReporters=text-summary

# Coverage for specific path
npm run test:coverage -- --collectCoverageFrom=src/services/**/*.ts
```

### Interpreting Coverage

- **High Coverage ≠ Good Tests** - Focus on quality over quantity
- **Critical Paths First** - Prioritize authentication, authorization, data integrity
- **100% Not Required** - Diminishing returns above 85-90%
- **Uncovered Code** - May indicate dead code or error paths

---

## Test Organization

### Directory Structure

```
/var/www/event-manager/
├── tests/
│   ├── setup.ts                    # Test configuration
│   ├── unit/
│   │   ├── services/              # Service tests (51/76)
│   │   ├── controllers/           # Controller tests (65 scaffolds)
│   │   ├── repositories/          # Repository tests
│   │   ├── middleware/            # Middleware tests
│   │   └── utils/                 # Utility tests
│   ├── integration/
│   │   ├── api/                   # API integration tests
│   │   └── database/              # Database tests
│   └── e2e/
│       ├── auth.e2e.test.ts       # Authentication flows
│       ├── scoring.e2e.test.ts    # Scoring workflows
│       └── admin.e2e.test.ts      # Admin workflows
├── frontend/src/
│   ├── components/__tests__/      # Component tests (123 scaffolds)
│   ├── pages/__tests__/           # Page tests
│   ├── hooks/__tests__/           # Hook tests
│   └── contexts/__tests__/        # Context tests
└── jest.config.js                 # Jest configuration
```

### Naming Conventions

```
Source file:        AuthService.ts
Test file:          AuthService.test.ts
Mock file:          AuthService.mock.ts
Test utilities:     test-utils.ts
```

---

## Troubleshooting

### Common Issues

#### Tests Timing Out

```typescript
// Increase timeout for slow tests
it('slow operation', async () => {
  // ... test code
}, 10000); // 10 second timeout

// Or globally in jest.config.js
testTimeout: 30000
```

#### Mock Not Working

```typescript
// Ensure mock is before import
jest.mock('@/services/AuthService');
import { AuthService } from '@/services/AuthService';

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

#### Database Conflicts

```bash
# Use separate test database
DATABASE_URL=postgresql://localhost:5432/event_manager_test npm test

# Run tests sequentially
npm run test:integration -- --runInBand
```

#### Memory Leaks

```typescript
// Cleanup after tests
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await redis.disconnect();
});
```

#### Flaky Tests

```typescript
// Use waitFor for async updates
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// Avoid arbitrary timeouts
await new Promise(resolve => setTimeout(resolve, 1000)); // Bad

// Use proper async handling
await screen.findByText('Success'); // Good
```

---

## Additional Resources

- [Testing Standards](./testing-standards.md) - Quality guidelines
- [Testing Examples](./testing-examples.md) - Detailed code examples
- [Testing Workflows](./testing-workflows.md) - Development workflows
- [Testing Quick Reference](./testing-quick-reference.md) - Command cheat sheet
- [Coverage Report](./testing-coverage-report.md) - Current test coverage

### External Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)

---

**Last Updated:** November 13, 2025
**Maintained By:** Event Manager Development Team
**Questions:** See [Testing Quick Reference](./testing-quick-reference.md) or raise an issue
