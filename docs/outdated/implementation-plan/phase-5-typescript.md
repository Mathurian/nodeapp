# 📄 PHASE 5: TYPE SAFETY & QUALITY IMPROVEMENTS
**Duration:** Days 36-42 (1 week)
**Focus:** Enable TypeScript strict mode, improve code quality
**Risk Level:** MEDIUM - Potential breaking changes
**Dependencies:** Phases 1-4 completed

---

## 🎯 PHASE OBJECTIVES

1. ✅ Enable TypeScript strict mode incrementally
2. ✅ Replace 275+ `any` types with proper types
3. ✅ Define comprehensive API response types
4. ✅ Implement null safety throughout codebase
5. ✅ Add ESLint strict rules
6. ✅ Remove unused imports and variables
7. ✅ Achieve 100% type coverage on new code

---

## 📋 DAY 36: STRICT MODE STRATEGY

### Task 5.1: Create Incremental Migration Plan (3 hours)

#### Create Strict TypeScript Config

**File:** `tsconfig.strict.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    // Enable all strict mode flags
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional strict checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    // Ensure imports are used
    "allowUnusedLabels": false,
    "allowUnreachableCode": false
  },
  "include": [
    "src/features/**/*.ts",
    "src/shared/utils/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

#### Migration Tracking

**File:** `docs/typescript-migration.md`

```markdown
# TypeScript Strict Mode Migration

## Progress

### Phase 1: New Files Only (Week 1)
- [x] tsconfig.strict.json created
- [ ] All new files use strict mode
- [ ] ESLint configured for strict mode

### Phase 2: Shared Utilities (Week 2)
- [ ] src/shared/utils/ - 0/20 files migrated
- [ ] src/shared/types/ - 0/15 files migrated
- [ ] src/shared/middleware/ - 0/19 files migrated

### Phase 3: Critical Paths (Week 3-4)
- [ ] src/features/auth/ - 0/8 files migrated
- [ ] src/features/users/ - 0/12 files migrated
- [ ] src/features/scoring/ - 0/15 files migrated

### Phase 4: Remaining Features (Week 5-6)
- [ ] src/features/events/ - 0/20 files migrated
- [ ] src/features/contests/ - 0/18 files migrated
- [ ] All other features

## Migration Checklist Per File

For each file being migrated:

1. [ ] Remove all `any` types
2. [ ] Add explicit return types to all functions
3. [ ] Handle all null/undefined cases
4. [ ] Add proper error handling
5. [ ] Update tests to be type-safe
6. [ ] Run `tsc --noEmit` to verify
7. [ ] Add file to `include` in tsconfig.strict.json
```

---

## 📋 DAY 37-38: DEFINE COMPREHENSIVE TYPES

### Task 5.2: Create Type Definitions (8 hours)

#### API Response Types

**File:** `src/shared/types/api.types.ts`

```typescript
/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  metadata?: PaginationMetadata;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  metadata: PaginationMetadata;
  timestamp: string;
}

/**
 * Generic error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: Record<string, any>;
  timestamp: string;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse extends ErrorResponse {
  details: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}
```

#### Domain Types

**File:** `src/shared/types/domain.types.ts`

```typescript
import { User, Event, Contest, Category, Score } from '@prisma/client';

/**
 * User types
 */
export type UserRole =
  | 'ADMIN'
  | 'ORGANIZER'
  | 'JUDGE'
  | 'CONTESTANT'
  | 'EMCEE'
  | 'TALLY_MASTER'
  | 'AUDITOR'
  | 'BOARD';

export interface UserWithRelations extends User {
  judge?: Judge | null;
  contestant?: Contestant | null;
  permissions?: Permission[];
}

export type CreateUserDTO = Pick<User, 'name' | 'email' | 'role'> & {
  password: string;
  preferredName?: string;
  phone?: string;
  bio?: string;
};

export type UpdateUserDTO = Partial<Omit<User, 'id' | 'password' | 'createdAt' | 'updatedAt'>>;

/**
 * Event types
 */
export interface EventWithRelations extends Event {
  contests?: Contest[];
  organizer?: User;
}

