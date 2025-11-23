# Phase 2: High Priority - Standardize Password Hashing

**Priority:** 🟠 HIGH
**Timeline:** Week 1 (after Phase 1)
**Risk Level:** MEDIUM
**Dependencies:** Phase 1 complete

---

## Problem Summary

**Issue:** Both `bcrypt` and `bcryptjs` libraries installed and potentially used
**Impact:**
- **Dependency Bloat:** Unnecessary package (one must go)
- **Inconsistency:** Different implementations may have different behaviors
- **Security Risk:** Mixing implementations could lead to verification issues
- **Confusion:** Developers uncertain which to use

**Current State:**
```json
// package.json
{
  "dependencies": {
    "bcrypt": "^5.1.0",      // Native C++ binding (faster)
    "bcryptjs": "^2.4.3"     // Pure JavaScript (slower)
  }
}
```

---

## Library Comparison

### bcrypt (Native)

**Pros:**
- ✅ Faster (10-20x speed improvement)
- ✅ More widely used in production Node.js apps
- ✅ Better performance under load
- ✅ Industry standard for Node.js

**Cons:**
- ❌ Requires native compilation (node-gyp)
- ❌ Can have installation issues on some systems
- ❌ Requires Python and build tools

### bcryptjs (Pure JavaScript)

**Pros:**
- ✅ No native dependencies (easier installation)
- ✅ Cross-platform compatible
- ✅ Works in all environments (including serverless)

**Cons:**
- ❌ Significantly slower
- ❌ Poor performance under high load
- ❌ Not recommended for production

---

## Recommendation

### ✅ STANDARDIZE ON: `bcrypt` (Native)

**Reasoning:**
1. **Performance:** 10-20x faster than bcryptjs
2. **Production Ready:** Industry standard for Node.js servers
3. **Better Security:** Faster = can use higher rounds without UX impact
4. **Current Environment:** Linux server has build tools installed

**Decision:** Remove `bcryptjs`, use `bcrypt` exclusively

---

## Implementation Plan

### Step 1: Audit Current Usage (2 hours)

**Find all bcrypt/bcryptjs imports:**

```bash
# Search for bcrypt imports
grep -r "require.*bcrypt" src/
grep -r "import.*bcrypt" src/

# Search for bcryptjs imports
grep -r "require.*bcryptjs" src/
grep -r "import.*bcryptjs" src/
```

**Check usage patterns:**

```bash
# Find hash operations
grep -r "bcrypt\.hash\|bcryptjs\.hash" src/

# Find compare operations
grep -r "bcrypt\.compare\|bcryptjs\.compare" src/

# Find salt generation
grep -r "bcrypt\.genSalt\|bcryptjs\.genSalt" src/
```

**Document findings:**
- List all files using bcrypt
- List all files using bcryptjs
- Identify any mixed usage

### Step 2: Standardize Imports (2 hours)

**Create Password Utility Service:**

```typescript
// src/utils/password.ts
import bcrypt from 'bcrypt';
import { logger } from '../config/logger';

/**
 * Password hashing utility using bcrypt
 * Centralized to ensure consistent usage across application
 */
export class PasswordService {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a plaintext password
   * @param plainPassword - The password to hash
   * @returns Hashed password
   */
  static async hash(plainPassword: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(plainPassword, this.SALT_ROUNDS);
      return hash;
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Compare plaintext password with hash
   * @param plainPassword - The password to check
   * @param hashedPassword - The hash to compare against
   * @returns True if password matches
   */
  static async compare(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      return isMatch;
    } catch (error) {
      logger.error('Error comparing password:', error);
      throw new Error('Password comparison failed');
    }
  }

  /**
   * Validate password meets requirements
   * @param password - Password to validate
   * @returns True if valid
   */
  static validate(password: string): boolean {
    // Minimum 8 characters, at least one uppercase, one lowercase, one number
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return minLength && hasUpperCase && hasLowerCase && hasNumber;
  }

  /**
   * Check if hash needs rehashing (e.g., rounds changed)
   * @param hashedPassword - The hash to check
   * @returns True if needs rehashing
   */
  static async needsRehash(hashedPassword: string): Promise<boolean> {
    try {
      // Extract rounds from hash
      const rounds = this.getRounds(hashedPassword);
      return rounds < this.SALT_ROUNDS;
    } catch {
      return false;
    }
  }

  /**
   * Extract salt rounds from bcrypt hash
   * @param hash - Bcrypt hash
   * @returns Number of rounds
   */
  private static getRounds(hash: string): number {
    // Bcrypt hash format: $2a$10$...
    // Rounds are between 2nd and 3rd $
    const parts = hash.split('$');
    return parseInt(parts[2], 10);
  }
}
```

