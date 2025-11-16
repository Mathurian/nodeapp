# Testing Examples

**Last Updated:** November 13, 2025
**Purpose:** Detailed, annotated examples from real Event Manager tests

---

## Table of Contents

1. [Service Test Example](#service-test-example)
2. [Controller Test Example](#controller-test-example)
3. [Component Test Example](#component-test-example)
4. [Integration Test Example](#integration-test-example)
5. [E2E Test Example](#e2e-test-example)
6. [Common Patterns](#common-patterns)

---

## Service Test Example

This is a real, production-ready service test from our codebase. Every line is annotated to explain the pattern and purpose.

### Complete Service Test: CustomFieldService

**File:** `/var/www/event-manager/tests/unit/services/CustomFieldService.test.ts`

```typescript
/**
 * CustomFieldService Unit Tests
 * Comprehensive tests for custom field service
 *
 * This service manages custom fields that can be attached to entities like
 * contestants, judges, etc. It handles field definitions, validation, and values.
 */

// ============================================================================
// IMPORTS
// ============================================================================

import 'reflect-metadata'; // Required for TypeScript decorators if using tsyringe
import { CustomFieldService } from '../../../src/services/CustomFieldService';
import { PrismaClient, CustomFieldType } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

// ============================================================================
// TEST SUITE SETUP
// ============================================================================

describe('CustomFieldService', () => {
  // Service instance - recreated for each test
  let service: CustomFieldService;

  // Mock Prisma client - provides type-safe database mocking
  let mockPrisma: DeepMockProxy<PrismaClient>;

  // ========================================================================
  // TEST DATA FIXTURES
  // ========================================================================

  /**
   * Mock custom field definition
   * Represents a field definition in the database
   * Contains all possible field properties for testing
   */
  const mockCustomField = {
    id: 'field-1',
    name: 'Emergency Contact',           // Human-readable name
    key: 'emergency_contact',            // Machine-readable key
    type: 'TEXT' as CustomFieldType,     // Field type (TEXT, NUMBER, etc.)
    entityType: 'contestant',            // What entity this attaches to
    required: true,                      // Is this field required?
    defaultValue: null,                  // Default value if any
    options: null,                       // For SELECT types, the options
    validation: JSON.stringify({         // Validation rules as JSON
      minLength: 3,
      maxLength: 100
    }),
    order: 1,                            // Display order
    active: true,                        // Is field active?
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  /**
   * Mock custom field value
   * Represents an actual value for a custom field
   */
  const mockCustomFieldValue = {
    id: 'value-1',
    customFieldId: 'field-1',            // Links to field definition
    entityId: 'entity-1',                // ID of the entity (contestant, etc.)
    value: 'John Doe',                   // The actual value
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ========================================================================
  // LIFECYCLE HOOKS
  // ========================================================================

  /**
   * beforeEach - Runs before every test
   *
   * Purpose:
   * 1. Create fresh mocks (no state from previous tests)
   * 2. Instantiate service with mocks
   * 3. Clear any mock call history
   *
   * This ensures each test is independent and isolated
   */
  beforeEach(() => {
    // Create a deep mock of PrismaClient
    // Deep mock means nested objects (prisma.user.findMany) are also mocked
    mockPrisma = mockDeep<PrismaClient>();

    // Create service instance with mocked dependencies
    service = new CustomFieldService(mockPrisma as any);

    // Clear all mock call history and results
    jest.clearAllMocks();
  });

  /**
   * afterEach - Runs after every test
   *
   * Purpose: Reset all mocks to their initial state
   * This prevents mock state from leaking between tests
   */
  afterEach(() => {
    mockReset(mockPrisma);
  });

  // ========================================================================
  // TEST SUITE: createCustomField
  // ========================================================================

  describe('createCustomField', () => {
    /**
     * Test: Success case with required fields only
     *
     * Pattern: AAA (Arrange-Act-Assert)
     *
     * What we're testing:
     * - Can create a field with minimum required data
     * - Service sets appropriate defaults
     * - Correct data is passed to database
     */
    it('should create a custom field with required fields', async () => {
      // ARRANGE - Set up test conditions
      // Mock the database response
      mockPrisma.customField.create.mockResolvedValue(mockCustomField);

      // ACT - Execute the code under test
      const result = await service.createCustomField({
        name: 'Emergency Contact',
        key: 'emergency_contact',
        type: 'TEXT',
        entityType: 'contestant',
      });

      // ASSERT - Verify the results
      // 1. Check return value
      expect(result).toEqual(mockCustomField);

      // 2. Check database was called correctly
      expect(mockPrisma.customField.create).toHaveBeenCalledWith({
        data: {
          name: 'Emergency Contact',
          key: 'emergency_contact',
          type: 'TEXT',
          entityType: 'contestant',
          required: false,              // Default value
          defaultValue: undefined,      // Not provided
          options: undefined,           // Not provided
          validation: undefined,        // Not provided
          order: 0,                     // Default order
          active: true,                 // Default active
        },
      });
    });

    /**
     * Test: Success case with all optional fields
     *
     * What we're testing:
     * - Service correctly handles optional parameters
     * - JSON serialization works for complex fields
     * - All field properties are preserved
     */
    it('should create a custom field with all optional fields', async () => {
      // ARRANGE
      const fullField = { ...mockCustomField, required: true, order: 5 };
      mockPrisma.customField.create.mockResolvedValue(fullField);

      // ACT
      const result = await service.createCustomField({
        name: 'Emergency Contact',
        key: 'emergency_contact',
        type: 'TEXT',
        entityType: 'contestant',
        required: true,
        defaultValue: 'N/A',
        options: ['option1', 'option2'],      // Array of options
        validation: { minLength: 3 },         // Validation object
        order: 5,
        active: true,
      });

      // ASSERT
      expect(result).toEqual(fullField);
      expect(mockPrisma.customField.create).toHaveBeenCalledWith({
        data: {
          name: 'Emergency Contact',
          key: 'emergency_contact',
          type: 'TEXT',
          entityType: 'contestant',
          required: true,
          defaultValue: 'N/A',
          // Note: options and validation are JSON stringified
          options: JSON.stringify(['option1', 'option2']),
          validation: JSON.stringify({ minLength: 3 }),
          order: 5,
          active: true,
        },
      });
    });

    /**
     * Test: Error handling for database errors
     *
     * What we're testing:
     * - Service handles database errors gracefully
     * - Error messages are descriptive
     * - Errors are properly propagated
     *
     * Pattern: Test error paths explicitly
     */
    it('should handle database errors', async () => {
      // ARRANGE - Mock database error
      mockPrisma.customField.create.mockRejectedValue(
        new Error('Database error')
      );

      // ACT & ASSERT - Expect promise to reject
      await expect(
        service.createCustomField({
          name: 'Test Field',
          key: 'test_field',
          type: 'TEXT',
          entityType: 'contestant',
        })
      ).rejects.toThrow('Failed to create custom field');

      // Note: The service wraps the database error in a more descriptive message
    });
  });

  // ========================================================================
  // TEST SUITE: getCustomFieldsByEntityType
  // ========================================================================

  describe('getCustomFieldsByEntityType', () => {
    /**
     * Test: Get active fields for an entity type
     *
     * What we're testing:
     * - Default behavior filters to active fields only
     * - Results are ordered by the 'order' field
     * - Correct WHERE clause is used
     */
    it('should get all active custom fields for an entity type', async () => {
      // ARRANGE
      mockPrisma.customField.findMany.mockResolvedValue([mockCustomField]);

      // ACT
      const result = await service.getCustomFieldsByEntityType('contestant');

      // ASSERT
      expect(result).toEqual([mockCustomField]);
      expect(mockPrisma.customField.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'contestant',
          active: true              // Default filters to active
        },
        orderBy: { order: 'asc' },  // Ordered by order field
      });
    });

    /**
     * Test: Get all fields including inactive
     *
     * What we're testing:
     * - Optional parameter changes filter behavior
     * - activeOnly=false removes active filter
     */
    it('should get all custom fields including inactive when activeOnly is false', async () => {
      // ARRANGE
      const inactiveField = { ...mockCustomField, active: false };
      mockPrisma.customField.findMany.mockResolvedValue([
        mockCustomField,
        inactiveField
      ]);

      // ACT - Pass activeOnly as false
      const result = await service.getCustomFieldsByEntityType('contestant', false);

      // ASSERT
      expect(result).toEqual([mockCustomField, inactiveField]);
      expect(mockPrisma.customField.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'contestant'
          // Note: No 'active' filter when activeOnly is false
        },
        orderBy: { order: 'asc' },
      });
    });

    /**
     * Test: Empty result handling
     *
     * What we're testing:
     * - Service handles empty results gracefully
     * - Returns empty array (not null or undefined)
     *
     * Pattern: Test edge cases like empty data
     */
    it('should return empty array when no fields exist', async () => {
      // ARRANGE
      mockPrisma.customField.findMany.mockResolvedValue([]);

      // ACT
      const result = await service.getCustomFieldsByEntityType('contestant');

      // ASSERT
      expect(result).toEqual([]);
    });

    /**
     * Test: Database error handling
     *
     * Pattern: Every database operation should have error test
     */
    it('should handle database errors', async () => {
      // ARRANGE
      mockPrisma.customField.findMany.mockRejectedValue(
        new Error('Database error')
      );

      // ACT & ASSERT
      await expect(
        service.getCustomFieldsByEntityType('contestant')
      ).rejects.toThrow('Failed to fetch custom fields');
    });
  });

  // ========================================================================
  // TEST SUITE: getCustomFieldById
  // ========================================================================

  describe('getCustomFieldById', () => {
    /**
     * Test: Get field with related values
     *
     * What we're testing:
     * - Service includes related data
     * - Correct ID is used in query
     * - Include clause is properly set
     */
    it('should get a custom field by id with values', async () => {
      // ARRANGE
      const fieldWithValues = {
        ...mockCustomField,
        values: [mockCustomFieldValue]
      };
      mockPrisma.customField.findUnique.mockResolvedValue(fieldWithValues as any);

      // ACT
      const result = await service.getCustomFieldById('field-1');

      // ASSERT
      expect(result).toEqual(fieldWithValues);
      expect(mockPrisma.customField.findUnique).toHaveBeenCalledWith({
        where: { id: 'field-1' },
        include: { values: true },    // Includes related values
      });
    });

    /**
     * Test: Not found handling
     *
     * What we're testing:
     * - Service returns null for missing records
     * - No error is thrown (null is valid response)
     *
     * Pattern: Test "not found" scenarios explicitly
     */
    it('should return null when field not found', async () => {
      // ARRANGE
      mockPrisma.customField.findUnique.mockResolvedValue(null);

      // ACT
      const result = await service.getCustomFieldById('nonexistent');

      // ASSERT
      expect(result).toBeNull();
    });

    /**
     * Test: Database error handling
     */
    it('should handle database errors', async () => {
      // ARRANGE
      mockPrisma.customField.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      // ACT & ASSERT
      await expect(
        service.getCustomFieldById('field-1')
      ).rejects.toThrow('Failed to fetch custom field');
    });
  });
});
```

### Key Patterns Demonstrated

1. **Deep Mocking with jest-mock-extended**
   - `mockDeep<PrismaClient>()` creates fully mocked Prisma client
   - All nested methods automatically return mocks

2. **AAA Pattern (Arrange-Act-Assert)**
   - Clear separation of test phases
   - Easy to understand what's being tested

3. **Comprehensive Coverage**
   - Success cases
   - Error cases
   - Edge cases (empty data, null values)
   - Optional parameters

4. **Descriptive Test Names**
   - Should describe WHAT is tested
   - Should describe EXPECTED outcome

5. **Mock Assertions**
   - Verify return values
   - Verify database calls
   - Verify correct parameters

---

## Controller Test Example

### AuthController Test

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
    // Mock service
    mockAuthService = mock<AuthService>();

    // Create controller with mocked service
    controller = new AuthController(mockAuthService);

    // Mock Express request object
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: undefined,
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Test Agent' }
    };

    // Mock Express response object
    // Each method returns 'this' for chaining
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis()
    };

    // Mock next function
    mockNext = jest.fn();
  });

  describe('login', () => {
    /**
     * Test: Successful login
     *
     * Controller responsibilities:
     * 1. Extract data from request
     * 2. Call service method
     * 3. Format response
     * 4. Set HTTP status
     */
    it('should return 200 with token on successful login', async () => {
      // ARRANGE
      const loginData = { email: 'test@example.com', password: 'password123' };
      const serviceResponse = {
        token: 'jwt-token',
        user: { id: '1', email: 'test@example.com', role: 'USER' }
      };

      // Set request body
      mockReq.body = loginData;

      // Mock service response
      mockAuthService.login.mockResolvedValue(serviceResponse);

      // ACT
      await controller.login(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // ASSERT
      // 1. Verify service was called correctly
      expect(mockAuthService.login).toHaveBeenCalledWith(
        loginData,
        '127.0.0.1',
        'Test Agent'
      );

      // 2. Verify response format
      expect(mockRes.json).toHaveBeenCalledWith({
        token: 'jwt-token',
        user: serviceResponse.user
      });

      // 3. Verify next was not called (no error)
      expect(mockNext).not.toHaveBeenCalled();
    });

    /**
     * Test: Validation error
     *
     * What we're testing:
     * - Controller validates request data
     * - Returns 400 for invalid input
     * - Error message is descriptive
     */
    it('should return 400 for missing credentials', async () => {
      // ARRANGE
      mockReq.body = { email: 'test@example.com' }; // Missing password

      // ACT
      await controller.login(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // ASSERT
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Email and password are required'
      });
    });

    /**
     * Test: Service error handling
     *
     * What we're testing:
     * - Controller catches service errors
     * - Passes errors to Express error handler
     */
    it('should call next with error on service failure', async () => {
      // ARRANGE
      mockReq.body = { email: 'test@example.com', password: 'password123' };
      const serviceError = new Error('Service error');
      mockAuthService.login.mockRejectedValue(serviceError);

      // ACT
      await controller.login(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // ASSERT
      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });

  describe('logout', () => {
    it('should clear token and return 200', async () => {
      // ARRANGE
      mockReq.user = { id: '1', email: 'test@example.com' };

      // ACT
      await controller.logout(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // ASSERT
      // Verify cookie is cleared
      expect(mockRes.cookie).toHaveBeenCalledWith('token', '', {
        httpOnly: true,
        expires: expect.any(Date)
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Logged out successfully'
      });
    });
  });
});
```

### Key Controller Test Patterns

1. **Mock Express Objects**
   - Request, Response, NextFunction
   - Methods return 'this' for chaining

2. **Test Controller Responsibilities**
   - Request validation
   - Service method calls
   - Response formatting
   - Error handling

3. **Don't Test Business Logic**
   - Business logic belongs in services
   - Controllers orchestrate, not implement

---

## Component Test Example

### LoginPage Component Test

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from '@/pages/LoginPage';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';

/**
 * Helper to render component with all necessary providers
 *
 * React components often need context providers, routers, etc.
 * This helper wraps the component with all dependencies
 */
const renderWithProviders = (
  component: React.ReactElement,
  authValue = mockAuthContext
) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authValue}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

/**
 * Mock auth context
 * Provides all values that AuthContext normally provides
 */
const mockAuthContext = {
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
  loading: false,
  isAuthenticated: false
};

describe('LoginPage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  /**
   * Test: Basic rendering
   *
   * What we're testing:
   * - Component renders without crashing
   * - Expected form elements are present
   * - Using accessible queries (getByLabelText, getByRole)
   */
  it('should render login form', () => {
    // ACT
    renderWithProviders(<LoginPage />);

    // ASSERT - Use accessible queries
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  /**
   * Test: Form submission
   *
   * What we're testing:
   * - User can type in fields
   * - Form submission calls login function
   * - Correct data is passed to login
   *
   * Pattern: Test user interactions
   */
  it('should call login on form submission', async () => {
    // ARRANGE
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    // ACT - Simulate user typing
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    // ASSERT
    await waitFor(() => {
      expect(mockAuthContext.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  /**
   * Test: Email validation
   *
   * What we're testing:
   * - Form validates email format
   * - Error message is displayed
   * - Login is not called for invalid email
   */
  it('should show error for invalid email', async () => {
    // ARRANGE
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    // ACT
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    // ASSERT
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
    expect(mockAuthContext.login).not.toHaveBeenCalled();
  });

  /**
   * Test: Loading state
   *
   * What we're testing:
   * - Loading spinner shows during login
   * - Submit button is disabled while loading
   */
  it('should show loading state during login', () => {
    // ARRANGE - Set loading in context
    const loadingContext = { ...mockAuthContext, loading: true };

    // ACT
    renderWithProviders(<LoginPage />, loadingContext);

    // ASSERT
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  /**
   * Test: Error display
   *
   * What we're testing:
   * - Login errors are displayed
   * - Error message is accessible
   */
  it('should display login error', async () => {
    // ARRANGE
    const errorContext = {
      ...mockAuthContext,
      login: vi.fn().mockRejectedValue(new Error('Invalid credentials'))
    };
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, errorContext);

    // ACT
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    // ASSERT
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i);
    });
  });

  /**
   * Test: Accessibility
   *
   * What we're testing:
   * - Form fields have proper labels
   * - Error messages are associated with fields
   * - Keyboard navigation works
   */
  it('should be accessible', () => {
    // ACT
    renderWithProviders(<LoginPage />);

    // ASSERT
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    // Inputs have proper types
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Inputs are properly labeled
    expect(emailInput).toHaveAccessibleName();
    expect(passwordInput).toHaveAccessibleName();
  });
});
```

### Key Component Test Patterns

1. **Test User Interactions**
   - Use userEvent for realistic interactions
   - Test what users actually do

2. **Accessible Queries**
   - getByRole, getByLabelText preferred
   - Avoid getByTestId unless necessary

3. **Test Behavior, Not Implementation**
   - Test what component does
   - Don't test how it does it

4. **Handle Async**
   - Use waitFor for async updates
   - Use findBy queries for async elements

---

## Integration Test Example

### API Endpoint Integration Test

```typescript
import request from 'supertest';
import { app } from '@/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('POST /api/auth/login', () => {
  // Clean database before each test
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  // Disconnect after all tests
  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Test: Complete authentication flow
   *
   * What we're testing:
   * - Full request/response cycle
   * - Real database operations
   * - Actual JWT generation
   * - HTTP status codes
   */
  it('should authenticate user and return token', async () => {
    // ARRANGE - Create real user in database
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: '$2a$10$validhashedpassword', // Pre-hashed
        name: 'Test User',
        role: 'USER'
      }
    });

    // ACT - Make real HTTP request
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    // ASSERT
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toMatchObject({
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER'
    });
    // Password should not be in response
    expect(response.body.user).not.toHaveProperty('password');
  });

  /**
   * Test: Invalid credentials
   */
  it('should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  /**
   * Test: Input validation
   */
  it('should return 400 for missing email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        password: 'password123'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/email.*required/i);
  });
});
```

---

## E2E Test Example

### Complete Scoring Workflow

```typescript
import { test, expect, Page } from '@playwright/test';

/**
 * Helper to login
 * Reusable function to authenticate before tests
 */
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
}

test.describe('Scoring Workflow', () => {
  /**
   * Test: Complete scoring workflow
   *
   * What we're testing:
   * - Multi-page workflow
   * - Real browser interactions
   * - Visual feedback
   * - State persistence
   */
  test('judge can submit score for contestant', async ({ page }) => {
    // ARRANGE - Login as judge
    await login(page, 'judge@example.com', 'password123');

    // ACT - Navigate to scoring page
    await page.click('text=Scoring');
    await expect(page).toHaveURL('/scoring');

    // Select event
    await page.selectOption('[name="event"]', '1');

    // Select category
    await page.selectOption('[name="category"]', '1');

    // Wait for contestants to load
    await page.waitForSelector('[data-testid="contestant-list"]');

    // Select first contestant
    await page.click('[data-testid="contestant-1"]');

    // Enter score
    await page.fill('[name="score"]', '95');

    // Add optional comment
    await page.fill('[name="comment"]', 'Excellent performance');

    // Submit score
    await page.click('button[type="submit"]');

    // ASSERT - Verify success
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message')).toContainText(
      'Score submitted successfully'
    );

    // Verify score appears in the list
    await expect(page.locator('[data-testid="score-1"]')).toContainText('95');

    // Verify can't submit duplicate
    await page.click('[data-testid="contestant-1"]');
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await expect(page.locator('.info-message')).toContainText(
      'Already scored this contestant'
    );
  });

  /**
   * Test: Error handling in UI
   */
  test('should show error for invalid score', async ({ page }) => {
    await login(page, 'judge@example.com', 'password123');
    await page.goto('/scoring');

    // Try to submit invalid score
    await page.selectOption('[name="event"]', '1');
    await page.selectOption('[name="category"]', '1');
    await page.waitForSelector('[data-testid="contestant-list"]');
    await page.click('[data-testid="contestant-1"]');

    // Invalid score (out of range)
    await page.fill('[name="score"]', '150');
    await page.click('button[type="submit"]');

    // Error should be displayed
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText(
      'Score must be between 0 and 100'
    );
  });
});
```

---

## Common Patterns

### Test Data Factory Pattern

```typescript
/**
 * Test data factories
 * Reusable functions to create test data
 */

// User factory
export const createMockUser = (overrides = {}) => ({
  id: `user-${Math.random()}`,
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER' as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Usage
const admin = createMockUser({ role: 'ADMIN' });
const inactiveUser = createMockUser({ isActive: false });
```

### Setup and Teardown Pattern

```typescript
describe('Service with resources', () => {
  let service: Service;
  let connection: Connection;

  beforeAll(async () => {
    // Setup once for all tests
    connection = await createConnection();
  });

  beforeEach(async () => {
    // Setup before each test
    service = new Service(connection);
    await clearDatabase();
  });

  afterEach(async () => {
    // Cleanup after each test
    await service.cleanup();
  });

  afterAll(async () => {
    // Cleanup once after all tests
    await connection.close();
  });
});
```

### Parameterized Test Pattern

```typescript
describe.each([
  { input: 'test@example.com', valid: true },
  { input: 'invalid-email', valid: false },
  { input: '', valid: false },
  { input: 'test@', valid: false },
])('validateEmail($input)', ({ input, valid }) => {
  it(`should return ${valid}`, () => {
    expect(validateEmail(input)).toBe(valid);
  });
});
```

---

## Related Documentation

- [Testing Guide](./testing-guide.md) - Complete testing guide
- [Testing Standards](./testing-standards.md) - Quality requirements
- [Testing Quick Reference](./testing-quick-reference.md) - Command reference
- [Testing Workflows](./testing-workflows.md) - Development workflows
- [Coverage Report](./testing-coverage-report.md) - Current coverage

---

**Last Updated:** November 13, 2025
**All examples are from real Event Manager tests**
**Use these patterns in your own tests**
