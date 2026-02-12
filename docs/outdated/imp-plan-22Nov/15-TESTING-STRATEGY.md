# Testing Strategy for All Implementation Phases

**Document Purpose:** Define testing approach for each implementation phase
**Created:** November 22, 2025
**Version:** 1.0

---

## Overall Testing Philosophy

**Test Before Deploy:** Every change must be tested before production deployment

**Test Pyramid:**
```
        E2E
       /   \
    Integration
   /           \
  Unit Tests
```

- **70% Unit Tests:** Fast, isolated, comprehensive
- **20% Integration Tests:** API endpoints, database interactions
- **10% E2E Tests:** Critical user workflows

---

## Phase 1: Critical Fixes Testing

### PrismaClient Singleton (01-CRITICAL-PRISMA-CLIENT.md)

**Unit Tests:**
- Verify singleton returns same instance
- Test connection pool limits
- Verify no memory leaks

**Integration Tests:**
- 1000 concurrent requests should not exhaust pool
- Database connections stay under limit
- No "too many clients" errors

**Test Command:**
```bash
npm test -- --testPathPattern="prisma.*singleton"
```

### Duplicate Files (02-CRITICAL-DUPLICATES.md)

**Verification Tests:**
- Confirm only one route file exists
- Confirm only one controller file exists
- All endpoints still functional

**Test Command:**
```bash
npm test -- --testPathPattern="customFields"
```

### Cascade Deletes (03-CRITICAL-CASCADE-DELETES.md)

**Unit Tests:**
- Test each cascade relationship
- Test SetNull relationships
- Test Restrict relationships

**Integration Tests:**
- Delete tenant → verify all tenant data deleted
- Delete event → verify contests/scores deleted
- Delete user → verify scores kept with null judgeId

**Critical Test:**
```typescript
describe('Cascade Delete Safety', () => {
  it('should cascade delete tenant data', async () => {
    const tenant = await createTestTenant();
    const user = await createTestUser({ tenantId: tenant.id });

    await prisma.tenant.delete({ where: { id: tenant.id } });

    const remainingUsers = await prisma.user.count({
      where: { tenantId: tenant.id }
    });
    expect(remainingUsers).toBe(0);
  });
});
```

---

## Phase 2: High Priority Testing

### Password Libraries (04-HIGH-PASSWORD-LIBS.md)

**Tests:**
- Hash generation works
- Password comparison works
- Validation rules enforced
- Old hashes still verify (backward compatibility)

**Performance Test:**
```typescript
it('should hash password in < 200ms', async () => {
  const start = Date.now();
  await PasswordService.hash('TestPassword123!');
  expect(Date.now() - start).toBeLessThan(200);
});
```

### Console Logging (05-HIGH-CONSOLE-LOGGING.md)

**Verification:**
```bash
# Should return 0
grep -r "console\.log" src/ | wc -l
```

**Test logger functionality:**
```typescript
it('should log at appropriate levels', () => {
  logger.error('test error');
  logger.warn('test warning');
  logger.info('test info');
  // Verify log file contains entries
});
```

### Type Safety (06-HIGH-TYPE-SAFETY.md)

**Compilation Tests:**
```bash
# Should compile with no errors
npx tsc --noEmit

# Enable strict mode incrementally
npx tsc --noEmit --strict
```

**Type Tests:**
```typescript
// Use tsd for type testing
import { expectType } from 'tsd';
import type { User } from '../types';

const user: User = { id: 1, email: 'test@test.com' };
expectType<number>(user.id);
expectType<string>(user.email);
```

### Environment Variables (07-HIGH-ENV-VARIABLES.md)

**Validation Tests:**
```typescript
describe('Environment Configuration', () => {
  it('should reject missing required vars', () => {
    delete process.env.DATABASE_URL;
    expect(() => require('../config/env')).toThrow();
  });

  it('should apply defaults for optional vars', () => {
    const { env } = require('../config/env');
    expect(env.PORT).toBe(3000);
  });
});
```

---

## Phase 3: Medium Priority Testing

### Database Optimizations (08-MEDIUM-DATABASE.md)

**Performance Tests:**
```typescript
describe('Query Performance', () => {
  it('should complete query in < 100ms', async () => {
    const start = Date.now();
    await prisma.event.findMany({ take: 100 });
    expect(Date.now() - start).toBeLessThan(100);
  });

  it('should use indexes for tenant queries', async () => {
    // Explain query to verify index usage
    const explain = await prisma.$queryRaw`
      EXPLAIN ANALYZE SELECT * FROM "Event" WHERE "tenantId" = 1
    `;
    // Verify index scan used, not seq scan
  });
});
```

### Security (09-MEDIUM-SECURITY.md)

**Security Tests:**
```typescript
describe('Security', () => {
  it('should reject SQL injection attempts', async () => {
    const malicious = "'; DROP TABLE users; --";
    await expect(
      apiClient.get(`/users?search=${malicious}`)
    ).rejects.toThrow();
  });

  it('should sanitize HTML output', () => {
    const dirty = '<script>alert("xss")</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script>');
  });

  it('should rate limit requests', async () => {
    const requests = Array(10).fill(null).map(() =>
      apiClient.post('/api/auth/login', { email: 'test', password: 'test' })
    );
    await Promise.all(requests);

    // Next request should be rate limited
    await expect(
      apiClient.post('/api/auth/login', {})
    ).rejects.toThrow(/rate limit/i);
  });
});
```

### Performance (10-MEDIUM-PERFORMANCE.md)

**Load Tests:**
```bash
# Apache Bench
ab -n 1000 -c 50 http://localhost:3000/api/events

# Artillery
artillery quick --count 100 --num 10 http://localhost:3000/api/events
```

**Caching Tests:**
```typescript
it('should return cached data on second request', async () => {
  await apiClient.get('/events'); // First request, cache miss
  const start = Date.now();
  await apiClient.get('/events'); // Second request, cache hit
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(50); // Should be much faster
});
```

---

## Phase 4: Code Quality Testing

### Testing (13-QUALITY-TESTING.md)

**Coverage Requirements:**
```bash
npm test -- --coverage
# Verify:
# - Statements: > 70%
# - Branches: > 70%
# - Functions: > 70%
# - Lines: > 70%
```

---

## Continuous Testing

### Pre-Commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
npm run lint
npm test -- --bail --findRelatedTests
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
- name: Run Tests
  run: npm test -- --ci --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

---

## Test Data Management

### Test Database

```bash
# Create test database
createdb event_manager_test

# Run migrations
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Seed test data
npm run seed:test
```

### Test Fixtures

```typescript
// test/fixtures/users.ts
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!',
    role: 'ADMIN',
  },
  judge: {
    email: 'judge@test.com',
    password: 'Judge123!',
    role: 'JUDGE',
  },
};
```

---

## Regression Testing

**After each phase:**
1. Run full test suite
2. Verify all previously working features still work
3. Check for performance regressions
4. Validate error handling

---

## Manual Testing Checklist

**For each major change:**

- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test on mobile device
- [ ] Test with slow network (throttle to 3G)
- [ ] Test with JavaScript disabled (where applicable)
- [ ] Test accessibility with screen reader
- [ ] Test keyboard navigation

---

## Success Criteria

**Phase 1:** All critical tests passing, no connection issues
**Phase 2:** Type errors < 10, all auth tests passing
**Phase 3:** Performance benchmarks met, security tests passing
**Phase 4:** Test coverage > 70%, all documentation complete

---

**Review Frequency:** Weekly during implementation
**Owner:** QA Team + Development Team