### Step 3: Replace All Usages (4 hours)

**Pattern 1: Direct bcrypt usage in AuthService**

**Before:**
```typescript
// src/services/AuthService.ts
import bcrypt from 'bcrypt';

export class AuthService {
  async register(email: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    // ...
  }

  async login(email: string, password: string) {
    const user = await findUser(email);
    const isValid = await bcrypt.compare(password, user.password);
    // ...
  }
}
```

**After:**
```typescript
// src/services/AuthService.ts
import { PasswordService } from '../utils/password';

export class AuthService {
  async register(email: string, password: string) {
    // Validate password first
    if (!PasswordService.validate(password)) {
      throw new Error('Password does not meet requirements');
    }

    const hashedPassword = await PasswordService.hash(password);
    // ...
  }

  async login(email: string, password: string) {
    const user = await findUser(email);
    const isValid = await PasswordService.compare(password, user.password);

    // Optionally rehash if using old rounds
    if (isValid && await PasswordService.needsRehash(user.password)) {
      const newHash = await PasswordService.hash(password);
      await updateUserPassword(user.id, newHash);
    }

    // ...
  }
}
```

**Pattern 2: bcryptjs usage (remove)**

**Before:**
```typescript
import bcryptjs from 'bcryptjs';

const hash = await bcryptjs.hash(password, 10);
const isMatch = await bcryptjs.compare(password, hash);
```

**After:**
```typescript
import { PasswordService } from '../utils/password';

const hash = await PasswordService.hash(password);
const isMatch = await PasswordService.compare(password, hash);
```

**Files to Update:**
- src/services/AuthService.ts
- src/services/UserService.ts
- src/controllers/usersController.ts
- src/controllers/authController.ts (if exists)
- Any other files using password hashing

**For each file:**
1. Remove bcrypt/bcryptjs imports
2. Import PasswordService
3. Replace hash() calls
4. Replace compare() calls
5. Add password validation where needed
6. Test authentication flow

### Step 4: Remove bcryptjs Dependency (30 minutes)

**Uninstall package:**

```bash
# Remove from package.json and node_modules
npm uninstall bcryptjs

# Remove types if installed
npm uninstall @types/bcryptjs
```

**Verify removal:**

```bash
# Should not appear in package.json
grep bcryptjs package.json

# Should not appear in node_modules
ls node_modules/ | grep bcryptjs
```

**Verify no remaining imports:**

```bash
# Should return 0 results
grep -r "bcryptjs" src/
```

### Step 5: Verify bcrypt Installation (1 hour)

**Check bcrypt is properly installed:**

```bash
# Should be in package.json dependencies
grep bcrypt package.json

# Should exist in node_modules
ls -la node_modules/bcrypt

# Check native binding
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.getRounds('\$2a\$10\$test'));"
# Should output: 10
```

**If installation issues (rare on Linux):**

```bash
# Rebuild native module
npm rebuild bcrypt

# Or reinstall
npm uninstall bcrypt
npm install bcrypt
```

**Test basic functionality:**