export type CreateEventDTO = Pick<Event, 'name' | 'startDate' | 'endDate'> & {
  description?: string;
  location?: string;
  maxContestants?: number;
};

export type UpdateEventDTO = Partial<CreateEventDTO>;

/**
 * Contest types
 */
export interface ContestWithRelations extends Contest {
  event?: Event;
  categories?: Category[];
  contestants?: Contestant[];
}

export type CreateContestDTO = Pick<Contest, 'eventId' | 'name'> & {
  description?: string;
  contestantNumberingMode?: 'MANUAL' | 'AUTOMATIC';
};

/**
 * Score types
 */
export interface ScoreWithRelations extends Score {
  judge?: Judge;
  contestant?: Contestant;
  category?: Category;
}

export type CreateScoreDTO = Pick<Score, 'judgeId' | 'contestantId' | 'categoryId' | 'value'> & {
  comment?: string;
};

/**
 * Query types
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterQuery {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export type UserQuery = PaginationQuery & FilterQuery;
export type EventQuery = PaginationQuery & Pick<FilterQuery, 'search' | 'startDate' | 'endDate'>;
```

#### Request/Response Types for Frontend

**File:** `frontend/src/types/api.types.ts`

```typescript
/**
 * Frontend API types - mirrors backend
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  metadata?: PaginationMetadata;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// User types
export interface User {
  id: string;
  name: string;
  preferredName: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  judge?: Judge | null;
  contestant?: Contestant | null;
}

export type UserRole =
  | 'ADMIN'
  | 'ORGANIZER'
  | 'JUDGE'
  | 'CONTESTANT'
  | 'EMCEE'
  | 'TALLY_MASTER'
  | 'AUDITOR'
  | 'BOARD';

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  preferredName?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  preferredName?: string;
  phone?: string;
  isActive?: boolean;
}

// Event types
export interface Event {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  maxContestants?: number;
}

// Type guards
export function isApiResponse<T>(obj: any): obj is ApiResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    'timestamp' in obj
  );
}

export function isSuccessResponse<T>(obj: any): obj is ApiResponse<T> & { success: true } {
  return isApiResponse(obj) && obj.success === true;
}
```

#### Update API Service with Types

**File:** `frontend/src/services/api.ts` (updated)

```typescript
import axios, { AxiosResponse } from 'axios';
import { ApiResponse, User, Event, CreateUserRequest, CreateEventRequest } from '../types/api.types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Type-safe API methods
export const usersAPI = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get<ApiResponse<User[]>>('/users');
    return response.data.data || [];
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    if (!response.data.data) {
      throw new Error('User not found');
    }
    return response.data.data;
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    const response = await api.post<ApiResponse<User>>('/users', data);
    if (!response.data.data) {
      throw new Error('Failed to create user');
    }
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreateUserRequest>): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, data);
    if (!response.data.data) {
      throw new Error('Failed to update user');
    }
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

export const eventsAPI = {
  getAll: async (): Promise<Event[]> => {
    const response = await api.get<ApiResponse<Event[]>>('/events');
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Event> => {
    const response = await api.get<ApiResponse<Event>>(`/events/${id}`);
    if (!response.data.data) {
      throw new Error('Event not found');
    }
    return response.data.data;
  },

  create: async (data: CreateEventRequest): Promise<Event> => {
    const response = await api.post<ApiResponse<Event>>('/events', data);
    if (!response.data.data) {
      throw new Error('Failed to create event');
    }
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreateEventRequest>): Promise<Event> => {
    const response = await api.put<ApiResponse<Event>>(`/events/${id}`, data);
    if (!response.data.data) {
      throw new Error('Failed to update event');
    }
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`);
  },
};

export { api };
export default api;
```

---

## 📋 DAY 39-40: MIGRATE CRITICAL FILES

### Task 5.3: Enable Strict Mode for Core Files (10 hours)

#### Migration Process Per File

1. **Add explicit return types**

Before:
```typescript
async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user;
}
```

After:
```typescript
async function getUser(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user;
}
```

2. **Replace `any` types**

Before:
```typescript
const userData: any = req.body;
const users: any[] = await prisma.user.findMany();
```

After:
```typescript
const userData: CreateUserDTO = req.body;
const users: User[] = await prisma.user.findMany();
```

3. **Handle null/undefined**

Before:
```typescript
const user = await prisma.user.findUnique({ where: { id } });
return user.email; // Could be null!
```

After:
```typescript
const user = await prisma.user.findUnique({ where: { id } });
if (!user) {
  throw new NotFoundError('User not found');
}
return user.email;
```

4. **Strict function parameters**

Before:
```typescript
function createUser(data) {
  // ...
}
```

After:
```typescript
function createUser(data: CreateUserDTO): Promise<User> {
  // ...
}
```

#### Migrate Auth Service (Example)

**File:** `src/features/auth/auth.service.ts`

```typescript
import { injectable, inject } from 'tsyringe';
import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ValidationError } from '@shared/errors/AppError';
import { jwtSecret, jwtExpiresIn } from '@shared/config';

export interface LoginDTO {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  sessionVersion: number;
}

@injectable()
export class AuthService {
  constructor(
    @inject('PrismaClient') private readonly prisma: PrismaClient
  ) {}

  async login(
    email: string,
    password: string,
    tenantId: string
  ): Promise<LoginResponse> {
    // Validate inputs
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId, email }
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate token
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      sessionVersion: user.sessionVersion ?? 0,
    };

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: jwtExpiresIn
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  async getUserFromToken(token: string): Promise<User | null> {
    const payload = await this.verifyToken(token);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId }
    });

    // Check session version
    if (user && (user.sessionVersion ?? 0) !== payload.sessionVersion) {
      throw new UnauthorizedError('Session expired');
    }

    return user;
  }
}
```

---

## 📋 DAY 41: ESLINT STRICT RULES

### Task 5.4: Configure ESLint for Type Safety (3 hours)

**File:** `.eslintrc.json`

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json",
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    // TypeScript strict rules
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "warn",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/require-await": "warn",
    "@typescript-eslint/no-misused-promises": "error",

    // General code quality
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-debugger": "error",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "curly": "error"
  },
  "overrides": [
    {
      "files": ["*.test.ts", "*.spec.ts"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-assignment": "off"
      }
    }
  ]
}
```

---

## 📋 DAY 42: VERIFICATION & DOCUMENTATION

### Task 5.5: Type Coverage Reporting (2 hours)

**File:** `scripts/type-coverage.sh`

```bash
#!/bin/bash

echo "📊 Checking TypeScript type coverage..."

# Install type-coverage if needed
npm install --save-dev type-coverage

# Run type coverage
npx type-coverage --detail --strict

# Generate report
npx type-coverage --detail --strict > type-coverage-report.txt

echo "✅ Type coverage report generated!"
cat type-coverage-report.txt
```

**Add to package.json:**
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:strict": "tsc --noEmit -p tsconfig.strict.json",
    "type-coverage": "type-coverage --detail",
    "lint:types": "eslint . --ext .ts --max-warnings 0"
  }
}
```

---

## ✅ PHASE 5 COMPLETION CHECKLIST

### Type Safety
- [ ] tsconfig.strict.json created and configured
- [ ] All API response types defined
- [ ] All domain types defined
- [ ] Frontend types mirror backend types
- [ ] Type guards implemented
- [ ] No `any` types in new code

### Migration Progress
- [ ] Shared utilities: 100% strict mode
- [ ] Auth feature: 100% strict mode
- [ ] Users feature: 100% strict mode
- [ ] Critical paths: 80%+ strict mode
- [ ] Overall codebase: 50%+ strict mode

### Code Quality
- [ ] ESLint strict rules configured
- [ ] All unused imports removed
- [ ] All unused variables removed
- [ ] Explicit return types on all functions
- [ ] Null safety implemented

### Documentation
- [ ] Migration progress tracked
- [ ] Type definitions documented
- [ ] Type coverage reports generated
- [ ] Examples provided for common patterns

### Metrics
- [ ] Type coverage: 85%+
- [ ] No ESLint type errors
- [ ] All tests passing
- [ ] Build successful with strict mode

---

**Next:** [Phase 6: Performance & Scalability](./phase-6-performance.md)
