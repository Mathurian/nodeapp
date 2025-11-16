# Development Guide

Developer workflow guide for contributing to Event Manager.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Common Tasks](#common-tasks)
- [Debugging](#debugging)
- [Git Workflow](#git-workflow)
- [Creating Features](#creating-features)

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis (optional)
- Git

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd event-manager

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npx prisma migrate dev
npx prisma db seed  # Optional: seed test data

# Start development
npm run dev  # Backend
cd frontend && npm run dev  # Frontend
```

## Project Structure

### Backend Structure

```
src/
├── config/           # Configuration modules
├── controllers/      # Request handlers
├── services/         # Business logic
├── repositories/     # Data access
├── middleware/       # Express middleware
├── routes/           # Route definitions
├── utils/            # Utilities
└── server.ts         # Entry point
```

### Frontend Structure

```
frontend/src/
├── components/       # Reusable components
├── pages/            # Page components
├── contexts/         # React contexts
├── hooks/            # Custom hooks
├── services/         # API services
├── utils/            # Utilities
└── App.tsx           # Root component
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Develop Feature

- Write code following standards
- Add tests for new functionality
- Update documentation

### 3. Test Changes

```bash
# Run tests
npm test

# Type check
npm run type-check

# Run E2E tests
npm run test:e2e
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
# Create pull request on GitHub
```

## Coding Standards

### TypeScript

**Use Strict Mode**:
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Explicit Types**:
```typescript
// Good
function processUser(user: User): Promise<void> {
  // ...
}

// Avoid
function processUser(user: any) {
  // ...
}
```

### Naming Conventions

- **Files**: camelCase.ts (services, utils), PascalCase.tsx (components)
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Classes**: PascalCase
- **Interfaces**: PascalCase with descriptive names

### Code Style

**ESLint Configuration**:
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

**Run Linter**:
```bash
npm run lint
npm run lint:fix  # Auto-fix
```

## Testing

### Unit Tests (Jest)

```typescript
// Example: services/EventService.test.ts
import { EventService } from './EventService';

describe('EventService', () => {
  let service: EventService;
  
  beforeEach(() => {
    service = new EventService();
  });
  
  it('should create event', async () => {
    const event = await service.create({
      name: 'Test Event',
      startDate: new Date(),
      endDate: new Date(),
    });
    
    expect(event).toHaveProperty('id');
    expect(event.name).toBe('Test Event');
  });
});
```

**Run Tests**:
```bash
npm test                # All tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage
```

### Integration Tests

```typescript
// Example: Integration test
import request from 'supertest';
import app from '../server';

describe('POST /api/events', () => {
  it('should create event with auth', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Event', /* ... */ });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

### E2E Tests (Playwright)

```typescript
// Example: Login flow
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/events');
});
```

**Run E2E Tests**:
```bash
npm run test:e2e          # Headless
npm run test:e2e:headed   # With browser
npm run test:e2e:debug    # Debug mode
```

## Common Tasks

### Adding New Model

1. **Update Prisma Schema**:
```prisma
model NewModel {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  createdAt DateTime @default(now())
  
  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@map("new_models")
}
```

2. **Create Migration**:
```bash
npx prisma migrate dev --name add_new_model
```

3. **Generate Client**:
```bash
npx prisma generate
```

### Adding New API Endpoint

1. **Create Controller**:
```typescript
// src/controllers/newController.ts
export const getAll = async (req, res) => {
  const items = await newService.getAll(req.tenantId);
  res.json({ success: true, data: items });
};
```

2. **Create Route**:
```typescript
// src/routes/newRoutes.ts
router.get('/', authenticateToken, requireRole(['ADMIN']), getAll);
```

3. **Register Route**:
```typescript
// src/config/routes.config.ts
app.use('/api/new', newRoutes);
```

### Adding Frontend Page

1. **Create Page Component**:
```typescript
// frontend/src/pages/NewPage.tsx
export default function NewPage() {
  return <div>New Page</div>;
}
```

2. **Add Route**:
```typescript
// frontend/src/App.tsx
<Route path="/new" element={<NewPage />} />
```

3. **Add Navigation**:
Update Layout component with new nav item.

## Debugging

### Backend Debugging

**VS Code Launch Configuration**:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev"],
  "skipFiles": ["<node_internals>/**"]
}
```

**Console Logging**:
```typescript
console.log('Debug:', data);  # Development only
logger.debug('Debug info', { data });  # Use logger in production
```

### Frontend Debugging

**React DevTools**: Install browser extension

**Console Logging**:
```typescript
console.log('State:', state);
```

**Network Tab**: Monitor API calls in browser DevTools

## Git Workflow

### Commit Message Format

Follow Conventional Commits:

```
type(scope): subject

body

footer
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples**:
```
feat(scoring): add bulk score entry
fix(auth): resolve JWT expiration issue
docs(api): update endpoint documentation
```

### Branch Naming

```
feature/description   # New feature
bugfix/description    # Bug fix
hotfix/description    # Urgent fix
refactor/description  # Code refactoring
```

## Creating Features

### Feature Development Checklist

- [ ] Create feature branch
- [ ] Implement backend logic
- [ ] Add backend tests
- [ ] Implement frontend UI
- [ ] Add frontend tests
- [ ] Update documentation
- [ ] Test manually
- [ ] Create pull request
- [ ] Code review
- [ ] Merge to main

---

**Next**: [Troubleshooting Guide](10-TROUBLESHOOTING.md)