```typescript
// test/utils/password.test.ts
import { PasswordService } from '../src/utils/password';

describe('PasswordService', () => {
  it('should hash password', async () => {
    const password = 'Test123!';
    const hash = await PasswordService.hash(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2a$')).toBe(true);
  });

  it('should compare password correctly', async () => {
    const password = 'Test123!';
    const hash = await PasswordService.hash(password);

    const isMatch = await PasswordService.compare(password, hash);
    expect(isMatch).toBe(true);

    const wrongMatch = await PasswordService.compare('wrong', hash);
    expect(wrongMatch).toBe(false);
  });

  it('should validate password requirements', () => {
    expect(PasswordService.validate('Test123!')).toBe(true);
    expect(PasswordService.validate('short')).toBe(false);
    expect(PasswordService.validate('nouppercase123')).toBe(false);
    expect(PasswordService.validate('NOLOWERCASE123')).toBe(false);
    expect(PasswordService.validate('NoNumbers!')).toBe(false);
  });

  it('should detect if rehash needed', async () => {
    // Hash with 10 rounds (old)
    const bcrypt = require('bcrypt');
    const oldHash = await bcrypt.hash('password', 10);

    const needsRehash = await PasswordService.needsRehash(oldHash);
    expect(needsRehash).toBe(true); // Current is 12 rounds

    // Hash with current rounds
    const newHash = await PasswordService.hash('password');
    const stillNeeds = await PasswordService.needsRehash(newHash);
    expect(stillNeeds).toBe(false);
  });
});
```

---

## Testing Strategy

### Unit Tests (2 hours)

**Test PasswordService:**
- ✅ Hash generation
- ✅ Password comparison (valid)
- ✅ Password comparison (invalid)
- ✅ Password validation
- ✅ Rehash detection
- ✅ Error handling

**Test AuthService:**
- ✅ Registration with valid password
- ✅ Registration with invalid password (should fail)
- ✅ Login with correct password
- ✅ Login with incorrect password
- ✅ Password rehashing on login

### Integration Tests (2 hours)

**Test full authentication flow:**

```typescript
// test/integration/auth.test.ts
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/config/database';

describe('Authentication Integration', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('should register user with hashed password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      })
      .expect(201);

    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    expect(user).toBeDefined();
    expect(user.password).not.toBe('SecurePass123!');
    expect(user.password.startsWith('$2a$')).toBe(true);
  });

  it('should reject weak password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User'
      })
      .expect(400);
  });

  it('should login with correct password', async () => {
    // Register
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      });

    // Login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!'
      })
      .expect(200);

    expect(response.body.token).toBeDefined();
  });

  it('should reject incorrect password', async () => {
    // Register
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      });

    // Login with wrong password
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPass123!'
      })
      .expect(401);
  });
});
```

### Performance Tests (1 hour)

**Compare bcrypt vs bcryptjs:**

```typescript
// test/performance/password-hash.test.ts
import { PasswordService } from '../src/utils/password';

describe('Password Hashing Performance', () => {
  it('should hash password in reasonable time', async () => {
    const password = 'TestPassword123!';

    const startTime = Date.now();
    await PasswordService.hash(password);
    const duration = Date.now() - startTime;

    // With bcrypt, should be < 200ms for 12 rounds
    expect(duration).toBeLessThan(200);

    console.log(`Hash time: ${duration}ms`);
  });

  it('should handle concurrent hashing', async () => {
    const passwords = Array.from({ length: 10 }, (_, i) => `Password${i}!`);

    const startTime = Date.now();
    await Promise.all(passwords.map(p => PasswordService.hash(p)));
    const duration = Date.now() - startTime;

    // Should complete 10 hashes in < 2 seconds
    expect(duration).toBeLessThan(2000);

    console.log(`10 concurrent hashes: ${duration}ms`);
  });
});
```

---

## Migration Strategy for Existing Passwords

### ⚠️ Important: Backward Compatibility

**Existing password hashes will still work!**

