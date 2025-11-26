# Event Manager

Multi-tenant event management system built with Node.js, TypeScript, React, and PostgreSQL.

## Features

- 🎯 **Multi-tenant architecture** - Complete tenant isolation with custom domains
- 🔐 **JWT authentication** - Secure authentication with MFA support
- 📊 **Event and contest management** - Comprehensive event lifecycle management
- 🏆 **Scoring system** - Advanced scoring with multi-stage certification workflow
- 👥 **Role-based access control** - 8 distinct user roles (Admin, Organizer, Judge, Tally Master, Auditor, Board, Emcee, Contestant)
- 📱 **Responsive UI** - Modern React frontend with real-time updates
- 📈 **Advanced reporting** - PDF, Excel, and CSV export capabilities
- 🔄 **Real-time updates** - WebSocket support for live data synchronization
- 📝 **Workflow customization** - Configurable multi-stage certification process
- 🔒 **Security** - CSRF protection, rate limiting, audit logging, and more

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)
- npm or yarn

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd event-manager

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npx prisma migrate deploy
npx prisma generate

# Seed database (optional)
npx prisma db seed

# Start development server
npm run dev

# In another terminal, start frontend
cd frontend && npm run dev
```

The application will be available at:
- Backend API: http://localhost:3000
- Frontend: http://localhost:5173
- API Documentation: http://localhost:3000/api-docs

## Project Structure

```
event-manager/
├── src/              # Backend source code
│   ├── config/       # Configuration files
│   ├── controllers/  # Request handlers
│   ├── services/     # Business logic
│   ├── repositories/ # Data access layer
│   ├── routes/        # API routes
│   ├── middleware/    # Express middleware
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
├── prisma/           # Database schema and migrations
├── tests/            # Test files
│   ├── unit/         # Unit tests
│   ├── integration/  # Integration tests
│   └── e2e/          # End-to-end tests
└── docs/             # Documentation
```

## Development

See [Development Guide](./docs/09-DEVELOPMENT.md) for detailed development instructions.

### Common Commands

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build for production

# Testing
npm test                # Run all tests
npm run test:unit       # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:e2e        # Run E2E tests
npm run test:coverage   # Run tests with coverage report

# Database
npx prisma migrate dev  # Create and apply migration
npx prisma generate     # Generate Prisma Client
npx prisma studio       # Open Prisma Studio (database GUI)

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
```

## API Documentation

Interactive API documentation is available at `/api-docs` when the server is running.

The API uses:
- **OpenAPI 3.0** specification
- **JWT Bearer** authentication
- **Multi-tenancy** via X-Tenant-ID header or subdomain

See [API Reference](./docs/04-API-REFERENCE.md) for complete API documentation.

## Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Test individual functions and services
- **Integration Tests**: Test API endpoints and database interactions
- **E2E Tests**: Test complete user workflows

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e
```

Target coverage: **70%+** for all code paths.

## Deployment

See [Deployment Guide](./docs/08-DEPLOYMENT.md) for detailed deployment instructions.

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Monitoring setup
- [ ] Backup system configured

### Quick Deployment

```bash
# Build application
npm run build

# Run migrations
npx prisma migrate deploy

# Start production server
npm start
```

## Documentation

Complete documentation is available in the `docs/` directory:

- **[Architecture](./docs/01-ARCHITECTURE.md)** - System architecture and design
- **[Getting Started](./docs/02-GETTING-STARTED.md)** - Installation and setup
- **[Features](./docs/03-FEATURES.md)** - Feature documentation
- **[API Reference](./docs/04-API-REFERENCE.md)** - Complete API documentation
- **[Database](./docs/05-DATABASE.md)** - Database schema and models
- **[Frontend](./docs/06-FRONTEND.md)** - Frontend architecture
- **[Security](./docs/07-SECURITY.md)** - Security features and best practices
- **[Deployment](./docs/08-DEPLOYMENT.md)** - Production deployment
- **[Development](./docs/09-DEVELOPMENT.md)** - Developer guide
- **[Troubleshooting](./docs/10-TROUBLESHOOTING.md)** - Common issues and solutions

## Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/event_manager

# JWT
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=production

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (optional)
SMTP_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `npm test`
4. Ensure code quality: `npm run lint && npm run format`
5. Commit with conventional commits
6. Create a pull request

## License

MIT

## Support

For issues, questions, or contributions, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ by the Event Manager Team**

