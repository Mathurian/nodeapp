# Phase 1: Critical - Remove Duplicate Files

**Priority:** 🔴 CRITICAL
**Timeline:** 24 hours
**Risk Level:** MEDIUM
**Dependencies:** None

---

## Problem Summary

**Issue:** Duplicate route and controller files with similar names causing confusion
**Impact:**
- Maintenance confusion - unclear which file is active
- Potential bugs from editing wrong file
- Inconsistent API behavior
- Routing conflicts

**Identified Duplicates:**
1. **Route Files:**
   - ~~`src/routes/customFieldRoutes.ts`~~ (VERIFIED: Does NOT exist - already removed)
   - `src/routes/customFieldsRoutes.ts` (only one exists - no action needed)

2. **Controller Files:**
   - `src/controllers/CustomFieldController.ts` (creates new PrismaClient - needs removal)
   - `src/controllers/customFieldsController.ts` (functional exports - keep this one)

---

## Investigation Steps

### Step 1: Analyze Route Files (1 hour)

**Determine which file is actually used:**

```bash
# Check which file is imported in server.ts or route index
grep -r "customField" src/server.ts src/routes/index.ts

# Check file sizes
ls -lh src/routes/customField*.ts

# Check last modified dates
stat src/routes/customFieldRoutes.ts
stat src/routes/customFieldsRoutes.ts

# Check git history
git log --oneline --follow src/routes/customFieldRoutes.ts
git log --oneline --follow src/routes/customFieldsRoutes.ts
```

**Compare file contents:**

```bash
# Show differences
diff src/routes/customFieldRoutes.ts src/routes/customFieldsRoutes.ts

# Or use a better diff tool
code --diff src/routes/customFieldRoutes.ts src/routes/customFieldsRoutes.ts
```

**Check which routes are registered:**

```typescript
// Look in src/server.ts or src/routes/index.ts
import customFieldRoutes from './routes/customFieldRoutes';
// OR
import customFieldsRoutes from './routes/customFieldsRoutes';
```

### Step 2: Analyze Controller Files (1 hour)

**Determine which controller is actually used:**

```bash
# Check which file is imported by routes
grep -r "CustomField.*Controller" src/routes/

# Check file sizes and dates
ls -lh src/controllers/CustomField*.ts
stat src/controllers/CustomFieldController.ts
stat src/controllers/customFieldsController.ts

# Check git history
git log --oneline --follow src/controllers/CustomFieldController.ts
git log --oneline --follow src/controllers/customFieldsController.ts
```

**Compare implementations:**

```bash
diff src/controllers/CustomFieldController.ts src/controllers/customFieldsController.ts
```

### Step 3: Determine Active vs Inactive Files (30 minutes)

**Create analysis matrix:**

| File | Last Modified | Size | Imported By | Git Commits | Status |
|------|---------------|------|-------------|-------------|--------|
| customFieldRoutes.ts | ? | ? | ? | ? | ACTIVE/INACTIVE |
| customFieldsRoutes.ts | ? | ? | ? | ? | ACTIVE/INACTIVE |
| CustomFieldController.ts | ? | ? | ? | ? | ACTIVE/INACTIVE |
| customFieldsController.ts | ? | ? | ? | ? | ACTIVE/INACTIVE |

**Decision Criteria:**
1. **Imported by server/routes:** File being used = ACTIVE
2. **More recent modifications:** Likely ACTIVE
3. **More git commits:** Likely ACTIVE
4. **Larger file size:** Likely more complete = ACTIVE
5. **Better code quality:** Choose for ACTIVE

---

## Resolution Strategy

### Strategy A: Files are Identical

**If `diff` shows NO differences:**

**Action:** Delete one file, keep the other based on naming convention

**Recommended Naming Convention:**
- Routes: `customFieldsRoutes.ts` (plural, lowercase)
- Controllers: `CustomFieldsController.ts` (PascalCase, plural)

**Steps:**
1. Verify files are 100% identical: `diff -q file1 file2`
2. Keep the file following naming convention
3. Update all imports to use kept file
4. Delete duplicate file
5. Commit with message: "Remove duplicate customField files - identical content"

