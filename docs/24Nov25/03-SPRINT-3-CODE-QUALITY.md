# Sprint 3: Code Quality & Maintainability
**Duration:** Weeks 7-9 (15 working days)
**Team:** 2 Full-Stack Developers + 1 QA Engineer
**Risk Level:** Low
**Dependencies:** None (can run parallel to Sprint 2 completion)

---

## Sprint Goal

Reduce technical debt through code duplication elimination, dependency cleanup, pattern extraction, and error handling standardization. Improve long-term maintainability and developer productivity.

---

## Sprint Backlog

### Epic 1: Code Duplication Reduction (Priority: HIGH)
**Effort:** 4-5 days
**Assignee:** Backend Developer

#### Task 1.1: Controller Duplication Analysis
**Effort:** 4 hours

**Patterns to Identify:**
1. **CRUD Boilerplate**
   - create, read, update, delete methods
   - Standard validation patterns
   - Error handling
   - Response formatting

2. **Permission Checks**
   - Role validation
   - Tenant isolation checks
   - Resource ownership verification

3. **Pagination Logic**
   - Query parameter parsing
   - Limit/offset calculation
   - Response metadata

**Analysis Process:**
```bash
# Find similar code patterns
npm run analyze:duplication

# Manual review of top duplicated blocks
```

**Acceptance Criteria:**
- [ ] Duplication report generated
- [ ] Top 20 duplicated blocks identified
- [ ] Refactoring opportunities prioritized
- [ ] Estimated effort calculated

**Deliverable:** `code-duplication-analysis.md`

#### Task 1.2: Create Base Controller
**Effort:** 1 day

**File:** `src/controllers/BaseController.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

export abstract class BaseController<T> {
  protected logger: ReturnType<typeof createLogger>;
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
    this.logger = createLogger(modelName.toLowerCase());
  }

  /**
   * Standard create operation
   */
  protected async create(
    req: Request,
    res: Response,
    data: any,
    options?: { include?: any }
  ): Promise<void> {
    try {
      const tenantId = req.tenantId;

      const result = await this.prisma[this.modelName].create({
        data: {
          ...data,
          tenantId,
        },
        ...options,
      });

      this.logger.info(`${this.modelName} created`, {
        id: result.id,
        userId: req.user?.id,
      });

      res.status(201).json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Standard list operation with pagination
   */
  protected async list(
    req: Request,
    res: Response,
    whereClause: any = {},
    options: {
      include?: any;
      orderBy?: any;
      select?: any;
    } = {}
  ): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        this.prisma[this.modelName].findMany({
          where: { ...whereClause, tenantId },
          skip,
          take: limit,
          ...options,
        }),
        this.prisma[this.modelName].count({
          where: { ...whereClause, tenantId },
        }),
      ]);

      res.json({
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + items.length < total,
        },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Standard get by ID operation
   */
  protected async getById(
    req: Request,
    res: Response,
    options?: { include?: any; select?: any }
  ): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      const result = await this.prisma[this.modelName].findFirst({
        where: { id, tenantId },
        ...options,
      });

      if (!result) {
        res.status(404).json({
          error: 'Not Found',
          message: `${this.modelName} not found`,
        });
        return;
      }

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Standard update operation
   */
  protected async update(
    req: Request,
    res: Response,
    data: any,
    options?: { include?: any }
  ): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      // Verify exists and belongs to tenant
      const existing = await this.prisma[this.modelName].findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        res.status(404).json({
          error: 'Not Found',
          message: `${this.modelName} not found`,
        });
        return;
      }

      const result = await this.prisma[this.modelName].update({
        where: { id },
        data,
        ...options,
      });

      this.logger.info(`${this.modelName} updated`, {
        id,
        userId: req.user?.id,
      });

      res.json(result);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Standard delete operation
   */
  protected async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;

      // Verify exists and belongs to tenant
      const existing = await this.prisma[this.modelName].findFirst({
        where: { id, tenantId },
      });

      if (!existing) {
        res.status(404).json({
          error: 'Not Found',
          message: `${this.modelName} not found`,
        });
        return;
      }

      await this.prisma[this.modelName].delete({
        where: { id },
      });

      this.logger.info(`${this.modelName} deleted`, {
        id,
        userId: req.user?.id,
      });

      res.status(204).send();
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Standard error handling
   */
  protected handleError(error: any, res: Response): void {
    this.logger.error(`${this.modelName} operation failed`, {
      error: error.message,
      stack: error.stack,
    });

    if (error.code === 'P2002') {
      res.status(409).json({
        error: 'Conflict',
        message: 'A record with this data already exists',
        field: error.meta?.target,
      });
      return;
    }

    if (error.code === 'P2025') {
      res.status(404).json({
        error: 'Not Found',
        message: 'Record not found',
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
}
```

