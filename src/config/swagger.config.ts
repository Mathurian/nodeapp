/**
 * Swagger/OpenAPI Configuration
 * API documentation setup using swagger-jsdoc and swagger-ui-express
 *
 * Updated: November 14, 2025
 * Comprehensive API documentation covering all endpoints and models
 */

import * as swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Event Manager API',
      version: '1.0.0',
      description: `
# Event Manager API Documentation

Comprehensive API for Event Manager - Contest Management System with Multi-Tenancy Support

## Features
- Multi-stage certification workflow (Judge → Tally Master → Auditor → Board)
- Role-based access control (8 distinct roles)
- Real-time updates via WebSocket
- Multi-tenancy with tenant isolation
- Comprehensive scoring and results management
- Advanced reporting and analytics

## Authentication
All endpoints (except /auth/login, /auth/register, /auth/forgot-password) require JWT authentication.

Include the JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## Multi-Tenancy
All requests must include tenant context. This can be provided via:
- Subdomain: \`tenant-slug.example.com\`
- Custom domain: \`customdomain.com\`
- X-Tenant-ID header: \`X-Tenant-ID: <tenant_id>\`
- JWT token (contains tenantId)

## Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- General endpoints: 100 requests per 15 minutes

## User Roles
- **ADMIN**: Full system access
- **ORGANIZER**: Event and contest management
- **BOARD**: Final certification approval
- **JUDGE**: Score submission and initial certification
- **TALLY_MASTER**: Second-stage certification
- **AUDITOR**: Third-stage certification
- **EMCEE**: Event hosting and commentary
- **CONTESTANT**: View own information and results
      `,
      contact: {
        name: 'API Support',
        email: 'support@eventmanager.com',
      },
      license: {
        name: 'ISC',
      },
    },
    servers: [
      {
        url: env.get('API_URL'),
        description: 'Development server',
      },
      {
        url: 'https://api.eventmanager.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login',
        },
        tenantId: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Tenant-ID',
          description: 'Tenant ID for multi-tenancy isolation',
        },
      },
      schemas: {
        // Common Response Types
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'ERROR_CODE',
            },
            message: {
              type: 'string',
              example: 'Detailed error message',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  example: 1,
                },
                limit: {
                  type: 'integer',
                  example: 20,
                },
                total: {
                  type: 'integer',
                  example: 100,
                },
                totalPages: {
                  type: 'integer',
                  example: 5,
                },
              },
            },
          },
        },

        // Multi-Tenancy
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            name: {
              type: 'string',
              example: 'Acme Events',
            },
            slug: {
              type: 'string',
              example: 'acme-events',
            },
            domain: {
              type: 'string',
              nullable: true,
              example: 'acme.eventmanager.com',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            settings: {
              type: 'object',
              nullable: true,
            },
            planType: {
              type: 'string',
              enum: ['free', 'pro', 'enterprise'],
              example: 'pro',
            },
            subscriptionStatus: {
              type: 'string',
              enum: ['active', 'cancelled', 'suspended'],
              example: 'active',
            },
            maxUsers: {
              type: 'integer',
              nullable: true,
              example: 100,
            },
            maxEvents: {
              type: 'integer',
              nullable: true,
              example: 50,
            },
            maxStorage: {
              type: 'integer',
              nullable: true,
              example: 10737418240,
              description: 'Storage limit in bytes',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // User Management
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            tenantId: {
              type: 'string',
              example: 'clx0987654321',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'ORGANIZER', 'JUDGE', 'CONTESTANT', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR'],
              example: 'JUDGE',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            phone: {
              type: 'string',
              nullable: true,
              example: '+1-555-0123',
            },
            mfaEnabled: {
              type: 'boolean',
              example: false,
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Event Management
        Event: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            tenantId: {
              type: 'string',
              example: 'clx0987654321',
            },
            name: {
              type: 'string',
              example: 'Annual Talent Show 2024',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Annual talent competition featuring local performers',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
            },
            location: {
              type: 'string',
              nullable: true,
              example: 'Main Auditorium',
            },
            archived: {
              type: 'boolean',
              example: false,
            },
            maxContestants: {
              type: 'integer',
              nullable: true,
              example: 100,
            },
            contestantNumberingMode: {
              type: 'string',
              enum: ['MANUAL', 'AUTO_INCREMENT', 'AUTO_RANDOM'],
              example: 'MANUAL',
            },
            isLocked: {
              type: 'boolean',
              example: false,
            },
            lockedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        Contest: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            tenantId: {
              type: 'string',
              example: 'clx0987654321',
            },
            eventId: {
              type: 'string',
              example: 'clx1111111111',
            },
            name: {
              type: 'string',
              example: 'Vocal Performance',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Solo vocal performance competition',
            },
            contestantNumberingMode: {
              type: 'string',
              enum: ['MANUAL', 'AUTO_INCREMENT', 'AUTO_RANDOM'],
              example: 'AUTO_INCREMENT',
            },
            nextContestantNumber: {
              type: 'integer',
              nullable: true,
              example: 25,
            },
            archived: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        Category: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            tenantId: {
              type: 'string',
              example: 'clx0987654321',
            },
            contestId: {
              type: 'string',
              example: 'clx1111111111',
            },
            name: {
              type: 'string',
              example: 'Senior Division',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Ages 18-25',
            },
            minAge: {
              type: 'integer',
              nullable: true,
              example: 18,
            },
            maxAge: {
              type: 'integer',
              nullable: true,
              example: 25,
            },
            maxContestants: {
              type: 'integer',
              nullable: true,
              example: 30,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Contestants and Judges
        Contestant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            tenantId: {
              type: 'string',
              example: 'clx0987654321',
            },
            eventId: {
              type: 'string',
              example: 'clx1111111111',
            },
            contestantNumber: {
              type: 'string',
              example: '42',
            },
            name: {
              type: 'string',
              example: 'Jane Smith',
            },
            email: {
              type: 'string',
              format: 'email',
              nullable: true,
              example: 'jane@example.com',
            },
            phone: {
              type: 'string',
              nullable: true,
              example: '+1-555-0199',
            },
            age: {
              type: 'integer',
              nullable: true,
              example: 22,
            },
            bio: {
              type: 'string',
              nullable: true,
              example: 'Professional vocalist with 10 years experience',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        Judge: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            tenantId: {
              type: 'string',
              example: 'clx0987654321',
            },
            eventId: {
              type: 'string',
              example: 'clx1111111111',
            },
            name: {
              type: 'string',
              example: 'Dr. Sarah Johnson',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'sjohnson@example.com',
            },
            phone: {
              type: 'string',
              nullable: true,
              example: '+1-555-0188',
            },
            bio: {
              type: 'string',
              nullable: true,
              example: 'Expert in vocal performance with 20 years judging experience',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Scoring System
        Criterion: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            categoryId: {
              type: 'string',
              example: 'clx1111111111',
            },
            name: {
              type: 'string',
              example: 'Vocal Quality',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Tone, pitch, and vocal control',
            },
            weight: {
              type: 'number',
              format: 'float',
              example: 1.0,
            },
            maxScore: {
              type: 'number',
              format: 'float',
              example: 10.0,
            },
            order: {
              type: 'integer',
              example: 1,
            },
          },
        },

        Score: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            assignmentId: {
              type: 'string',
              example: 'clx2222222222',
            },
            criterionId: {
              type: 'string',
              example: 'clx3333333333',
            },
            value: {
              type: 'number',
              format: 'float',
              example: 8.5,
            },
            comment: {
              type: 'string',
              nullable: true,
              example: 'Excellent vocal control',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Certification Workflow
        Certification: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            tenantId: {
              type: 'string',
              example: 'clx0987654321',
            },
            assignmentId: {
              type: 'string',
              example: 'clx2222222222',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'TALLY_VERIFIED', 'AUDITOR_VERIFIED', 'BOARD_APPROVED', 'REJECTED'],
              example: 'TALLY_VERIFIED',
            },
            judgeCertifiedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            judgeCertifiedBy: {
              type: 'string',
              nullable: true,
            },
            tallyVerifiedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            tallyVerifiedBy: {
              type: 'string',
              nullable: true,
            },
            auditorVerifiedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            auditorVerifiedBy: {
              type: 'string',
              nullable: true,
            },
            boardApprovedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            boardApprovedBy: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Assignments
        Assignment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            tenantId: {
              type: 'string',
              example: 'clx0987654321',
            },
            judgeId: {
              type: 'string',
              example: 'clx1111111111',
            },
            contestantId: {
              type: 'string',
              example: 'clx2222222222',
            },
            categoryId: {
              type: 'string',
              example: 'clx3333333333',
            },
            eventId: {
              type: 'string',
              example: 'clx4444444444',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Notifications
        Notification: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            tenantId: {
              type: 'string',
              example: 'clx0987654321',
            },
            userId: {
              type: 'string',
              example: 'clx1111111111',
            },
            title: {
              type: 'string',
              example: 'New Score Submitted',
            },
            message: {
              type: 'string',
              example: 'Judge Sarah Johnson submitted scores for contestant #42',
            },
            type: {
              type: 'string',
              enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR'],
              example: 'INFO',
            },
            isRead: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // Reports
        Report: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'clx1234567890',
            },
            tenantId: {
              type: 'string',
              example: 'clx0987654321',
            },
            name: {
              type: 'string',
              example: 'Final Results Report',
            },
            type: {
              type: 'string',
              enum: ['RESULTS', 'SCORES', 'CERTIFICATIONS', 'ANALYTICS', 'CUSTOM'],
              example: 'RESULTS',
            },
            format: {
              type: 'string',
              enum: ['PDF', 'EXCEL', 'CSV'],
              example: 'PDF',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'GENERATING', 'COMPLETED', 'FAILED'],
              example: 'COMPLETED',
            },
            filePath: {
              type: 'string',
              nullable: true,
              example: '/uploads/reports/final-results-2024.pdf',
            },
            createdBy: {
              type: 'string',
              example: 'clx5555555555',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management',
      },
      {
        name: 'Users',
        description: 'User management and profile operations',
      },
      {
        name: 'Tenants',
        description: 'Multi-tenancy management (Admin only)',
      },
      {
        name: 'Events',
        description: 'Event creation, management, and archival',
      },
      {
        name: 'Contests',
        description: 'Contest management within events',
      },
      {
        name: 'Categories',
        description: 'Category management within contests',
      },
      {
        name: 'Contestants',
        description: 'Contestant registration and management',
      },
      {
        name: 'Judges',
        description: 'Judge management and assignments',
      },
      {
        name: 'Assignments',
        description: 'Judge-contestant-category assignments',
      },
      {
        name: 'Scoring',
        description: 'Score entry and management',
      },
      {
        name: 'Certification',
        description: '4-stage certification workflow (Judge → Tally → Auditor → Board)',
      },
      {
        name: 'Results',
        description: 'Results calculation and winners',
      },
      {
        name: 'Reports',
        description: 'Report generation and export (PDF, Excel, CSV)',
      },
      {
        name: 'Notifications',
        description: 'User notifications and alerts',
      },
      {
        name: 'Admin',
        description: 'Administrative functions and system settings',
      },
      {
        name: 'Settings',
        description: 'System settings and configuration',
      },
      {
        name: 'Files',
        description: 'File upload and management',
      },
      {
        name: 'Backup',
        description: 'Database and file backup operations',
      },
      {
        name: 'Health',
        description: 'System health and monitoring endpoints',
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/server.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc.default(options);

/**
 * Swagger UI options
 */
export const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Event Manager API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    docExpansion: 'list',
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
  },
};

export default swaggerSpec;