### Strategy B: Files are Different

**If `diff` shows DIFFERENCES:**

**Action:** Merge files, keeping best implementation

**Steps:**

1. **Create backup:**
   ```bash
   cp src/routes/customFieldRoutes.ts src/routes/customFieldRoutes.ts.backup
   cp src/routes/customFieldsRoutes.ts src/routes/customFieldsRoutes.ts.backup
   ```

2. **Analyze differences:**
   - Which file has more complete implementations?
   - Which file has better error handling?
   - Which file has proper TypeScript types?
   - Which file matches project conventions?

3. **Merge strategy:**
   ```typescript
   // Create new merged file with best of both
   // src/routes/customFieldsRoutes.ts (FINAL)

   // Take complete route definitions from one file
   // Add missing routes from other file
   // Use better error handling patterns
   // Apply consistent code style
   ```

4. **Testing:**
   - Test all endpoints from both files
   - Ensure no functionality lost
   - Verify error handling works

5. **Update imports:**
   - Change all imports to use final merged file
   - Delete both original files
   - Commit merged result

### Strategy C: One File is Clearly Obsolete

**If one file is empty, stub, or clearly outdated:**

**Action:** Delete obsolete file immediately

**Steps:**
1. Verify obsolete file is not imported anywhere:
   ```bash
   grep -r "customFieldRoutes" src/ --exclude-dir=node_modules
   ```
2. If not imported: Delete file
3. If imported: Update import first, then delete

---

## Implementation Plan

### Phase 1: Route Files (2 hours)

**Step 1: Investigate**
```bash
# Check current imports
grep -r "customFieldRoutes\|customFieldsRoutes" src/

# Compare files
diff src/routes/customFieldRoutes.ts src/routes/customFieldsRoutes.ts > /tmp/route-diff.txt
cat /tmp/route-diff.txt

# Check which is registered
grep -A5 "app.use.*customField" src/server.ts
```

**Step 2: Decision**
- If identical: Keep `customFieldsRoutes.ts` (follows plural convention)
- If different: Merge to `customFieldsRoutes.ts`
- If one obsolete: Delete obsolete

**Step 3: Execute**

**Option A - Identical Files:**
```bash
# Verify identical
diff src/routes/customFieldRoutes.ts src/routes/customFieldsRoutes.ts
# No output = identical

# Update any imports (if customFieldRoutes was being used)
# Find and replace in server.ts or route index

# Delete duplicate
rm src/routes/customFieldRoutes.ts
git add src/routes/customFieldRoutes.ts
git commit -m "Remove duplicate customFieldRoutes - identical to customFieldsRoutes"
```

**Option B - Different Files:**
```typescript
// 1. Read both files completely
// 2. Create new merged file
// src/routes/customFieldsRoutes.ts

import express from 'express';
import { CustomFieldsController } from '../controllers/customFieldsController';
import { authenticate } from '../middleware/auth';
import { validateCustomField } from '../middleware/validation';

const router = express.Router();
const controller = new CustomFieldsController();

// Merge all unique routes from both files
router.get('/api/custom-fields', authenticate, controller.getAll);
router.get('/api/custom-fields/:id', authenticate, controller.getById);
router.post('/api/custom-fields', authenticate, validateCustomField, controller.create);
router.put('/api/custom-fields/:id', authenticate, validateCustomField, controller.update);
router.delete('/api/custom-fields/:id', authenticate, controller.delete);

// Add any unique routes from the other file here

export default router;
```

```bash
# Test merged file
npm run build
npm test -- customFieldsRoutes

# Delete both original files
rm src/routes/customFieldRoutes.ts
rm src/routes/customFieldsRoutes.ts.backup

# Commit
git add src/routes/customFieldsRoutes.ts
git commit -m "Merge duplicate customField route files"
```

### Phase 2: Controller Files (2 hours)

**Step 1: Investigate**
```bash
# Check imports
grep -r "CustomFieldController\|customFieldsController" src/

# Compare files
diff src/controllers/CustomFieldController.ts src/controllers/customFieldsController.ts > /tmp/controller-diff.txt

# Check class names
grep "export class" src/controllers/CustomField*.ts
```