**Acceptance Criteria:**
- [ ] BaseController implemented with common CRUD operations
- [ ] Pagination standardized
- [ ] Error handling consistent
- [ ] TypeScript generic types used
- [ ] Unit tests for base controller
- [ ] Documentation with usage examples

#### Task 1.3: Refactor Controllers to Use Base
**Effort:** 2-3 days

**Controllers to Refactor (Priority Order):**
1. EventsController
2. ContestsController
3. CategoriesController
4. UsersController
5. JudgesController
6. (Continue with others as time allows)

**Example Refactor:**

**Before:**
```typescript
// src/controllers/eventsController.ts
export const getEvents = async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    // ... lots of boilerplate
  } catch (error) {
    // ... error handling
  }
};
```

**After:**
```typescript
// src/controllers/eventsController.ts
import { BaseController } from './BaseController';

class EventsController extends BaseController<Event> {
  constructor() {
    super(prisma, 'event');
  }

  // Use inherited methods or override
  async getEvents(req: Request, res: Response) {
    await this.list(req, res, {}, {
      include: {
        contests: {
          include: {
            categories: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  // Custom methods
  async archiveEvent(req: Request, res: Response) {
    // Custom logic here
  }
}

export const eventsController = new EventsController();
```

**Acceptance Criteria:**
- [ ] Priority controllers refactored
- [ ] All tests updated and passing
- [ ] API responses unchanged (backward compatible)
- [ ] Code duplication reduced by 40%+
- [ ] No breaking changes

---

### Epic 2: Dependency Audit & Cleanup (Priority: HIGH)
**Effort:** 3-5 days
**Assignee:** Full-Stack Developer

#### Task 2.1: Dependency Audit
**Effort:** 1 day

**Current State:** 104 production dependencies

**Audit Process:**
```bash
# Check for unused dependencies
npx depcheck

# Security audit
npm audit

# Check for duplicate dependencies
npm ls --all | grep -A 1 "deduped"

# Check for outdated dependencies
npm outdated

# License compliance
npx license-checker --summary
```

**Categories:**
1. **Unused:** Can be removed immediately
2. **Duplicate:** Multiple packages doing same thing
3. **Vulnerable:** Security issues
4. **Outdated:** Major versions behind
5. **Heavy:** Large bundle impact

**Acceptance Criteria:**
- [ ] Complete dependency inventory
- [ ] Unused dependencies identified
- [ ] Duplicate functionality identified
- [ ] Security vulnerabilities documented
- [ ] Bundle impact analysis completed

**Deliverable:** `dependency-audit-report.md`

#### Task 2.2: Remove Unused Dependencies
**Effort:** 4 hours

**Likely Candidates:**
```bash
# Example unused dependencies
npm uninstall <package-name>
```

**Process:**
1. Remove from package.json
2. Search codebase for imports
3. Run tests
4. Update lock file

**Acceptance Criteria:**
- [ ] All unused dependencies removed
- [ ] Tests passing
- [ ] Application builds successfully
- [ ] No runtime errors

#### Task 2.3: Consolidate Duplicate Dependencies
**Effort:** 1 day

**Identified Duplicates:**

**PDF Generation (3 libraries):**
- PDFKit
- jsPDF
- Puppeteer

**Recommendation:** Keep Puppeteer (most capable), remove others
- PDFKit and jsPDF can be replaced with Puppeteer
- Migrate existing PDF generation to Puppeteer

