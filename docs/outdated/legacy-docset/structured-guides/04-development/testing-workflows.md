# Testing Workflows

**Last Updated:** November 13, 2025
**Purpose:** Development workflows and testing processes

---

## Table of Contents

1. [TDD Workflow](#tdd-workflow)
2. [Adding Tests to Existing Code](#adding-tests-to-existing-code)
3. [Testing New Features](#testing-new-features)
4. [Regression Testing](#regression-testing)
5. [Pre-Commit Testing](#pre-commit-testing)
6. [PR Testing Requirements](#pr-testing-requirements)
7. [Manual Testing Integration](#manual-testing-integration)

---

## TDD Workflow

**Test-Driven Development** - Write tests before implementation

### The Red-Green-Refactor Cycle

```
1. RED    → Write failing test
2. GREEN  → Write minimal code to pass
3. REFACTOR → Improve code while keeping tests green
```

### Step-by-Step TDD Process

#### Step 1: Write the Test (RED)

Start with a failing test that describes what you want to build:

```typescript
// tests/unit/services/NewFeatureService.test.ts
describe('NewFeatureService', () => {
  describe('calculateDiscount', () => {
    it('should apply 10% discount for orders over $100', () => {
      // ARRANGE
      const service = new NewFeatureService();
      const order = { total: 150 };

      // ACT
      const result = service.calculateDiscount(order);

      // ASSERT
      expect(result.discount).toBe(15);
      expect(result.finalTotal).toBe(135);
    });
  });
});
```

**Run the test:**
```bash
npm test -- NewFeatureService.test.ts
```

**Expected Result:** Test fails (method doesn't exist yet)

#### Step 2: Write Minimal Code (GREEN)

Write just enough code to make the test pass:

```typescript
// src/services/NewFeatureService.ts
export class NewFeatureService {
  calculateDiscount(order: { total: number }) {
    // Simplest implementation that passes
    if (order.total > 100) {
      const discount = order.total * 0.1;
      return {
        discount,
        finalTotal: order.total - discount
      };
    }
    return { discount: 0, finalTotal: order.total };
  }
}
```

**Run the test:**
```bash
npm test -- NewFeatureService.test.ts
```

**Expected Result:** Test passes (GREEN)

#### Step 3: Add More Tests

Add tests for edge cases and additional scenarios:

```typescript
it('should apply no discount for orders under $100', () => {
  const service = new NewFeatureService();
  const order = { total: 50 };

  const result = service.calculateDiscount(order);

  expect(result.discount).toBe(0);
  expect(result.finalTotal).toBe(50);
});

it('should apply 20% discount for orders over $500', () => {
  const service = new NewFeatureService();
  const order = { total: 600 };

  const result = service.calculateDiscount(order);

  expect(result.discount).toBe(120);
  expect(result.finalTotal).toBe(480);
});
```

#### Step 4: Refactor

Improve the code while keeping tests green:

```typescript
export class NewFeatureService {
  private readonly DISCOUNT_TIERS = [
    { threshold: 500, rate: 0.2 },
    { threshold: 100, rate: 0.1 }
  ];

  calculateDiscount(order: { total: number }) {
    const tier = this.DISCOUNT_TIERS.find(t => order.total >= t.threshold);

    if (!tier) {
      return { discount: 0, finalTotal: order.total };
    }

    const discount = order.total * tier.rate;
    return {
      discount,
      finalTotal: order.total - discount
    };
  }
}
```

**Run all tests:**
```bash
npm test -- NewFeatureService.test.ts
```

**Expected Result:** All tests still pass

### TDD Benefits

1. **Better Design** - Forces you to think about API before implementation
2. **Confidence** - Code is tested from the start
3. **Documentation** - Tests serve as usage examples
4. **No Wasted Effort** - Only write code that's needed

### When to Use TDD

✅ **Good for:**
- New features
- Complex business logic
- Bug fixes (write test that reproduces bug)
- Algorithms and calculations

❌ **Less suitable for:**
- Exploratory/prototype code
- UI styling tweaks
- Simple CRUD operations

---

## Adding Tests to Existing Code

**Scenario:** You have code without tests and need to add coverage.

### Process

#### Step 1: Analyze the Code

```typescript
// Existing code without tests
export class UserService {
  constructor(private prisma: PrismaClient) {}

  async createUser(data: CreateUserInput) {
    // Validate email
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email');
    }

    // Check for duplicate
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      throw new Error('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword
      }
    });
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

**Identify what to test:**
- ✅ Valid user creation
- ✅ Email validation
- ✅ Duplicate email handling
- ✅ Password hashing
- ✅ Database errors

#### Step 2: Create Test File

```typescript
import 'reflect-metadata';
import { UserService } from '@/services/UserService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('UserService', () => {
  let service: UserService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new UserService(mockPrisma as any);
  });

  // Tests go here
});
```

#### Step 3: Write Tests for Happy Path First

```typescript
describe('createUser', () => {
  it('should create user with valid data', async () => {
    // ARRANGE
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };

    const hashedPassword = '$2a$10$hashedpassword';
    const createdUser = {
      id: '1',
      ...userData,
      password: hashedPassword
    };

    mockPrisma.user.findUnique.mockResolvedValue(null); // No duplicate
    (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
    mockPrisma.user.create.mockResolvedValue(createdUser as any);

    // ACT
    const result = await service.createUser(userData);

    // ASSERT
    expect(result).toEqual(createdUser);
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });
});
```

#### Step 4: Add Error Cases

```typescript
it('should reject invalid email', async () => {
  await expect(
    service.createUser({
      email: 'invalid-email',
      password: 'password123',
      name: 'Test'
    })
  ).rejects.toThrow('Invalid email');
});

it('should reject duplicate email', async () => {
  mockPrisma.user.findUnique.mockResolvedValue({
    id: '1',
    email: 'test@example.com'
  } as any);

  await expect(
    service.createUser({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test'
    })
  ).rejects.toThrow('Email already exists');
});
```

#### Step 5: Run Tests and Refactor

```bash
npm test -- UserService.test.ts --coverage
```

Check coverage report and add tests for uncovered lines.

### Prioritization for Existing Code

1. **Critical paths first** (authentication, payments, data integrity)
2. **Bug-prone areas** (complex logic, frequent changes)
3. **High-value features** (core business logic)
4. **Simple utilities last** (easy to test, low risk)

---

## Testing New Features

**Scenario:** You're adding a new feature to the application.

### Feature Development Workflow

#### 1. Planning Phase

Before writing code:

```markdown
Feature: Contestant Age Restriction

Acceptance Criteria:
- Categories can have min/max age restrictions
- System validates contestant age against category
- Clear error messages for age violations
- Admins can bypass restrictions

Test Cases Needed:
- Valid age within range
- Age too young
- Age too old
- No restrictions set
- Admin bypass
- Edge cases (exactly min/max age)
```

#### 2. Write Service Tests

```typescript
describe('CategoryRestrictionService', () => {
  describe('validateAge', () => {
    it('should allow age within range', async () => {
      const category = { minAge: 18, maxAge: 35 };
      const contestant = { age: 25 };

      const result = await service.validateAge(contestant, category);

      expect(result.valid).toBe(true);
    });

    it('should reject age below minimum', async () => {
      const category = { minAge: 18, maxAge: 35 };
      const contestant = { age: 16 };

      const result = await service.validateAge(contestant, category);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('minimum age is 18');
    });

    // ... more tests
  });
});
```

#### 3. Implement Service

```typescript
export class CategoryRestrictionService {
  validateAge(contestant: { age: number }, category: { minAge?: number, maxAge?: number }) {
    if (!category.minAge && !category.maxAge) {
      return { valid: true };
    }

    if (category.minAge && contestant.age < category.minAge) {
      return {
        valid: false,
        error: `Contestant must be at least ${category.minAge} years old`
      };
    }

    if (category.maxAge && contestant.age > category.maxAge) {
      return {
        valid: false,
        error: `Contestant must be no older than ${category.maxAge} years old`
      };
    }

    return { valid: true };
  }
}
```

#### 4. Write Controller Tests

```typescript
describe('POST /api/categories/:id/validate-contestant', () => {
  it('should return 200 when contestant meets age requirements', async () => {
    mockReq.params = { id: 'category-1' };
    mockReq.body = { contestantId: 'contestant-1' };

    mockService.validateAge.mockResolvedValue({ valid: true });

    await controller.validateContestant(mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ valid: true });
  });

  // ... more tests
});
```

#### 5. Write Component Tests

```typescript
describe('ContestantRegistration', () => {
  it('should show age error when contestant too young', async () => {
    renderWithProviders(<ContestantRegistration />);

    // Select category with age restriction
    await userEvent.selectOption(
      screen.getByLabelText('Category'),
      'Adult Division (18-35)'
    );

    // Enter young contestant
    await userEvent.type(screen.getByLabelText('Age'), '16');
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toContainText(
        'minimum age is 18'
      );
    });
  });
});
```

#### 6. Write E2E Tests

```typescript
test('complete registration with age validation', async ({ page }) => {
  await page.goto('/registration');

  await page.selectOption('[name="category"]', 'adult-division');
  await page.fill('[name="age"]', '16');
  await page.click('button[type="submit"]');

  await expect(page.locator('.error-message')).toContainText(
    'minimum age is 18'
  );

  // Fix and resubmit
  await page.fill('[name="age"]', '25');
  await page.click('button[type="submit"]');

  await expect(page.locator('.success-message')).toBeVisible();
});
```

#### 7. Verify All Tests Pass

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Full coverage
npm run test:coverage
```

---

## Regression Testing

**Scenario:** Ensure changes don't break existing functionality.

### Regression Testing Process

#### 1. Before Making Changes

```bash
# Run full test suite to ensure clean baseline
npm run test:coverage

# Document current test results
# All tests should be passing
```

#### 2. Make Your Changes

```typescript
// Modify existing code
export class ScoringService {
  // Changed scoring algorithm
  calculateFinalScore(scores: number[]): number {
    // New implementation
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }
}
```

#### 3. Run Affected Tests

```bash
# Run tests for modified service
npm test -- ScoringService.test.ts

# Check if any tests fail
```

#### 4. Update Tests if Needed

If tests fail due to intentional changes:

```typescript
// Update test expectations
it('should calculate average score', () => {
  const scores = [90, 85, 95];
  const result = service.calculateFinalScore(scores);

  // Updated expectation for new algorithm
  expect(result).toBe(90); // Average instead of sum
});
```

#### 5. Run Full Regression Suite

```bash
# Run all tests to catch ripple effects
npm test

# Run with coverage to ensure no gaps
npm run test:coverage
```

#### 6. Check Related Features

```bash
# Test related services
npm test -- --testPathPattern="Scoring|Results|Winner"

# Test E2E workflows that use scoring
npm run test:e2e -- scoring
```

### Regression Checklist

Before committing changes:

- [ ] All existing tests still pass
- [ ] New tests added for new functionality
- [ ] Coverage hasn't decreased
- [ ] Integration tests pass
- [ ] E2E tests for critical flows pass
- [ ] No console errors in test output
- [ ] Performance tests still pass (if applicable)

---

## Pre-Commit Testing

**Workflow:** Run tests before committing code.

### Git Pre-Commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running pre-commit tests..."

# Run linter
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Please fix errors before committing."
  exit 1
fi

# Run type checking
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ Type check failed. Please fix errors before committing."
  exit 1
fi

# Run unit tests for changed files
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.ts$')

if [ -n "$CHANGED_FILES" ]; then
  echo "Running tests for changed files..."
  npm test -- --findRelatedTests $CHANGED_FILES --bail

  if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix before committing."
    exit 1
  fi
fi

echo "✅ Pre-commit checks passed!"
exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Using Husky (Recommended)

Install Husky:
```bash
npm install -D husky
npx husky install
```

Add pre-commit hook:
```bash
npx husky add .git/hooks/pre-commit "npm run pre-commit"
```

Add script to `package.json`:
```json
{
  "scripts": {
    "pre-commit": "npm run lint && npm run type-check && npm test -- --findRelatedTests $(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.ts$')"
  }
}
```

### Pre-Commit Workflow

```
1. Make changes
2. Stage files:           git add .
3. Attempt commit:        git commit -m "message"
4. Hook runs automatically:
   ├── Lint
   ├── Type check
   └── Test changed files
5. If pass: Commit succeeds
6. If fail: Fix issues and try again
```

---

## PR Testing Requirements

**Workflow:** Ensure all tests pass before merging pull requests.

### PR Checklist

Every PR must include:

1. **Tests for New Code**
   - [ ] Unit tests for new services/utilities
   - [ ] Controller tests for new endpoints
   - [ ] Component tests for new UI
   - [ ] Integration tests for new workflows

2. **Updated Tests**
   - [ ] Updated tests for modified code
   - [ ] No skipped tests (test.skip)
   - [ ] No focused tests (test.only)

3. **Coverage Requirements**
   - [ ] Overall coverage ≥ 80%
   - [ ] Service coverage ≥ 85%
   - [ ] Controller coverage ≥ 75%
   - [ ] No coverage decrease

4. **Test Quality**
   - [ ] Tests follow AAA pattern
   - [ ] Descriptive test names
   - [ ] No commented-out tests
   - [ ] No console.log statements

### CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/test.yml`):

```yaml
name: Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run integration tests
        run: npm run test:integration

      - name: Check coverage thresholds
        run: |
          if [ -f coverage/coverage-summary.json ]; then
            node scripts/check-coverage.js
          fi

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Comment PR
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(
              fs.readFileSync('coverage/coverage-summary.json', 'utf8')
            );
            const percent = coverage.total.lines.pct;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Test Coverage: ${percent}%\n\nAll tests passed! ✅`
            });