**Step 2: Decision**
- Standardize on: `CustomFieldsController.ts` (PascalCase, plural)
- Determine active vs obsolete
- Plan merge if needed

**Step 3: Execute**

**Standard Controller Format:**
```typescript
// src/controllers/customFieldsController.ts (FINAL)
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { logger } from '../config/logger';

export class CustomFieldsController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customFields = await prisma.customField.findMany({
        where: { tenantId: req.tenantId },
      });
      res.json({ data: customFields });
    } catch (error) {
      logger.error('Error fetching custom fields:', error);
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customField = await prisma.customField.findUnique({
        where: { id: parseInt(id), tenantId: req.tenantId },
      });

      if (!customField) {
        res.status(404).json({ error: 'Custom field not found' });
        return;
      }

      res.json({ data: customField });
    } catch (error) {
      logger.error('Error fetching custom field:', error);
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customField = await prisma.customField.create({
        data: {
          ...req.body,
          tenantId: req.tenantId,
        },
      });
      res.status(201).json({ data: customField });
    } catch (error) {
      logger.error('Error creating custom field:', error);
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const customField = await prisma.customField.update({
        where: { id: parseInt(id), tenantId: req.tenantId },
        data: req.body,
      });
      res.json({ data: customField });
    } catch (error) {
      logger.error('Error updating custom field:', error);
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.customField.delete({
        where: { id: parseInt(id), tenantId: req.tenantId },
      });
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting custom field:', error);
      next(error);
    }
  }
}
```

**Update route imports:**
```typescript
// src/routes/customFieldsRoutes.ts
import { CustomFieldsController } from '../controllers/customFieldsController';
// NOT: CustomFieldController
```

**Delete duplicate:**
```bash
rm src/controllers/CustomFieldController.ts
git add .
git commit -m "Standardize on customFieldsController.ts"
```

---

## Testing Plan

### Unit Tests (1 hour)

**Test that duplicates are removed:**
```bash
# Should return 0 results
find src/routes -name "*customFieldRoutes.ts" | wc -l
# Expected: 1

find src/controllers -name "*CustomField*Controller.ts" | wc -l
# Expected: 1
```

**Test imports are correct:**
```bash
# Should return 0 (no imports of deleted files)
grep -r "customFieldRoutes[^s]" src/
grep -r "CustomFieldController[^s]" src/

# Should find imports of kept files
grep -r "customFieldsRoutes" src/
grep -r "customFieldsController" src/
```

**Test route functionality:**
```bash
# Start server
npm run dev

# Test all custom field endpoints
curl http://localhost:3000/api/custom-fields
curl http://localhost:3000/api/custom-fields/1
curl -X POST http://localhost:3000/api/custom-fields -d '{"name":"test"}'
curl -X PUT http://localhost:3000/api/custom-fields/1 -d '{"name":"updated"}'
curl -X DELETE http://localhost:3000/api/custom-fields/1
```

### Integration Tests (30 minutes)

```typescript
// test/integration/customFields.test.ts
import request from 'supertest';
import app from '../src/server';

describe('Custom Fields API', () => {
  it('should get all custom fields', async () => {
    const response = await request(app)
      .get('/api/custom-fields')
      .expect(200);
    expect(response.body.data).toBeDefined();
  });

  it('should create a custom field', async () => {
    const response = await request(app)
      .post('/api/custom-fields')
      .send({ name: 'Test Field', type: 'text' })
      .expect(201);
    expect(response.body.data.name).toBe('Test Field');
  });

  // ... more tests
});
```

---

## Validation Criteria

### Success Metrics

✅ **Exactly ONE route file exists:**
```bash
find src/routes -name "*customField*Routes.ts" | wc -l
# Expected: 1 (customFieldsRoutes.ts)
```

✅ **Exactly ONE controller file exists:**
```bash
find src/controllers -name "*CustomField*Controller.ts" | wc -l
# Expected: 1 (customFieldsController.ts)
```

✅ **No imports of deleted files:**
```bash
grep -r "customFieldRoutes\b" src/
# Expected: 0 results (only customFieldsRoutes should exist)
```

