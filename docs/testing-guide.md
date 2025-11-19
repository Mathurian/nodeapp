# Testing Guide

## Overview

This project uses Jest as the testing framework with comprehensive unit, integration, and end-to-end tests. The testing infrastructure is designed to achieve 80%+ code coverage while maintaining fast, reliable test execution.

## Test Infrastructure

### Directory Structure

```
tests/
├── setup.ts                    # Test environment setup (integration tests)
├── jest.setup.mocks.ts         # Mock setup for unit tests
├── helpers/                    # Test utilities and helpers
│   ├── testUtils.ts           # General test utilities
│   ├── databaseHelpers.ts     # Database setup/teardown
│   ├── authHelpers.ts         # Authentication helpers
│   └── mockData.ts            # Mock data generators
├── unit/                      # Unit tests (with mocking)
│   ├── services/              # Service unit tests
│   ├── controllers/           # Controller unit tests
│   └── middleware/            # Middleware unit tests
├── integration/               # Integration tests (with real DB)
└── e2e/                       # End-to-end tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Coverage Targets

The project enforces the following minimum coverage thresholds:

- **Services**: 85% (branches, functions, lines, statements)
- **Middleware**: 80%
- **Repositories**: 80%
- **Controllers**: 75%
- **Global**: 80%

## Writing Tests

### Unit Test Pattern

Unit tests should mock all external dependencies:

```typescript
import { virusScanMiddleware } from '../../../src/middleware/virusScanMiddleware';

// Mock external dependencies
const mockScanFile = jest.fn();
jest.mock('../../../src/services/VirusScanService', () => ({
  getVirusScanService: jest.fn(() => ({
    scanFile: mockScanFile,
  })),
}));

describe('virusScanMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should scan file and pass if clean', async () => {
    mockScanFile.mockResolvedValue({ status: 'CLEAN' });
    // Test logic here
  });
});
```

### Best Practices

1. **Use descriptive test names**
2. **Follow Arrange-Act-Assert pattern**
3. **Test edge cases and error conditions**
4. **Mock external dependencies properly**
5. **Clean up after tests**

## Test Setup Files

- **`tests/setup.ts`**: For integration tests (requires real database)
- **`tests/jest.setup.mocks.ts`**: For unit tests (mocks all dependencies)

## Troubleshooting

### Tests Require Database

If you see database connection errors:
- Unit tests should use `tests/jest.setup.mocks.ts` for mocking
- Integration tests require a test database to be running

### Setting up Test Database

```bash
# Create test database
createdb event_manager_test

# Run migrations
DATABASE_URL="postgresql://user:password@localhost:5432/event_manager_test" npx prisma migrate deploy

# Set environment variable
export TEST_DATABASE_URL="postgresql://user:password@localhost:5432/event_manager_test"
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [Supertest](https://github.com/visionmedia/supertest)