```

### Review Process

1. **Automated Checks**
   - CI pipeline runs all tests
   - Coverage report generated
   - Linting and type checking

2. **Manual Review**
   - Reviewer checks test quality
   - Verifies edge cases are covered
   - Ensures no anti-patterns

3. **Approval Criteria**
   - ✅ All CI checks pass
   - ✅ Coverage meets thresholds
   - ✅ Tests are well-written
   - ✅ No unrelated test changes

---

## Manual Testing Integration

**Workflow:** Coordinate automated and manual testing.

### When to Manual Test

Even with comprehensive automated tests, manual testing is needed for:

1. **User Experience**
   - Visual design
   - Layout responsiveness
   - Animation smoothness
   - Accessibility with screen readers

2. **Complex Workflows**
   - Multi-user scenarios
   - Real-time features
   - Edge cases not in automation

3. **Integration Points**
   - Third-party services
   - Payment processing
   - Email delivery

### Manual Testing Checklist

Before release:

```markdown
## Pre-Release Manual Testing

### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Logout
- [ ] Session timeout
- [ ] Password reset flow

### Core Features
- [ ] Create event
- [ ] Add contestants
- [ ] Assign judges
- [ ] Submit scores
- [ ] Generate reports
- [ ] Export data

### Cross-Browser
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast
- [ ] Focus indicators

