# Development Guide

Development documentation for contributors and developers.

---

## Quick Links

- **[Getting Started](./getting-started.md)** - Set up development environment
- **[Coding Standards](./coding-standards.md)** - Code style and conventions
- **[Testing Guide](./testing-guide.md)** - Testing strategies and best practices
- **[Test Documentation](./test-documentation.md)** - Test suite details
- **[Test Execution Guide](./test-execution-guide.md)** - Running tests
- **[Debugging](./debugging.md)** - Debugging techniques
- **[Git Workflow](./git-workflow.md)** - Branching and commit strategy

---

## Development Environment Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Git
- Code editor (VS Code recommended)
- Terminal/command line

### Setup Steps
1. Clone repository
2. Install dependencies (`npm install`)
3. Configure environment (`.env`)
4. Set up database (`npm run migrate`)
5. Seed test data (`npm run seed`)
6. Start development servers

**Detailed guide:** [Getting Started](./getting-started.md)

---

## Technology Stack

### Backend
- **TypeScript:** Type-safe JavaScript
- **Node.js:** Runtime environment
- **Express:** Web framework
- **Prisma:** ORM and query builder
- **Socket.IO:** Real-time communication
- **Jest:** Unit testing framework

### Frontend
- **React 18:** UI library
- **TypeScript:** Type safety
- **Vite:** Build tool
- **Tailwind CSS:** Utility-first CSS
- **React Router:** Client-side routing
- **React Query:** Data fetching
- **Vitest:** Unit testing
- **Playwright:** E2E testing

---

## Project Structure

```
event-manager/
├── src/                    # Backend source
│   ├── controllers/        # Route controllers
│   ├── services/          # Business logic
│   ├── repositories/      # Data access
│   ├── middleware/        # Express middleware
│   ├── routes/           # API routes
│   ├── utils/            # Utilities
│   └── server.ts         # Entry point
├── frontend/              # Frontend source
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API client
│   │   └── utils/        # Utilities
├── prisma/               # Database schema
├── tests/                # Test files
├── docs/                 # Documentation
└── scripts/              # Build/deploy scripts
```

---

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Develop with Hot Reload
```bash
# Backend (with nodemon)
npm run dev

# Frontend (with Vite HMR)
cd frontend && npm run dev
```

### 3. Write Tests
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows

### 4. Run Tests
```bash
# Backend tests
npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

### 5. Lint and Format
```bash
# Run ESLint
npm run lint

# Fix issues
npm run lint -- --fix

# Format with Prettier
npm run format
```

### 6. Commit Changes
```bash
git add .
git commit -m "feat: Add user profile page"
```

### 7. Push and Create PR
```bash
git push origin feature/your-feature-name
# Create PR on GitHub
```

---

## Coding Standards

### TypeScript
- **Strict mode:** Always enabled
- **No any:** Avoid `any` type
- **Explicit types:** Define function return types
- **Interfaces:** Use for object shapes
- **Enums:** Use for constants

### React
- **Functional components:** Use hooks
- **TypeScript:** Type all props
- **Single responsibility:** One component, one purpose
- **Hooks:** Custom hooks for logic reuse
- **Props drilling:** Avoid with contexts

### Testing
- **Coverage:** Aim for 80%+
- **AAA pattern:** Arrange, Act, Assert
- **Meaningful names:** Describe what's tested
- **Independent tests:** No test dependencies
- **Fast tests:** Keep unit tests quick

**Full standards:** [Coding Standards](./coding-standards.md)

---

## Common Development Tasks

### Run Database Migrations
```bash
npx prisma migrate dev --name migration_name
```

### Generate Prisma Client
```bash
npx prisma generate
```

### View Database
```bash
npx prisma studio
```

### Build for Production
```bash
# Backend
npm run build

# Frontend
cd frontend && npm run build
```

### Run Linter
```bash
npm run lint
npm run lint -- --fix
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

---

## Debugging

### Backend Debugging
- Use VS Code debugger
- Add breakpoints in TypeScript
- Inspect with Chrome DevTools
- Check logs in `logs/` directory

### Frontend Debugging
- React DevTools
- Browser DevTools
- Network tab for API calls
- Console for errors

### Database Debugging
- Prisma Studio for data inspection
- Enable query logging
- Use database GUI (pgAdmin)

**Full guide:** [Debugging](./debugging.md)

---

## Testing Strategy

### Test Types
1. **Unit Tests:** Individual functions/components
2. **Integration Tests:** API endpoints
3. **E2E Tests:** Full user workflows
4. **Manual Tests:** UI/UX validation

### Testing Tools
- **Jest:** Backend unit tests
- **Vitest:** Frontend unit tests
- **React Testing Library:** Component tests
- **Playwright:** E2E tests
- **Supertest:** API endpoint tests

**Full guide:** [Testing Guide](./testing-guide.md)

---

## Contributing

### Before You Start
1. Read [Coding Standards](./coding-standards.md)
2. Set up [Development Environment](./getting-started.md)
3. Review [Git Workflow](./git-workflow.md)
4. Check existing issues/PRs

### Pull Request Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] TypeScript compiles
- [ ] Linter passes
- [ ] PR description complete

---

## Resources

### Internal Documentation
- [Architecture Overview](../01-architecture/README.md)
- [API Reference](../07-api/README.md)
- [Security Model](../01-architecture/security-model.md)

### External Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/)

---

**Happy coding! 🚀**