✅ **All endpoints functional:**
- GET /api/custom-fields returns 200
- POST /api/custom-fields returns 201
- PUT /api/custom-fields/:id returns 200
- DELETE /api/custom-fields/:id returns 204

✅ **Build succeeds:**
```bash
npm run build
# Expected: Success with 0 errors
```

✅ **Tests pass:**
```bash
npm test
# Expected: All tests pass
```

---

## Rollback Plan

**If issues arise:**

### Immediate Rollback

```bash
# Restore deleted files from git
git checkout HEAD~1 -- src/routes/customFieldRoutes.ts
git checkout HEAD~1 -- src/controllers/CustomFieldController.ts

# Revert import changes
git checkout HEAD~1 -- src/server.ts

# Rebuild
npm run build

# Restart
pm2 restart event-manager
```

### Keep Both Files Temporarily

If consolidation causes issues, can temporarily register both routes:

```typescript
// src/server.ts - TEMPORARY ONLY
import customFieldRoutes from './routes/customFieldRoutes';
import customFieldsRoutes from './routes/customFieldsRoutes';

app.use('/v1', customFieldRoutes);   // Old version
app.use('/v2', customFieldsRoutes);  // New version

// Migration period: 1 week
// Then remove v1 routes
```

---

## Documentation Updates

**After completion, update:**

1. **API Documentation:**
   - Confirm endpoint paths
   - Update any references to old file names
   - Ensure OpenAPI/Swagger spec is current

2. **Code Comments:**
   ```typescript
   /**
    * Custom Fields Routes
    *
    * Consolidated from:
    * - customFieldRoutes.ts (removed 2025-11-22)
    * - customFieldsRoutes.ts (kept as single source)
    *
    * All custom field CRUD operations
    */
   ```

3. **Team Communication:**
   - Notify team of file deletion
   - Update import instructions
   - Update local branches to avoid conflicts

---

## Future Prevention

**To prevent duplicate files in future:**

### 1. Naming Conventions Document

Create: `docs/conventions/FILE-NAMING.md`

```markdown
# File Naming Conventions

## Routes
- Format: `{resource}Routes.ts` (plural, camelCase)
- Example: `customFieldsRoutes.ts`, `usersRoutes.ts`

## Controllers
- Format: `{Resource}Controller.ts` (PascalCase, singular)
- Example: `CustomFieldController.ts`, `UserController.ts`

## Services
- Format: `{Resource}Service.ts` (PascalCase, singular)
- Example: `CustomFieldService.ts`, `UserService.ts`
```

### 2. Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh

# Check for duplicate file patterns
duplicates=$(find src/routes -name "*Routes.ts" | \
  sed 's/Routes\.ts$//' | \
  uniq -d)

if [ -n "$duplicates" ]; then
  echo "❌ Duplicate route files detected:"
  echo "$duplicates"
  exit 1
fi
```

### 3. ESLint Rule

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // Enforce import from correct file names
    'import/no-duplicates': 'error',
  },
};
```

---

## Estimated Effort

| Task | Time | Developer |
|------|------|-----------|
| Investigate route files | 1 hour | Backend Dev |
| Investigate controller files | 1 hour | Backend Dev |
| Merge/consolidate files | 2 hours | Backend Dev |
| Update imports | 1 hour | Backend Dev |
| Testing (unit + integration) | 1.5 hours | QA |
| Documentation updates | 0.5 hours | Backend Dev |
| Code review | 1 hour | Senior Dev |
| **Total** | **8 hours** | **1 day** |

---

## Code Review Checklist

**Before Merging:**

- [ ] Only one `customField` route file exists
- [ ] Only one `CustomField` controller file exists
- [ ] Follows naming conventions (plural routes, PascalCase controllers)
- [ ] All imports updated to use correct file
- [ ] No references to deleted files in codebase
- [ ] All endpoints tested and working
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Build succeeds with no errors
- [ ] API documentation updated
- [ ] Team notified of changes

---

**Status:** READY TO IMPLEMENT
**Dependencies:** None (can run in parallel with other tasks)
**Next Steps:** Run investigation scripts to determine active files
**Owner:** Backend Development Team