### Performance
- [ ] Page load times < 3s
- [ ] No console errors
- [ ] No memory leaks
- [ ] Works with 1000+ records
```

### Exploratory Testing

Set aside time for unscripted testing:

```markdown
## Exploratory Testing Session (30 minutes)

Goal: Find edge cases and UX issues

Areas to explore:
- Unusual input combinations
- Rapid clicking/interaction
- Network disconnection scenarios
- Browser back/forward navigation
- Opening multiple tabs
- Copy/paste operations
```

### Bug Reporting from Manual Testing

When manual testing finds a bug:

1. **Document the bug**
   ```markdown
   Title: Score submission fails with special characters

   Steps to reproduce:
   1. Login as judge
   2. Navigate to scoring page
   3. Enter score with comment: "Great! #1 performance"
   4. Click submit

   Expected: Score saved successfully
   Actual: Error: "Invalid characters in comment"

   Browser: Chrome 120
   ```

2. **Write a failing test**
   ```typescript
   it('should allow special characters in comments', async () => {
     const score = {
       value: 95,
       comment: 'Great! #1 performance'
     };

     const result = await service.submitScore(score);

     expect(result.comment).toBe('Great! #1 performance');
   });
   ```

3. **Fix the code**
4. **Verify test passes**
5. **Manually verify fix**

---

## Related Documentation

- [Testing Guide](./testing-guide.md) - Complete testing guide
- [Testing Standards](./testing-standards.md) - Quality requirements
- [Testing Examples](./testing-examples.md) - Code examples
- [Testing Quick Reference](./testing-quick-reference.md) - Command reference
- [Coverage Report](./testing-coverage-report.md) - Current coverage

---

**Last Updated:** November 13, 2025
**Maintained By:** Event Manager Development Team
**Integrate testing into your daily workflow for better code quality**
