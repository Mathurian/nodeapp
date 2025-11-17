# 📄 PHASE 2: TEST INFRASTRUCTURE RECOVERY & CI/CD
**Duration:** Days 8-14
**Focus:** Fix all broken tests, implement automated CI/CD pipeline
**Risk Level:** MEDIUM - No user-facing changes
**Dependencies:** Phase 1 completed

---

## 🎯 PHASE OBJECTIVES

1. ✅ Fix Jest configuration to run all 236 backend tests
2. ✅ Fix Playwright configuration for 190 E2E tests
3. ✅ Achieve 85%+ code coverage
4. ✅ Implement GitHub Actions CI/CD pipeline
5. ✅ Add automated testing on pull requests
6. ✅ Generate and publish coverage reports
7. ✅ Set up test database automation

---

## 📋 DAY 8: FIX JEST CONFIGURATION

### Task 2.1: Resolve Jest/Babel Conflict (4 hours)

**Current Error:**
```
TypeError: The "original" argument must be of type function
```

**Root Cause:** Babel-Istanbul plugin conflicts with ts-jest isolated modules

#### Fix jest.config.js

**File:** `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],

  // FIXED: Remove babel-jest transform
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      isolatedModules: true,
      tsconfig: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        skipLibCheck: true,
      }
    }],
  },

  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*.ts',
    '!src/config/**',
    '!src/server.ts',
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },

  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  maxWorkers: '50%',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
```

#### Fix tests/setup.ts

**File:** `tests/setup.ts`

```typescript
import 'reflect-metadata';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock Prisma
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  event: { /* ... */ },
  // ... other models
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: jest.fn((callback) => callback(mockPrismaClient)),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

// Mock tsyringe container
const mockContainer = {
  resolve: jest.fn((token) => {
    if (token === 'PrismaClient') return mockPrismaClient;
    if (typeof token === 'function') return new token();
    return {};
  }),
  register: jest.fn(),
  clearInstances: jest.fn(),
};

jest.mock('tsyringe', () => ({
  container: mockContainer,
  injectable: () => (target: any) => target,
  inject: () => () => {},
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock cache
jest.mock('../src/utils/cache', () => ({
  userCache: {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
  },
}));

// Global test utilities
export const createMockRequest = (overrides = {}): any => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  tenantId: 'test-tenant',
  ...overrides,
});

export const createMockResponse = (): any => {
  const res: any = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  };
  return res;
};

afterEach(() => {
  jest.clearAllMocks();
});

export { mockPrismaClient, mockContainer };
```

#### Verification

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Run single test
npm test -- tests/unit/controllers/usersController.test.ts

# Run all unit tests
npm test -- tests/unit

# Run with coverage
npm test -- --coverage
```

**Expected:** All tests pass, coverage report generated

---

## 📋 DAY 9: E2E TEST CONFIGURATION

### Task 2.2: Configure Playwright Tests (3 hours)

#### Update playwright.config.ts

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],

  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: process.env.SKIP_WEB_SERVER === 'true' ? [] : [
    {
      command: 'npm run dev',
      port: 3000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd frontend && npm run dev',
      port: 5173,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

#### Create E2E Helpers

**File:** `tests/e2e/helpers.ts`

```typescript
import { Page } from '@playwright/test';

export async function loginAsUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 5000 });
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await page.waitForURL('/login');
}

export async function waitForSuccessMessage(page: Page) {
  await page.waitForSelector('.toast-success', { timeout: 5000 });
}

