# Test Execution Guide

## Running Tests

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### All Tests
```bash
npm test
```

## New Test Files Added

### Unit Tests
1. `tests/unit/services/SettingsService.test.ts` - Tests contestant visibility parsing
2. `tests/unit/services/AdminService.test.ts` - Tests database browser table listing
3. `tests/unit/services/JudgeContestantCertificationService.test.ts` - Tests certification status
4. `tests/unit/services/TallyMasterService.test.ts` - Tests contest certifications

### E2E Tests
1. `tests/e2e/manualTestingFixes.e2e.test.ts` - Comprehensive E2E tests for all fixed issues

## Test Coverage

The new tests cover:
- ✅ Contestant visibility settings transformation
- ✅ Database browser table listing
- ✅ Contest repository Prisma injection
- ✅ Judge certification status endpoint
- ✅ Contest certifications endpoint
- ✅ Missing route endpoints (auditor, board)
- ✅ Array safety patterns
- ✅ Error handling

## Running Specific Test Suites

```bash
# Test only settings-related fixes
npm run test:unit -- SettingsService

# Test only admin-related fixes
npm run test:unit -- AdminService

# Test only certification-related fixes
npm run test:unit -- JudgeContestantCertificationService

# Test only tally master fixes
npm run test:unit -- TallyMasterService

# Run E2E tests for manual testing fixes
npm run test:e2e -- manualTestingFixes
```

## Continuous Integration

These tests should be run in CI/CD pipeline to prevent regression of these issues.