**Date Libraries:**
- date-fns (keep)
- Check if any moment.js usage exists (remove)

**HTTP Clients:**
- axios (keep)
- node-fetch usage? (consolidate to axios)

**Implementation Plan:**
1. Identify usage of deprecated libraries
2. Create migration functions
3. Update all call sites
4. Remove old libraries
5. Test thoroughly

**Acceptance Criteria:**
- [ ] Only one library per function category
- [ ] All PDF generation uses Puppeteer
- [ ] All HTTP calls use axios
- [ ] Dependency count reduced to <90

#### Task 2.4: Security Updates
**Effort:** 1 day

**Process:**
```bash
# Fix vulnerabilities
npm audit fix

# For breaking changes
npm audit fix --force  # (only after review)

# Manual fixes for critical issues
npm update <package> --save
```

**Special Attention:**
- Authentication libraries
- Encryption libraries
- File upload libraries
- Any with critical/high vulnerabilities

**Acceptance Criteria:**
- [ ] Zero critical vulnerabilities
- [ ] Zero high vulnerabilities
- [ ] Medium/low vulnerabilities documented and tracked
- [ ] All tests passing after updates

#### Task 2.5: Update Documentation
**Effort:** 4 hours

**Files to Update:**
- package.json (remove obsolete scripts)
- README.md (update dependency list)
- CONTRIBUTING.md (update setup instructions)
- docs/DEPENDENCIES.md (create if missing)

**Acceptance Criteria:**
- [ ] Documentation reflects actual dependencies
- [ ] Reasons for each major dependency documented
- [ ] Setup instructions tested
- [ ] Contribution guide updated

---

### Epic 3: Error Handling Standardization (Priority: MEDIUM)
**Effort:** 2-3 days
**Assignee:** Backend Developer

#### Task 3.1: Error Response Standardization
**Effort:** 1 day

**Create Error Factory:**

**File:** `src/utils/errorFactory.ts`
```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, true, details);
  }
}

export class ValidationError extends AppError {
  constructor(errors: any[]) {
    super('Validation failed', 422, true, { errors });
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, false);
  }
}

// Standard error response format
export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  path?: string;
  requestId?: string;
}

export const formatErrorResponse = (
  error: AppError,
  req?: Express.Request
): ErrorResponse => {
  return {
    error: error.constructor.name.replace('Error', ''),
    message: error.message,
    details: error.details,
    timestamp: new Date().toISOString(),
    path: req?.path,
    requestId: req?.id, // Add request ID middleware
  };
};
```

**Acceptance Criteria:**
- [ ] Error classes for all HTTP status codes
- [ ] Standard error response format
- [ ] Error factory with formatting
- [ ] TypeScript types exported
- [ ] Documentation with examples

#### Task 3.2: Update Error Handler Middleware
**Effort:** 4 hours

**File:** `src/middleware/errorHandler.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError, formatErrorResponse } from '../utils/errorFactory';
import { createLogger } from '../utils/logger';
import * as Sentry from '@sentry/node';

const logger = createLogger('error-handler');

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    tenantId: req.tenantId,
  });

  // Report to Sentry if not operational
  if (error instanceof AppError && !error.isOperational) {
    Sentry.captureException(error);
  }

  // Handle known errors
  if (error instanceof AppError) {
    const response = formatErrorResponse(error, req);
    res.status(error.statusCode).json(response);
    return;
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = handlePrismaError(error);
    const response = formatErrorResponse(prismaError, req);
    res.status(prismaError.statusCode).json(response);
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    const validationError = new AppError(
      'Validation failed',
      422,
      true,
      error.details
    );
    const response = formatErrorResponse(validationError, req);
    res.status(422).json(response);
    return;
  }

  // Unknown errors
  const unknownError = new InternalServerError();
  const response = formatErrorResponse(unknownError, req);
  res.status(500).json(response);

  // Report unknown errors to Sentry
  Sentry.captureException(error);
};

function handlePrismaError(error: any): AppError {
  switch (error.code) {
    case 'P2002':
      return new ConflictError('A record with this data already exists', {
        field: error.meta?.target,
      });
    case 'P2025':
      return new NotFoundError('Record');
    case 'P2003':
      return new BadRequestError('Foreign key constraint failed');
    default:
      return new InternalServerError('Database error');
  }
}
```

