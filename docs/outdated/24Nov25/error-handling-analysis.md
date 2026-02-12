# Error Handling Analysis - Sprint 3 Epic 3

**Date:** November 25, 2025
**Status:** ✅ Analysis Complete

---

## Summary

**Current State:** Inconsistent error handling with duplicate error class hierarchies
**Issues Found:** 5 major problems
**Recommended Action:** Consolidate to single error hierarchy, standardize usage

---

## Current Error Handling Patterns

### Pattern 1: Generic Error (178 occurrences across 49 files)
```typescript
throw new Error('Something went wrong')
```
- **Issues:**
  - No status code
  - No error code
  - Not caught by error handler properly
  - Inconsistent error messages

### Pattern 2: ServiceError Hierarchy (162 occurrences across 21 files)
Located in `src/services/BaseService.ts`

**Classes:**
- `ServiceError` (base class)
- `ValidationError` (422 status)
- `NotFoundError` (404 status)
- `UnauthorizedError` (401 status)
- `ForbiddenError` (403 status)
- `ConflictError` (409 status)

**Usage:**
- Used in services that extend BaseService
- Properly integrated with error handler middleware
- Missing some error types (rate limiting, internal errors)

### Pattern 3: BaseAppError Hierarchy (NOT USED!)
Located in `src/types/errors/index.ts`

**Classes:**
- `BaseAppError` (base class with isOperational flag)
- `ValidationError` (400 status)
- `AuthenticationError` (401 status)
- `AuthorizationError` (403 status)
- `NotFoundError` (404 status)
- `ConflictError` (409 status)
- `InternalError` (500 status)
- `RateLimitError` (429 status)

**Features:**
- Comprehensive ErrorCode enum (42 error codes!)
- isOperational flag for distinguishing errors
- Type guards (isAppError, isOperationalError)
- Better designed but **NEVER IMPORTED OR USED**

---

## Issues Identified

### 1. Duplicate Error Class Hierarchies (CRITICAL)
**Problem:** Two separate error class hierarchies exist:
- `src/types/errors/index.ts` - BaseAppError (comprehensive, NOT used)
- `src/services/BaseService.ts` - ServiceError (simple, used in 21 files)

**Impact:**
- Code confusion
- Maintenance burden
- Inconsistent error handling

**Solution:** Consolidate to BaseAppError (more comprehensive)

---

### 2. Inconsistent Error Status Codes
**Problem:** ValidationError has different status codes:
- ServiceError: 422 (Unprocessable Entity)
- BaseAppError: 400 (Bad Request)

**Impact:** API inconsistency

**Solution:** Standardize to 400 (more common REST convention)

---

### 3. Generic throw new Error Usage (HIGH)
**Problem:** 178 occurrences of `throw new Error()` across 49 files

**Files with Most Generic Errors:**
- `src/services/AuthService.ts` (19 occurrences)
- `src/services/CustomFieldService.ts` (17 occurrences)
- `src/services/EmailTemplateService.ts` (13 occurrences)
- `src/services/ResultsService.ts` (12 occurrences)
- `src/services/TenantService.ts` (11 occurrences)

**Impact:**
- No structured error codes
- Poor error tracking
- Inconsistent error responses

**Solution:** Migrate to custom error classes

---

### 4. Error Handler Middleware Inconsistencies
**Problem:** Error handler checks error.name as strings:
```typescript
if (error.name === 'ValidationError') { ... }
if (error.name === 'UnauthorizedError') { ... }
```

**Issues:**
- Fragile (typos possible)
- Not type-safe
- Doesn't leverage error class hierarchy

**Solution:** Use instanceof checks with proper error classes

---

### 5. Missing Error Types
**Problem:** Some common HTTP errors not represented:
- 400 Bad Request (covered by ValidationError inconsistently)
- 429 Too Many Requests (RateLimitError exists but not in ServiceError)
- 500 Internal Server Error (InternalError exists but not in ServiceError)
- 503 Service Unavailable (not in either hierarchy)

**Solution:** Add missing error types to consolidated hierarchy

---

## Error Handler Middleware Analysis

**Location:** `src/middleware/errorHandler.ts`

**Current Flow:**
1. Log error with structured format
2. Send to Sentry if 500+
3. Log to database via ErrorLogService
4. Check error.name for specific types
5. Handle Prisma errors specially
6. Default to 500 Internal Server Error

**Issues:**
- String-based error.name checks (fragile)
- Doesn't use error.code property from BaseAppError
- Doesn't check error.isOperational flag

**Improvements Needed:**
- Use instanceof checks
- Leverage error.code and error.isOperational
- Consistent error response format

---

## Standardization Plan

### Phase 1: Consolidate Error Classes (2 hours)

1. **Move BaseAppError to common location**
   - Keep in `src/types/errors/index.ts`
   - Export all error classes

