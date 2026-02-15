# 📄 PHASE 4: CODE RESTRUCTURING & ARCHITECTURE
**Duration:** Days 29-35 (1 week)
**Focus:** Clean architecture, remove duplication, organize files
**Risk Level:** LOW - Internal refactoring only
**Dependencies:** Phases 1-3 completed

---

## 🎯 PHASE OBJECTIVES

1. ✅ Reorganize to feature-based folder structure
2. ✅ Consolidate shared utilities and helpers
3. ✅ Remove duplicate code and patterns
4. ✅ Resolve all 49 TODO/FIXME comments
5. ✅ Delete backup .js files
6. ✅ Establish consistent code patterns
7. ✅ Improve import organization

---

## 📋 DAY 29: FOLDER RESTRUCTURING

### Task 4.1: Feature-Based Architecture (6 hours)

**Current Structure:**
```
src/
├── controllers/     (123 files - flat)
├── services/        (63 files - flat)
├── repositories/    (12 files - flat)
├── middleware/      (19 files - flat)
├── routes/          (72 files - flat)
└── utils/           (mixed utilities)
```

**New Structure:**
```
src/
├── features/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.middleware.ts
│   │   ├── auth.types.ts
│   │   └── auth.test.ts
│   ├── events/
│   │   ├── events.controller.ts
│   │   ├── events.service.ts
│   │   ├── events.repository.ts
│   │   ├── events.routes.ts
│   │   ├── events.validation.ts
│   │   └── events.test.ts
│   ├── users/
│   ├── scoring/
│   ├── contests/
│   ├── categories/
│   ├── reports/
│   └── ...
├── shared/
│   ├── middleware/    (global middleware only)
│   ├── utils/         (shared utilities)
│   ├── types/         (global types)
│   └── config/        (configuration)
├── database/
│   ├── prisma/
│   ├── migrations/
│   └── seeds/
└── server.ts
```

#### Migration Script

**File:** `scripts/restructure-codebase.ts`

```typescript
import fs from 'fs-extra';
import path from 'path';

const features = [
  'auth',
  'users',
  'events',
  'contests',
  'categories',
  'scoring',
  'results',
  'reports',
  'assignments',
  'certifications',
  'notifications',
  'templates',
  'admin',
];

async function restructureCodebase() {
  console.log('🔧 Starting codebase restructure...');

  // Create feature directories
  for (const feature of features) {
    const featureDir = path.join('src', 'features', feature);
    await fs.ensureDir(featureDir);
    console.log(`✓ Created ${featureDir}`);
  }

  // Move controllers
  for (const feature of features) {
    const controllerFiles = await findControllerFiles(feature);
    for (const file of controllerFiles) {
      const dest = path.join('src', 'features', feature, path.basename(file));
      await fs.move(file, dest);
      console.log(`✓ Moved ${file} → ${dest}`);
    }
  }

  // Move services
  for (const feature of features) {
    const serviceFiles = await findServiceFiles(feature);
    for (const file of serviceFiles) {
      const dest = path.join('src', 'features', feature, path.basename(file));
      await fs.move(file, dest);
      console.log(`✓ Moved ${file} → ${dest}`);
    }
  }

  // Update imports
  await updateAllImports();

  console.log('✅ Restructure complete!');
}

async function findControllerFiles(feature: string): Promise<string[]> {
  const controllerDir = path.join('src', 'controllers');
  const files = await fs.readdir(controllerDir);
  const pattern = new RegExp(`${feature}.*controller\\.ts$`, 'i');
  return files
    .filter(f => pattern.test(f))
    .map(f => path.join(controllerDir, f));
}

async function findServiceFiles(feature: string): Promise<string[]> {
  const serviceDir = path.join('src', 'services');
  const files = await fs.readdir(serviceDir);
  const pattern = new RegExp(`${feature}.*service\\.ts$`, 'i');
  return files
    .filter(f => pattern.test(f))
    .map(f => path.join(serviceDir, f));
}

async function updateAllImports() {
  // This would use a tool like jscodeshift to update import paths
  console.log('Updating import paths...');
  // Implementation would go here
}

restructureCodebase().catch(console.error);
```

