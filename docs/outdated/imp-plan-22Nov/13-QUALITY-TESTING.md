# Phase 4: Code Quality - Testing Improvements

**Priority:** 🟢 CODE QUALITY
**Timeline:** Week 3-4
**Risk Level:** LOW
**Dependencies:** All code refactoring complete

---

## Testing Strategy

### 1. Setup Testing Framework (2 hours)

**Install dependencies:**

```bash
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev supertest @types/supertest
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

**Jest configuration:**

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
```

### 2. Unit Tests (20 hours)

**Test services:**

```typescript
// test/services/EventService.test.ts
import { EventService } from '../../src/services/EventService';
import prisma from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  event: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('EventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create event successfully', async () => {
      const mockEvent = {
        id: 1,
        name: 'Test Event',
        tenantId: 1,
      };

      (prisma.event.create as jest.Mock).mockResolvedValue(mockEvent);

      const result = await EventService.create({
        name: 'Test Event',
        tenantId: 1,
      });

      expect(result).toEqual(mockEvent);
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: { name: 'Test Event', tenantId: 1 },
      });
    });

    it('should throw error on invalid data', async () => {
      await expect(
        EventService.create({ name: '', tenantId: 1 })
      ).rejects.toThrow('Invalid event data');
    });
  });

  describe('findById', () => {
    it('should return event when found', async () => {
      const mockEvent = { id: 1, name: 'Test Event' };
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(mockEvent);

      const result = await EventService.findById(1);

      expect(result).toEqual(mockEvent);
    });

    it('should return null when not found', async () => {
      (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await EventService.findById(999);

      expect(result).toBeNull();
    });
  });
});
```

**Test utilities:**

```typescript
// test/utils/password.test.ts
import { PasswordService } from '../../src/utils/password';

describe('PasswordService', () => {
  describe('hash', () => {
    it('should hash password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2a$')).toBe(true);
    });
  });

  describe('compare', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hash(password);

      const result = await PasswordService.compare(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hash(password);

      const result = await PasswordService.compare('WrongPassword', hash);

      expect(result).toBe(false);
    });
  });

  describe('validate', () => {
    it('should accept valid password', () => {
      expect(PasswordService.validate('ValidPass123!')).toBe(true);
    });

    it('should reject short password', () => {
      expect(PasswordService.validate('Short1!')).toBe(false);
    });

    it('should reject password without uppercase', () => {
      expect(PasswordService.validate('lowercase123!')).toBe(false);
    });
  });
});
```

### 3. Integration Tests (15 hours)

**Test API endpoints:**

```typescript
// test/integration/events.test.ts
import request from 'supertest';
import app from '../../src/server';
import prisma from '../../src/config/database';

describe('Events API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup test database
    await prisma.$executeRaw`TRUNCATE TABLE "Event" CASCADE`;

    // Create test user and get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'test123' });

    authToken = response.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/events', () => {
    it('should return all events', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/events')
        .expect(401);
    });
  });

  describe('POST /api/events', () => {
    it('should create event', async () => {
      const eventData = {
        name: 'Test Event',
        startDate: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body.data).toMatchObject({
        name: eventData.name,
      });
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);
    });
  });
});
```

### 4. End-to-End Tests (10 hours)

**Install Playwright:**

```bash
npm install --save-dev @playwright/test
npx playwright install
```

**E2E test example:**

```typescript
// test/e2e/event-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Event Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'test123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create new event', async ({ page }) => {
    // Navigate to events page
    await page.click('text=Events');
    await expect(page).toHaveURL('/events');

    // Click create button
    await page.click('text=Create Event');

    // Fill form
    await page.fill('[name="name"]', 'Annual Conference');
    await page.fill('[name="description"]', 'Yearly meeting');
    await page.fill('[name="startDate"]', '2025-12-01');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('text=Event created successfully')).toBeVisible();
    await expect(page.locator('text=Annual Conference')).toBeVisible();
  });
});
```

### 5. Test Coverage (Ongoing)

**Measure coverage:**

```bash
npm test -- --coverage
```

**Target coverage:**
- Statements: 70%
- Branches: 70%
- Functions: 70%
- Lines: 70%

**Priority for testing:**
1. Services (business logic)
2. Utilities
3. Middleware
4. Controllers
5. Routes (integration tests)

### 6. Continuous Integration (3 hours)

**GitHub Actions workflow:**

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: event_manager_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/event_manager_test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Test Organization

```
test/
├── unit/
│   ├── services/
│   ├── utils/
│   └── middleware/
├── integration/
│   ├── api/
│   └── database/
├── e2e/
│   └── flows/
├── fixtures/
│   └── testData.ts
└── setup.ts
```

---

## Estimated Effort

| Task | Time |
|------|------|
| Setup testing | 2 hours |
| Unit tests | 20 hours |
| Integration tests | 15 hours |
| E2E tests | 10 hours |
| CI/CD setup | 3 hours |
| **Total** | **50 hours** |

---

## Success Criteria

✅ **70%+ code coverage**
✅ **All critical paths tested**
✅ **CI/CD pipeline running tests**
✅ **E2E tests for main workflows**
✅ **Tests passing on every commit**

---

**Status:** READY TO IMPLEMENT
**Owner:** QA + Backend Development Team