2. **Update BaseService to use BaseAppError**
   - Replace ServiceError with BaseAppError
   - Update all error class references
   - Update ValidationError to use 400 instead of 422

3. **Add missing error types to BaseAppError**
   - BadRequestError (400)
   - ServiceUnavailableError (503)

### Phase 2: Update Error Handler (1 hour)

1. **Replace string checks with instanceof**
   ```typescript
   if (error instanceof ValidationError) { ... }
   if (error instanceof UnauthorizedError) { ... }
   ```

2. **Leverage error.code and error.isOperational**
   ```typescript
   if (isAppError(error)) {
     return res.status(error.statusCode).json({
       success: false,
       error: error.code,
       message: error.message,
       ...(error.details && { details: error.details }),
     });
   }
   ```

3. **Improve error response format**
   - Use error.code instead of generic strings
   - Include error.details when available

### Phase 3: Migrate Services (4-6 hours)

1. **Update high-frequency files first**
   - AuthService.ts (19 errors)
   - CustomFieldService.ts (17 errors)
   - EmailTemplateService.ts (13 errors)
   - ResultsService.ts (12 errors)
   - TenantService.ts (11 errors)

2. **Replace generic Error with specific error classes**
   ```typescript
   // Before:
   throw new Error('User not found');

   // After:
   throw new NotFoundError('User not found', ErrorCode.USER_NOT_FOUND);
   ```

3. **Test each service after migration**

### Phase 4: Update Controllers (Deferred)
- Use BaseController error handling helpers
- Ensure consistent error responses
- *Deferred to future sprint (controllers already use BaseController)*

---

## Expected Benefits

1. **Consistency:** Single error hierarchy across all code
2. **Type Safety:** TypeScript can catch error handling issues
3. **Better Tracking:** ErrorCode enum enables better error analytics
4. **Operational Errors:** isOperational flag distinguishes user vs system errors
5. **Maintainability:** Centralized error definitions
6. **API Quality:** Consistent error responses with proper codes

---

## Error Code Mapping

| HTTP Status | Error Class | Error Code | Use Case |
|-------------|-------------|------------|----------|
| 400 | ValidationError | VALIDATION_ERROR | Invalid input |
| 401 | AuthenticationError | AUTHENTICATION_ERROR | Not authenticated |
| 401 | AuthenticationError | TOKEN_EXPIRED | JWT expired |
| 403 | AuthorizationError | INSUFFICIENT_PERMISSIONS | No permission |
| 404 | NotFoundError | RESOURCE_NOT_FOUND | Resource missing |
| 409 | ConflictError | DUPLICATE_ENTRY | Already exists |
| 429 | RateLimitError | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | InternalError | INTERNAL_ERROR | Unexpected error |
| 500 | InternalError | DATABASE_ERROR | DB operation failed |

---

## Implementation Checklist

### Epic 3 Task 1: Analysis ✅
- [x] Identify duplicate error hierarchies
- [x] Count generic Error usage (178 occurrences)
- [x] Analyze error handler middleware
- [x] Document current patterns
- [x] Create standardization plan

### Epic 3 Task 2: Consolidate Error Classes
- [ ] Add missing error types to BaseAppError
- [ ] Update BaseService to use BaseAppError
- [ ] Update imports in 21 service files
- [ ] Remove ServiceError hierarchy
- [ ] Update TypeScript compilation

### Epic 3 Task 3: Update Error Handler
- [ ] Replace string checks with instanceof
- [ ] Use error.code in responses
- [ ] Leverage error.isOperational
- [ ] Test error responses

### Epic 3 Task 4: Migrate High-Frequency Services (Deferred)
- [ ] AuthService.ts (19 → error classes)
- [ ] CustomFieldService.ts (17 → error classes)
- [ ] EmailTemplateService.ts (13 → error classes)
- [ ] ResultsService.ts (12 → error classes)
- [ ] TenantService.ts (11 → error classes)
- *Note: Full migration deferred to future sprint*

---

## Risk Assessment

**Consolidation Risk:** LOW
- ServiceError is used in 21 files
- Straightforward find-and-replace import changes
- Tests should catch any issues

**Error Handler Risk:** LOW
- Changes are backward compatible
- Improves type safety

**Service Migration Risk:** MEDIUM (Deferred)
- 178 occurrences to migrate
- Requires careful analysis of each error
- Extensive testing needed
- *This is why we're deferring to future sprint*

---

## Success Criteria

- [x] Analysis complete
- [ ] Single error hierarchy (BaseAppError only)
- [ ] Error handler uses instanceof checks
- [ ] All services use BaseAppError hierarchy
- [ ] Zero TypeScript compilation errors
- [ ] Consistent error response format
- [ ] Tests pass

---

**Status:** ✅ Analysis complete, ready for implementation
**Estimated Time:** 3-4 hours for Tasks 2 & 3 (migration deferred)
**Risk Level:** LOW
**Priority:** HIGH (reduces technical debt significantly)
