import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  QuestionMarkCircleIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface FAQItem {
  question: string
  answer: string
  category: string
}

interface DocSection {
  title: string
  icon: React.ComponentType<any>
  description: string
  docs: DocLink[]
}

interface DocLink {
  title: string
  description: string
  path: string
}

const HelpPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'faq' | 'docs'>('faq')
  const [expandedFAQs, setExpandedFAQs] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewingDoc, setViewingDoc] = useState<{ title: string; content: string } | null>(null)

  const faqs: FAQItem[] = [
    {
      category: 'Getting Started',
      question: 'How do I create my first event?',
      answer: 'Navigate to the Events page from the sidebar or command palette (Cmd/Ctrl+K), then click "Create Event". Fill in the event details including name, date, and location. After creating the event, you can add contests and categories to it.'
    },
    {
      category: 'Getting Started',
      question: 'What are the different user roles?',
      answer: 'The system has several roles: ADMIN (full system access), ORGANIZER (event management), JUDGE (scoring), TALLY_MASTER (score verification), AUDITOR (final certification), BOARD (approvals), and CONTESTANT (participation). Each role has specific permissions and access levels.'
    },
    {
      category: 'Getting Started',
      question: 'How do I navigate the system quickly?',
      answer: 'Use the Command Palette (Cmd/Ctrl+K) to quickly access any page, create items, or perform actions. You can also use keyboard shortcuts like F1 for help, Cmd/Ctrl+B for sidebar, and "/" for search.'
    },
    {
      category: 'Scoring',
      question: 'How does the scoring workflow work?',
      answer: 'Judges submit scores for contestants in assigned categories. Tally Masters verify and certify the totals. Auditors perform final certification, and Board members approve the results. This multi-step verification ensures accuracy.'
    },
    {
      category: 'Scoring',
      question: 'Can I apply deductions to scores?',
      answer: 'Yes, judges can apply deductions when scoring. Navigate to the scoring page, select a contestant, and use the deductions panel to add time penalties, point deductions, or other adjustments. All deductions are logged for transparency.'
    },
    {
      category: 'Scoring',
      question: 'How do I fix a score after submission?',
      answer: 'Scores can be edited before certification. If a score is already certified, an admin or the certifying user must first decertify it, then the judge can edit and resubmit the score.'
    },
    {
      category: 'Results',
      question: 'How are winners determined?',
      answer: 'Winners are determined by the highest total scores after all judges have submitted scores, deductions are applied, and the results are certified through the tally master and auditor workflow. Ties are handled according to the contest rules.'
    },
    {
      category: 'Results',
      question: 'Can contestants see their scores?',
      answer: 'This depends on the contestant visibility settings configured by administrators. By default, contestants may see final results after certification, but individual judge scores may be hidden. Check Settings → Contestant Visibility to configure this.'
    },
    {
      category: 'Results',
      question: 'How do I generate reports?',
      answer: 'Navigate to the Reports page to generate various reports including score sheets, results summaries, judge assignments, and more. You can export reports as PDF or Excel files.'
    },
    {
      category: 'Administration',
      question: 'How do I configure email notifications?',
      answer: 'Go to Settings → Email/SMTP Settings. Configure your SMTP server details including host, port, username, and password. You can test the configuration before saving. Email notifications will be sent for important events like score certifications.'
    },
    {
      category: 'Administration',
      question: 'How do I backup my data?',
      answer: 'Navigate to Backups from the sidebar or command palette. You can create manual backups or configure automatic scheduled backups. Backups include the database, uploaded files, and configuration. Store backups securely off-site.'
    },
    {
      category: 'Administration',
      question: 'How do I customize the application theme?',
      answer: 'Go to Settings → Theme & Branding. You can customize the application name, subtitle, primary and secondary colors, upload a custom logo and favicon. Changes apply system-wide immediately.'
    },
    {
      category: 'Administration',
      question: 'What security settings are available?',
      answer: 'Navigate to Settings → Security Settings to configure max login attempts, lockout duration, session timeout, password requirements, and two-factor authentication. Strong password policies are recommended for production environments.'
    },
    {
      category: 'Troubleshooting',
      question: 'Why am I getting permission denied errors?',
      answer: 'Permission errors occur when your user role lacks the required permissions for an action. Contact your system administrator to request appropriate role assignments or permissions.'
    },
    {
      category: 'Troubleshooting',
      question: 'What if scores are not calculating correctly?',
      answer: 'Ensure all judges have submitted scores for all contestants in the category. Verify that deductions are applied correctly. Check the category type and scoring method. If issues persist, check the logs in Admin → Logs for detailed error messages.'
    },
    {
      category: 'Troubleshooting',
      question: 'How do I recover from accidental data deletion?',
      answer: 'If you have automatic backups enabled, restore from the most recent backup via the Disaster Recovery page. Always maintain regular backups. Some deletions may be recoverable from the Archive if soft-delete is enabled.'
    },
    {
      category: 'Advanced Features',
      question: 'What are workflow customizations?',
      answer: 'Workflow customizations allow you to modify the certification workflow, approval processes, and automation rules. Navigate to Workflows to configure custom approval chains, notifications, and business logic.'
    },
    {
      category: 'Advanced Features',
      question: 'How do I use bulk operations?',
      answer: 'The Bulk Operations page allows you to perform actions on multiple items simultaneously, such as assigning judges to multiple categories, updating contestant information in batch, or generating multiple reports at once.'
    },
    {
      category: 'Advanced Features',
      question: 'Can I integrate with external systems?',
      answer: 'Yes, the system provides a RESTful API for external integrations. API documentation is available at /api/docs. You can generate API keys in your Profile settings for authentication.'
    },
    {
      category: 'Advanced Features',
      question: 'How do I set up multi-tenancy?',
      answer: 'Multi-tenancy allows multiple organizations to use separate instances within the same deployment. Navigate to Tenants (admin only) to create and manage tenant organizations. Each tenant has isolated data and settings.'
    },
  ]

  const docSections: DocSection[] = [
    {
      title: 'Architecture & Getting Started',
      icon: RocketLaunchIcon,
      description: 'Learn about the system architecture and get started quickly',
      docs: [
        {
          title: 'System Architecture',
          description: 'Overview of the application architecture, components, and data flow',
          path: '/docs/01-ARCHITECTURE.md'
        },
        {
          title: 'Getting Started Guide',
          description: 'Quick start guide for new users and administrators',
          path: '/docs/02-GETTING-STARTED.md'
        },
        {
          title: 'Features Overview',
          description: 'Comprehensive overview of all system features and capabilities',
          path: '/docs/03-FEATURES.md'
        },
      ]
    },
    {
      title: 'Technical Reference',
      icon: CodeBracketIcon,
      description: 'API documentation and technical specifications',
      docs: [
        {
          title: 'API Reference',
          description: 'Complete API endpoint documentation and examples',
          path: '/docs/04-API-REFERENCE.md'
        },
        {
          title: 'Database Schema',
          description: 'Database structure, relationships, and data models',
          path: '/docs/05-DATABASE.md'
        },
        {
          title: 'Frontend Guide',
          description: 'Frontend architecture, components, and development guide',
          path: '/docs/06-FRONTEND.md'
        },
      ]
    },
    {
      title: 'Security & Deployment',
      icon: ShieldCheckIcon,
      description: 'Security best practices and deployment instructions',
      docs: [
        {
          title: 'Security Guide',
          description: 'Security features, best practices, and hardening guide',
          path: '/docs/07-SECURITY.md'
        },
        {
          title: 'Deployment Guide',
          description: 'Production deployment instructions and configuration',
          path: '/docs/08-DEPLOYMENT.md'
        },
        {
          title: 'Development Setup',
          description: 'Local development environment setup and workflow',
          path: '/docs/09-DEVELOPMENT.md'
        },
      ]
    },
    {
      title: 'Operations & Maintenance',
      icon: WrenchScrewdriverIcon,
      description: 'Operational guides and maintenance procedures',
      docs: [
        {
          title: 'Troubleshooting Guide',
          description: 'Common issues, solutions, and debugging techniques',
          path: '/docs/10-TROUBLESHOOTING.md'
        },
        {
          title: 'Disaster Recovery',
          description: 'Backup, restore, and disaster recovery procedures',
          path: '/docs/11-DISASTER-RECOVERY.md'
        },
        {
          title: 'Workflow Customization',
          description: 'Customizing workflows, approvals, and business logic',
          path: '/docs/12-WORKFLOW-CUSTOMIZATION.md'
        },
      ]
    },
  ]

  const categories = ['all', ...Array.from(new Set(faqs.map(faq => faq.category)))]

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleFAQ = (question: string) => {
    if (expandedFAQs.includes(question)) {
      setExpandedFAQs(expandedFAQs.filter(q => q !== question))
    } else {
      setExpandedFAQs([...expandedFAQs, question])
    }
  }

  const getDocumentationContent = (doc: DocLink): string => {
    const contentMap: Record<string, string> = {
      'System Architecture': `# System Architecture

## Overview

The Event Manager is a full-stack TypeScript application designed for managing pageant, competition, and event scoring with multi-tenant support.

## Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript for type safety
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with bcrypt password hashing
- **Real-time**: Socket.IO for live updates
- **Email**: Nodemailer with SMTP support

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: React Query for server state, Context API for client state
- **Styling**: Tailwind CSS with dark mode support
- **UI Components**: Heroicons for icons
- **Build Tool**: Vite for fast development

## Architecture Patterns

### Three-Tier Architecture

1. **Presentation Layer** (Frontend)
   - React components with hooks
   - Command palette for quick actions
   - Responsive design with mobile support
   - Real-time updates via WebSocket

2. **Application Layer** (Backend)
   - RESTful API endpoints
   - Service layer for business logic
   - Repository pattern for data access
   - Middleware for authentication, validation, CSRF protection

3. **Data Layer**
   - PostgreSQL relational database
   - Prisma schema with migrations
   - Multi-tenant data isolation
   - Soft deletes and audit logging

## Key Components

### Authentication & Authorization
- JWT tokens with refresh token rotation
- Role-based access control (RBAC)
- Tenant-scoped permissions
- Session management with configurable timeout

### Multi-Tenancy
- Tenant isolation at database level
- URL-based tenant routing (/tenant-slug/page)
- Shared infrastructure with isolated data
- Tenant-specific settings and branding

### Real-Time Features
- WebSocket connections via Socket.IO
- Live score updates
- Real-time notifications
- Connection state management

### File Management
- Multer for file uploads
- Image optimization
- Secure file storage
- Profile and bio image support

## Security Features

- CSRF token validation
- Rate limiting on authentication endpoints
- Input sanitization and validation
- SQL injection prevention via Prisma
- XSS protection with content security headers
- Secure password hashing (bcrypt with cost factor 12)
- Two-factor authentication support`,

      'Getting Started Guide': `# Getting Started Guide

## Welcome to Event Manager

This guide will help you get started with the Event Manager system, whether you're an administrator, organizer, judge, or contestant.

## Initial Setup (Administrators)

### 1. First Login
1. Navigate to the application URL
2. Log in with your admin credentials
3. You'll be directed to the dashboard

### 2. Configure System Settings
1. Go to **Settings** via sidebar or Command Palette (Cmd/Ctrl+K)
2. Configure:
   - **General Settings**: Application name, subtitle, contact email
   - **Email/SMTP**: Configure email server for notifications
   - **Security**: Set password policies, session timeout, max login attempts
   - **Theme & Branding**: Customize colors, upload logo and favicon

### 3. Create Your First Event
1. Open Command Palette (Cmd/Ctrl+K) or go to **Events** page
2. Click **Create Event**
3. Fill in required fields:
   - Event name (e.g., "Annual Pageant 2024")
   - Event date and time
   - Location
   - Description (optional)
4. Click **Save**

### 4. Add Contests to Event
1. Navigate to the event details
2. Click **Add Contest**
3. Enter contest details:
   - Contest name (e.g., "Evening Gown")
   - Category type (scoring method)
   - Description
4. Save the contest

### 5. Create Categories
1. Open a contest
2. Click **Add Category**
3. Configure:
   - Category name (e.g., "Junior Division")
   - Score cap (maximum possible score)
   - Time limit (if applicable)
   - Min/max contestants
4. Add scoring criteria for the category

### 6. Set Up Users
1. Go to **Users** page
2. Click **Create User**
3. Assign appropriate roles:
   - **JUDGE**: For scoring
   - **CONTESTANT**: For participants
   - **TALLY_MASTER**: For score verification
   - **AUDITOR**: For final certification
   - **ORGANIZER**: For event management
4. Import users in bulk via CSV if needed

### 7. Make Assignments
1. Navigate to **Assignments** page
2. Assign judges to categories
3. Assign contestants to categories
4. Assign tally masters and auditors (event/contest/category level)

## Daily Operations

### For Judges
1. Log in and navigate to **Scoring** page
2. Select your assigned category
3. Select contestant to score
4. Enter scores for each criterion
5. Apply deductions if necessary
6. Submit scores

### For Tally Masters
1. Navigate to **Certifications** page
2. Review submitted scores
3. Verify calculations
4. Certify totals for categories

### For Auditors
1. Access **Certifications** page
2. Review tally master certifications
3. Perform final verification
4. Certify results

### For Contestants
1. View assigned categories in dashboard
2. Check schedule and assignments
3. View results (after certification, if enabled)

## Keyboard Shortcuts

- **Cmd/Ctrl + K**: Open Command Palette
- **Cmd/Ctrl + B**: Toggle sidebar
- **F1**: Open help
- **/**: Focus search
- **Esc**: Close modals/dialogs

## Command Palette Quick Actions

Press Cmd/Ctrl+K and type:
- "new event" - Create new event
- "scoring" - Go to scoring page
- "users" - Manage users
- "settings" - Open settings
- "logout" - Sign out

## Best Practices

1. **Regular Backups**: Configure automatic backups in **Backups** page
2. **User Training**: Ensure all users understand their roles
3. **Test Environment**: Test major changes before live events
4. **Monitor Logs**: Check **Logs** page regularly for issues
5. **Update Profiles**: Keep user information current

## Getting Help

- Press **F1** or click **Help** in sidebar
- Browse FAQ section
- Check documentation for detailed guides
- Contact system administrator for technical issues`,

      'Features Overview': `# Features Overview

## Core Features

### Event Management
- **Hierarchical Structure**: Events → Contests → Categories
- **Event Templates**: Reusable event configurations
- **Scheduling**: Date, time, and location management
- **Custom Fields**: Add event-specific data fields
- **Archive**: Soft-delete events for historical record

### User Management
- **Multiple User Roles**: ADMIN, ORGANIZER, JUDGE, CONTESTANT, TALLY_MASTER, AUDITOR, BOARD, EMCEE
- **User Profiles**: Name, email, phone, bio, pronouns, gender
- **Profile Images**: Upload profile pictures
- **Bulk Import**: CSV import for bulk user creation
- **Role-Based Access**: Granular permissions per role

### Scoring System
- **Multi-Criterion Scoring**: Define multiple scoring criteria per category
- **Real-Time Scoring**: Live score updates via WebSocket
- **Deductions**: Apply time penalties, point deductions
- **Score Verification**: Multi-level certification workflow
- **Score History**: Complete audit trail of score changes
- **Anonymous Judging**: Option to hide judge identities

### Assignment Management
- **Judge Assignments**: Assign judges to specific categories
- **Contestant Assignments**: Register contestants for categories
- **Multi-Level Assignments**: Event, contest, or category level
- **Tally Master Assignment**: Assign score verifiers
- **Auditor Assignment**: Assign final certifiers
- **Conflict Detection**: Prevent double-booking

### Certification Workflow
1. **Judges Submit**: Judges enter scores
2. **Tally Master**: Verifies and certifies totals
3. **Auditor**: Final certification
4. **Board Approval**: Optional final approval step
- Decertification support for corrections
- Audit logs for all certification actions

### Results & Reporting
- **Live Results**: Real-time score updates
- **Winner Determination**: Automatic calculation
- **Tie Handling**: Configurable tie-breaking rules
- **Export Options**: PDF, Excel, CSV
- **Custom Reports**: Configurable report templates
- **Emcee Mode**: Live results display for announcers

### Communication
- **Email Notifications**: Score updates, certifications, results
- **SMTP Configuration**: Custom email server support
- **Email Templates**: Customizable email content
- **SMS Support**: SMS notifications (with Twilio)
- **In-App Notifications**: Real-time alerts

### Administration

#### Settings Management
- **General Settings**: App name, contact info
- **Email Settings**: SMTP configuration
- **Security Settings**: Password policies, session timeout
- **Theme & Branding**: Logo, colors, favicon
- **Contestant Visibility**: Control what contestants see
- **Field Visibility**: Customize visible fields per role

#### Data Management
- **Backup & Restore**: Manual and automatic backups
- **Disaster Recovery**: System restore capabilities
- **Archive Management**: View and restore archived data
- **Data Wipe**: Secure data deletion
- **Database Browser**: Direct database access (admin only)
- **Bulk Operations**: Batch data updates

#### System Monitoring
- **Log Viewer**: View application logs
- **Performance Monitoring**: System metrics
- **Audit Logs**: Complete user action history
- **Cache Management**: Redis cache control
- **Error Tracking**: Detailed error reporting

### Advanced Features

#### Multi-Tenancy
- **Tenant Isolation**: Complete data separation
- **Tenant Management**: Create and manage organizations
- **Custom Domains**: Tenant-specific URLs
- **Per-Tenant Settings**: Independent configurations
- **Tenant Branding**: Custom logos and colors

#### Workflow Customization
- **Custom Workflows**: Define approval processes
- **Automation Rules**: Triggered actions
- **Notification Rules**: Custom alert conditions
- **Business Logic**: Configurable validation rules

#### API Access
- **RESTful API**: Full programmatic access
- **API Documentation**: Swagger/OpenAPI docs at /api/docs
- **API Keys**: Generate authentication tokens
- **Webhooks**: Event-driven integrations

#### Command Palette
- **Quick Navigation**: Jump to any page instantly
- **Quick Actions**: Perform common tasks
- **Search**: Find users, events, categories
- **Keyboard Driven**: Fully accessible via keyboard

### Mobile Support
- **Responsive Design**: Works on all screen sizes
- **Mobile Optimized**: Touch-friendly interface
- **Progressive Web App**: Install as app
- **Offline Support**: Limited offline functionality

### Security Features
- **CSRF Protection**: Token-based validation
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Comprehensive data validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content sanitization
- **Secure Headers**: Security best practices
- **Password Hashing**: bcrypt with high cost factor
- **Session Management**: Secure token rotation
- **Two-Factor Auth**: Optional 2FA support`,

      'API Reference': `# API Reference

## Base URL

\`\`\`
Production: https://your-domain.com/api
Development: http://localhost:3001/api
\`\`\`

## Authentication

All API requests require a JWT token in the Authorization header:

\`\`\`bash
Authorization: Bearer <your-jwt-token>
\`\`\`

### Obtaining a Token

**POST** \`/api/auth/login\`

\`\`\`json
{
  "email": "user@example.com",
  "password": "your-password"
}
\`\`\`

Response:
\`\`\`json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
\`\`\`

## Events API

### List Events
**GET** \`/api/events\`

Query parameters:
- \`page\` (number): Page number (default: 1)
- \`limit\` (number): Items per page (default: 50)

### Create Event
**POST** \`/api/events\`

\`\`\`json
{
  "name": "Annual Pageant 2024",
  "eventDate": "2024-12-25T18:00:00Z",
  "location": "Grand Theater",
  "description": "Annual pageant event"
}
\`\`\`

### Get Event Details
**GET** \`/api/events/:eventId\`

### Update Event
**PUT** \`/api/events/:eventId\`

### Delete Event
**DELETE** \`/api/events/:eventId\`

## Contests API

### List Contests for Event
**GET** \`/api/events/:eventId/contests\`

### Create Contest
**POST** \`/api/events/:eventId/contests\`

\`\`\`json
{
  "name": "Evening Gown",
  "contestTypeId": "uuid",
  "description": "Evening gown competition"
}
\`\`\`

### Update Contest
**PUT** \`/api/contests/:contestId\`

### Delete Contest
**DELETE** \`/api/contests/:contestId\`

## Categories API

### List Categories for Contest
**GET** \`/api/contests/:contestId/categories\`

### Create Category
**POST** \`/api/contests/:contestId/categories\`

\`\`\`json
{
  "name": "Junior Division",
  "scoreCap": 100,
  "timeLimit": 300,
  "contestantMin": 1,
  "contestantMax": 50
}
\`\`\`

### Update Category
**PUT** \`/api/categories/:categoryId\`

### Delete Category
**DELETE** \`/api/categories/:categoryId\`

### Get Category Criteria
**GET** \`/api/categories/:categoryId/criteria\`

### Create Criterion
**POST** \`/api/categories/:categoryId/criteria\`

\`\`\`json
{
  "name": "Presentation",
  "maxScore": 25
}
\`\`\`

## Scoring API

### Get Scores for Category
**GET** \`/api/scoring/category/:categoryId/scores\`

Query parameters:
- \`contestantId\` (string): Filter by contestant

### Submit Score
**POST** \`/api/scoring/score\`

\`\`\`json
{
  "judgeId": "uuid",
  "contestantId": "uuid",
  "categoryId": "uuid",
  "criterionId": "uuid",
  "score": 23.5,
  "deduction": 0,
  "deductionReason": null
}
\`\`\`

### Update Score
**PUT** \`/api/scoring/score/:scoreId\`

### Delete Score
**DELETE** \`/api/scoring/score/:scoreId\`

## Users API

### List Users
**GET** \`/api/users\`

Query parameters:
- \`role\` (string): Filter by role

### Create User
**POST** \`/api/users\`

\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "JUDGE",
  "phone": "+1234567890"
}
\`\`\`

### Get User by ID
**GET** \`/api/users/:userId\`

### Update User
**PUT** \`/api/users/:userId\`

### Delete User
**DELETE** \`/api/users/:userId\`

### Upload User Image
**POST** \`/api/users/:userId/image\`

Content-Type: multipart/form-data

Form data:
- \`image\`: Image file (max 5MB)

## Assignments API

### Get Judge Assignments
**GET** \`/api/assignments?type=judge\`

### Assign Judge
**POST** \`/api/assignments/judge\`

\`\`\`json
{
  "judgeId": "uuid",
  "categoryId": "uuid"
}
\`\`\`

### Remove Judge Assignment
**PUT** \`/api/assignments/remove/:assignmentId\`

### Get Contestant Assignments
**GET** \`/api/assignments/contestants/assignments\`

### Assign Contestant
**POST** \`/api/assignments/contestants\`

\`\`\`json
{
  "contestantId": "uuid",
  "categoryId": "uuid"
}
\`\`\`

### Remove Contestant Assignment
**DELETE** \`/api/assignments/category/:categoryId/contestant/:contestantId\`

## Response Format

### Success Response
\`\`\`json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation successful"
}
\`\`\`

### Error Response
\`\`\`json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
\`\`\`

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- Other endpoints: 100 requests per minute
- Rate limits are per IP address

## Pagination

List endpoints support pagination:
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 50, max: 100)

Response includes:
\`\`\`json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasMore": true
  }
}
\`\`\``,

      'Database Schema': `# Database Schema

## Core Tables

### Users
Stores all system users including judges, contestants, organizers, etc.

\`\`\`prisma
model User {
  id                String   @id @default(cuid())
  email             String
  name              String
  password          String
  role              UserRole
  tenantId          String
  isActive          Boolean  @default(true)
  lastLoginAt       DateTime?
  phone             String?
  address           String?
  city              String?
  state             String?
  country           String?
  bio               String?
  preferredName     String?
  pronouns          String?
  gender            String?
  image             String?
  judgeId           String?
  contestantId      String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([tenantId, email])
}
\`\`\`

### Events
Top-level events that contain contests.

\`\`\`prisma
model Event {
  id          String    @id @default(cuid())
  name        String
  eventDate   DateTime
  location    String?
  description String?
  tenantId    String
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  contests    Contest[]
}
\`\`\`

### Contests
Competitions within events (e.g., Evening Gown, Talent).

\`\`\`prisma
model Contest {
  id              String   @id @default(cuid())
  name            String
  eventId         String
  contestTypeId   String?
  description     String?
  tenantId        String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  event           Event      @relation(fields: [eventId], references: [id])
  categories      Category[]
}
\`\`\`

### Categories
Divisions within contests (e.g., Junior, Senior).

\`\`\`prisma
model Category {
  id              String   @id @default(cuid())
  name            String
  contestId       String
  scoreCap        Int?
  timeLimit       Int?
  contestantMin   Int?
  contestantMax   Int?
  isCertified     Boolean  @default(false)
  tenantId        String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  contest         Contest     @relation(fields: [contestId], references: [id])
  criteria        Criterion[]
  scores          Score[]
  assignments     Assignment[]
}
\`\`\`

### Criterion
Scoring criteria for categories (e.g., Presentation, Technique).

\`\`\`prisma
model Criterion {
  id          String   @id @default(cuid())
  name        String
  categoryId  String
  maxScore    Int
  tenantId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  category    Category @relation(fields: [categoryId], references: [id])
  scores      Score[]
}
\`\`\`

### Scores
Individual scores submitted by judges.

\`\`\`prisma
model Score {
  id               String   @id @default(cuid())
  judgeId          String
  contestantId     String
  categoryId       String
  criterionId      String
  score            Float
  deduction        Float    @default(0)
  deductionReason  String?
  isCertified      Boolean  @default(false)
  certifiedBy      String?
  certifiedAt      DateTime?
  tenantId         String
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  judge            Judge       @relation(fields: [judgeId], references: [id])
  contestant       Contestant  @relation(fields: [contestantId], references: [id])
  category         Category    @relation(fields: [categoryId], references: [id])
  criterion        Criterion   @relation(fields: [criterionId], references: [id])
}
\`\`\`

### Judge
Extended judge information.

\`\`\`prisma
model Judge {
  id          String   @id @default(cuid())
  name        String
  email       String?
  isHeadJudge Boolean  @default(false)
  bio         String?
  gender      String?
  pronouns    String?
  tenantId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  assignments Assignment[]
  scores      Score[]
}
\`\`\`

### Contestant
Participant information.

\`\`\`prisma
model Contestant {
  id                String   @id @default(cuid())
  name              String
  email             String?
  contestantNumber  Int?
  bio               String?
  gender            String?
  pronouns          String?
  tenantId          String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  scores            Score[]
}
\`\`\`

### Assignment
Judge-to-category assignments.

\`\`\`prisma
model Assignment {
  id          String   @id @default(cuid())
  judgeId     String
  categoryId  String
  tenantId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  judge       Judge    @relation(fields: [judgeId], references: [id])
  category    Category @relation(fields: [categoryId], references: [id])

  @@unique([judgeId, categoryId])
}
\`\`\`

## Tenant Isolation

All tables include a \`tenantId\` field for multi-tenant data isolation:
- Every query must filter by \`tenantId\`
- Unique constraints include \`tenantId\`
- Prevents cross-tenant data access

## Indexes

Key indexes for performance:
- \`users_email_tenantId_idx\`: Fast user lookup
- \`events_tenantId_eventDate_idx\`: Event queries
- \`scores_categoryId_judgeId_idx\`: Score aggregation
- \`assignments_judgeId_idx\`: Assignment lookups

## Soft Deletes

Many tables support soft deletes via \`isActive\` or \`deletedAt\` fields:
- Allows data recovery
- Maintains referential integrity
- Archive functionality

## Audit Fields

Standard audit fields on most tables:
- \`createdAt\`: Record creation timestamp
- \`updatedAt\`: Last modification timestamp
- \`createdBy\`: User who created (some tables)
- \`updatedBy\`: User who last modified (some tables)`,

      'Security Guide': `# Security Guide

## Authentication

### Password Requirements
- Minimum 8 characters
- Must include: uppercase, lowercase, number, special character
- Password history: Cannot reuse last 5 passwords
- Expiration: Configurable (default: 90 days)
- Complexity validation on client and server

### Password Storage
- bcrypt hashing with cost factor 12
- Salted per password
- Never stored or logged in plain text
- Secure comparison to prevent timing attacks

### Session Management
- JWT tokens with configurable expiration
- Refresh token rotation
- Configurable session timeout
- Automatic logout on inactivity
- Single sign-on support

### Account Lockout
- Configurable max login attempts (default: 5)
- Configurable lockout duration (default: 30 minutes)
- IP-based tracking
- Email notification on lockout
- Admin can unlock accounts

## Authorization

### Role-Based Access Control (RBAC)
- **SUPER_ADMIN**: Full system access, cross-tenant
- **ADMIN**: Tenant administration
- **ORGANIZER**: Event and user management
- **JUDGE**: Scoring only
- **TALLY_MASTER**: Score verification
- **AUDITOR**: Final certification
- **BOARD**: Approval workflows
- **CONTESTANT**: View assignments and results
- **EMCEE**: Live results display

### Permission Model
- Granular permissions per endpoint
- Role hierarchy with inheritance
- Tenant-scoped permissions
- Custom permission sets

## Data Protection

### Multi-Tenant Isolation
- Complete data separation by tenant
- Tenant ID required on all queries
- No cross-tenant data access
- Separate backups per tenant

### Encryption
- **In Transit**: TLS 1.2+ for all connections
- **At Rest**: Database encryption
- **Passwords**: bcrypt hashed
- **Tokens**: Encrypted JWTs
- **Sensitive Fields**: AES-256 encryption

### Data Sanitization
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS protection (content sanitization)
- CSRF token validation
- Output encoding

## Network Security

### HTTPS/TLS
- Force HTTPS in production
- TLS 1.2 minimum
- Strong cipher suites only
- HSTS headers enabled
- Certificate pinning

### CORS Configuration
- Whitelist allowed origins
- Credentials support
- Preflight caching
- Restricted methods and headers

### Rate Limiting
- Authentication: 5 req/min per IP
- API endpoints: 100 req/min per user
- File uploads: 10 req/hour per user
- Configurable thresholds
- Exponential backoff

### Firewall Rules
- Allow only necessary ports
- Restrict admin endpoints to trusted IPs
- DDoS protection
- Geographic restrictions (optional)

## Application Security

### CSRF Protection
- Token-based validation
- SameSite cookie attribute
- Origin header verification
- Double-submit cookies

### XSS Prevention
- Content Security Policy (CSP) headers
- Input sanitization
- Output encoding
- DOM-based XSS protection
- React's built-in escaping

### SQL Injection Prevention
- Prisma ORM with parameterized queries
- No raw SQL execution
- Input type validation
- Prepared statements

### File Upload Security
- Type validation (whitelist)
- Size limits (5MB for images)
- Malware scanning (if available)
- Secure file storage
- No execution permissions

## Monitoring & Auditing

### Audit Logging
- All user actions logged
- Authentication events
- Data modifications
- Permission changes
- Failed access attempts
- Log retention: 1 year

### Security Monitoring
- Failed login tracking
- Unusual activity detection
- Rate limit violations
- Error rate monitoring
- Real-time alerts

### Log Management
- Centralized logging
- Log aggregation
- Search and analysis
- Compliance reporting
- Secure log storage

## Backup & Recovery

### Backup Strategy
- Daily automated backups
- Encrypted backup storage
- Off-site backup replication
- Backup retention: 30 days
- Test restores monthly

### Disaster Recovery
- Recovery time objective (RTO): 4 hours
- Recovery point objective (RPO): 24 hours
- Documented recovery procedures
- Regular DR testing
- Failover capabilities

## Compliance

### Data Privacy
- GDPR compliance ready
- Data minimization
- Right to erasure support
- Data portability
- Privacy by design

### Security Standards
- OWASP Top 10 protection
- CIS benchmarks
- PCI DSS considerations (if handling payments)
- SOC 2 Type II ready
- Regular security assessments

## Best Practices

### For Administrators
1. Use strong passwords and 2FA
2. Regular security audits
3. Keep system updated
4. Monitor logs daily
5. Restrict admin access
6. Regular backup verification
7. Document security procedures

### For Users
1. Choose strong, unique passwords
2. Enable two-factor authentication
3. Don't share credentials
4. Log out when done
5. Report suspicious activity
6. Keep contact info current
7. Review account activity

### For Developers
1. Follow secure coding practices
2. Input validation everywhere
3. Use parameterized queries
4. Implement proper error handling
5. Keep dependencies updated
6. Code review for security
7. Security testing in CI/CD

## Incident Response

### Response Plan
1. **Detection**: Monitor for security incidents
2. **Analysis**: Assess severity and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threat
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Document and improve

### Contact Points
- Security team: security@example.com
- Incident hotline: Available 24/7
- Emergency contacts in documentation

## Security Updates

### Patch Management
- Weekly security patch reviews
- Critical patches within 24 hours
- Regular dependency updates
- Change management process
- Rollback procedures

### Vulnerability Disclosure
- Responsible disclosure program
- Security contact: security@example.com
- Response SLA: 48 hours
- Public disclosure timeline
- Hall of fame for researchers`,
    }

    return contentMap[doc.title] || `# ${doc.title}

## Documentation Not Available

Detailed documentation for "${doc.title}" is coming soon.

Please check the FAQ section for common questions, or contact your system administrator for more information.`
  }

  const handleDocClick = async (doc: DocLink) => {
    const content = getDocumentationContent(doc)
    setViewingDoc({ title: doc.title, content })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <QuestionMarkCircleIcon className="h-10 w-10 mr-3 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Help & Documentation</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Find answers to common questions and explore comprehensive documentation
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles and documentation..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('faq')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'faq'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <QuestionMarkCircleIcon className="h-5 w-5 mr-2" />
                Frequently Asked Questions
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === 'docs'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <BookOpenIcon className="h-5 w-5 mr-2" />
                Documentation
              </button>
            </nav>
          </div>
        </div>

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div>
            {/* Category Filter */}
            <div className="mb-6 flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {category === 'all' ? 'All Categories' : category}
                </button>
              ))}
            </div>

            {/* FAQ Items */}
            <div className="space-y-3">
              {filteredFAQs.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                  <QuestionMarkCircleIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">No FAQs found matching your search.</p>
                </div>
              ) : (
                filteredFAQs.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFAQ(faq.question)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <div className="flex items-start">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 mr-3">
                            {faq.category}
                          </span>
                          <h3 className="text-base font-medium text-gray-900 dark:text-white flex-1">
                            {faq.question}
                          </h3>
                        </div>
                      </div>
                      {expandedFAQs.includes(faq.question) ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 ml-4 flex-shrink-0" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 ml-4 flex-shrink-0" />
                      )}
                    </button>
                    {expandedFAQs.includes(faq.question) && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Help Footer */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-start">
                <AcademicCapIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Still need help?
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    If you can't find the answer you're looking for, check out our comprehensive documentation or contact your system administrator.
                  </p>
                  <button
                    onClick={() => setActiveTab('docs')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm flex items-center"
                  >
                    Browse Documentation
                    <ChevronDownIcon className="h-4 w-4 ml-1 rotate-[-90deg]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            {docSections.map((section, index) => {
              const Icon = section.icon
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {section.title}
                        </h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {section.docs.map((doc, docIndex) => (
                      <button
                        key={docIndex}
                        onClick={() => handleDocClick(doc)}
                        className="w-full flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left group"
                      >
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {doc.title}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {doc.description}
                          </p>
                        </div>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 ml-2 flex-shrink-0 rotate-[-90deg]" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}

          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-3">
              <BookOpenIcon className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white">User Guide</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Learn how to use the system effectively with our comprehensive user guide.
            </p>
            <button
              onClick={() => {
                setActiveTab('docs')
                handleDocClick({ title: 'Getting Started', description: 'Learn how to use the system effectively', path: '/docs/02-GETTING-STARTED.md' })
              }}
              className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
            >
              Read Guide →
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-3">
              <CodeBracketIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-2" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white">API Reference</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Integrate with external systems using our RESTful API.
            </p>
            <button
              onClick={() => {
                setActiveTab('docs')
                handleDocClick({ title: 'API Reference', description: 'RESTful API integration documentation', path: '/docs/04-API-REFERENCE.md' })
              }}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
            >
              View API Docs →
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-3">
              <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-2" />
              <h3 className="text-base font-medium text-gray-900 dark:text-white">Troubleshooting</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Find solutions to common problems and error messages.
            </p>
            <button
              onClick={() => {
                setActiveTab('docs')
              }}
              className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium"
            >
              Get Help →
            </button>
          </div>
        </div>

        {/* Documentation Viewer Modal */}
        {viewingDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
                  {viewingDoc.title}
                </h2>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="prose prose-blue dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-6 mb-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2" {...props} />,
                      p: ({node, ...props}) => <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 mb-4 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="ml-4" {...props} />,
                      code: ({node, className, children, ...props}: any) => {
                        const isInline = !className?.includes('language-')
                        return isInline
                          ? <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-sm rounded text-blue-600 dark:text-blue-400" {...props}>{children}</code>
                          : <code className="block p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm overflow-x-auto mb-4" {...props}>{children}</code>
                      },
                      pre: ({node, ...props}) => <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 mb-4" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-gray-900 dark:text-white" {...props} />,
                      hr: ({node, ...props}) => <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />,
                    }}
                  >
                    {viewingDoc.content}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => setViewingDoc(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HelpPage
