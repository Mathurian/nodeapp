# Development Guide

Developer workflow guide for contributing to Event Manager.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Development Tools and UIs](#development-tools-and-uis)
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
  await page.goto('/your-tenant-slug/login');
  
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/\/your-tenant-slug\/(dashboard|board|emcee|tally)/);
});
```

The exact post-login route depends on tenant-aware routing and the user role. Do not assume every successful login lands on `/events`.

**Run E2E Tests**:
```bash
npm run test:e2e          # Headless
npm run test:e2e:headed   # With browser
npm run test:e2e:debug    # Debug mode
```

## Development Tools and UIs

### Playwright Test UI (Interactive Mode)

The Playwright UI mode provides an interactive interface for developing and debugging E2E tests.

**Launch Interactive UI**:
```bash
# Standard UI mode
npm run test:e2e:ui

# Or directly with playwright
npx playwright test --ui

# For remote access (accessible from other machines)
npx playwright test --ui --ui-host=0.0.0.0 --ui-port=9323
```

**Features**:
- Run tests interactively with visual feedback
- Step through test execution line-by-line
- Inspect DOM elements during test execution
- Debug test failures in real-time
- Time-travel debugging (see exact page state at each step)
- Trace viewer integration
- Pick locator tool for identifying elements

**Usage Tips**:
1. Click on any test to run it
2. Use the "Pick Locator" button to find selectors
3. View traces for failed tests
4. Step through tests using the timeline
5. Inspect screenshots and videos

### Playwright HTML Report

View detailed test results with screenshots, videos, and traces.

**Access Report**:
```bash
# Generate and view report
npm run test:e2e:report

# Or directly
npx playwright show-report

# Manual access (after tests run)
open playwright-report/index.html
```

**Report Location**: `/opt/event-manager/current/playwright-report/index.html`

**Features**:
- Visual test results with pass/fail indicators
- Screenshots of failures
- Video recordings of test execution
- Detailed error messages and stack traces
- Execution timeline
- Filtering by status (passed/failed/skipped)
- Search functionality

### Playwright Code Generator

Record user interactions and automatically generate test code.

**Launch Code Generator**:
```bash
# Start code generator
npm run test:e2e:codegen

# Or with specific URL
npx playwright codegen http://localhost:5173

# Generate code for specific browser
npx playwright codegen --browser=chromium http://localhost:5173
```

**Workflow**:
1. Run codegen command
2. Browser opens with recorder toolbar
3. Interact with your application normally
4. Playwright generates test code automatically
5. Copy generated code to your test file
6. Refine as needed

### API Documentation (Swagger UI)

Interactive API documentation for testing and exploring endpoints.

**Access Swagger UI**:
- **Production**: http://conmgr.com/api-docs
- **Development**: http://localhost:3000/api-docs

**Features**:
- Complete API endpoint documentation
- Interactive "Try it out" testing
- Request/response examples
- Schema definitions
- Authentication testing

**Testing API with Swagger**:
1. Navigate to http://localhost:3000/api-docs
2. Click "Authorize" button at top
3. Enter JWT token: `Bearer <your-token>`
4. Click any endpoint to expand
5. Click "Try it out"
6. Fill in parameters
7. Click "Execute"
8. View response

**Getting JWT Token For Direct API Testing**:
```bash
# Login via API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Copy the token from response
# Use in Swagger: Bearer <token>
```

Use this bearer-token flow for direct API testing only. The browser application uses tenant-aware routes and the normal app session flow, so browser and E2E examples should be written around tenant login pages rather than token injection by default.

### Database GUI (Prisma Studio)

Visual database browser and editor.

**Launch Prisma Studio**:
```bash
# Open Prisma Studio
npx prisma studio

# Opens at http://localhost:5555
```

**Features**:
- Browse all database tables
- View and edit records
- Filter and search data
- Create new records
- Delete records
- View relationships
- Export data

**Common Tasks**:
- **View all users**: Click "User" table
- **Create test data**: Click "Add record"
- **Search records**: Use filter input
- **View relations**: Click linked fields

### Application Health Dashboard

Monitor application health and status.

**Health Check Endpoint**:
```bash
# Check application health
curl http://localhost:3000/health

# Pretty print JSON
curl http://localhost:3000/health | jq

# Watch health status
watch -n 5 curl -s http://localhost:3000/health
```

**Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-28T12:00:00.000Z",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected"
}
```

### Metrics Endpoint

View application metrics in Prometheus format.

**Access Metrics**:
```bash
# View all metrics
curl http://localhost:3000/metrics

# Filter specific metrics
curl http://localhost:3000/metrics | grep http_requests

# Monitor database metrics
curl http://localhost:3000/metrics | grep database
```

**Common Metrics**:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_ms` - Request duration
- `database_query_duration_ms` - Database query time
- `active_connections` - Current active connections

### Frontend Dev Tools

**React Developer Tools**:
- Install browser extension
- Inspect component tree
- View props and state
- Profile component performance

**Redux DevTools** (if using Redux):
- Install browser extension
- View state changes
- Time-travel debugging
- Action replay

### Debugging Tools

**Backend Debugging**:
```bash
# Run with Node debugger
node --inspect dist/server.js

# Or with nodemon
nodemon --inspect src/server.ts

# Chrome DevTools
# Open chrome://inspect
# Click "Open dedicated DevTools for Node"
```

**Frontend Debugging**:
```bash
# Run with source maps
npm run dev

# Browser DevTools
# Press F12 or Right-click > Inspect
# Use Console, Network, Sources tabs
```

### Log Monitoring

**Application Logs**:
```bash
# View application logs (production)
sudo journalctl -u event-manager -f

# View backend logs (development)
tail -f logs/app.log

# Search for errors
sudo journalctl -u event-manager | grep -i error

# View last 100 lines
sudo journalctl -u event-manager -n 100
```

**Access Logs**:
```bash
# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Performance Profiling

**Node.js Profiling**:
```bash
# Generate CPU profile
node --prof dist/server.js

# Analyze profile
node --prof-process isolate-*.log > processed.txt

# Memory profiling
node --inspect --expose-gc dist/server.js
```

**Frontend Profiling**:
- Use React DevTools Profiler
- Chrome DevTools Performance tab
- Lighthouse audits

### Quick Reference Commands

```bash
# Development UIs
npm run test:e2e:ui          # Playwright interactive UI
npm run test:e2e:report      # View test report
npm run test:e2e:codegen     # Generate test code
npx prisma studio             # Database GUI

# Testing
npm run test:e2e:headed      # E2E with visible browser
npm run test:e2e:debug       # E2E debug mode
npm test -- --watch           # Unit tests watch mode

# Monitoring
curl http://localhost:3000/health      # Health check
curl http://localhost:3000/metrics     # Metrics
curl http://localhost:3000/api-docs    # API docs

# Logs
sudo journalctl -u event-manager -f    # Application logs
tail -f logs/app.log                   # Development logs
sudo tail -f /var/log/nginx/error.log  # Nginx errors
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