#### Update tsconfig.json Paths

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@features/*": ["src/features/*"],
      "@shared/*": ["src/shared/*"],
      "@config/*": ["src/shared/config/*"],
      "@middleware/*": ["src/shared/middleware/*"],
      "@utils/*": ["src/shared/utils/*"],
      "@types/*": ["src/shared/types/*"]
    }
  }
}
```

---

## 📋 DAY 30: CONSOLIDATE UTILITIES

### Task 4.2: Merge Duplicate Utilities (4 hours)

#### Identify Duplicates

**Current State:**
- Response helpers duplicated across controllers
- Validation helpers scattered
- Date formatting in multiple places
- Error handling inconsistent

#### Create Shared Utils

**File:** `src/shared/utils/response.utils.ts`

```typescript
import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  metadata?: any
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    metadata,
  };
  res.status(200).json(response);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message?: string
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message: message || 'Resource created successfully',
    timestamp: new Date().toISOString(),
  };
  res.status(201).json(response);
};

export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 500,
  details?: any
): void => {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && details ? { details } : {}),
  };
  res.status(statusCode).json(response);
};

export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): void => {
  sendError(res, message, 404);
};

export const sendBadRequest = (
  res: Response,
  message: string = 'Bad request'
): void => {
  sendError(res, message, 400);
};

export const sendValidationError = (
  res: Response,
  errors: Array<{ field: string; message: string }>
): void => {
  const response: ApiResponse = {
    success: false,
    error: 'Validation failed',
    timestamp: new Date().toISOString(),
    details: errors,
  };
  res.status(422).json(response);
};
```

**File:** `src/shared/utils/date.utils.ts`

```typescript
import { format, parseISO, isValid } from 'date-fns';

export const formatDate = (date: Date | string, pattern: string = 'yyyy-MM-dd'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? format(dateObj, pattern) : '';
};

export const formatDateTime = (date: Date | string): string => {
  return formatDate(date, 'yyyy-MM-dd HH:mm:ss');
};

export const formatDateForDisplay = (date: Date | string): string => {
  return formatDate(date, 'MMM dd, yyyy');
};

export const isValidDate = (date: any): boolean => {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj);
};

export const toISOString = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateObj.toISOString();
};
```

**File:** `src/shared/utils/validation.utils.ts`

```typescript
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const sanitizeString = (str: string): string => {
  return str.trim().replace(/\s+/g, ' ');
};

export const isStrongPassword = (password: string): boolean => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};
```

---

## 📋 DAY 31: REMOVE DUPLICATION

### Task 4.3: Eliminate Duplicate Code (6 hours)

#### Consolidate Repository Registrations

**Current Problem:** Repositories registered twice in container

**File:** `src/shared/config/container.ts`

```typescript
import 'reflect-metadata';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { prisma } from './database';

// Helper function to create repository factory
const createRepositoryFactory = <T>(
  RepositoryClass: new (prisma: PrismaClient) => T
) => {
  return (c: any) => {
    const prismaClient = c.resolve<PrismaClient>('PrismaClient');
    return new RepositoryClass(prismaClient);
  };
};

export function setupContainer(): void {
  // Register Prisma Client
  container.register<PrismaClient>('PrismaClient', {
    useValue: prisma
  });

  // Register repositories using helper
  const repositories = [
    UserRepository,
    EventRepository,
    ScoreRepository,
    ContestRepository,
    CategoryRepository,
    // ... more repositories
  ];

  repositories.forEach(RepositoryClass => {
    // Register as class
    container.register(RepositoryClass, {
      useFactory: createRepositoryFactory(RepositoryClass)
    });

    // Register as string token (for @inject decorators)
    container.register(RepositoryClass.name, {
      useFactory: createRepositoryFactory(RepositoryClass)
    });
  });

  console.log(`✓ Registered ${repositories.length} repositories`);
}
```

#### Remove Backup Files

**File:** `scripts/clean-backup-files.sh`

```bash
#!/bin/bash

echo "🗑️  Removing backup files..."

# Find and list backup files
find ./src -name "*.js.backup" -o -name "*.backup.ts" | while read file; do
  echo "Removing: $file"
  rm "$file"
done

# Find and remove .bak files
find ./src -name "*.bak" | while read file; do
  echo "Removing: $file"
  rm "$file"
done

echo "✅ Backup files removed!"
```

Run:
```bash
chmod +x scripts/clean-backup-files.sh
./scripts/clean-backup-files.sh
```

---

## 📋 DAY 32-33: RESOLVE TODO ITEMS

### Task 4.4: Fix All TODO/FIXME Comments (8 hours)

#### Find All TODOs

```bash
grep -r "TODO\|FIXME\|XXX\|HACK" ./src --include="*.ts" > todos.txt
```

#### Categorize TODOs

**File:** `scripts/categorize-todos.ts`

```typescript
import fs from 'fs';
import path from 'path';

interface Todo {
  file: string;
  line: number;
  type: 'TODO' | 'FIXME' | 'HACK' | 'XXX';
  comment: string;
  priority: 'high' | 'medium' | 'low';
}

async function categorizeTodos() {
  const todos: Todo[] = [];

  // Read all TypeScript files
  const files = getAllTsFiles('./src');

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const match = line.match(/(TODO|FIXME|HACK|XXX):?\s*(.+)/i);
      if (match) {
        const type = match[1].toUpperCase() as Todo['type'];
        const comment = match[2].trim();

        // Determine priority
        let priority: Todo['priority'] = 'medium';
        if (type === 'FIXME' || type === 'HACK') priority = 'high';
        if (comment.toLowerCase().includes('optional')) priority = 'low';

        todos.push({
          file,
          line: index + 1,
          type,
          comment,
          priority,
        });
      }
    });
  }

  // Group by priority
  const grouped = {
    high: todos.filter(t => t.priority === 'high'),
    medium: todos.filter(t => t.priority === 'medium'),
    low: todos.filter(t => t.priority === 'low'),
  };

  // Generate report
  console.log('# TODO Report\n');
  console.log(`Total: ${todos.length} items\n`);

  for (const [priority, items] of Object.entries(grouped)) {
    console.log(`## ${priority.toUpperCase()} Priority (${items.length} items)\n`);
    items.forEach(item => {
      console.log(`- [ ] **${item.file}:${item.line}** - ${item.comment}`);
    });
    console.log('');
  }

  // Save to file
  fs.writeFileSync('TODO_REPORT.md', generateMarkdown(grouped));
  console.log('✅ Report saved to TODO_REPORT.md');
}

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function generateMarkdown(grouped: any): string {
  // Implementation...
  return '';
}

categorizeTodos();
```

#### Create GitHub Issues for TODOs

**File:** `scripts/create-todo-issues.sh`

```bash
#!/bin/bash

# This script creates GitHub issues for each high-priority TODO

while IFS= read -r line; do
  if [[ $line =~ \*\*(.+):([0-9]+)\*\*\ -\ (.+) ]]; then
    file="${BASH_REMATCH[1]}"
    lineno="${BASH_REMATCH[2]}"
    comment="${BASH_REMATCH[3]}"

    title="TODO: $comment"
    body="**File:** $file:$lineno\n\n**Description:** $comment\n\n**Priority:** High"

    # Create GitHub issue
    gh issue create \
      --title "$title" \
      --body "$body" \
      --label "technical-debt,todo"

    echo "Created issue: $title"
  fi
done < TODO_REPORT.md
```

---

## 📋 DAY 34: CODE PATTERNS & STANDARDS

### Task 4.5: Establish Consistent Patterns (4 hours)

#### Error Handling Pattern

**File:** `src/shared/errors/AppError.ts`

```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}
```

**Usage:**
```typescript
// Instead of:
if (!user) {
  return res.status(404).json({ error: 'User not found' });
}

// Use:
if (!user) {
  throw new NotFoundError('User not found');
}
```

#### Service Pattern

**Template:** `src/shared/templates/BaseService.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { Logger } from '../utils/logger';

@injectable()
export abstract class BaseService {
  protected logger: Logger;

  constructor(
    @inject('PrismaClient') protected prisma: PrismaClient
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  protected handleError(error: any, context: string): never {
    this.logger.error(`Error in ${context}`, { error });
    throw error;
  }
}
```

#### Controller Pattern

**Template:** `src/shared/templates/BaseController.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export abstract class BaseController {
  protected asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}
```

---

## 📋 DAY 35: DOCUMENTATION & VERIFICATION

### Task 4.6: Update Documentation (3 hours)

#### Architecture Documentation

**File:** `docs/ARCHITECTURE.md` (update)

```markdown
# Architecture Overview

## Folder Structure

```
src/
├── features/              # Feature-based modules
│   ├── auth/             # Authentication
│   ├── users/            # User management
│   ├── events/           # Event management
│   └── ...
├── shared/               # Shared code
│   ├── middleware/       # Global middleware
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   ├── errors/          # Error classes
│   └── config/          # Configuration
└── server.ts            # Application entry point
```

## Design Patterns

### Feature Module Pattern

Each feature follows this structure:

```
feature/
├── feature.controller.ts  # HTTP handlers
├── feature.service.ts     # Business logic
├── feature.repository.ts  # Data access
├── feature.routes.ts      # Route definitions
├── feature.types.ts       # TypeScript types
├── feature.validation.ts  # Zod schemas
└── feature.test.ts        # Tests
```

### Dependency Injection

We use `tsyringe` for dependency injection:

```typescript
@injectable()
export class UserService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('CacheService') private cache: CacheService
  ) {}
}
```

### Error Handling

Use custom error classes:

```typescript
throw new NotFoundError('User not found');
throw new ValidationError('Invalid email', { field: 'email' });
```

## Import Organization

Imports should be organized in this order:

1. External libraries
2. Internal features
3. Shared utilities
4. Types
5. Relative imports

```typescript
// External
import { injectable } from 'tsyringe';
import { PrismaClient } from '@prisma/client';

// Features
import { UserService } from '@features/users/user.service';

// Shared
import { Logger } from '@shared/utils/logger';

// Types
import { CreateUserDTO } from '@types/user.types';

// Relative
import { validateUser } from './user.validation';
```
```

---

## ✅ PHASE 4 COMPLETION CHECKLIST

### Folder Structure
- [ ] Feature-based structure implemented
- [ ] Shared utilities consolidated
- [ ] All files moved to new locations
- [ ] Import paths updated throughout
- [ ] tsconfig paths configured

### Code Quality
- [ ] Duplicate repository registrations removed
- [ ] Backup files deleted
- [ ] All 49 TODOs resolved or tracked in GitHub
- [ ] Consistent error handling pattern
- [ ] Consistent service pattern
- [ ] Consistent controller pattern

### Documentation
- [ ] Architecture documentation updated
- [ ] Design patterns documented
- [ ] Import organization guide written
- [ ] Migration guide created

### Verification
- [ ] All tests still passing
- [ ] No broken imports
- [ ] Application builds successfully
- [ ] No duplicate code detected

---

**Next:** [Phase 5: Type Safety & Quality](./phase-5-typescript.md)
