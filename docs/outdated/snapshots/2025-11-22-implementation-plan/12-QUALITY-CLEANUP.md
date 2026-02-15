# Phase 4: Code Quality - Cleanup and Organization

**Priority:** 🟢 CODE QUALITY
**Timeline:** Week 3-4
**Risk Level:** LOW
**Dependencies:** All previous phases

---

## Cleanup Tasks

### 1. Remove Dead Code (6 hours)

**Find unused exports:**

```bash
npm install --save-dev ts-prune

# Find unused exports
npx ts-prune | grep -v "used in module"
```

**Find unused files:**

```bash
# Files not imported anywhere
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  basename="${file##*/}"
  if ! grep -r "from.*${basename%.*}" src/ --exclude-dir=node_modules > /dev/null; then
    echo "Potentially unused: $file"
  fi
done
```

**Remove commented code:**

```bash
# Find large comment blocks
grep -r "^[[:space:]]*//.*$" src/ | wc -l

# Manual review and removal needed
```

### 2. Consolidate Utilities (4 hours)

**Organize utils directory:**

```bash
src/utils/
├── validation/
│   ├── schemas.ts         # Zod schemas
│   └── validators.ts      # Custom validators
├── formatting/
│   ├── date.ts           # Date formatting
│   ├── currency.ts       # Currency formatting
│   └── string.ts         # String utilities
├── auth/
│   └── password.ts       # Password service
├── database/
│   ├── pagination.ts     # Pagination helper
│   └── queryBuilder.ts   # Query utilities
└── index.ts              # Re-exports
```

**Remove duplicate utilities:**

```bash
# Find similar function names
find src/utils -name "*.ts" -exec grep -h "^export function" {} \; | sort | uniq -c | sort -rn
```

### 3. Naming Consistency (8 hours)

**Standardize naming conventions:**

- **Files:** camelCase for utilities, PascalCase for classes
- **Functions:** camelCase, descriptive verbs
- **Classes:** PascalCase, noun-based
- **Interfaces:** PascalCase, descriptive
- **Types:** PascalCase, suffix with 'Type' if needed
- **Enums:** PascalCase, singular names

**Rename inconsistent files:**

```bash
# Example renames
git mv src/utils/helpers.ts src/utils/arrayHelpers.ts
git mv src/services/service.ts src/services/BaseService.ts
```

### 4. Code Formatting (2 hours)

**Ensure Prettier/ESLint configured:**

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

```json
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  }
};
```

**Format all code:**

```bash
npx prettier --write "src/**/*.{ts,tsx}"
npx eslint --fix "src/**/*.{ts,tsx}"
```

### 5. Remove TODO Comments (3 hours)

**Convert TODOs to issues:**

```bash
# Find all TODOs
grep -rn "TODO\|FIXME\|HACK" src/ > /tmp/todos.txt

# Create GitHub issues for each
# Then remove TODO comments after creating issues
```

### 6. File Organization (4 hours)

**Ensure consistent directory structure:**

```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── services/        # Business logic
├── repositories/    # Data access (if not using Prisma directly)
├── middleware/      # Express middleware
├── routes/          # Route definitions
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── validators/      # Input validation
└── server.ts        # Application entry point
```

**Move misplaced files:**

```bash
# Example: Move validation schemas to proper location
git mv src/utils/schemas.ts src/validators/schemas.ts
```

### 7. Import Organization (2 hours)

**Standard import order:**

```typescript
// 1. External libraries
import express from 'express';
import { z } from 'zod';

// 2. Internal modules (absolute imports)
import { logger } from '@/config/logger';
import prisma from '@/config/database';

// 3. Types
import type { User, Event } from '@/types';

// 4. Relative imports
import { UserService } from './UserService';
import { validateUser } from './validators';
```

**Configure path aliases:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@config/*": ["config/*"],
      "@services/*": ["services/*"],
      "@types/*": ["types/*"]
    }
  }
}
```

### 8. Documentation Standards (6 hours)

**JSDoc for all public APIs:**

```typescript
/**
 * Creates a new event in the system
 *
 * @param data - Event creation data
 * @param context - Request context with user and tenant info
 * @returns Created event object
 * @throws {ValidationError} If data is invalid
 * @throws {AuthorizationError} If user lacks permissions
 *
 * @example
 * const event = await createEvent({
 *   name: 'Annual Meeting',
 *   startDate: new Date('2025-12-01'),
 * }, { userId: 1, tenantId: 1 });
 */
export async function createEvent(
  data: CreateEventDto,
  context: ServiceContext
): Promise<Event> {
  // Implementation
}
```

---

## Code Quality Metrics

**Before Cleanup:**
- Dead code: ~15 unused files
- Inconsistent naming: ~50 files
- Missing documentation: 80% of functions
- TODOs: 11 comments
- Import inconsistency: High

**After Cleanup:**
- Dead code: 0 unused files
- Consistent naming: 100%
- Documentation: 60%+ coverage
- TODOs: 0 (all converted to issues)
- Import consistency: 100%

---

## Estimated Effort

| Task | Time |
|------|------|
| Remove dead code | 6 hours |
| Consolidate utilities | 4 hours |
| Naming consistency | 8 hours |
| Code formatting | 2 hours |
| Remove TODOs | 3 hours |
| File organization | 4 hours |
| Import organization | 2 hours |
| Documentation | 6 hours |
| **Total** | **35 hours** |

---

**Status:** READY TO IMPLEMENT
**Owner:** Backend Development Team