**Acceptance Criteria:**
- [ ] All error types handled
- [ ] Consistent error responses
- [ ] Proper logging
- [ ] Sentry integration
- [ ] Tests for all error scenarios

#### Task 3.3: Refactor Controllers to Use Error Factory
**Effort:** 1-2 days

**Update all controllers to use new error classes:**

**Before:**
```typescript
if (!user) {
  res.status(404).json({ error: 'User not found' });
  return;
}
```

**After:**
```typescript
if (!user) {
  throw new NotFoundError('User');
}
```

**Acceptance Criteria:**
- [ ] All controllers use error factory
- [ ] No more manual res.status().json() for errors
- [ ] Consistent error responses across API
- [ ] All tests updated

---

### Epic 4: Extract Common Patterns (Priority: MEDIUM)
**Effort:** 2 days
**Assignee:** Full-Stack Developer

#### Task 4.1: Extract Validation Schemas
**Effort:** 1 day

**Create Validation Library:**

**File:** `src/validation/schemas.ts`
```typescript
import { z } from 'zod';

// Common schemas
export const idSchema = z.string().cuid();
export const emailSchema = z.string().email();
export const tenantIdSchema = z.string().cuid();

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// User schemas
export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: emailSchema,
  password: z.string().min(8).max(255),
  role: z.enum(['ADMIN', 'JUDGE', 'CONTESTANT', 'ORGANIZER']),
  // ... other fields
});

export const updateUserSchema = createUserSchema.partial();

// Event schemas
export const createEventSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  location: z.string().optional(),
});

// ... more schemas
```

**Create Validation Middleware:**

**File:** `src/middleware/validate.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errorFactory';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = validated.body;
      req.query = validated.query;
      req.params = validated.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(error.errors);
      }
      next(error);
    }
  };
};
```

**Usage:**
```typescript
router.post('/events',
  validate(createEventSchema),
  eventsController.create
);
```

**Acceptance Criteria:**
- [ ] All validation schemas centralized
- [ ] Validation middleware created
- [ ] Zod or Joi used consistently
- [ ] All routes use validation middleware

#### Task 4.2: Extract Frontend Common Components
**Effort:** 1 day

**Components to Extract:**
1. **DataTable** - Reusable table with sorting, filtering
2. **FormWrapper** - Standard form layout with validation
3. **PageLayout** - Standard page structure
4. **LoadingState** - Loading indicators
5. **ErrorState** - Error display

**Example:**

**File:** `frontend/src/components/common/DataTable.tsx`
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  pagination?: PaginationState;
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  onRowClick,
  pagination,
}: DataTableProps<T>) {
  // Reusable table implementation
}
```

**Acceptance Criteria:**
- [ ] Common components extracted
- [ ] Used in at least 5 pages
- [ ] Props properly typed
- [ ] Documented with examples
- [ ] Storybook stories created

---

## Testing Requirements

### Unit Tests
- [ ] BaseController all methods
- [ ] Error factory all error types
- [ ] Validation schemas
- [ ] Common components

**Coverage Target:** 85%+

### Integration Tests
- [ ] Refactored controllers maintain same API
- [ ] Error responses standardized
- [ ] Validation middleware

### Regression Tests
- [ ] All existing functionality works
- [ ] No API breaking changes
- [ ] Frontend UI unchanged

---

## Deployment Plan

**Risk:** Low - mostly internal refactoring

**Strategy:** Incremental deployment
1. Deploy base classes (unused initially)
2. Deploy refactored controllers one at a time
3. Deploy dependency changes
4. Deploy frontend changes

**Rollback:** Simple git revert for any issues

---

## Success Criteria

- ✓ Code duplication reduced by 40%
- ✓ Dependency count < 90 packages
- ✓ Zero critical/high vulnerabilities
- ✓ Consistent error responses across all endpoints
- ✓ Common patterns extracted and documented
- ✓ All tests passing
- ✓ No breaking changes

---

*Sprint planning completed: November 24, 2025*
