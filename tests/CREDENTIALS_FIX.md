# Test Credentials Standardization

All tests should use `password123` as the standard test password to match the application's seed data.

## Quick Fix Script

Run this script to update all integration tests to use the standard password:

```bash
# Find and replace AdminPassword123! with password123 in all integration tests
find tests/integration -name "*.test.ts" -type f -exec sed -i "s/'AdminPassword123!'/'password123'/g" {} \;
find tests/integration -name "*.test.ts" -type f -exec sed -i 's/"AdminPassword123!"/"password123"/g' {} \;
find tests/integration -name "*.test.ts" -type f -exec sed -i "s/bcrypt\.hash('AdminPassword123!'/bcrypt.hash('password123'/g" {} \;
find tests/integration -name "*.test.ts" -type f -exec sed -i 's/bcrypt\.hash("AdminPassword123!"/bcrypt.hash("password123"/g' {} \;
```

## Manual Updates Needed

1. Import the test credentials helper:
```typescript
import { TEST_PASSWORD, hashTestPassword, loginWithCredentials } from '../helpers/testCredentials';
```

2. Replace password hashing:
```typescript
// OLD:
const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);

// NEW:
const hashedPassword = await hashTestPassword();
```

3. Replace login calls:
```typescript
// OLD:
const response = await request(app)
  .post('/api/auth/login')
  .send({
    email: 'admin@test.com',
    password: 'AdminPassword123!'
  });

// NEW:
const token = await loginWithCredentials(request(app), 'admin@test.com', TEST_PASSWORD);
```

