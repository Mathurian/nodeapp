# Testing Standards

**Last Updated:** November 13, 2025
**Application Version:** 2.0
**Purpose:** Define quality standards for all tests in the Event Manager project

---

## Table of Contents

1. [Overview](#overview)
2. [Quality Checklist](#quality-checklist)
3. [Minimum Requirements](#minimum-requirements)
4. [Code Patterns](#code-patterns)
5. [What Makes a Good Test](#what-makes-a-good-test)
6. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
7. [Review Criteria](#review-criteria)
8. [Test Quality Metrics](#test-quality-metrics)

---

## Overview

This document defines the quality standards for all tests in the Event Manager project. Following these standards ensures:

- **Reliability** - Tests consistently pass or fail for the right reasons
- **Maintainability** - Tests are easy to understand and update
- **Value** - Tests catch real bugs and prevent regressions
- **Speed** - Test suite runs quickly enough for continuous development

---

## Quality Checklist

Before submitting any test for review, ensure it meets these criteria:

### Basic Requirements

- [ ] Test file has descriptive header comment
- [ ] All imports are organized and necessary
- [ ] Tests use proper TypeScript types (no `any` without justification)
- [ ] Each test has a clear, descriptive name
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Setup and teardown logic is in appropriate hooks
- [ ] All mocks are cleaned up after each test
- [ ] No console.log or debugging code left in
- [ ] No commented-out code
- [ ] No test.skip or test.only (unless temporary for debugging)

### Coverage Requirements

- [ ] All public methods are tested
- [ ] Success paths are covered
- [ ] Error paths are covered
- [ ] Edge cases are handled
- [ ] Input validation is tested
- [ ] Minimum coverage thresholds are met (see [Coverage Goals](#minimum-requirements))

### Code Quality

- [ ] Tests are independent (don't rely on execution order)
- [ ] Tests are deterministic (same input = same output)
- [ ] Tests use meaningful variable names
- [ ] Magic numbers and strings are avoided or documented
- [ ] Complex test logic is extracted to helper functions
- [ ] Assertions use specific matchers (not just `toBeTruthy()`)

### Documentation

- [ ] Complex test scenarios have explanatory comments
- [ ] Mock data represents realistic scenarios
- [ ] Edge cases explain why they matter
- [ ] Test names describe what is being tested and expected outcome

---

## Minimum Requirements

### Service Tests

**Minimum Lines:** 300+ lines per service test file
**Minimum Test Cases:** 15+ test cases
**Coverage Target:** 85%+

**Required Test Coverage:**
- Constructor and initialization
- All public methods
- Success scenarios for each method
- Error handling (database errors, validation errors, business logic errors)
- Edge cases (null, undefined, empty arrays, boundary values)
- Input validation
- Cache invalidation (if applicable)
- Transaction handling (if applicable)

**Example Structure:**
```typescript
describe('ServiceName', () => {
  // Setup (20-40 lines)
  describe('constructor', () => {
    // 1-2 tests
  });

  describe('methodName', () => {
    // 3-5 tests per method:
    // - Success case
    // - Invalid input
    // - Database error
    // - Edge cases
  });
});
```

### Controller Tests

**Minimum Lines:** 250+ lines per controller test file
**Minimum Test Cases:** 12+ test cases
**Coverage Target:** 75%+

**Required Test Coverage:**
- All route handlers
- Request validation
- Response formatting
- Authentication/authorization checks
- Error handling and status codes
- Query parameter handling
- Request body validation

**Example Structure:**
```typescript
describe('ControllerName', () => {
  // Setup (30-50 lines)

  describe('GET /endpoint', () => {
    // Tests for successful retrieval
    // Tests for not found
    // Tests for invalid parameters
    // Tests for unauthorized access
  });

  describe('POST /endpoint', () => {
    // Tests for successful creation
    // Tests for validation errors
    // Tests for duplicate entries
    // Tests for service errors
  });
});
```

### Component Tests

**Minimum Lines:** 100+ lines per component test file
**Minimum Test Cases:** 8+ test cases
**Coverage Target:** 70%+

**Required Test Coverage:**
- Component renders without crashing
- Props are handled correctly
- User interactions trigger expected behavior
- State changes work as expected
- Error states are displayed
- Loading states are displayed
- Accessibility requirements are met

**Example Structure:**
```typescript
describe('ComponentName', () => {
  // Setup (20-30 lines)

  it('should render without crashing', () => {});
  it('should display correct props', () => {});
  it('should handle user interaction', async () => {});
  it('should show error state', () => {});
  it('should be accessible', () => {});
});
```

### Integration Tests

**Minimum Lines:** 200+ lines per integration test file
**Minimum Test Cases:** 10+ test cases
**Coverage Target:** 80%+

**Required Test Coverage:**
- Complete request/response cycles
- Database transactions
- Error responses with proper status codes
- Authentication flows
- Authorization checks
- Data validation across layers

### E2E Tests

**Minimum Lines:** 150+ lines per E2E test file
**Minimum Test Cases:** 5+ test cases
**Coverage Target:** N/A (focus on critical paths)

**Required Test Coverage:**
- Happy path workflows
- Error handling in UI
- Multi-step processes
- Authentication/logout flows
- Critical business workflows

---

## Code Patterns

### Test Structure Pattern

```typescript
/**
 * ServiceName Unit Tests
 * Brief description of what this service does and why these tests matter
 */

import { ServiceName } from '@/services/ServiceName';
import { DependencyA } from '@/services/DependencyA';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependencyA: DeepMockProxy<DependencyA>;

  beforeEach(() => {
    // Create fresh mocks
    mockDependencyA = mockDeep<DependencyA>();

    // Instantiate service
    service = new ServiceName(mockDependencyA);

    // Clear any previous mock state
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore all mocks
    jest.restoreAllMocks();
  });

  describe('methodName', () => {
    it('should return expected result for valid input', async () => {
      // Arrange
      const input = { id: '1', name: 'Test' };
      const expectedOutput = { id: '1', name: 'Test', processed: true };
      mockDependencyA.process.mockResolvedValue(expectedOutput);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(expectedOutput);
      expect(mockDependencyA.process).toHaveBeenCalledWith(input);
      expect(mockDependencyA.process).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid input', async () => {
      // Arrange
      const invalidInput = { id: null, name: '' };

      // Act & Assert
      await expect(service.methodName(invalidInput))
        .rejects
        .toThrow('Validation failed');
    });

    it('should handle database error gracefully', async () => {
      // Arrange
      const input = { id: '1', name: 'Test' };
      mockDependencyA.process.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.methodName(input))
        .rejects
        .toThrow('Database connection failed');
    });
  });
});
```

### Mock Data Pattern

```typescript
// Good - Reusable test data factories
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

const createMockEvent = (overrides = {}) => ({
  id: 'event-1',
  name: 'Test Event',
  startDate: new Date('2025-12-01'),
  endDate: new Date('2025-12-02'),
  location: 'Test Venue',
  isActive: true,
  ...overrides
});

// Usage
it('should process active user events', async () => {
  const user = createMockUser({ role: 'ADMIN' });
  const event = createMockEvent({ createdBy: user.id });

  // Test logic here
});
```

### Assertion Pattern

```typescript
// Good - Specific assertions
expect(result.id).toBe('user-1');
expect(result.email).toBe('test@example.com');
expect(result.createdAt).toBeInstanceOf(Date);
expect(result.roles).toContain('USER');
expect(result.metadata).toHaveProperty('lastLogin');

// Avoid - Vague assertions
expect(result).toBeTruthy();
expect(result).toBeDefined();
expect(result).not.toBeNull();
```

### Error Testing Pattern

```typescript
// Good - Test specific error types and messages
it('should throw ValidationError for missing required fields', async () => {
  await expect(service.create({}))
    .rejects
    .toThrow(ValidationError);
});

it('should throw specific error message', async () => {
  await expect(service.create({ email: 'invalid' }))
    .rejects
    .toThrow('Email must be valid');
});

// Also good - Test error properties
it('should include field details in validation error', async () => {
  try {
    await service.create({ email: 'invalid' });
    fail('Should have thrown error');
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.field).toBe('email');
    expect(error.value).toBe('invalid');
  }
});
```

---

## What Makes a Good Test

### 1. Clear Intent

```typescript
// Good - Name describes what and why
it('should reject login when user account is suspended', async () => {
  const suspendedUser = createMockUser({ isActive: false });
  mockPrisma.user.findUnique.mockResolvedValue(suspendedUser);

  await expect(authService.login({ email: 'test@example.com', password: 'pass' }))
    .rejects
    .toThrow('Account is suspended');
});

// Bad - Vague name
it('should not login', async () => {
  // What scenario? Why should it not login?
});
```

### 2. Test One Thing

```typescript
// Good - Focused test
it('should hash password during registration', async () => {
  const result = await authService.register({
    email: 'test@example.com',
    password: 'plaintext'
  });

  expect(result.password).not.toBe('plaintext');
  expect(result.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
});

// Bad - Testing multiple unrelated things
it('should register user', async () => {
  const result = await authService.register({ /* ... */ });

  expect(result.password).not.toBe('plaintext'); // Password hashing
  expect(mockMailer.send).toHaveBeenCalled(); // Email sending
  expect(mockCache.set).toHaveBeenCalled(); // Caching
  expect(result.role).toBe('USER'); // Role assignment
  // Too many concerns in one test
});
```

### 3. Independent

```typescript
// Good - Each test sets up its own data
describe('UserService', () => {
  it('should create user', async () => {
    const userData = { email: 'new@example.com', password: 'pass' };
    const result = await service.create(userData);
    expect(result.email).toBe('new@example.com');
  });

  it('should find user by email', async () => {
    const mockUser = createMockUser({ email: 'find@example.com' });
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.findByEmail('find@example.com');
    expect(result.email).toBe('find@example.com');
  });
});

// Bad - Tests depend on each other
describe('UserService', () => {
  let createdUser;

  it('should create user', async () => {
    createdUser = await service.create({ email: 'test@example.com' });
    expect(createdUser).toBeDefined();
  });

  it('should find created user', async () => {
    // This test depends on the previous test
    const result = await service.findByEmail(createdUser.email);
    expect(result).toEqual(createdUser);
  });
});
```

### 4. Fast

```typescript
// Good - Mock external dependencies
it('should send welcome email', async () => {
  const mockMailer = { send: jest.fn().mockResolvedValue({ messageId: '123' }) };
  const service = new UserService(mockPrisma, mockMailer);

  await service.sendWelcomeEmail('test@example.com');

  expect(mockMailer.send).toHaveBeenCalled();
});

// Bad - Slow tests with real dependencies
it('should send welcome email', async () => {
  // Actually sends email - slow and fragile
  await service.sendWelcomeEmail('test@example.com');

  // Checks real inbox - very slow
  const emails = await checkInbox('test@example.com');
  expect(emails).toContainEqual(expect.objectContaining({
    subject: 'Welcome'
  }));
});
```

### 5. Repeatable

```typescript
// Good - Deterministic
it('should format date consistently', () => {
  const date = new Date('2025-01-15T10:30:00Z');
  const result = formatDate(date);
  expect(result).toBe('2025-01-15');
});

// Bad - Non-deterministic
it('should format current date', () => {
  const result = formatDate(new Date()); // Changes every day
  expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
});
```

---

## Anti-Patterns to Avoid

### 1. Testing Implementation Details

```typescript
// Bad - Brittle test coupled to implementation
it('should call database exactly twice', async () => {
  await service.createUser({ email: 'test@example.com' });

  expect(mockPrisma.user.create).toHaveBeenCalledTimes(2);
  // What if we optimize and only call it once?
});

// Good - Test behavior
it('should create user with email', async () => {
  const result = await service.createUser({ email: 'test@example.com' });

  expect(result.email).toBe('test@example.com');
  expect(result.id).toBeDefined();
});
```

### 2. Excessive Mocking

```typescript
// Bad - Mocking everything makes test meaningless
it('should process user', async () => {
  mockService.validateUser.mockReturnValue(true);
  mockService.enrichUser.mockReturnValue(mockUser);
  mockService.saveUser.mockReturnValue(mockUser);

  const result = await service.processUser(mockUser);

  expect(result).toEqual(mockUser);
  // We're just testing mocks returning what we told them to
});

// Good - Mock external dependencies, test real logic
it('should process user by validating and enriching', async () => {
  const inputUser = { email: 'test@example.com', name: '' };
  mockEnrichmentService.enrich.mockResolvedValue({
    name: 'Enriched Name',
    metadata: { source: 'external' }
  });

  const result = await service.processUser(inputUser);

  expect(result.email).toBe('test@example.com');
  expect(result.name).toBe('Enriched Name');
  expect(mockEnrichmentService.enrich).toHaveBeenCalledWith(inputUser);
});
```

### 3. Unclear Test Names

```typescript
// Bad
it('works', () => {});
it('test 1', () => {});
it('should return true', () => {});

// Good
it('should authenticate user with valid credentials', () => {});
it('should reject expired tokens', () => {});
it('should sanitize user input before database insertion', () => {});
```

### 4. Magic Numbers and Strings

```typescript
// Bad
it('should validate age', () => {
  expect(validateAge(17)).toBe(false);
  expect(validateAge(18)).toBe(true);
  expect(validateAge(150)).toBe(false);
});

// Good
it('should validate age within allowed range', () => {
  const MINIMUM_AGE = 18;
  const MAXIMUM_AGE = 120;

  expect(validateAge(MINIMUM_AGE - 1)).toBe(false);
  expect(validateAge(MINIMUM_AGE)).toBe(true);
  expect(validateAge(MAXIMUM_AGE + 1)).toBe(false);
});
```

### 5. Large Test Files Without Organization

```typescript
// Bad - 2000 line file with no organization
describe('UserService', () => {
  it('test 1', () => {});
  it('test 2', () => {});
  // ... 50 more tests in random order
});

// Good - Organized by method/feature
describe('UserService', () => {
  describe('constructor', () => {
    // Constructor tests
  });

  describe('createUser', () => {
    it('should create user with valid data', () => {});
    it('should validate email format', () => {});
    it('should reject duplicate emails', () => {});
  });

  describe('updateUser', () => {
    // Update tests
  });
});
```

### 6. Ignoring Async/Await

```typescript
// Bad - Missing await, test passes incorrectly
it('should create user', () => {
  service.createUser({ email: 'test@example.com' });

  expect(mockPrisma.user.create).toHaveBeenCalled();
  // Test finishes before promise resolves
});

// Good - Properly handle async
it('should create user', async () => {
  await service.createUser({ email: 'test@example.com' });

  expect(mockPrisma.user.create).toHaveBeenCalled();
});
```

### 7. Not Testing Error Cases

```typescript
// Bad - Only happy path
describe('divide', () => {
  it('should divide numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });
});

// Good - Happy path and error cases
describe('divide', () => {
  it('should divide numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('should throw error for division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
  });

  it('should handle negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
  });
});
```

---

## Review Criteria

### Code Review Checklist

When reviewing test code, verify:

#### Structure (20%)
- [ ] Proper file organization and naming
- [ ] Imports are clean and minimal
- [ ] Test suites are logically grouped
- [ ] Setup/teardown is appropriate

#### Coverage (30%)
- [ ] All public methods tested
- [ ] Success and error paths covered
- [ ] Edge cases addressed
- [ ] Meets minimum coverage thresholds

#### Quality (30%)
- [ ] Tests are independent
- [ ] Tests are deterministic
- [ ] Assertions are specific
- [ ] No anti-patterns present

#### Readability (20%)
- [ ] Test names are descriptive
- [ ] Code is well-commented where needed
- [ ] Test data is realistic
- [ ] Complex logic is explained

### Approval Criteria

A test suite is approved when:

1. **All checklist items pass**
2. **Coverage meets targets:**
   - Services: 85%+
   - Controllers: 75%+
   - Components: 70%+
   - Integration: 80%+

3. **No blocking issues:**
   - No test.skip without justification
   - No console.log statements
   - No commented-out code
   - No failing tests

4. **Quality standards met:**
   - Minimum line counts achieved
   - Minimum test case counts achieved
   - All patterns followed
   - No anti-patterns present

---

## Test Quality Metrics

### Measuring Test Quality

Track these metrics for each test suite:

#### Coverage Metrics
- **Line Coverage:** % of lines executed
- **Branch Coverage:** % of conditional branches executed
- **Function Coverage:** % of functions called
- **Statement Coverage:** % of statements executed

#### Quality Metrics
- **Test Count:** Number of test cases
- **Lines of Test Code:** Size of test suite
- **Assertions per Test:** Average number of assertions
- **Test Execution Time:** How long tests take to run

#### Health Metrics
- **Flaky Test Rate:** % of tests that intermittently fail
- **Test Maintenance Time:** Time spent fixing broken tests
- **Coverage Trend:** Is coverage improving or degrading?

### Quality Targets

```
High Quality Test Suite:
├── Coverage:           85%+
├── Tests per File:     15+
├── Lines per File:     300+
├── Assertions/Test:    3-7
├── Execution Time:     < 5s per file
├── Flaky Rate:         0%
└── Maintenance:        Low (tests rarely break on refactors)

Acceptable Test Suite:
├── Coverage:           75-84%
├── Tests per File:     10-14
├── Lines per File:     200-299
├── Assertions/Test:    2-3
├── Execution Time:     5-10s per file
├── Flaky Rate:         < 5%
└── Maintenance:        Medium

Needs Improvement:
├── Coverage:           < 75%
├── Tests per File:     < 10
├── Lines per File:     < 200
├── Assertions/Test:    < 2
├── Execution Time:     > 10s per file
├── Flaky Rate:         > 5%
└── Maintenance:        High (tests break frequently)
```

---

## Continuous Improvement

### Regular Reviews

- **Weekly:** Review new tests in pull requests
- **Monthly:** Analyze coverage trends and identify gaps
- **Quarterly:** Review and update testing standards
- **Annually:** Comprehensive test suite audit

### Improvement Actions

When tests need improvement:

1. **Identify the gap:** What's missing or wrong?
2. **Prioritize:** Critical paths first
3. **Implement:** Add missing tests or fix issues
4. **Document:** Update patterns and examples
5. **Share:** Teach team about improvements

---

## Additional Resources

- [Testing Guide](./testing-guide.md) - Comprehensive testing guide
- [Testing Examples](./testing-examples.md) - Annotated test examples
- [Testing Quick Reference](./testing-quick-reference.md) - Quick command reference
- [Coverage Report](./testing-coverage-report.md) - Current coverage status

---

**Last Updated:** November 13, 2025
**Maintained By:** Event Manager Development Team
**Questions:** Raise an issue or discuss in team meetings