Both bcrypt and bcryptjs use the same hash format: `$2a$rounds$salt+hash`

**No database migration needed:**
- Existing hashes remain valid
- New registrations use bcrypt
- Login still works with old hashes
- Optionally rehash on successful login

### Optional: Gradual Rehashing

**Implement rehashing on login:**

```typescript
// src/services/AuthService.ts
async login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify password
  const isValid = await PasswordService.compare(password, user.password);

  if (!isValid) {
    throw new Error('Invalid password');
  }

  // Check if hash needs updating
  if (await PasswordService.needsRehash(user.password)) {
    logger.info(`Rehashing password for user ${user.id}`);

    const newHash = await PasswordService.hash(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash }
    });
  }

  // Generate session token
  return this.generateToken(user);
}
```

**Benefits:**
- Gradually updates all passwords to new rounds
- Zero downtime
- No forced password resets
- Better security over time

---

## Documentation Updates

### Update API Documentation

**Password requirements:**

```markdown
## Password Requirements

All passwords must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- Recommended: Include special characters

**Implementation:**
Passwords are hashed using bcrypt with 12 rounds.

**Security:**
- Hashes are not reversible
- Each password gets unique salt
- Brute force resistant
```

### Update Developer Documentation

**Create: `docs/development/PASSWORD-HASHING.md`**

```markdown
# Password Hashing Guidelines

## Library

**Use:** `bcrypt` (native)
**Do NOT use:** bcryptjs, other libraries

## Usage

**Always use PasswordService:**

\`\`\`typescript
import { PasswordService } from '../utils/password';

// Hash password
const hash = await PasswordService.hash(plainPassword);

// Compare password
const isValid = await PasswordService.compare(plainPassword, hash);

// Validate requirements
const meetsRequirements = PasswordService.validate(password);
\`\`\`

**Never:**
- Import bcrypt directly in application code
- Store plaintext passwords
- Log passwords (even in dev mode)
- Send passwords in URLs

## Configuration

Salt rounds: 12 (configured in PasswordService)
Can be adjusted based on performance requirements.

## Testing

Always test authentication flows after changes.
Mock PasswordService in unit tests to avoid slow hash operations.
```

---

## Rollback Plan

### If bcrypt installation issues

**Fallback to bcryptjs temporarily:**

```bash
# Reinstall bcryptjs
npm install bcryptjs

# Temporarily update PasswordService
# src/utils/password.ts
import bcryptjs from 'bcryptjs'; // Temporary fallback
```

**Then investigate and fix bcrypt installation:**

```bash
# Install build tools
sudo apt-get install build-essential python3

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### If authentication breaks

**Immediate rollback:**

```bash
# Revert code changes
git revert HEAD

# Rebuild
npm run build

# Restart
pm2 restart event-manager
```

**Verify authentication working:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## Estimated Effort

| Task | Time | Developer |
|------|------|-----------|
| Audit current usage | 2 hours | Backend Dev |
| Create PasswordService | 2 hours | Backend Dev |
| Replace all usages | 4 hours | Backend Dev |
| Remove bcryptjs | 30 min | Backend Dev |
| Unit tests | 2 hours | Backend Dev + QA |
| Integration tests | 2 hours | QA |
| Performance tests | 1 hour | QA |
| Documentation | 1 hour | Backend Dev |
| Code review | 1 hour | Senior Dev |
| **Total** | **15.5 hours** | **2 days** |

---

## Success Criteria

✅ **Only bcrypt in package.json** (no bcryptjs)
✅ **PasswordService used throughout codebase**
✅ **No direct bcrypt imports in application code**
✅ **All authentication tests passing**
✅ **Password validation enforced**
✅ **Performance benchmarks met** (< 200ms per hash)
✅ **Documentation updated**

---

**Status:** READY TO IMPLEMENT
**Dependencies:** Phase 1 complete
**Next Steps:** Audit current bcrypt/bcryptjs usage
**Owner:** Backend Development Team