export async function waitForErrorMessage(page: Page) {
  await page.waitForSelector('.toast-error', { timeout: 5000 });
}
```

#### Update package.json

```json
{
  "scripts": {
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --runInBand",
    "test:unit": "jest tests/unit --runInBand",
    "test:integration": "jest tests/integration --runInBand",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:chromium": "playwright test --project=chromium",
    "test:all": "npm run test:coverage && npm run test:e2e"
  }
}
```

---

## 📋 DAY 10-11: CI/CD PIPELINE

### Task 2.3: GitHub Actions Workflow (6 hours)

#### Main CI/CD Workflow

**File:** `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop, claude/* ]
  pull_request:
    branches: [ main, develop ]

jobs:
  # Backend tests
  backend-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
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
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Prisma migrations
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
        run: npx prisma migrate deploy

      - name: Run unit tests
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
        run: npm run test:unit

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
        run: npm run test:integration

      - name: Generate coverage report
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info
          flags: backend

  # Frontend tests
  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run frontend linting
        working-directory: ./frontend
        run: npm run lint

      - name: Type check
        working-directory: ./frontend
        run: npm run type-check

      - name: Build frontend
        working-directory: ./frontend
        run: npm run build

  # E2E tests
  e2e-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Build frontend
        working-directory: ./frontend
        run: npm run build

      - name: Run Prisma migrations
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
        run: npx prisma migrate deploy

      - name: Seed test data
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
        run: npx ts-node prisma/seed.ts

      - name: Start backend
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
          NODE_ENV: test
        run: npm run dev &

      - name: Wait for backend
        run: npx wait-on http://localhost:3000/api/health

      - name: Start frontend
        working-directory: ./frontend
        run: npm run dev &

      - name: Wait for frontend
        run: npx wait-on http://localhost:5173

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  # Lint and security
  lint-and-security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run security audit
        run: npm audit --audit-level=moderate

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

---

## 📋 DAY 12: TEST DATABASE AUTOMATION

### Task 2.4: Automated Test Database Setup (3 hours)

**File:** `scripts/setup-test-db.sh`

```bash
#!/bin/bash

set -e

echo "🗄️  Setting up test database..."

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-test_user}"
DB_PASSWORD="${DB_PASSWORD:-test_password}"
DB_NAME="${DB_NAME:-test_db}"

export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Drop existing test database
echo "Dropping existing test database..."
psql -U postgres -h $DB_HOST -c "DROP DATABASE IF EXISTS ${DB_NAME};" || true

# Create test database
echo "Creating test database..."
psql -U postgres -h $DB_HOST -c "CREATE DATABASE ${DB_NAME};"

# Create test user
echo "Creating test user..."
psql -U postgres -h $DB_HOST -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" || true

# Grant privileges
echo "Granting privileges..."
psql -U postgres -h $DB_HOST -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

# Run migrations
echo "Running migrations..."
npx prisma migrate deploy

# Seed data
echo "Seeding test data..."
npx ts-node prisma/seed.ts

echo "✅ Test database setup complete!"
```

**File:** `scripts/teardown-test-db.sh`

```bash
#!/bin/bash

set -e

DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-test_db}"

echo "🗑️  Tearing down test database..."
psql -U postgres -h $DB_HOST -c "DROP DATABASE IF EXISTS ${DB_NAME};"
echo "✅ Test database removed!"
```

**File:** `package.json` (add scripts)

```json
{
  "scripts": {
    "test:db:setup": "bash scripts/setup-test-db.sh",
    "test:db:teardown": "bash scripts/teardown-test-db.sh",
    "test:db:reset": "npm run test:db:teardown && npm run test:db:setup"
  }
}
```

---

## 📋 DAY 13: COVERAGE REPORTING

### Task 2.5: Implement Coverage Tracking (2 hours)

**File:** `.github/workflows/coverage.yml`

```yaml
name: Coverage Report

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  coverage:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Generate coverage badge
        uses: cicirello/jacoco-badge-generator@v2
        with:
          badges-directory: badges
          generate-branches-badge: true
          generate-summary: true

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          file: ./coverage/lcov.info
          fail_ci_if_error: true

      - name: Comment PR with coverage
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**File:** `README.md` (add badges)

```markdown
# Event Manager Application

![Build Status](https://github.com/your-org/event-manager/workflows/CI%2FCD%20Pipeline/badge.svg)
![Coverage](https://codecov.io/gh/your-org/event-manager/branch/main/graph/badge.svg)
![Tests](https://img.shields.io/badge/tests-236%20passed-success)
![E2E Tests](https://img.shields.io/badge/e2e-190%20passed-success)
```

---

## 📋 DAY 14: DOCUMENTATION & VERIFICATION

### Task 2.6: Test Documentation (2 hours)

**File:** `docs/TESTING.md`

```markdown
# Testing Guide

## Running Tests

### Backend Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Frontend E2E Tests

```bash
# All E2E tests
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Specific browser
npm run test:e2e:chromium
```

### Test Database

```bash
# Setup test database
npm run test:db:setup

# Reset test database
npm run test:db:reset

# Teardown test database
npm run test:db:teardown
```

## Writing Tests

### Unit Test Example

```typescript
describe('UserService', () => {
  it('should create a new user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      role: 'ADMIN'
    };

    const result = await userService.createUser(userData);

    expect(result).toBeDefined();
    expect(result.email).toBe(userData.email);
  });
});
```

### E2E Test Example

```typescript
test('should login successfully', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

## Coverage Requirements

- **Global:** 80%+
- **Services:** 85%+
- **Middleware:** 80%+
- **Controllers:** 75%+
```

---

## ✅ PHASE 2 COMPLETION CHECKLIST

### Backend Tests
- [ ] All 236 test files execute without errors
- [ ] Unit tests: 100+ tests passing
- [ ] Integration tests: 80+ tests passing
- [ ] E2E backend tests: 50+ tests passing
- [ ] Coverage: 85%+ overall

### Frontend Tests
- [ ] All 190 Playwright tests execute
- [ ] Chromium tests passing
- [ ] Firefox tests passing (optional)
- [ ] Screenshots captured on failure
- [ ] Videos captured on failure

### CI/CD
- [ ] GitHub Actions workflows created
- [ ] Tests run on every PR
- [ ] Coverage reports published
- [ ] Codecov integration working
- [ ] Test database automation working

### Documentation
- [ ] Testing guide written
- [ ] README badges added
- [ ] Test writing examples provided
- [ ] CI/CD process documented

### Metrics
- [ ] Test execution time < 10 minutes
- [ ] E2E execution time < 15 minutes
- [ ] No flaky tests
- [ ] Coverage trends tracked

---

**Next:** [Phase 3: Navigation & UX Overhaul](./phase-3-navigation.md)
