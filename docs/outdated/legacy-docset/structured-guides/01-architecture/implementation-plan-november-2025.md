# Event Manager Application - Comprehensive Enhancement Implementation Plan

**Plan Created:** November 12, 2025
**Prepared By:** Claude (Sonnet 4.5)
**Application Base:** Event Manager v1.0 (node_react branch)
**Reference Document:** `/home/mat/11November25-Claude-Review.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Implementation Phases](#2-implementation-phases)
3. [Phase 1: Foundation (Quick Wins & Critical Security)](#3-phase-1-foundation)
4. [Phase 2: Core Enhancements (Major Features & Performance)](#4-phase-2-core-enhancements)
5. [Phase 3: Advanced Features (Complex Features & UX)](#5-phase-3-advanced-features)
6. [Phase 4: Scaling & Enterprise (Multi-Tenancy & Architecture)](#6-phase-4-scaling--enterprise)
7. [Technical Specifications](#7-technical-specifications)
8. [Timeline & Milestones](#8-timeline--milestones)
9. [Resource Requirements](#9-resource-requirements)
10. [Risk Management](#10-risk-management)
11. [Success Metrics](#11-success-metrics)
12. [Migration & Deployment Strategy](#12-migration--deployment-strategy)
13. [Maintenance & Support Plan](#13-maintenance--support-plan)

---

## 1. Executive Summary

### 1.1 Overview

This implementation plan outlines comprehensive enhancements to the Event Manager Application, a mature TypeScript-based contest management system currently serving small to medium-scale events. The plan addresses 6 key enhancement areas across 4 implementation phases spanning 12-18 months.

### 1.2 Current State Snapshot

**Application Maturity:** Production-ready (9.2/10 overall health)
- **Backend:** 240 TypeScript files, 100% migration complete
- **Frontend:** 119 React/TypeScript components
- **Database:** 45 Prisma models, PostgreSQL
- **User Roles:** 8 distinct roles with RBAC
- **Security Score:** 8.9/10 (Excellent)
- **Feature Completeness:** 100% of planned features

### 1.3 Enhancement Categories

| Category | Priority | Effort | Expected Impact |
|----------|----------|--------|----------------|
| **User Experience & Accessibility** | High | 45-60 days | Improved usability, WCAG compliance |
| **Performance & Scalability** | High | 48-65 days | 3-5x performance improvement |
| **Features & Functionality** | Medium | 35-50 days | Enhanced user productivity |
| **Architecture & Infrastructure** | Low | 65-90 days | Enterprise-scale readiness |
| **Security & Compliance** | Critical | 30-40 days | Enhanced security posture |
| **Quality & Maintainability** | High | 35-50 days | Reduced bugs, faster development |

### 1.4 Total Timeline & Resources

**Timeline:** 12-18 months (4 phases)
**Total Effort:** 258-355 developer days (~14-20 person-months)
**Team Size:** 4-6 developers (2 backend, 2 frontend, 1 DevOps, 1 QA)
**Budget Estimate:** $200,000 - $300,000 (including tools, infrastructure, external services)

### 1.5 Expected ROI

**Year 1 Benefits:**
- 50% reduction in bug reports through comprehensive testing
- 40% improvement in page load times through performance optimizations
- 30% reduction in support tickets through improved UX and onboarding
- 60% faster feature development through improved code quality tools
- 99.9% uptime through enhanced monitoring and disaster recovery

**Year 2+ Benefits:**
- Support for 10x user growth through scalability improvements
- 80% reduction in security incidents through advanced security features
- 50% reduction in operational costs through multi-tenancy
- Enablement of enterprise sales through compliance and security certifications

### 1.6 Critical Dependencies

**External Dependencies:**
1. Redis server for distributed caching/sessions (Phase 1)
2. ClamAV for virus scanning (Phase 1)
3. Secrets management solution (AWS Secrets Manager/Vault) (Phase 1)
4. APM tool (Datadog/New Relic) (Phase 1)
5. CDN provider (CloudFront/Cloudflare) (Phase 2)
6. Message broker (RabbitMQ/Kafka) (Phase 4 - optional)

**Internal Prerequisites:**
1. Production database backup strategy validated
2. CI/CD pipeline established
3. Staging environment matching production
4. Monitoring infrastructure (Prometheus/Grafana) operational
5. Development team trained on new tools and patterns

---

## 2. Implementation Phases

### Phase 1: Foundation (Months 1-3)
**Focus:** Quick wins, critical security, infrastructure preparation
**Effort:** 60-85 developer days
**Parallel Work Opportunities:** High (most tasks independent)

**Key Objectives:**
- Eliminate critical security gaps
- Establish comprehensive testing foundation
- Implement performance monitoring
- Deploy distributed caching infrastructure
- Improve dependency management

### Phase 2: Core Enhancements (Months 4-7)
**Focus:** Major features, performance improvements, UX enhancements
**Effort:** 85-120 developer days
**Parallel Work Opportunities:** Medium (some dependencies)

**Key Objectives:**
- Implement offline capabilities (PWA)
- Deploy comprehensive caching strategy
- Enhance mobile experience
- Add data visualization
- Implement user onboarding
- Optimize database performance

### Phase 3: Advanced Features (Months 8-11)
**Focus:** Complex features, advanced UX, customization
**Effort:** 60-85 developer days
**Parallel Work Opportunities:** Medium

**Key Objectives:**
- Implement advanced authentication (MFA, SSO)
- Add notification center
- Enable workflow customization
- Implement bulk operations
- Add API access & webhooks

### Phase 4: Scaling & Enterprise (Months 12-18)
**Focus:** Multi-tenancy, microservices evaluation, disaster recovery
**Effort:** 53-65 developer days
**Parallel Work Opportunities:** Low (architectural dependencies)

**Key Objectives:**
- Implement multi-tenancy architecture
- Evaluate and potentially implement microservices for specific domains
- Implement event-driven architecture for async operations
- Complete disaster recovery automation
- Enable database sharding

---

## 3. Phase 1: Foundation

### 3.1 Comprehensive Testing (P1-001)

#### Current State
- 154 tests passing (Jest + Playwright)
- Limited backend coverage (~40-50%)
- Minimal frontend component tests
- No visual regression testing
- No mutation testing

#### Desired End State
- 100%+ backend test coverage
- 100%+ frontend component test coverage
- Visual regression tests for critical UI flows
- Mutation testing integrated into CI
- Contract testing for API endpoints
- Comprehensive E2E tests for all critical workflows

#### Technical Approach

**Technologies:**
- **Backend:** Jest 30.2.0 (existing), Supertest (existing), @stryker-mutator/core for mutation testing
- **Frontend:** React Testing Library, @testing-library/jest-dom, @testing-library/user-event
- **Visual Regression:** Percy or Chromatic
- **Contract Testing:** Pact
- **E2E:** Playwright 1.56.1 (existing, expand coverage)

**Architecture Changes:**
- Add test utilities directory: `/var/www/event-manager/tests/utils/`
- Create test fixtures: `/var/www/event-manager/tests/fixtures/`
- Add test database seeding: `/var/www/event-manager/tests/seeds/`
- Configure test coverage thresholds in `jest.config.js`

#### Implementation Steps

1. **Backend Unit Tests (8 days)**
   - Day 1-2: Create test utilities and fixtures
     - File: `/var/www/event-manager/tests/utils/testHelpers.ts`
     - File: `/var/www/event-manager/tests/fixtures/users.fixture.ts`
     - File: `/var/www/event-manager/tests/fixtures/events.fixture.ts`
   - Day 3-4: Write service layer tests (target 80% coverage)
     - Test files: `/var/www/event-manager/tests/services/*.test.ts`
     - Priority services: EventService, ScoringService, CertificationService
   - Day 5-6: Write middleware tests
     - Test files: `/var/www/event-manager/tests/middleware/*.test.ts`
     - All 16 middleware modules
   - Day 7-8: Write utility and helper tests
     - Test files: `/var/www/event-manager/tests/utils/*.test.ts`

2. **Backend Integration Tests (5 days)**
   - Day 1-2: Controller integration tests
     - Test files: `/var/www/event-manager/tests/integration/controllers/*.test.ts`
     - Focus on complex workflows: scoring, certification, approvals
   - Day 3-4: Database integration tests
     - Test files: `/var/www/event-manager/tests/integration/database/*.test.ts`
     - Transaction handling, cascade deletes, constraints
   - Day 5: Authentication/authorization flow tests
     - Test file: `/var/www/event-manager/tests/integration/auth.test.ts`

3. **Frontend Component Tests (6 days)**
   - Day 1: Setup testing infrastructure
     - Update: `/var/www/event-manager/frontend/vite.config.ts`
     - Install: @testing-library/react, @testing-library/jest-dom
   - Day 2-3: Test shared components
     - Test files: `/var/www/event-manager/frontend/src/components/__tests__/*.test.tsx`
     - Priority: Modal, DataTable, FormField, Pagination
   - Day 4-5: Test page components
     - Test files: `/var/www/event-manager/frontend/src/pages/__tests__/*.test.tsx`
     - Priority: LoginPage, ScoringPage, ResultsPage
   - Day 6: Test custom hooks and contexts
     - Test files: `/var/www/event-manager/frontend/src/hooks/__tests__/*.test.ts`
     - Test files: `/var/www/event-manager/frontend/src/contexts/__tests__/*.test.tsx`

4. **E2E Test Expansion (4 days)**
   - Day 1: Critical user journeys
     - Test file: `/var/www/event-manager/tests/e2e/user-journeys.spec.ts`
     - Login → Event creation → Contest setup → Category creation
   - Day 2: Scoring workflows
     - Test file: `/var/www/event-manager/tests/e2e/scoring-workflow.spec.ts`
     - Judge score entry → Certification → Totals → Results
   - Day 3: Approval workflows
     - Test file: `/var/www/event-manager/tests/e2e/approval-workflow.spec.ts`
     - Deduction requests → Multi-role approvals → Score adjustments
   - Day 4: Admin operations
     - Test file: `/var/www/event-manager/tests/e2e/admin-operations.spec.ts`
     - User management → Backups → System settings

5. **Visual Regression Tests (2 days)**
   - Day 1: Setup Percy/Chromatic integration
     - Update: `/var/www/event-manager/.github/workflows/visual-tests.yml`
     - Install: @percy/cli or chromatic
   - Day 2: Create visual test suite
     - Test file: `/var/www/event-manager/tests/visual/snapshots.spec.ts`
     - Snapshot critical pages in light/dark mode, different roles

6. **Contract Testing (3 days)**
   - Day 1: Setup Pact
     - Install: @pact-foundation/pact
     - Configure: `/var/www/event-manager/tests/contract/pact.config.ts`
   - Day 2-3: Write consumer contracts for frontend
     - Test files: `/var/www/event-manager/tests/contract/consumers/*.pact.test.ts`
     - Critical API endpoints: auth, events, scoring, results

7. **Mutation Testing (2 days)**
   - Day 1: Setup Stryker
     - Install: @stryker-mutator/core, @stryker-mutator/jest-runner
     - Configure: `/var/www/event-manager/stryker.conf.js`
   - Day 2: Run mutation tests and fix gaps
     - Target 80%+ mutation score for critical services

8. **CI/CD Integration (2 days)**
   - Day 1: Update GitHub Actions workflow
     - File: `/var/www/event-manager/.github/workflows/test.yml`
     - Add test coverage reporting (Codecov or Coveralls)
     - Add coverage thresholds (fail if below 80% backend, 70% frontend)
   - Day 2: Add pre-commit hooks
     - Install: husky, lint-staged
     - Configure: `/var/www/event-manager/.husky/pre-commit`
     - Run tests on changed files before commit

#### File Changes Required

**New Files:**
- `/var/www/event-manager/tests/utils/testHelpers.ts`
- `/var/www/event-manager/tests/fixtures/*.fixture.ts` (10+ fixtures)
- `/var/www/event-manager/tests/services/*.test.ts` (64 test files)
- `/var/www/event-manager/tests/middleware/*.test.ts` (16 test files)
- `/var/www/event-manager/tests/integration/**/*.test.ts` (20+ test files)
- `/var/www/event-manager/frontend/src/components/__tests__/*.test.tsx` (50+ test files)
- `/var/www/event-manager/frontend/src/pages/__tests__/*.test.tsx` (39 test files)
- `/var/www/event-manager/tests/e2e/*.spec.ts` (10+ E2E test files)
- `/var/www/event-manager/tests/visual/snapshots.spec.ts`
- `/var/www/event-manager/tests/contract/**/*.pact.test.ts`
- `/var/www/event-manager/stryker.conf.js`

**Modified Files:**
- `/var/www/event-manager/jest.config.js` (add coverage thresholds)
- `/var/www/event-manager/frontend/vite.config.ts` (add test config)
- `/var/www/event-manager/.github/workflows/test.yml` (expand CI tests)
- `/var/www/event-manager/package.json` (add test scripts and dependencies)

#### Dependencies
None (foundational task)

#### Effort Estimate
**32 developer days** (4 weeks with 2 developers working in parallel)

#### Priority
**CRITICAL** - Foundation for all other changes

#### Risk Assessment
**Risk Level:** Medium

**Risks:**
1. **Time Overrun:** Writing comprehensive tests is time-consuming
   - *Mitigation:* Start with critical paths, incrementally add coverage
2. **Flaky Tests:** E2E tests can be unreliable
   - *Mitigation:* Use Playwright's built-in retry logic, proper waits
3. **CI Pipeline Slowdown:** More tests = slower builds
   - *Mitigation:* Parallelize test execution, use test result caching

**Mitigation Strategies:**
- Set realistic coverage targets (80% backend, 70% frontend)
- Focus on high-value tests first (critical workflows, complex logic)
- Use test code coverage tools to identify gaps
- Implement progressive coverage increases (don't block releases)

#### Testing Strategy
- All new tests must pass before merging
- Test coverage must not decrease
- Mutation score target: 80%+ for critical services
- Visual regression tests run on every PR
- E2E tests run nightly and on release branches

#### Rollback Plan
- Tests are non-invasive, no rollback needed
- If CI becomes too slow, temporarily disable some test suites
- Can remove visual regression tests if too expensive

---

### 3.2 Virus Scanning Integration (P1-002)

#### Current State
- File uploads accepted without virus scanning
- File type and size validation only
- No malware detection
- Files stored directly without quarantine

#### Desired End State
- All uploaded files scanned by ClamAV
- Infected files quarantined and blocked
- File content verification (not just extension)
- Real-time scanning for all uploads
- Periodic scanning of existing files
- Admin dashboard for virus scan logs

#### Technical Approach

**Technologies:**
- **ClamAV:** Open-source antivirus engine
- **clamscan:** Node.js ClamAV wrapper
- **Bull/BullMQ:** Job queue for async scanning

**Architecture Changes:**
- Add virus scanning middleware: `/var/www/event-manager/src/middleware/virusScanning.ts`
- Create virus scanning service: `/var/www/event-manager/src/services/VirusScanningService.ts`
- Add quarantine directory: `/var/www/event-manager/uploads/quarantine/`
- Add virus scan log model to database
- Create background job for scanning existing files

#### Implementation Steps

1. **ClamAV Installation & Configuration (0.5 days)**
   - Install ClamAV on server
     ```bash
     sudo apt-get install clamav clamav-daemon
     sudo freshclam  # Update virus definitions
     sudo systemctl start clamav-daemon
     ```
   - Create configuration file
     - File: `/var/www/event-manager/config/clamav.conf`
   - Verify ClamAV is running: `sudo systemctl status clamav-daemon`

2. **Database Schema Update (0.5 days)**
   - Add VirusScanLog model to Prisma schema
     - File: `/var/www/event-manager/prisma/schema.prisma`
     ```prisma
     model VirusScanLog {
       id          String   @id @default(cuid())
       fileId      String
       fileName    String
       filePath    String
       scanResult  String   // CLEAN, INFECTED, ERROR
       virusName   String?
       scanTime    DateTime @default(now())
       actionTaken String   // ALLOWED, QUARANTINED, DELETED
       scannedBy   String?  // User ID or SYSTEM

       file        File     @relation(fields: [fileId], references: [id], onDelete: Cascade)

       @@index([fileId])
       @@index([scanResult])
       @@index([scanTime])
     }

     // Add to File model
     model File {
       // ... existing fields
       scanStatus    String  @default("PENDING") // PENDING, SCANNING, CLEAN, INFECTED
       lastScannedAt DateTime?
       virusScans    VirusScanLog[]
     }
     ```
   - Run migration: `npx prisma migrate dev --name add-virus-scanning`

3. **Virus Scanning Service (1.5 days)**
   - Create service
     - File: `/var/www/event-manager/src/services/VirusScanningService.ts`
     ```typescript
     import { injectable, inject } from 'tsyringe';
     import NodeClam from 'clamscan';
     import { PrismaClient } from '@prisma/client';
     import fs from 'fs-extra';
     import path from 'path';
     import logger from '../utils/logger';

     @injectable()
     export class VirusScanningService {
       private clamScan: any;
       private quarantineDir = path.join(process.cwd(), 'uploads', 'quarantine');

       constructor(
         @inject('PrismaClient') private prisma: PrismaClient
       ) {
         this.initializeClamScan();
         this.ensureQuarantineDir();
       }

       private async initializeClamScan() {
         try {
           const ClamScan = new NodeClam().init({
             removeInfected: false,
             quarantineInfected: false,
             scanLog: null,
             debugMode: process.env.NODE_ENV === 'development',
             clamdscan: {
               socket: '/var/run/clamav/clamd.ctl',
               timeout: 60000,
               localFallback: true,
             },
           });
           this.clamScan = await ClamScan;
           logger.info('ClamAV initialized successfully');
         } catch (error) {
           logger.error('Failed to initialize ClamAV:', error);
           throw new Error('Virus scanning service unavailable');
         }
       }

       private async ensureQuarantineDir() {
         await fs.ensureDir(this.quarantineDir);
       }

       async scanFile(filePath: string, fileId: string): Promise<ScanResult> {
         logger.info(`Scanning file: ${filePath}`);

         try {
           // Update file status to SCANNING
           await this.prisma.file.update({
             where: { id: fileId },
             data: { scanStatus: 'SCANNING' },
           });

           // Scan the file
           const { isInfected, viruses } = await this.clamScan.isInfected(filePath);

           const scanResult = {
             isClean: !isInfected,
             isInfected,
             viruses: viruses || [],
             filePath,
             fileId,
           };

           // Log scan result
           await this.logScanResult(fileId, filePath, scanResult);

           // Handle infected files
           if (isInfected) {
             await this.quarantineFile(filePath, fileId, viruses[0]);
             await this.prisma.file.update({
               where: { id: fileId },
               data: {
                 scanStatus: 'INFECTED',
                 lastScannedAt: new Date(),
               },
             });
           } else {
             await this.prisma.file.update({
               where: { id: fileId },
               data: {
                 scanStatus: 'CLEAN',
                 lastScannedAt: new Date(),
               },
             });
           }

           return scanResult;
         } catch (error) {
           logger.error(`Error scanning file ${filePath}:`, error);

           await this.prisma.virusScanLog.create({
             data: {
               fileId,
               fileName: path.basename(filePath),
               filePath,
               scanResult: 'ERROR',
               actionTaken: 'NONE',
             },
           });

           throw error;
         }
       }

       private async quarantineFile(filePath: string, fileId: string, virusName: string) {
         const fileName = path.basename(filePath);
         const quarantinePath = path.join(this.quarantineDir, `${fileId}_${fileName}`);

         try {
           await fs.move(filePath, quarantinePath, { overwrite: true });
           logger.warn(`File quarantined: ${fileName} (${virusName})`);
         } catch (error) {
           logger.error(`Failed to quarantine file ${fileName}:`, error);
           // Delete file if can't quarantine
           await fs.remove(filePath);
         }
       }

       private async logScanResult(fileId: string, filePath: string, result: ScanResult) {
         await this.prisma.virusScanLog.create({
           data: {
             fileId,
             fileName: path.basename(filePath),
             filePath,
             scanResult: result.isInfected ? 'INFECTED' : 'CLEAN',
             virusName: result.viruses[0] || null,
             actionTaken: result.isInfected ? 'QUARANTINED' : 'ALLOWED',
           },
         });
       }

       async scanExistingFiles(batchSize: number = 10) {
         const unscannedFiles = await this.prisma.file.findMany({
           where: {
             OR: [
               { scanStatus: 'PENDING' },
               { lastScannedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // > 7 days
             ],
           },
           take: batchSize,
         });

         const results = [];
         for (const file of unscannedFiles) {
           try {
             const result = await this.scanFile(file.path, file.id);
             results.push(result);
           } catch (error) {
             logger.error(`Failed to scan file ${file.id}:`, error);
           }
         }

         return results;
       }
     }

     interface ScanResult {
       isClean: boolean;
       isInfected: boolean;
       viruses: string[];
       filePath: string;
       fileId: string;
     }
     ```

4. **Virus Scanning Middleware (0.5 days)**
   - Create middleware
     - File: `/var/www/event-manager/src/middleware/virusScanning.ts`
     ```typescript
     import { Request, Response, NextFunction } from 'express';
     import { container } from 'tsyringe';
     import { VirusScanningService } from '../services/VirusScanningService';
     import logger from '../utils/logger';

     export const scanUploadedFile = async (
       req: Request,
       res: Response,
       next: NextFunction
     ) => {
       if (!req.file && !req.files) {
         return next();
       }

       const virusScanningService = container.resolve(VirusScanningService);

       try {
         const files = req.file ? [req.file] : (req.files as Express.Multer.File[]);

         for (const file of files) {
           const scanResult = await virusScanningService.scanFile(
             file.path,
             file.filename // Temporary, will be updated when File record created
           );

           if (scanResult.isInfected) {
             logger.warn(`Infected file upload blocked: ${file.originalname}`);
             return res.status(400).json({
               success: false,
               error: 'FILE_INFECTED',
               message: `The uploaded file "${file.originalname}" contains a virus and has been blocked.`,
               virus: scanResult.viruses[0],
             });
           }
         }

         next();
       } catch (error) {
         logger.error('Virus scanning error:', error);
         return res.status(500).json({
           success: false,
           error: 'SCAN_FAILED',
           message: 'File scanning failed. Please try again or contact support.',
         });
       }
     };
     ```

5. **Integrate Middleware into Upload Routes (0.5 days)**
   - Update upload routes
     - File: `/var/www/event-manager/src/routes/uploadRoutes.ts`
     ```typescript
     import { scanUploadedFile } from '../middleware/virusScanning';

     router.post('/upload',
       authenticate,
       upload.single('file'),
       scanUploadedFile,  // Add virus scanning
       uploadController.handleUpload
     );
     ```
   - Update other file upload routes similarly
     - `/var/www/event-manager/src/routes/bioRoutes.ts`
     - `/var/www/event-manager/src/routes/fileRoutes.ts`

6. **Background Scanning Job (1 day)**
   - Install Bull: `npm install bull @types/bull`
   - Create queue configuration
     - File: `/var/www/event-manager/src/config/queue.ts`
     ```typescript
     import Bull from 'bull';
     import Redis from 'ioredis';

     const redisClient = new Redis({
       host: process.env.REDIS_HOST || 'localhost',
       port: parseInt(process.env.REDIS_PORT || '6379'),
       password: process.env.REDIS_PASSWORD,
     });

     export const virusScanQueue = new Bull('virus-scan', {
       createClient: (type) => {
         switch (type) {
           case 'client':
             return redisClient;
           case 'subscriber':
             return redisClient.duplicate();
           case 'bclient':
             return redisClient.duplicate();
           default:
             return redisClient;
         }
       },
     });
     ```
   - Create job processor
     - File: `/var/www/event-manager/src/jobs/virusScanProcessor.ts`
     ```typescript
     import { container } from 'tsyringe';
     import { VirusScanningService } from '../services/VirusScanningService';
     import { virusScanQueue } from '../config/queue';
     import logger from '../utils/logger';

     virusScanQueue.process('scan-existing-files', async (job) => {
       const { batchSize } = job.data;
       const virusScanningService = container.resolve(VirusScanningService);

       logger.info('Starting background virus scan');
       const results = await virusScanningService.scanExistingFiles(batchSize);
       logger.info(`Scanned ${results.length} files`);

       return results;
     });

     // Schedule periodic scanning
     export const schedulePeriodicScans = () => {
       virusScanQueue.add(
         'scan-existing-files',
         { batchSize: 50 },
         {
           repeat: {
             cron: '0 2 * * *', // Daily at 2 AM
           },
         }
       );
     };
     ```
   - Start job processor in server
     - File: `/var/www/event-manager/src/server.ts`
     ```typescript
     import './jobs/virusScanProcessor';
     import { schedulePeriodicScans } from './jobs/virusScanProcessor';

     // After server starts
     schedulePeriodicScans();
     ```

7. **Admin Dashboard for Virus Scans (0.5 days)**
   - Add controller method
     - File: `/var/www/event-manager/src/controllers/adminController.ts`
     ```typescript
     async getVirusScanLogs(req: Request, res: Response) {
       const { page = 1, limit = 50, scanResult } = req.query;

       const where = scanResult ? { scanResult: scanResult as string } : {};

       const [logs, total] = await Promise.all([
         prisma.virusScanLog.findMany({
           where,
           include: { file: true },
           orderBy: { scanTime: 'desc' },
           skip: (Number(page) - 1) * Number(limit),
           take: Number(limit),
         }),
         prisma.virusScanLog.count({ where }),
       ]);

       res.json({
         success: true,
         data: {
           logs,
           pagination: {
             page: Number(page),
             limit: Number(limit),
             total,
             pages: Math.ceil(total / Number(limit)),
           },
         },
       });
     }
     ```
   - Add frontend component
     - File: `/var/www/event-manager/frontend/src/components/VirusScanDashboard.tsx`
     - Display scan logs, infected file count, last scan time, quarantine management

#### File Changes Required

**New Files:**
- `/var/www/event-manager/src/services/VirusScanningService.ts`
- `/var/www/event-manager/src/middleware/virusScanning.ts`
- `/var/www/event-manager/src/config/queue.ts`
- `/var/www/event-manager/src/jobs/virusScanProcessor.ts`
- `/var/www/event-manager/frontend/src/components/VirusScanDashboard.tsx`
- `/var/www/event-manager/config/clamav.conf`
- `/var/www/event-manager/uploads/quarantine/.gitkeep`

**Modified Files:**
- `/var/www/event-manager/prisma/schema.prisma` (add VirusScanLog model)
- `/var/www/event-manager/src/routes/uploadRoutes.ts` (add middleware)
- `/var/www/event-manager/src/routes/bioRoutes.ts` (add middleware)
- `/var/www/event-manager/src/routes/fileRoutes.ts` (add middleware)
- `/var/www/event-manager/src/controllers/adminController.ts` (add scan logs endpoint)
- `/var/www/event-manager/src/server.ts` (start job processor)
- `/var/www/event-manager/package.json` (add dependencies)
- `/var/www/event-manager/.env` (add REDIS config)

#### Dependencies
- Redis server must be running (shared with P1-004)
- ClamAV daemon must be installed and running

#### Effort Estimate
**5 developer days** (1 week with 1 developer)

#### Priority
**CRITICAL** - Security vulnerability

#### Risk Assessment
**Risk Level:** Medium

**Risks:**
1. **ClamAV Performance:** Scanning large files may be slow
   - *Mitigation:* Use async job queue, show upload progress
2. **False Positives:** Legitimate files flagged as infected
   - *Mitigation:* Allow admins to whitelist files, manual review quarantine
3. **Virus Definition Updates:** Outdated definitions miss new threats
   - *Mitigation:* Automate freshclam updates, monitor update status

#### Testing Strategy
- Upload known virus test file (EICAR test file)
- Verify file is quarantined
- Verify clean files pass through
- Test background scanning job
- Load test with concurrent uploads

#### Rollback Plan
- Remove virus scanning middleware from upload routes
- Continue accepting uploads without scanning
- Keep ClamAV running for future re-enablement
- No data migration needed (VirusScanLog is new table)

---

### 3.3 Secrets Management (P1-003)

#### Current State
- Secrets stored in `.env` file
- No secret rotation
- Secrets visible to anyone with file system access
- No secret access auditing
- Manual secret management

#### Desired End State
- Secrets stored in AWS Secrets Manager or HashiCorp Vault
- Automatic secret rotation
- Encrypted secrets at rest
- Secret access auditing
- Zero secrets in `.env` file (only pointer to secret store)
- Graceful degradation if secret store unavailable

#### Technical Approach

**Technologies:**
- **AWS Secrets Manager** (recommended for AWS deployments) OR
- **HashiCorp Vault** (recommended for on-premise/multi-cloud)
- **aws-sdk** or **node-vault** for integration

**Architecture Changes:**
- Create secrets service: `/var/www/event-manager/src/services/SecretsService.ts`
- Update config loader: `/var/www/event-manager/src/config/secrets.ts`
- Add secret rotation lambda/cron jobs
- Update deployment scripts to fetch secrets on startup

#### Implementation Steps

**Option A: AWS Secrets Manager Implementation**

1. **AWS Secrets Manager Setup (0.5 days)**
   - Create AWS Secrets Manager secrets via AWS Console or CLI
     ```bash
     aws secretsmanager create-secret \
       --name event-manager/production/database \
       --secret-string '{"username":"event_user","password":"secure_password","host":"db.example.com"}'

     aws secretsmanager create-secret \
       --name event-manager/production/jwt \
       --secret-string '{"secret":"your-jwt-secret-here"}'

     aws secretsmanager create-secret \
       --name event-manager/production/session \
       --secret-string '{"secret":"your-session-secret-here"}'
     ```
   - Configure IAM role/policy for secret access
   - Update `.env` file to only contain:
     ```env
     AWS_REGION=us-east-1
     AWS_SECRET_NAME_PREFIX=event-manager/production
     NODE_ENV=production
     ```

2. **Secrets Service Implementation (2 days)**
   - Create service
     - File: `/var/www/event-manager/src/services/SecretsService.ts`
     ```typescript
     import { injectable } from 'tsyringe';
     import {
       SecretsManagerClient,
       GetSecretValueCommand,
       UpdateSecretCommand,
       RotateSecretCommand,
     } from '@aws-sdk/client-secrets-manager';
     import logger from '../utils/logger';

     interface SecretCache {
       value: any;
       expiresAt: number;
     }

     @injectable()
     export class SecretsService {
       private client: SecretsManagerClient;
       private cache: Map<string, SecretCache> = new Map();
       private readonly CACHE_TTL = 300000; // 5 minutes
       private readonly secretPrefix: string;

       constructor() {
         this.client = new SecretsManagerClient({
           region: process.env.AWS_REGION || 'us-east-1',
         });
         this.secretPrefix = process.env.AWS_SECRET_NAME_PREFIX || 'event-manager/production';
       }

       async getSecret(secretKey: string, useCache: boolean = true): Promise<any> {
         const secretName = `${this.secretPrefix}/${secretKey}`;

         // Check cache
         if (useCache && this.cache.has(secretName)) {
           const cached = this.cache.get(secretName)!;
           if (Date.now() < cached.expiresAt) {
             logger.debug(`Secret cache hit: ${secretName}`);
             return cached.value;
           }
           this.cache.delete(secretName);
         }

         try {
           logger.info(`Fetching secret: ${secretName}`);
           const command = new GetSecretValueCommand({ SecretId: secretName });
           const response = await this.client.send(command);

           let secretValue;
           if (response.SecretString) {
             secretValue = JSON.parse(response.SecretString);
           } else if (response.SecretBinary) {
             secretValue = Buffer.from(response.SecretBinary).toString('utf-8');
           } else {
             throw new Error(`No secret value found for ${secretName}`);
           }

           // Cache the secret
           if (useCache) {
             this.cache.set(secretName, {
               value: secretValue,
               expiresAt: Date.now() + this.CACHE_TTL,
             });
           }

           return secretValue;
         } catch (error) {
           logger.error(`Failed to fetch secret ${secretName}:`, error);
           throw new Error(`Secret retrieval failed: ${secretKey}`);
         }
       }

       async updateSecret(secretKey: string, secretValue: any): Promise<void> {
         const secretName = `${this.secretPrefix}/${secretKey}`;

         try {
           const command = new UpdateSecretCommand({
             SecretId: secretName,
             SecretString: JSON.stringify(secretValue),
           });
           await this.client.send(command);

           // Invalidate cache
           this.cache.delete(secretName);

           logger.info(`Secret updated: ${secretName}`);
         } catch (error) {
           logger.error(`Failed to update secret ${secretName}:`, error);
           throw error;
         }
       }

       async rotateSecret(secretKey: string): Promise<void> {
         const secretName = `${this.secretPrefix}/${secretKey}`;

         try {
           const command = new RotateSecretCommand({
             SecretId: secretName,
             RotationLambdaARN: process.env.ROTATION_LAMBDA_ARN,
           });
           await this.client.send(command);

           // Invalidate cache
           this.cache.delete(secretName);

           logger.info(`Secret rotation initiated: ${secretName}`);
         } catch (error) {
           logger.error(`Failed to rotate secret ${secretName}:`, error);
           throw error;
         }
       }

       clearCache(): void {
         this.cache.clear();
         logger.info('Secrets cache cleared');
       }
     }
     ```

3. **Config Loader Update (1 day)**
   - Update config to use secrets service
     - File: `/var/www/event-manager/src/config/secrets.ts`
     ```typescript
     import { container } from 'tsyringe';
     import { SecretsService } from '../services/SecretsService';
     import logger from '../utils/logger';

     interface AppSecrets {
       database: {
         username: string;
         password: string;
         host: string;
         port: number;
         database: string;
       };
       jwt: {
         secret: string;
         expiresIn: string;
       };
       session: {
         secret: string;
       };
       csrf: {
         secret: string;
       };
       smtp: {
         host: string;
         port: number;
         username: string;
         password: string;
       };
     }

     let cachedSecrets: AppSecrets | null = null;

     export async function loadSecrets(): Promise<AppSecrets> {
       if (cachedSecrets) {
         return cachedSecrets;
       }

       const secretsService = container.resolve(SecretsService);

       try {
         const [database, jwt, session, csrf, smtp] = await Promise.all([
           secretsService.getSecret('database'),
           secretsService.getSecret('jwt'),
           secretsService.getSecret('session'),
           secretsService.getSecret('csrf'),
           secretsService.getSecret('smtp'),
         ]);

         cachedSecrets = {
           database,
           jwt,
           session,
           csrf,
           smtp,
         };

         logger.info('Secrets loaded successfully');
         return cachedSecrets;
       } catch (error) {
         logger.error('Failed to load secrets:', error);

         // Fallback to .env for development
         if (process.env.NODE_ENV !== 'production') {
           logger.warn('Using fallback .env secrets for development');
           cachedSecrets = {
             database: {
               username: process.env.DB_USERNAME || 'event_manager',
               password: process.env.DB_PASSWORD || 'password',
               host: process.env.DB_HOST || 'localhost',
               port: parseInt(process.env.DB_PORT || '5432'),
               database: process.env.DB_NAME || 'event_manager',
             },
             jwt: {
               secret: process.env.JWT_SECRET || 'dev-jwt-secret',
               expiresIn: '1h',
             },
             session: {
               secret: process.env.SESSION_SECRET || 'dev-session-secret',
             },
             csrf: {
               secret: process.env.CSRF_SECRET || 'dev-csrf-secret',
             },
             smtp: {
               host: process.env.SMTP_HOST || 'localhost',
               port: parseInt(process.env.SMTP_PORT || '587'),
               username: process.env.SMTP_USERNAME || '',
               password: process.env.SMTP_PASSWORD || '',
             },
           };
           return cachedSecrets;
         }

         throw new Error('Failed to load production secrets');
       }
     }

     export function getSecrets(): AppSecrets {
       if (!cachedSecrets) {
         throw new Error('Secrets not loaded. Call loadSecrets() first.');
       }
       return cachedSecrets;
     }

     export function clearSecretsCache(): void {
       cachedSecrets = null;
       const secretsService = container.resolve(SecretsService);
       secretsService.clearCache();
     }
     ```

4. **Update Server Initialization (0.5 days)**
   - Load secrets before starting server
     - File: `/var/www/event-manager/src/server.ts`
     ```typescript
     import { loadSecrets } from './config/secrets';

     async function startServer() {
       try {
         // Load secrets first
         await loadSecrets();
         logger.info('Secrets loaded successfully');

         // Initialize database connection
         const secrets = getSecrets();
         process.env.DATABASE_URL = `postgresql://${secrets.database.username}:${secrets.database.password}@${secrets.database.host}:${secrets.database.port}/${secrets.database.database}`;

         // Continue with normal server initialization
         await initializeApp();

         const PORT = process.env.PORT || 3000;
         app.listen(PORT, () => {
           logger.info(`Server started on port ${PORT}`);
         });
       } catch (error) {
         logger.error('Failed to start server:', error);
         process.exit(1);
       }
     }

     startServer();
     ```

5. **Secret Rotation Implementation (1.5 days)**
   - Create rotation Lambda function (AWS) or cron job
     - File: `/var/www/event-manager/scripts/rotate-secrets.ts`
     ```typescript
     import { SecretsService } from '../src/services/SecretsService';
     import { generateSecureToken } from '../src/utils/crypto';
     import logger from '../src/utils/logger';

     async function rotateJwtSecret() {
       const secretsService = new SecretsService();

       // Generate new secret
       const newSecret = generateSecureToken(64);

       // Update secret
       await secretsService.updateSecret('jwt', {
         secret: newSecret,
         expiresIn: '1h',
       });

       logger.info('JWT secret rotated successfully');
     }

     async function rotateSessionSecret() {
       const secretsService = new SecretsService();

       const newSecret = generateSecureToken(64);

       await secretsService.updateSecret('session', {
         secret: newSecret,
       });

       logger.info('Session secret rotated successfully');
     }

     async function rotateDatabasePassword() {
       const secretsService = new SecretsService();

       // This requires coordination with database
       // Generate new password
       const newPassword = generateSecureToken(32);

       // Update database user password (requires admin connection)
       // Then update secret

       logger.info('Database password rotated successfully');
     }

     // Run rotation based on argument
     const secretType = process.argv[2];
     switch (secretType) {
       case 'jwt':
         rotateJwtSecret();
         break;
       case 'session':
         rotateSessionSecret();
         break;
       case 'database':
         rotateDatabasePassword();
         break;
       default:
         logger.error('Unknown secret type:', secretType);
         process.exit(1);
     }
     ```
   - Add cron job for automatic rotation
     - File: `/var/www/event-manager/src/jobs/secretRotationJob.ts`
     ```typescript
     import cron from 'node-cron';
     import { exec } from 'child_process';
     import { promisify } from 'util';
     import logger from '../utils/logger';

     const execAsync = promisify(exec);

     export function scheduleSecretRotation() {
       // Rotate JWT secret every 90 days
       cron.schedule('0 0 1 */3 *', async () => {
         logger.info('Starting JWT secret rotation');
         try {
           await execAsync('npm run rotate-secret jwt');
           logger.info('JWT secret rotation completed');
         } catch (error) {
           logger.error('JWT secret rotation failed:', error);
         }
       });

       // Rotate session secret every 30 days
       cron.schedule('0 0 1 * *', async () => {
         logger.info('Starting session secret rotation');
         try {
           await execAsync('npm run rotate-secret session');
           logger.info('Session secret rotation completed');
         } catch (error) {
           logger.error('Session secret rotation failed:', error);
         }
       });

       logger.info('Secret rotation jobs scheduled');
     }
     ```

6. **Testing & Validation (0.5 days)**
   - Create test script to verify secret loading
     - File: `/var/www/event-manager/scripts/test-secrets.ts`
     ```typescript
     import { loadSecrets } from '../src/config/secrets';
     import logger from '../src/utils/logger';

     async function testSecrets() {
       try {
         const secrets = await loadSecrets();
         logger.info('✓ Database secrets loaded');
         logger.info('✓ JWT secrets loaded');
         logger.info('✓ Session secrets loaded');
         logger.info('✓ CSRF secrets loaded');
         logger.info('✓ SMTP secrets loaded');
         logger.info('All secrets loaded successfully');
       } catch (error) {
         logger.error('Secret loading failed:', error);
         process.exit(1);
       }
     }

     testSecrets();
     ```

**Option B: HashiCorp Vault Implementation** (Alternative to AWS Secrets Manager)

Similar structure but using `node-vault` library instead of AWS SDK.

#### File Changes Required

**New Files:**
- `/var/www/event-manager/src/services/SecretsService.ts`
- `/var/www/event-manager/src/config/secrets.ts`
- `/var/www/event-manager/scripts/rotate-secrets.ts`
- `/var/www/event-manager/src/jobs/secretRotationJob.ts`
- `/var/www/event-manager/scripts/test-secrets.ts`
- `/var/www/event-manager/scripts/setup-secrets.sh` (AWS CLI commands)

**Modified Files:**
- `/var/www/event-manager/src/server.ts` (load secrets on startup)
- `/var/www/event-manager/.env` (remove secrets, add AWS config)
- `/var/www/event-manager/package.json` (add scripts and dependencies)
- `/var/www/event-manager/README.md` (update setup instructions)

#### Dependencies
- AWS account with Secrets Manager enabled OR
- HashiCorp Vault server running
- IAM role/credentials for secret access

#### Effort Estimate
**6 developer days** (1.5 weeks with 1 developer)

#### Priority
**HIGH** - Security improvement

#### Risk Assessment
**Risk Level:** Medium

**Risks:**
1. **Service Unavailable:** Secrets manager down = app can't start
   - *Mitigation:* Implement local secret cache, fallback to .env in development
2. **Cost:** AWS Secrets Manager charges per secret and API call
   - *Mitigation:* Implement aggressive caching (5-minute TTL)
3. **Rotation Downtime:** Rotating secrets may cause brief authentication failures
   - *Mitigation:* Implement graceful secret rotation (overlap period)

#### Testing Strategy
- Test secret loading in development environment
- Test fallback to .env when secrets unavailable
- Test secret rotation without downtime
- Load test secret API calls

#### Rollback Plan
- Keep .env file with all secrets as backup
- Add feature flag: `USE_SECRETS_MANAGER=false`
- If secrets manager fails, fall back to .env
- No database changes needed

---

### 3.4 Redis Distributed Caching (P1-004)

#### Current State
- User caching with in-memory Map
- Single-server deployment only
- No distributed caching
- Cache not shared across server instances
- No cache expiration management
- Limited cache invalidation

#### Desired End State
- Redis for distributed caching
- Multi-server deployment support
- Shared cache across instances
- Automatic cache expiration (TTL)
- Comprehensive cache invalidation strategies
- Cache warming for critical data
- Cache monitoring and statistics

#### Technical Approach

**Technologies:**
- **Redis 7.x:** In-memory data store
- **ioredis:** Node.js Redis client
- **Bull/BullMQ:** Job queue using Redis
- **Socket.IO Redis Adapter:** For multi-server WebSocket support

**Architecture Changes:**
- Replace in-memory cache with Redis
- Create centralized cache service: `/var/www/event-manager/src/services/CacheService.ts`
- Add cache middleware for HTTP response caching
- Configure Socket.IO Redis adapter
- Add cache warming on server startup

#### Implementation Steps

1. **Redis Installation & Configuration (0.5 days)**
   - Install Redis via Docker Compose
     - File: `/var/www/event-manager/docker-compose.yml`
     ```yaml
     services:
       redis:
         image: redis:7-alpine
         container_name: event-manager-redis
         ports:
           - "6379:6379"
         volumes:
           - redis-data:/data
         command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
         healthcheck:
           test: ["CMD", "redis-cli", "ping"]
           interval: 10s
           timeout: 3s
           retries: 3
         networks:
           - event-manager-network

     volumes:
       redis-data:
     ```
   - Add Redis config to `.env`
     ```env
     REDIS_HOST=localhost
     REDIS_PORT=6379
     REDIS_PASSWORD=secure_redis_password
     REDIS_DB=0
     REDIS_TTL=3600
     ```

2. **Cache Service Implementation (2 days)**
   - Create comprehensive cache service
     - File: `/var/www/event-manager/src/services/CacheService.ts`
     ```typescript
     import { injectable } from 'tsyringe';
     import Redis from 'ioredis';
     import logger from '../utils/logger';

     @injectable()
     export class CacheService {
       private client: Redis;
       private readonly defaultTTL: number;
       private stats: CacheStats = {
         hits: 0,
         misses: 0,
         sets: 0,
         deletes: 0,
       };

       constructor() {
         this.client = new Redis({
           host: process.env.REDIS_HOST || 'localhost',
           port: parseInt(process.env.REDIS_PORT || '6379'),
           password: process.env.REDIS_PASSWORD,
           db: parseInt(process.env.REDIS_DB || '0'),
           retryStrategy: (times) => {
             const delay = Math.min(times * 50, 2000);
             return delay;
           },
         });

         this.defaultTTL = parseInt(process.env.REDIS_TTL || '3600');

         this.client.on('connect', () => {
           logger.info('Redis connected');
         });

         this.client.on('error', (error) => {
           logger.error('Redis error:', error);
         });
       }

       /**
        * Get value from cache
        */
       async get<T>(key: string): Promise<T | null> {
         try {
           const value = await this.client.get(key);
           if (value) {
             this.stats.hits++;
             return JSON.parse(value) as T;
           }
           this.stats.misses++;
           return null;
         } catch (error) {
           logger.error(`Cache get error for key ${key}:`, error);
           return null;
         }
       }

       /**
        * Set value in cache
        */
       async set(key: string, value: any, ttl?: number): Promise<void> {
         try {
           const serialized = JSON.stringify(value);
           const expirySeconds = ttl || this.defaultTTL;
           await this.client.setex(key, expirySeconds, serialized);
           this.stats.sets++;
         } catch (error) {
           logger.error(`Cache set error for key ${key}:`, error);
         }
       }

       /**
        * Delete key from cache
        */
       async delete(key: string): Promise<void> {
         try {
           await this.client.del(key);
           this.stats.deletes++;
         } catch (error) {
           logger.error(`Cache delete error for key ${key}:`, error);
         }
       }

       /**
        * Delete keys matching pattern
        */
       async deletePattern(pattern: string): Promise<number> {
         try {
           const keys = await this.client.keys(pattern);
           if (keys.length === 0) return 0;

           const deleted = await this.client.del(...keys);
           this.stats.deletes += deleted;
           return deleted;
         } catch (error) {
           logger.error(`Cache delete pattern error for ${pattern}:`, error);
           return 0;
         }
       }

       /**
        * Check if key exists
        */
       async exists(key: string): Promise<boolean> {
         try {
           const result = await this.client.exists(key);
           return result === 1;
         } catch (error) {
           logger.error(`Cache exists error for key ${key}:`, error);
           return false;
         }
       }

       /**
        * Get TTL for key
        */
       async ttl(key: string): Promise<number> {
         try {
           return await this.client.ttl(key);
         } catch (error) {
           logger.error(`Cache TTL error for key ${key}:`, error);
           return -1;
         }
       }

       /**
        * Increment counter
        */
       async increment(key: string, by: number = 1): Promise<number> {
         try {
           return await this.client.incrby(key, by);
         } catch (error) {
           logger.error(`Cache increment error for key ${key}:`, error);
           return 0;
         }
       }

       /**
        * Set with NX (only if not exists)
        */
       async setNX(key: string, value: any, ttl?: number): Promise<boolean> {
         try {
           const serialized = JSON.stringify(value);
           const expirySeconds = ttl || this.defaultTTL;
           const result = await this.client.set(key, serialized, 'EX', expirySeconds, 'NX');
           return result === 'OK';
         } catch (error) {
           logger.error(`Cache setNX error for key ${key}:`, error);
           return false;
         }
       }

       /**
        * Get multiple keys
        */
       async mget<T>(keys: string[]): Promise<(T | null)[]> {
         try {
           const values = await this.client.mget(...keys);
           return values.map((v) => (v ? JSON.parse(v) as T : null));
         } catch (error) {
           logger.error('Cache mget error:', error);
           return keys.map(() => null);
         }
       }

       /**
        * Flush all cache
        */
       async flush(): Promise<void> {
         try {
           await this.client.flushdb();
           logger.info('Cache flushed');
         } catch (error) {
           logger.error('Cache flush error:', error);
         }
       }

       /**
        * Get cache statistics
        */
       getStats(): CacheStats {
         const hitRate = this.stats.hits + this.stats.misses === 0
           ? 0
           : (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100;

         return {
           ...this.stats,
           hitRate: parseFloat(hitRate.toFixed(2)),
         };
       }

       /**
        * Reset statistics
        */
       resetStats(): void {
         this.stats = {
           hits: 0,
           misses: 0,
           sets: 0,
           deletes: 0,
         };
       }

       /**
        * Close connection
        */
       async disconnect(): Promise<void> {
         await this.client.quit();
       }
     }

     interface CacheStats {
       hits: number;
       misses: number;
       sets: number;
       deletes: number;
       hitRate?: number;
     }
     ```

3. **User Cache Migration (1 day)**
   - Replace in-memory user cache with Redis
     - File: `/var/www/event-manager/src/middleware/auth.ts`
     ```typescript
     import { container } from 'tsyringe';
     import { CacheService } from '../services/CacheService';

     export const authenticate = async (req, res, next) => {
       try {
         const token = extractToken(req);
         const decoded = jwt.verify(token, secrets.jwt.secret);

         const cacheService = container.resolve(CacheService);
         const cacheKey = `user:${decoded.userId}`;

         // Try cache first
         let user = await cacheService.get(cacheKey);

         if (!user) {
           // Cache miss - fetch from database
           user = await prisma.user.findUnique({
             where: { id: decoded.userId },
           });

           if (user) {
             // Cache for 1 hour
             await cacheService.set(cacheKey, user, 3600);
           }
         }

         if (!user || !user.isActive) {
           return res.status(401).json({ error: 'Unauthorized' });
         }

         // Validate session version
         if (decoded.sessionVersion !== user.sessionVersion) {
           await cacheService.delete(cacheKey);
           return res.status(401).json({ error: 'Session expired' });
         }

         req.user = user;
         next();
       } catch (error) {
         logger.error('Authentication error:', error);
         res.status(401).json({ error: 'Invalid token' });
       }
     };
     ```
   - Update user invalidation
     - File: `/var/www/event-manager/src/services/UserService.ts`
     ```typescript
     async updateUser(userId: string, data: any) {
       const user = await prisma.user.update({
         where: { id: userId },
         data,
       });

       // Invalidate cache
       const cacheService = container.resolve(CacheService);
       await cacheService.delete(`user:${userId}`);

       return user;
     }

     async changePassword(userId: string, newPassword: string) {
       const hashedPassword = await bcrypt.hash(newPassword, 12);

       const user = await prisma.user.update({
         where: { id: userId },
         data: {
           password: hashedPassword,
           sessionVersion: { increment: 1 }, // Invalidate all sessions
         },
       });

       // Invalidate cache
       const cacheService = container.resolve(CacheService);
       await cacheService.delete(`user:${userId}`);

       return user;
     }
     ```

4. **Query Result Caching (2 days)**
   - Add caching to expensive queries
     - File: `/var/www/event-manager/src/services/ResultsService.ts`
     ```typescript
     async getCategoryResults(categoryId: string, forceRefresh: boolean = false) {
       const cacheKey = `results:category:${categoryId}`;
       const cacheService = container.resolve(CacheService);

       if (!forceRefresh) {
         const cached = await cacheService.get(cacheKey);
         if (cached) {
           logger.debug(`Cache hit: ${cacheKey}`);
           return cached;
         }
       }

       // Expensive database query
       const results = await this.calculateCategoryResults(categoryId);

       // Cache for 5 minutes
       await cacheService.set(cacheKey, results, 300);

       return results;
     }

     async invalidateCategoryResults(categoryId: string) {
       const cacheService = container.resolve(CacheService);
       await cacheService.delete(`results:category:${categoryId}`);
     }
     ```
   - Add caching to other expensive operations
     - Event listings with filters
     - Dashboard statistics
     - Report generation (partial results)

5. **HTTP Response Caching Middleware (1 day)**
   - Create middleware for cacheable GET requests
     - File: `/var/www/event-manager/src/middleware/httpCache.ts`
     ```typescript
     import { Request, Response, NextFunction } from 'express';
     import { container } from 'tsyringe';
     import { CacheService } from '../services/CacheService';
     import crypto from 'crypto';

     export const cacheMiddleware = (ttl: number = 300) => {
       return async (req: Request, res: Response, next: NextFunction) => {
         // Only cache GET requests
         if (req.method !== 'GET') {
           return next();
         }

         // Generate cache key from URL and query params
         const cacheKey = `http:${req.originalUrl}`;
         const cacheService = container.resolve(CacheService);

         // Check cache
         const cached = await cacheService.get<CachedResponse>(cacheKey);
         if (cached) {
           res.set('X-Cache', 'HIT');
           res.set(cached.headers);
           return res.status(cached.status).json(cached.body);
         }

         // Cache miss - intercept response
         const originalJson = res.json.bind(res);
         res.json = (body: any) => {
           // Store response in cache
           const cachedResponse: CachedResponse = {
             status: res.statusCode,
             headers: {
               'Content-Type': 'application/json',
             },
             body,
           };

           cacheService.set(cacheKey, cachedResponse, ttl);

           res.set('X-Cache', 'MISS');
           return originalJson(body);
         };

         next();
       };
     };

     interface CachedResponse {
       status: number;
       headers: Record<string, string>;
       body: any;
     }
     ```
   - Apply to appropriate routes
     - File: `/var/www/event-manager/src/routes/resultsRoutes.ts`
     ```typescript
     import { cacheMiddleware } from '../middleware/httpCache';

     router.get('/results/:categoryId',
       authenticate,
       cacheMiddleware(300), // Cache for 5 minutes
       resultsController.getCategoryResults
     );
     ```

6. **Socket.IO Redis Adapter (0.5 days)**
   - Enable multi-server WebSocket support
     - File: `/var/www/event-manager/src/server.ts`
     ```typescript
     import { createAdapter } from '@socket.io/redis-adapter';
     import { createClient } from 'redis';

     // Create Redis clients for Socket.IO adapter
     const pubClient = createClient({
       url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
     });
     const subClient = pubClient.duplicate();

     await Promise.all([pubClient.connect(), subClient.connect()]);

     io.adapter(createAdapter(pubClient, subClient));

     logger.info('Socket.IO Redis adapter configured');
     ```

7. **Cache Warming on Startup (1 day)**
   - Pre-load critical data
     - File: `/var/www/event-manager/src/jobs/cacheWarmingJob.ts`
     ```typescript
     import { container } from 'tsyringe';
     import { CacheService } from '../services/CacheService';
     import { PrismaClient } from '@prisma/client';
     import logger from '../utils/logger';

     export async function warmCache() {
       logger.info('Starting cache warming...');
       const cacheService = container.resolve(CacheService);
       const prisma = container.resolve<PrismaClient>('PrismaClient');

       try {
         // Warm active events
         const activeEvents = await prisma.event.findMany({
           where: {
             archived: false,
             endDate: { gte: new Date() },
           },
           include: {
             contests: {
               include: {
                 categories: true,
               },
             },
           },
         });

         for (const event of activeEvents) {
           await cacheService.set(`event:${event.id}`, event, 3600);
         }

         logger.info(`Warmed ${activeEvents.length} active events`);

         // Warm system settings
         const settings = await prisma.systemSetting.findMany();
         await cacheService.set('settings:all', settings, 3600);

         logger.info('Cache warming completed');
       } catch (error) {
         logger.error('Cache warming failed:', error);
       }
     }
     ```
   - Call on server startup
     - File: `/var/www/event-manager/src/server.ts`
     ```typescript
     import { warmCache } from './jobs/cacheWarmingJob';

     async function startServer() {
       // ... other initialization

       // Warm cache
       await warmCache();

       app.listen(PORT, () => {
         logger.info(`Server started on port ${PORT}`);
       });
     }
     ```

8. **Cache Monitoring Endpoint (0.5 days)**
   - Add cache statistics endpoint
     - File: `/var/www/event-manager/src/controllers/cacheController.ts`
     ```typescript
     import { container } from 'tsyringe';
     import { CacheService } from '../services/CacheService';

     export const cacheController = {
       async getStats(req: Request, res: Response) {
         const cacheService = container.resolve(CacheService);
         const stats = cacheService.getStats();

         res.json({
           success: true,
           data: stats,
         });
       },

       async flush(req: Request, res: Response) {
         const cacheService = container.resolve(CacheService);
         await cacheService.flush();

         res.json({
           success: true,
           message: 'Cache flushed successfully',
         });
       },

       async invalidatePattern(req: Request, res: Response) {
         const { pattern } = req.body;
         const cacheService = container.resolve(CacheService);

         const deleted = await cacheService.deletePattern(pattern);

         res.json({
           success: true,
           data: { deleted },
         });
       },
     };
     ```

#### File Changes Required

**New Files:**
- `/var/www/event-manager/src/services/CacheService.ts`
- `/var/www/event-manager/src/middleware/httpCache.ts`
- `/var/www/event-manager/src/jobs/cacheWarmingJob.ts`
- `/var/www/event-manager/docker-compose.yml` (if doesn't exist) or update existing

**Modified Files:**
- `/var/www/event-manager/src/middleware/auth.ts` (use Redis cache)
- `/var/www/event-manager/src/services/UserService.ts` (cache invalidation)
- `/var/www/event-manager/src/services/ResultsService.ts` (query caching)
- `/var/www/event-manager/src/services/EventService.ts` (query caching)
- `/var/www/event-manager/src/controllers/cacheController.ts` (add stats endpoints)
- `/var/www/event-manager/src/routes/resultsRoutes.ts` (add cache middleware)
- `/var/www/event-manager/src/server.ts` (Socket.IO adapter, cache warming)
- `/var/www/event-manager/.env` (add Redis config)
- `/var/www/event-manager/package.json` (add dependencies)

#### Dependencies
- Redis server running (Docker or standalone)
- Used by P1-002 (virus scanning job queue)

#### Effort Estimate
**8 developer days** (2 weeks with 1 developer)

#### Priority
**HIGH** - Performance improvement, enables horizontal scaling

#### Risk Assessment
**Risk Level:** Medium

**Risks:**
1. **Redis Unavailable:** App becomes slow/unusable if Redis down
   - *Mitigation:* Graceful degradation - continue without cache if Redis unavailable
2. **Cache Invalidation Bugs:** Stale data served to users
   - *Mitigation:* Conservative TTLs, comprehensive invalidation on mutations
3. **Memory Usage:** Redis consumes significant memory
   - *Mitigation:* Monitor memory usage, implement cache eviction policies (LRU)

#### Testing Strategy
- Test cache hit/miss scenarios
- Verify cache invalidation on data updates
- Load test with and without Redis
- Test graceful degradation when Redis unavailable
- Verify Socket.IO works across multiple servers

#### Rollback Plan
- Remove Redis adapter from Socket.IO (single-server only)
- Remove cache middleware from routes
- Keep in-memory user cache
- Stop Redis container
- No database changes needed

---

### 3.5 Performance Monitoring (APM) (P1-005)

#### Current State
- Basic Prometheus metrics exposed at `/metrics`
- Performance logs in database
- No distributed tracing
- No error tracking aggregation
- No user session replay
- No frontend performance monitoring
- Manual log analysis

#### Desired End State
- Comprehensive APM with Datadog or New Relic
- Distributed tracing across services
- Error tracking and aggregation (Sentry)
- User session replay (LogRocket or FullStory)
- Frontend performance monitoring (Lighthouse CI)
- Real-time alerting on performance degradation
- Performance budgets enforced in CI

#### Technical Approach

**Technologies:**
- **APM:** Datadog APM or New Relic (recommendation: Datadog for better Node.js support)
- **Error Tracking:** Sentry
- **Frontend Monitoring:** Lighthouse CI
- **Session Replay:** LogRocket (optional, privacy considerations)

**Architecture Changes:**
- Add Datadog APM agent
- Instrument critical code paths
- Add Sentry error tracking
- Configure frontend performance budgets
- Create alerting rules

#### Implementation Steps

1. **Datadog APM Setup (1 day)**
   - Sign up for Datadog account
   - Install dd-trace
     ```bash
     npm install dd-trace
     ```
   - Create Datadog initialization file
     - File: `/var/www/event-manager/src/config/datadog.ts`
     ```typescript
     import tracer from 'dd-trace';

     export function initializeDatadog() {
       if (process.env.NODE_ENV === 'production') {
         tracer.init({
           service: 'event-manager-backend',
           env: process.env.NODE_ENV,
           version: process.env.APP_VERSION || '1.0.0',
           logInjection: true,
           analytics: true,
           runtimeMetrics: true,
           profiling: true,
         });

         tracer.use('http', {
           service: 'event-manager-http',
         });

         tracer.use('express', {
           service: 'event-manager-api',
           analytics: true,
         });

         tracer.use('ioredis', {
           service: 'event-manager-redis',
         });

         tracer.use('pg', {
           service: 'event-manager-postgres',
         });

         console.log('Datadog APM initialized');
       }
     }
     ```
   - Initialize in server (must be before other imports)
     - File: `/var/www/event-manager/src/server.ts`
     ```typescript
     // MUST be first import
     import { initializeDatadog } from './config/datadog';
     initializeDatadog();

     // Then other imports
     import express from 'express';
     // ...rest of imports
     ```
   - Add environment variables
     ```env
     DD_API_KEY=your-datadog-api-key
     DD_AGENT_HOST=localhost
     DD_AGENT_PORT=8126
     DD_SERVICE=event-manager-backend
     DD_ENV=production
     DD_VERSION=1.0.0
     ```

2. **Custom Instrumentation (1.5 days)**
   - Add custom spans for critical operations
     - File: `/var/www/event-manager/src/services/ScoringService.ts`
     ```typescript
     import tracer from 'dd-trace';

     async calculateScores(categoryId: string) {
       const span = tracer.startSpan('scoring.calculate', {
         resource: 'ScoringService.calculateScores',
         tags: {
           'category.id': categoryId,
         },
       });

       try {
         // ... score calculation logic

         span.setTag('scores.count', scores.length);
         return scores;
       } catch (error) {
         span.setTag('error', true);
         span.setTag('error.message', error.message);
         throw error;
       } finally {
         span.finish();
       }
     }
     ```
   - Instrument other critical services
     - ResultsService
     - CertificationService
     - AuthService
     - ReportGenerationService

3. **Sentry Error Tracking (1 day)**
   - Install Sentry
     ```bash
     npm install @sentry/node @sentry/tracing @sentry/react
     ```
   - Configure backend Sentry
     - File: `/var/www/event-manager/src/config/sentry.ts`
     ```typescript
     import * as Sentry from '@sentry/node';
     import * as Tracing from '@sentry/tracing';
     import { Express } from 'express';

     export function initializeSentry(app: Express) {
       if (process.env.NODE_ENV === 'production') {
         Sentry.init({
           dsn: process.env.SENTRY_DSN,
           environment: process.env.NODE_ENV,
           release: process.env.APP_VERSION || '1.0.0',
           tracesSampleRate: 1.0,
           integrations: [
             new Sentry.Integrations.Http({ tracing: true }),
             new Tracing.Integrations.Express({ app }),
             new Tracing.Integrations.Postgres(),
           ],
         });

         // RequestHandler creates a separate execution context
         app.use(Sentry.Handlers.requestHandler());
         app.use(Sentry.Handlers.tracingHandler());

         console.log('Sentry initialized');
       }
     }

     export function setupSentryErrorHandler(app: Express) {
       // The error handler must be before any other error middleware
       app.use(Sentry.Handlers.errorHandler());
     }
     ```
   - Initialize in server
     - File: `/var/www/event-manager/src/server.ts`
     ```typescript
     import { initializeSentry, setupSentryErrorHandler } from './config/sentry';

     const app = express();

     initializeSentry(app);

     // ... middleware and routes

     // IMPORTANT: Add Sentry error handler before your own error handler
     setupSentryErrorHandler(app);
     app.use(errorHandler); // Your existing error handler
     ```
   - Configure frontend Sentry
     - File: `/var/www/event-manager/frontend/src/config/sentry.ts`
     ```typescript
     import * as Sentry from '@sentry/react';
     import { BrowserTracing } from '@sentry/tracing';

     export function initializeFrontendSentry() {
       if (import.meta.env.PROD) {
         Sentry.init({
           dsn: import.meta.env.VITE_SENTRY_DSN,
           environment: import.meta.env.MODE,
           release: import.meta.env.VITE_APP_VERSION,
           integrations: [
             new BrowserTracing(),
             new Sentry.Replay({
               maskAllText: true,
               blockAllMedia: true,
             }),
           ],
           tracesSampleRate: 1.0,
           replaysSessionSampleRate: 0.1,
           replaysOnErrorSampleRate: 1.0,
         });
       }
     }
     ```
   - Initialize in main.tsx
     - File: `/var/www/event-manager/frontend/src/main.tsx`
     ```typescript
     import { initializeFrontendSentry } from './config/sentry';

     initializeFrontendSentry();

     // ... rest of app initialization
     ```

4. **Frontend Performance Monitoring (1.5 days)**
   - Install Lighthouse CI
     ```bash
     npm install -D @lhci/cli
     ```
   - Create Lighthouse CI configuration
     - File: `/var/www/event-manager/frontend/lighthouserc.js`
     ```javascript
     module.exports = {
       ci: {
         collect: {
           startServerCommand: 'npm run preview',
           url: [
             'http://localhost:4173/',
             'http://localhost:4173/login',
             'http://localhost:4173/events',
             'http://localhost:4173/scoring',
           ],
           numberOfRuns: 3,
         },
         assert: {
           preset: 'lighthouse:recommended',
           assertions: {
             'categories:performance': ['error', { minScore: 0.9 }],
             'categories:accessibility': ['error', { minScore: 0.9 }],
             'categories:best-practices': ['error', { minScore: 0.9 }],
             'categories:seo': ['error', { minScore: 0.9 }],
             'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
             'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
             'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
             'total-blocking-time': ['error', { maxNumericValue: 300 }],
           },
         },
         upload: {
           target: 'temporary-public-storage',
         },
       },
     };
     ```
   - Add Lighthouse CI to GitHub Actions
     - File: `/var/www/event-manager/.github/workflows/lighthouse-ci.yml`
     ```yaml
     name: Lighthouse CI

     on:
       pull_request:
         branches: [main, node_react]

     jobs:
       lighthouse:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v3

           - name: Setup Node.js
             uses: actions/setup-node@v3
             with:
               node-version: '18'
               cache: 'npm'

           - name: Install dependencies
             run: npm ci
             working-directory: frontend

           - name: Build
             run: npm run build
             working-directory: frontend

           - name: Run Lighthouse CI
             run: |
               npm install -g @lhci/cli
               lhci autorun
             working-directory: frontend
             env:
               LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
     ```
   - Add Web Vitals tracking to frontend
     - File: `/var/www/event-manager/frontend/src/utils/webVitals.ts`
     ```typescript
     import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
     import * as Sentry from '@sentry/react';

     export function trackWebVitals() {
       getCLS((metric) => {
         Sentry.addBreadcrumb({
           category: 'web-vitals',
           message: 'CLS',
           data: metric,
         });
         console.log('CLS:', metric);
       });

       getFID((metric) => {
         Sentry.addBreadcrumb({
           category: 'web-vitals',
           message: 'FID',
           data: metric,
         });
         console.log('FID:', metric);
       });

       getFCP((metric) => {
         Sentry.addBreadcrumb({
           category: 'web-vitals',
           message: 'FCP',
           data: metric,
         });
         console.log('FCP:', metric);
       });

       getLCP((metric) => {
         Sentry.addBreadcrumb({
           category: 'web-vitals',
           message: 'LCP',
           data: metric,
         });
         console.log('LCP:', metric);
       });

       getTTFB((metric) => {
         Sentry.addBreadcrumb({
           category: 'web-vitals',
           message: 'TTFB',
           data: metric,
         });
         console.log('TTFB:', metric);
       });
     }
     ```
   - Initialize in main.tsx
     - File: `/var/www/event-manager/frontend/src/main.tsx`
     ```typescript
     import { trackWebVitals } from './utils/webVitals';

     trackWebVitals();
     ```

5. **Alerting Configuration (1 day)**
   - Create Datadog monitors
     - API response time > 2 seconds for 5 minutes
     - Error rate > 1% for 5 minutes
     - Database query time > 500ms for 5 minutes
     - Memory usage > 85% for 10 minutes
     - Redis cache hit rate < 70% for 15 minutes
   - Create Sentry alerts
     - New error types
     - Error count spike (>100 in 5 minutes)
     - Performance regression (>20% slower)
   - Configure notification channels
     - Email for critical alerts
     - Slack for warnings
     - PagerDuty for production incidents (optional)

6. **Dashboards Creation (0.5 days)**
   - Create Datadog dashboards
     - **Application Overview**
       - Request rate
       - Error rate
       - Response time (p50, p95, p99)
       - Active users
     - **Database Performance**
       - Query time
       - Connection pool usage
       - Slow queries
     - **Cache Performance**
       - Cache hit/miss rate
       - Cache memory usage
       - Cache evictions
     - **Business Metrics**
       - Events created
       - Scores submitted
       - Certifications completed
   - Create Sentry dashboards
     - Error frequency by type
     - Error distribution by user role
     - Browser/OS distribution
     - Release comparison

7. **Documentation (0.5 days)**
   - Create monitoring runbook
     - File: `/var/www/event-manager/docs/MONITORING.md`
     - How to access Datadog/Sentry
     - How to interpret metrics
     - Common issues and troubleshooting
     - Alerting escalation procedures

#### File Changes Required

**New Files:**
- `/var/www/event-manager/src/config/datadog.ts`
- `/var/www/event-manager/src/config/sentry.ts`
- `/var/www/event-manager/frontend/src/config/sentry.ts`
- `/var/www/event-manager/frontend/src/utils/webVitals.ts`
- `/var/www/event-manager/frontend/lighthouserc.js`
- `/var/www/event-manager/.github/workflows/lighthouse-ci.yml`
- `/var/www/event-manager/docs/MONITORING.md`

**Modified Files:**
- `/var/www/event-manager/src/server.ts` (initialize Datadog & Sentry)
- `/var/www/event-manager/frontend/src/main.tsx` (initialize Sentry & Web Vitals)
- `/var/www/event-manager/src/services/*.ts` (add custom spans)
- `/var/www/event-manager/.env` (add monitoring config)
- `/var/www/event-manager/package.json` (add dependencies)
- `/var/www/event-manager/frontend/package.json` (add dependencies)

#### Dependencies
- Datadog account (paid service)
- Sentry account (free tier available)
- GitHub repository for Lighthouse CI

#### Effort Estimate
**7 developer days** (1.5 weeks with 1 developer)

#### Priority
**HIGH** - Critical for production visibility

#### Risk Assessment
**Risk Level:** Low

**Risks:**
1. **Cost:** Datadog/Sentry can be expensive at scale
   - *Mitigation:* Start with smaller plans, use sampling for traces
2. **Performance Impact:** APM adds small overhead
   - *Mitigation:* Negligible with modern APM tools (<1% overhead)
3. **Privacy Concerns:** Session replay may record sensitive data
   - *Mitigation:* Use masking, disable for sensitive pages, review privacy policy

#### Testing Strategy
- Verify traces appear in Datadog
- Trigger test errors and verify in Sentry
- Run Lighthouse CI on PR
- Test alerting with simulated issues

#### Rollback Plan
- Remove Datadog initialization (remove tracer.init())
- Remove Sentry initialization
- Disable Lighthouse CI workflow
- No database changes needed
- Can be removed without affecting functionality

---

## 3.6 Phase 1 Summary

**Total Effort:** 60 developer days (3 months with 2 developers)

**Deliverables:**
1. ✅ 80%+ test coverage (backend & frontend)
2. ✅ Virus scanning for all file uploads
3. ✅ Secrets stored in AWS Secrets Manager/Vault
4. ✅ Redis distributed caching deployed
5. ✅ Comprehensive APM with Datadog & Sentry

**Success Criteria:**
- All tests passing with coverage ≥80% backend, ≥70% frontend
- Zero malware uploads reaching production storage
- Zero secrets in .env file
- Cache hit rate ≥70% for user authentication
- Mean time to detection (MTTD) for errors <5 minutes

**Key Milestones:**
- Week 2: Testing infrastructure complete
- Week 4: Virus scanning operational
- Week 6: Secrets management deployed
- Week 8: Redis caching operational
- Week 10: APM fully configured

**Risk Mitigation:**
- Start with highest ROI items (testing, virus scanning)
- Run tasks in parallel where possible
- Have rollback plans for each change
- Deploy to staging first

**Parallel Work Opportunities:**
- Testing (P1-001) and APM (P1-005) can run in parallel
- Virus scanning (P1-002) and Secrets management (P1-003) can run in parallel
- Redis caching (P1-004) can run once P1-002 complete (shares Redis)

---

## 4. Phase 2: Core Enhancements

### 4.1 Accessibility Improvements (WCAG 2.1 AA) (P2-001)

#### Current State
- Basic HTML semantics
- Limited ARIA labels
- No skip links
- Inconsistent keyboard navigation
- No focus management in modals
- Color contrast issues in some areas
- No screen reader announcements for dynamic content

#### Desired End State
- Full WCAG 2.1 AA compliance
- Comprehensive ARIA labels and roles
- Skip links on all pages
- Full keyboard navigation
- Proper focus management
- Minimum 4.5:1 color contrast for text
- Screen reader announcements for all dynamic updates
- Accessible forms with proper error messaging

#### Technical Approach

**Technologies:**
- **axe-core:** Accessibility testing
- **react-aria:** Accessible React components
- **focus-trap-react:** Focus management for modals
- **pa11y:** Automated accessibility testing in CI

**Tools:**
- **WAVE:** Browser extension for manual testing
- **axe DevTools:** Chrome extension for testing
- **NVDA/JAWS:** Screen reader testing

#### Implementation Steps

1. **Audit Current Accessibility (1 day)**
   - Run axe-core automated scan
   - Manual testing with screen readers (NVDA, JAWS, VoiceOver)
   - Document issues by severity
   - Create prioritized fix list

2. **Color Contrast Fixes (1 day)**
   - Audit all color combinations
   - Update Tailwind theme with WCAG AA compliant colors
     - File: `/var/www/event-manager/frontend/tailwind.config.js`
     ```javascript
     module.exports = {
       theme: {
         extend: {
           colors: {
             // Update with WCAG AA compliant colors
             primary: {
               50: '#f0f9ff',
               100: '#e0f2fe',
               200: '#bae6fd',
               300: '#7dd3fc',
               400: '#38bdf8',
               500: '#0ea5e9',  // Must have 4.5:1 contrast on white
               600: '#0284c7',
               700: '#0369a1',
               800: '#075985',
               900: '#0c4a6e',
             },
             // ... other colors
           },
         },
       },
     };
     ```
   - Test all button states (default, hover, focus, disabled)
   - Ensure link colors meet contrast requirements

3. **Semantic HTML & ARIA Labels (2 days)**
   - Update components with proper semantic HTML
     - Replace `<div>` with `<main>`, `<nav>`, `<aside>`, `<article>`, `<section>`
     - File: `/var/www/event-manager/frontend/src/components/Layout.tsx`
     ```tsx
     export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
       return (
         <div className="min-h-screen flex flex-col">
           <a href="#main-content" className="sr-only focus:not-sr-only">
             Skip to main content
           </a>

           <header role="banner">
             <TopNavigation aria-label="Main navigation" />
           </header>

           <div className="flex flex-1">
             <aside role="complementary" aria-label="Sidebar">
               <PageSidebar />
             </aside>

             <main id="main-content" role="main" tabIndex={-1}>
               {children}
             </main>
           </div>

           <footer role="contentinfo">
             <Footer />
           </footer>
         </div>
       );
     };
     ```
   - Add ARIA labels to all interactive elements
     - File: `/var/www/event-manager/frontend/src/components/DataTable.tsx`
     ```tsx
     <table role="table" aria-label="Events table">
       <thead>
         <tr role="row">
           <th role="columnheader" scope="col" aria-sort={sortDirection}>
             Event Name
           </th>
           {/* ... other headers */}
         </tr>
       </thead>
       <tbody>
         {data.map((row, index) => (
           <tr key={row.id} role="row">
             <td role="cell">{row.name}</td>
             {/* ... other cells */}
             <td role="cell">
               <button
                 aria-label={`Edit ${row.name}`}
                 onClick={() => handleEdit(row.id)}
               >
                 Edit
               </button>
               <button
                 aria-label={`Delete ${row.name}`}
                 onClick={() => handleDelete(row.id)}
               >
                 Delete
               </button>
             </td>
           </tr>
         ))}
       </tbody>
     </table>
     ```

4. **Keyboard Navigation (2 days)**
   - Implement keyboard shortcuts
     - File: `/var/www/event-manager/frontend/src/hooks/useKeyboardShortcuts.ts`
     ```typescript
     import { useEffect } from 'react';

     export function useKeyboardShortcuts() {
       useEffect(() => {
         const handleKeyPress = (e: KeyboardEvent) => {
           // Skip if typing in input
           if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
             return;
           }

           // Alt+1-9 for quick navigation
           if (e.altKey && e.key >= '1' && e.key <= '9') {
             e.preventDefault();
             const index = parseInt(e.key) - 1;
             const navItems = document.querySelectorAll('[data-nav-item]');
             if (navItems[index]) {
               (navItems[index] as HTMLElement).focus();
               (navItems[index] as HTMLElement).click();
             }
           }

           // Escape to close modal
           if (e.key === 'Escape') {
             const openModal = document.querySelector('[role="dialog"][aria-modal="true"]');
             if (openModal) {
               const closeButton = openModal.querySelector('[aria-label="Close"]') as HTMLElement;
               closeButton?.click();
             }
           }

           // Ctrl+/ or ? to open command palette
           if ((e.ctrlKey && e.key === '/') || e.key === '?') {
             e.preventDefault();
             // Open command palette
           }
         };

         document.addEventListener('keydown', handleKeyPress);
         return () => document.removeEventListener('keydown', handleKeyPress);
       }, []);
     }
     ```
   - Ensure all interactive elements are keyboard accessible
   - Add visual focus indicators
     - File: `/var/www/event-manager/frontend/src/index.css`
     ```css
     /* Enhanced focus indicators */
     *:focus-visible {
       outline: 2px solid theme('colors.primary.500');
       outline-offset: 2px;
       border-radius: 2px;
     }

     /* Remove default outline */
     *:focus {
       outline: none;
     }

     /* Skip link styles */
     .sr-only {
       position: absolute;
       width: 1px;
       height: 1px;
       padding: 0;
       margin: -1px;
       overflow: hidden;
       clip: rect(0, 0, 0, 0);
       white-space: nowrap;
       border-width: 0;
     }

     .sr-only:focus,
     .sr-only:active {
       position: static;
       width: auto;
       height: auto;
       padding: 0.5rem 1rem;
       margin: 0;
       overflow: visible;
       clip: auto;
       white-space: normal;
       background-color: theme('colors.primary.500');
       color: white;
       z-index: 999;
     }
     ```

5. **Focus Management (1.5 days)**
   - Install focus-trap-react: `npm install focus-trap-react`
   - Update Modal component
     - File: `/var/www/event-manager/frontend/src/components/Modal.tsx`
     ```tsx
     import FocusTrap from 'focus-trap-react';
     import { useEffect, useRef } from 'react';

     interface ModalProps {
       isOpen: boolean;
       onClose: () => void;
       title: string;
       children: React.ReactNode;
     }

     export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
       const previousFocusRef = useRef<HTMLElement | null>(null);
       const closeButtonRef = useRef<HTMLButtonElement>(null);

       useEffect(() => {
         if (isOpen) {
           // Store previously focused element
           previousFocusRef.current = document.activeElement as HTMLElement;

           // Focus close button when modal opens
           setTimeout(() => {
             closeButtonRef.current?.focus();
           }, 100);
         } else {
           // Restore focus when modal closes
           previousFocusRef.current?.focus();
         }
       }, [isOpen]);

       if (!isOpen) return null;

       return (
         <FocusTrap active={isOpen}>
           <div
             role="dialog"
             aria-modal="true"
             aria-labelledby="modal-title"
             className="fixed inset-0 z-50 overflow-y-auto"
           >
             <div className="flex items-center justify-center min-h-screen p-4">
               <div
                 className="fixed inset-0 bg-black bg-opacity-50"
                 onClick={onClose}
                 aria-hidden="true"
               />

               <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
                 <div className="flex items-center justify-between mb-4">
                   <h2 id="modal-title" className="text-2xl font-bold">
                     {title}
                   </h2>
                   <button
                     ref={closeButtonRef}
                     onClick={onClose}
                     aria-label="Close modal"
                     className="text-gray-500 hover:text-gray-700"
                   >
                     <span aria-hidden="true">×</span>
                   </button>
                 </div>

                 <div>{children}</div>
               </div>
             </div>
           </div>
         </FocusTrap>
       );
     };
     ```
   - Update other overlay components (dropdowns, tooltips)

6. **Screen Reader Announcements (1.5 days)**
   - Create live region component
     - File: `/var/www/event-manager/frontend/src/components/LiveRegion.tsx`
     ```tsx
     import { useEffect, useRef } from 'react';

     interface LiveRegionProps {
       message: string;
       role?: 'status' | 'alert';
       'aria-live'?: 'polite' | 'assertive';
     }

     export const LiveRegion: React.FC<LiveRegionProps> = ({
       message,
       role = 'status',
       'aria-live': ariaLive = 'polite',
     }) => {
       return (
         <div
           role={role}
           aria-live={ariaLive}
           aria-atomic="true"
           className="sr-only"
         >
           {message}
         </div>
       );
     };

     // Hook for announcing messages
     export function useAnnouncement() {
       const [announcement, setAnnouncement] = useState('');

       const announce = (message: string) => {
         setAnnouncement('');
         setTimeout(() => setAnnouncement(message), 100);
       };

       return { announcement, announce };
     }
     ```
   - Add announcements for dynamic content updates
     - File: `/var/www/event-manager/frontend/src/pages/ScoringPage.tsx`
     ```tsx
     const { announcement, announce } = useAnnouncement();

     const handleScoreSubmit = async () => {
       try {
         await submitScore(score);
         announce('Score submitted successfully');
         toast.success('Score submitted');
       } catch (error) {
         announce('Error submitting score. Please try again.');
         toast.error('Failed to submit score');
       }
     };

     return (
       <>
         <LiveRegion message={announcement} />
         {/* ... rest of component */}
       </>
     );
     ```

7. **Form Accessibility (1.5 days)**
   - Update form components with proper labels and error handling
     - File: `/var/www/event-manager/frontend/src/components/FormField.tsx`
     ```tsx
     interface FormFieldProps {
       label: string;
       name: string;
       type?: string;
       required?: boolean;
       error?: string;
       helpText?: string;
       value: any;
       onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
     }

     export const FormField: React.FC<FormFieldProps> = ({
       label,
       name,
       type = 'text',
       required = false,
       error,
       helpText,
       value,
       onChange,
     }) => {
       const inputId = `field-${name}`;
       const errorId = `${inputId}-error`;
       const helpId = `${inputId}-help`;

       return (
         <div className="form-field">
           <label htmlFor={inputId} className="block font-medium mb-1">
             {label}
             {required && <span aria-label="required" className="text-red-500">*</span>}
           </label>

           {helpText && (
             <p id={helpId} className="text-sm text-gray-600 mb-1">
               {helpText}
             </p>
           )}

           <input
             id={inputId}
             name={name}
             type={type}
             required={required}
             value={value}
             onChange={onChange}
             aria-invalid={!!error}
             aria-describedby={`${error ? errorId : ''} ${helpText ? helpId : ''}`.trim()}
             className={`w-full px-3 py-2 border rounded ${
               error ? 'border-red-500' : 'border-gray-300'
             }`}
           />

           {error && (
             <p id={errorId} role="alert" className="text-red-500 text-sm mt-1">
               {error}
             </p>
           )}
         </div>
       );
     };
     ```
   - Ensure all forms use proper fieldset/legend for groups
   - Add aria-required to required fields

8. **Automated Testing (1 day)**
   - Install axe-core: `npm install -D @axe-core/react jest-axe`
   - Add accessibility tests
     - File: `/var/www/event-manager/frontend/src/components/__tests__/Modal.test.tsx`
     ```typescript
     import { render } from '@testing-library/react';
     import { axe, toHaveNoViolations } from 'jest-axe';
     import { Modal } from '../Modal';

     expect.extend(toHaveNoViolations);

     describe('Modal Accessibility', () => {
       it('should have no accessibility violations', async () => {
         const { container } = render(
           <Modal isOpen={true} onClose={() => {}} title="Test Modal">
             <p>Modal content</p>
           </Modal>
         );

         const results = await axe(container);
         expect(results).toHaveNoViolations();
       });

       it('should trap focus within modal', () => {
         // ... focus trap test
       });

       it('should return focus on close', () => {
         // ... focus restoration test
       });
     });
     ```
   - Add pa11y to CI
     - File: `/var/www/event-manager/.github/workflows/accessibility.yml`
     ```yaml
     name: Accessibility Tests

     on: [push, pull_request]

     jobs:
       a11y:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v3

           - name: Setup Node.js
             uses: actions/setup-node@v3
             with:
               node-version: '18'

           - name: Install dependencies
             run: npm ci
             working-directory: frontend

           - name: Build
             run: npm run build
             working-directory: frontend

           - name: Run pa11y
             run: |
               npm install -g pa11y-ci
               pa11y-ci --config .pa11yci.json
             working-directory: frontend
     ```
   - Create pa11y configuration
     - File: `/var/www/event-manager/frontend/.pa11yci.json`
     ```json
     {
       "defaults": {
         "standard": "WCAG2AA",
         "timeout": 10000,
         "wait": 500,
         "chromeLaunchConfig": {
           "args": ["--no-sandbox"]
         }
       },
       "urls": [
         "http://localhost:4173/",
         "http://localhost:4173/login",
         "http://localhost:4173/events"
       ]
     }
     ```

9. **Documentation (0.5 days)**
   - Create accessibility guide
     - File: `/var/www/event-manager/docs/ACCESSIBILITY.md`
     - WCAG 2.1 AA compliance statement
     - Keyboard shortcuts reference
     - Screen reader support
     - How to report accessibility issues

#### File Changes Required

**New Files:**
- `/var/www/event-manager/frontend/src/hooks/useKeyboardShortcuts.ts`
- `/var/www/event-manager/frontend/src/components/LiveRegion.tsx`
- `/var/www/event-manager/frontend/src/hooks/useAnnouncement.ts`
- `/var/www/event-manager/.github/workflows/accessibility.yml`
- `/var/www/event-manager/frontend/.pa11yci.json`
- `/var/www/event-manager/docs/ACCESSIBILITY.md`

**Modified Files:**
- `/var/www/event-manager/frontend/tailwind.config.js` (color updates)
- `/var/www/event-manager/frontend/src/components/Layout.tsx` (semantic HTML)
- `/var/www/event-manager/frontend/src/components/Modal.tsx` (focus trap)
- `/var/www/event-manager/frontend/src/components/DataTable.tsx` (ARIA labels)
- `/var/www/event-manager/frontend/src/components/FormField.tsx` (proper labels)
- `/var/www/event-manager/frontend/src/index.css` (focus styles)
- `/var/www/event-manager/frontend/package.json` (add dependencies)
- All page components (add skip links, ARIA labels, keyboard shortcuts)

#### Dependencies
None

#### Effort Estimate
**12 developer days** (3 weeks with 1 developer)

#### Priority
**MEDIUM** - Important for compliance and usability

#### Risk Assessment
**Risk Level:** Low

**Risks:**
1. **Testing Coverage:** Hard to test all accessibility scenarios
   - *Mitigation:* Combine automated testing (axe, pa11y) with manual testing
2. **Breaking Changes:** Focus management may conflict with existing UX
   - *Mitigation:* Test thoroughly, allow opt-out for power users
3. **Performance:** Focus trap and announcements may add overhead
   - *Mitigation:* Minimal impact, debounce announcements

#### Testing Strategy
- Automated testing with axe-core and pa11y
- Manual testing with screen readers (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation testing
- Color contrast verification with tools
- Test with users who have disabilities (if possible)

#### Rollback Plan
- Remove focus trap from modals
- Remove skip links
- Revert color changes
- No database changes

---

Due to length constraints, I'll create the comprehensive plan with all sections but summarize the remaining Phase 2-4 items in a structured format. Let me continue the document.


### 4.2 Remaining Phase 2 Enhancements (Summary)

Due to the comprehensive nature of the plan, the remaining Phase 2-4 enhancements are summarized below with key details. Each follows the same detailed implementation pattern as Phase 1 items.

#### P2-002: Offline Capabilities (PWA) - 10 days
- **Service worker implementation** for offline functionality
- **IndexedDB** for local data storage
- **Background sync** for queuing offline actions
- **Install prompt** for PWA installation
- **Offline indicator** and queue status display

#### P2-003: Mobile Experience Enhancement - 5 days
- **Swipe gestures** for navigation (react-swipeable)
- **Pull-to-refresh** on list views
- **Mobile-optimized tables** with horizontal scroll
- **Touch-friendly** controls (44px+ tap targets)
- **Bottom sheets** for mobile modals

#### P2-004: User Onboarding - 6 days
- **Interactive tour** with Shepherd.js
- **Contextual tooltips** with Tippy.js
- **Empty state** illustrations with call-to-actions
- **Video tutorials** embedded in help pages
- **Progress tracking** for onboarding completion

#### P2-005: Data Visualization - 8 days
- **Chart.js integration** for score distributions
- **Progress indicators** for workflows
- **Heatmaps** for judge scoring patterns (D3.js)
- **Dashboard widgets** with drag-and-drop (react-grid-layout)
- **Export charts** to PNG/PDF

#### P2-006: Database Optimizations - 8 days
- **Slow query logging** and analysis
- **Index optimization** based on query patterns
- **Query result caching** with Redis
- **Database connection pooling** tuning
- **Read replicas** configuration (optional)

#### P2-007: Background Job Processing - 8 days
- **Bull/BullMQ** job queue setup
- **Async report generation** jobs
- **Email sending** queue
- **Export generation** background processing
- **Job monitoring** dashboard

**Phase 2 Total Effort:** 57 days (includes P2-001: 12 days)

---

## 5. Phase 3: Advanced Features

### 5.1 Advanced Authentication (P3-001) - 10 days

**Multi-Factor Authentication (MFA)**
- **TOTP support** (Time-based One-Time Password)
- **SMS-based MFA** (optional)
- **Backup codes** generation
- **WebAuthn** (FIDO2) for biometric authentication

**SSO Integration**
- **OAuth 2.0** providers (Google, Microsoft, GitHub)
- **SAML 2.0** for enterprise SSO
- **LDAP/Active Directory** integration

**Refresh Tokens**
- **Long-lived refresh tokens** for better UX
- **Token rotation** on refresh
- **Refresh token revocation** API
- **Device tracking** and management

### 5.2 Notification Center (P3-002) - 6 days

- **Persistent notification panel** with history
- **Notification preferences** per user
- **Email digest** option (daily/weekly)
- **In-app notifications** with action buttons
- **Push notifications** (Web Push API)
- **Notification templates** system

### 5.3 Bulk Operations Expansion (P3-003) - 6 days

- **Bulk event operations** (archive, delete, export)
- **Bulk contestant operations** (assign, score, certify)
- **Progress tracking** for bulk ops
- **Partial success handling** (some succeed, some fail)
- **Undo for bulk operations** (within time window)

### 5.4 Workflow Customization (P3-004) - 10 days

- **Configurable certification workflows** (skip/reorder stages)
- **Custom approval workflows** with visual editor
- **Conditional workflows** based on thresholds
- **Workflow templates** library
- **Workflow audit trail**

### 5.5 API Access & Webhooks (P3-005) - 9 days

- **API key management** for external integrations
- **Webhook configuration** UI
- **Webhook delivery logs** and retry logic
- **Outgoing webhooks** for events (score_submitted, certification_completed)
- **Webhook signature verification**
- **Rate limiting** per API key
- **API documentation** (OpenAPI/Swagger)

### 5.6 Advanced Customization (P3-006) - 8 days

- **Custom CSS injection** for advanced users (sandboxed)
- **Dashboard widget customization** (show/hide, reorder)
- **Custom field visibility** per role
- **Default views** per user
- **Layout preferences** (sidebar position, compact mode)

### 5.7 Custom Fields (P3-007) - 10 days

**Database Schema**
```prisma
model CustomField {
  id          String   @id @default(cuid())
  entityType  String   // EVENT, CONTEST, CATEGORY, USER, CONTESTANT, JUDGE
  fieldName   String
  fieldType   String   // TEXT, NUMBER, DATE, DROPDOWN, CHECKBOX, FILE
  label       String
  helpText    String?
  required    Boolean  @default(false)
  options     Json?    // For DROPDOWN type
  validation  Json?    // Validation rules
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([entityType, fieldName])
  @@index([entityType, isActive])
}

model CustomFieldValue {
  id            String   @id @default(cuid())
  customFieldId String
  entityId      String   // ID of the entity (event, contest, etc.)
  value         Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  customField   CustomField @relation(fields: [customFieldId], references: [id], onDelete: Cascade)

  @@unique([customFieldId, entityId])
  @@index([entityId])
}
```

**Implementation**
- **Admin UI** for custom field management
- **Dynamic form rendering** based on custom fields
- **Validation** based on field type
- **API endpoints** for CRUD operations
- **Search/filter** by custom field values

**Phase 3 Total Effort:** 59 days

---

## 6. Phase 4: Scaling & Enterprise

### 6.1 Multi-Tenancy Architecture (P4-001) - 20 days

**Schema-per-Tenant Approach** (Recommended)

**Architecture Design**
```
┌─────────────────────────────────────────────┐
│          Application Layer                  │
│  (Single codebase, multi-tenant aware)      │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│       Tenant Middleware                     │
│  (Identifies tenant from subdomain/header)  │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│       Tenant Context                        │
│  (Switches database connection)             │
└────────────────┬────────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
┌────────▼────────┐ ┌───▼──────────────┐
│  Tenant A DB    │ │  Tenant B DB     │
│  (PostgreSQL)   │ │  (PostgreSQL)    │
└─────────────────┘ └──────────────────┘
```

**Implementation Steps**

1. **Tenant Model & Management (3 days)**
   ```prisma
   model Tenant {
     id              String   @id @default(cuid())
     name            String
     subdomain       String   @unique
     domain          String?  @unique
     databaseUrl     String   // Connection string to tenant database
     isActive        Boolean  @default(true)
     plan            String   @default("FREE") // FREE, PRO, ENTERPRISE
     maxUsers        Int?
     maxEvents       Int?
     features        Json     // Feature flags per tenant
     createdAt       DateTime @default(now())
     updatedAt       DateTime @updatedAt
     
     settings        TenantSettings?
   }

   model TenantSettings {
     id                String   @id @default(cuid())
     tenantId          String   @unique
     branding          Json     // Logo, colors, fonts
     customDomain      String?
     emailSettings     Json
     notificationRules Json
     
     tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
   }
   ```

2. **Tenant Middleware (2 days)**
   - File: `/var/www/event-manager/src/middleware/tenantIdentification.ts`
   ```typescript
   export const identifyTenant = async (req, res, next) => {
     try {
       // Extract tenant identifier from subdomain or custom domain
       const host = req.get('host') || '';
       const subdomain = extractSubdomain(host);
       
       // Look up tenant
       const tenant = await prisma.tenant.findFirst({
         where: {
           OR: [
             { subdomain },
             { domain: host }
           ],
           isActive: true
         }
       });

       if (!tenant) {
         return res.status(404).json({
           error: 'Tenant not found',
           message: 'The requested organization does not exist'
         });
       }

       // Store tenant in request
       req.tenant = tenant;
       
       // Switch database connection for this request
       req.tenantPrisma = getTenantPrisma(tenant.databaseUrl);
       
       next();
     } catch (error) {
       logger.error('Tenant identification error:', error);
       res.status(500).json({ error: 'Internal server error' });
     }
   };
   ```

3. **Database Connection Pool per Tenant (4 days)**
   - File: `/var/www/event-manager/src/services/TenantDatabaseService.ts`
   ```typescript
   import { PrismaClient } from '@prisma/client';
   import { LRUCache } from 'lru-cache';

   class TenantDatabaseService {
     private connectionCache: LRUCache<string, PrismaClient>;
     
     constructor() {
       this.connectionCache = new LRUCache({
         max: 100, // Max 100 tenant connections cached
         ttl: 1000 * 60 * 60, // 1 hour TTL
         dispose: (value, key) => {
           value.$disconnect();
         }
       });
     }

     getTenantPrisma(databaseUrl: string): PrismaClient {
       let client = this.connectionCache.get(databaseUrl);
       
       if (!client) {
         client = new PrismaClient({
           datasources: {
             db: { url: databaseUrl }
           },
           log: ['error', 'warn']
         });
         
         this.connectionCache.set(databaseUrl, client);
       }
       
       return client;
     }

     async disconnectTenant(tenantId: string) {
       // Force disconnect and remove from cache
       const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
       if (tenant) {
         const client = this.connectionCache.get(tenant.databaseUrl);
         if (client) {
           await client.$disconnect();
           this.connectionCache.delete(tenant.databaseUrl);
         }
       }
     }

     async disconnectAll() {
       for (const [key, client] of this.connectionCache.entries()) {
         await client.$disconnect();
       }
       this.connectionCache.clear();
     }
   }

   export const tenantDbService = new TenantDatabaseService();
   ```

4. **Tenant Provisioning API (3 days)**
   - **Automated tenant creation** endpoint
   - **Database schema migration** per tenant
   - **Default data seeding** per tenant
   - **Subdomain validation** and availability check
   - **Tenant activation/deactivation**

5. **Tenant Admin Dashboard (4 days)**
   - **Tenant list** with status, plan, usage
   - **Create new tenant** form
   - **Tenant settings** management
   - **Usage metrics** per tenant (users, events, storage)
   - **Plan management** and limits enforcement
   - **Billing integration** hooks

6. **Multi-Tenant Testing (2 days)**
   - **Tenant isolation tests** (ensure data separation)
   - **Cross-tenant access tests** (should fail)
   - **Performance tests** with multiple tenants
   - **Connection pool tests** (ensure proper cleanup)

7. **Migration from Single-Tenant (2 days)**
   - **Data migration script** to move existing data to default tenant
   - **Tenant seeding** for existing installation
   - **Backward compatibility** mode (optional)

**Key Considerations**
- **Data Isolation:** Complete separation via schema-per-tenant
- **Performance:** Connection pooling critical for performance
- **Migrations:** Run migrations on all tenant databases
- **Backup:** Separate backup per tenant
- **Cost:** Higher database costs but better isolation

---

### 6.2 Event-Driven Architecture (P4-002) - 18 days

**Message Broker Selection:** RabbitMQ or Apache Kafka
- **RabbitMQ:** Better for complex routing, lower latency
- **Kafka:** Better for high throughput, event replay

**Architecture**
```
┌─────────────────────────────────────────────────┐
│            Application Services                 │
│  (EventService, ScoringService, etc.)           │
└───────────┬─────────────────────────────────────┘
            │
            │ publishes events
            ▼
┌───────────────────────────────────────────────────┐
│              Event Bus (RabbitMQ)                 │
│  Topics: event.created, score.submitted, etc.     │
└───────────┬─────────────────────────────────────┬─┘
            │                                     │
    consumes│                             consumes│
            ▼                                     ▼
┌───────────────────────┐         ┌───────────────────────┐
│  Notification Service │         │  Analytics Service    │
│  (sends emails, SMS)  │         │  (aggregates data)    │
└───────────────────────┘         └───────────────────────┘
```

**Event Types**
- `event.created`, `event.updated`, `event.deleted`
- `score.submitted`, `score.updated`, `score.certified`
- `certification.completed`, `certification.rejected`
- `user.created`, `user.role_changed`
- `report.generated`, `export.completed`

**Implementation**
1. **Event Bus Setup (2 days)**
2. **Event Publishing (4 days)** - Modify services to publish events
3. **Event Consumers (6 days)** - Create consumers for notifications, analytics
4. **Event Replay (2 days)** - Ability to replay events for debugging
5. **Event Monitoring (2 days)** - Dashboard for event flow
6. **Error Handling (2 days)** - Dead letter queue, retry logic

**Benefits**
- **Decoupling:** Services don't directly depend on each other
- **Scalability:** Async processing, horizontal scaling
- **Reliability:** Guaranteed delivery, retry logic
- **Audit Trail:** Complete event history

---

### 6.3 Database Sharding (P4-003) - 15 days

**Sharding Strategy:** Shard by Event ID

**Why Shard by Event?**
- Most queries are event-scoped
- Natural data partition boundary
- Events rarely span shards

**Architecture**
```
┌────────────────────────────────────────┐
│        Application Layer               │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│       Shard Router Middleware          │
│  (Determines shard from event ID)      │
└────────┬───────────────────────────┬───┘
         │                           │
         ▼                           ▼
┌────────────────┐         ┌────────────────┐
│  Shard 1 (DB1) │         │  Shard 2 (DB2) │
│  Events 1-1000 │         │  Events 1001+  │
└────────────────┘         └────────────────┘
```

**Implementation**
1. **Shard Configuration (2 days)**
   - Define shard mappings
   - Create ShardRegistry service
   
2. **Shard Router (3 days)**
   - Determine shard from event ID
   - Route queries to correct shard
   
3. **Cross-Shard Queries (4 days)**
   - Aggregate queries across shards
   - Pagination across shards
   
4. **Shard Rebalancing (3 days)**
   - Move events between shards
   - Online rebalancing (zero downtime)
   
5. **Monitoring & Alerting (2 days)**
   - Shard health monitoring
   - Unbalanced shard detection
   
6. **Testing (1 day)**
   - Query correctness across shards
   - Performance testing

**When to Implement:** Only when single database becomes bottleneck (>10M records)

---

### 6.4 Microservices Evaluation (P4-004) - 15 days

**Candidates for Microservices:**
1. **Notification Service** - High independence, different scaling needs
2. **Report Generation Service** - CPU-intensive, async processing
3. **Authentication Service** - Shared across all services

**Architecture (if pursuing microservices)**
```
┌─────────────────────────────────────────────────────┐
│                API Gateway (Kong/Nginx)             │
└─────┬─────────────┬──────────────┬──────────────┬───┘
      │             │              │              │
      ▼             ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Core    │  │  Notif.  │  │  Report  │  │   Auth   │
│  Service │  │  Service │  │  Service │  │  Service │
└─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘
      │             │              │              │
      └─────────────┴──────────────┴──────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Message Broker │
                  └─────────────────┘
```

**Recommendation:** **Defer microservices** until clear need
- Current monolith is well-structured
- Can extract services later if needed
- Added complexity not justified yet

---

### 6.5 Disaster Recovery Automation (P4-005) - 10 days

**PITR (Point-in-Time Recovery)**
1. **PostgreSQL WAL Archiving (2 days)**
   - Configure WAL archiving to S3/Azure Blob
   - Automated WAL backups every 5 minutes
   
2. **PITR Restore Script (2 days)**
   - Script to restore to any point in time
   - Testing and documentation
   
3. **Automated DR Testing (3 days)**
   - Weekly DR drill (automated)
   - Restore to staging, verify data
   - Alert on failures
   
4. **Multi-Region Replication (2 days)**
   - Async replication to secondary region
   - Automatic failover (optional)
   
5. **DR Runbook (1 day)**
   - Step-by-step recovery procedures
   - Contact information
   - RTO/RPO definitions

**RTO/RPO Targets**
- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 5 minutes

---

## 7. Technical Specifications

### 7.1 Multi-Tenancy Deep Dive

**Tenant Routing Flow**
```typescript
// Request comes in: https://acme.eventmanager.com/api/events

1. Nginx/Load Balancer forwards to Node.js app
2. identifyTenant middleware runs
   - Extracts subdomain: "acme"
   - Looks up tenant in master DB
   - Retrieves tenant's database connection string
3. getTenantPrisma() called
   - Checks connection pool cache
   - Returns existing or creates new PrismaClient
4. Request proceeds with tenant-specific database
5. All queries automatically scoped to tenant
```

**Tenant Isolation Enforcement**
```typescript
// Middleware ensures tenant context
export const enforceTenantContext = (req, res, next) => {
  if (!req.tenantPrisma) {
    return res.status(500).json({
      error: 'Tenant context missing'
    });
  }
  next();
};

// Controller uses tenant-specific Prisma
export const eventController = {
  async getEvents(req, res) {
    // This automatically queries tenant's database only
    const events = await req.tenantPrisma.event.findMany({
      where: { archived: false }
    });
    res.json(events);
  }
};
```

**Tenant Migration Script**
```typescript
// Runs schema migrations on all tenant databases
async function migrateAllTenants() {
  const tenants = await masterPrisma.tenant.findMany({
    where: { isActive: true }
  });

  for (const tenant of tenants) {
    console.log(`Migrating tenant: ${tenant.name}`);
    try {
      // Run Prisma migrate on tenant database
      await execAsync(`DATABASE_URL="${tenant.databaseUrl}" npx prisma migrate deploy`);
      console.log(`✓ ${tenant.name} migrated successfully`);
    } catch (error) {
      console.error(`✗ ${tenant.name} migration failed:`, error);
      // Send alert to admin
    }
  }
}
```

---

### 7.2 Offline Capabilities (PWA) Deep Dive

**Service Worker Strategy**
```javascript
// /var/www/event-manager/frontend/public/sw.js

// Cache strategies by resource type
const CACHE_NAME = 'event-manager-v1';

const CACHE_STRATEGIES = {
  // Static assets: Cache first, fallback to network
  static: ['/', '/index.html', '/assets/'],
  
  // API: Network first, fallback to cache (stale data better than nothing)
  api: ['/api/events', '/api/contests', '/api/results'],
  
  // User data: Network only (never cached)
  sensitive: ['/api/auth', '/api/users/me'],
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Static assets: Cache first
  if (CACHE_STRATEGIES.static.some(pattern => url.pathname.startsWith(pattern))) {
    event.respondWith(cacheFirst(request));
  }
  
  // API: Network first with cache fallback
  else if (CACHE_STRATEGIES.api.some(pattern => url.pathname.startsWith(pattern))) {
    event.respondWith(networkFirst(request));
  }
  
  // Sensitive: Network only
  else if (CACHE_STRATEGIES.sensitive.some(pattern => url.pathname.startsWith(pattern))) {
    event.respondWith(fetch(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncOfflineScores());
  }
});

async function syncOfflineScores() {
  const db = await openIndexedDB();
  const offlineScores = await db.getAll('offlineScores');
  
  for (const score of offlineScores) {
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(score.data)
      });
      
      // Remove from offline queue on success
      await db.delete('offlineScores', score.id);
      
      // Show notification
      self.registration.showNotification('Score synced', {
        body: `Score for contestant ${score.data.contestantId} synced successfully`
      });
    } catch (error) {
      // Keep in queue for next sync
      console.error('Sync failed:', error);
    }
  }
}
```

**IndexedDB Structure**
```typescript
// /var/www/event-manager/frontend/src/utils/offlineDb.ts

interface OfflineScore {
  id: string;
  timestamp: number;
  data: {
    categoryId: string;
    contestantId: string;
    judgeId: string;
    score: number;
    comment?: string;
  };
  syncStatus: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

const DB_NAME = 'EventManagerOffline';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store for offline scores
      if (!db.objectStoreNames.contains('offlineScores')) {
        const store = db.createObjectStore('offlineScores', { keyPath: 'id' });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Cache for events
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
      
      // Cache for categories
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
    };
  });
};
```

---

### 7.3 Caching Strategy Details

**Cache Layers**
```
┌──────────────────────────────────────────────────┐
│           Browser Cache (HTTP Headers)          │  ← Static assets
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│         React Query Cache (Client-side)          │  ← API responses
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│         Redis Cache (Server-side)                │  ← Query results
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│              PostgreSQL                          │  ← Source of truth
└──────────────────────────────────────────────────┘
```

**Cache Invalidation Strategy**
```typescript
// Event Service with comprehensive cache invalidation

class EventService {
  async updateEvent(eventId: string, data: any) {
    // Update in database
    const event = await prisma.event.update({
      where: { id: eventId },
      data
    });

    // Invalidate related caches
    await Promise.all([
      // Invalidate this event
      cacheService.delete(`event:${eventId}`),
      
      // Invalidate event list
      cacheService.deletePattern('events:list:*'),
      
      // Invalidate contest lists for this event
      cacheService.deletePattern(`contests:event:${eventId}:*`),
      
      // Invalidate results (if event details affect results)
      cacheService.deletePattern(`results:event:${eventId}:*`),
    ]);

    // Emit event for other services to react
    eventBus.publish('event.updated', { eventId, changes: data });

    return event;
  }
}
```

**Cache Key Naming Convention**
```
Format: <entity>:<identifier>:<variant>

Examples:
- user:abc123                           // Single user
- user:abc123:permissions               // User permissions
- events:list:page:1:limit:20          // Event list page 1
- events:list:archived:true:page:1     // Archived events page 1
- results:category:xyz789              // Category results
- results:event:abc123:final           // Final event results
```

---

## 8. Timeline & Milestones

### 8.1 Gantt Chart Overview

```
Month 1-3 (Phase 1: Foundation)
├─ Testing Framework        ████████░░░░░░░░░░ (Weeks 1-4)
├─ Virus Scanning          ░░░░██░░░░░░░░░░░░ (Week 3)
├─ Secrets Management      ░░░░░░███░░░░░░░░░ (Weeks 4-5)
├─ Redis Caching           ░░░░░░░░████░░░░░░ (Weeks 6-7)
└─ APM/Monitoring          ░░░░░░░░░░███░░░░░ (Weeks 8-9)

Month 4-7 (Phase 2: Core Enhancements)
├─ Accessibility           ████░░░░░░░░░░░░░░ (Weeks 1-3)
├─ Offline PWA             ░░░░████░░░░░░░░░░ (Weeks 4-5)
├─ Mobile UX               ░░░░░░███░░░░░░░░░ (Weeks 6-7)
├─ Data Visualization      ░░░░░░░░████░░░░░░ (Weeks 8-9)
├─ DB Optimization         ░░░░░░░░░░████░░░░ (Weeks 10-11)
└─ Background Jobs         ░░░░░░░░░░░░░░████ (Weeks 12-13)

Month 8-11 (Phase 3: Advanced Features)
├─ Advanced Auth (MFA/SSO) ████░░░░░░░░░░░░░░ (Weeks 1-2)
├─ Notification Center     ░░░░███░░░░░░░░░░░ (Weeks 3-4)
├─ Bulk Operations         ░░░░░░███░░░░░░░░░ (Weeks 5-6)
├─ Workflow Custom         ░░░░░░░░████░░░░░░ (Weeks 7-8)
├─ API/Webhooks            ░░░░░░░░░░████░░░░ (Weeks 9-10)
└─ Custom Fields           ░░░░░░░░░░░░████░░ (Weeks 11-12)

Month 12-18 (Phase 4: Enterprise)
├─ Multi-Tenancy           ████████░░░░░░░░░░ (Weeks 1-4)
├─ Event-Driven Arch       ░░░░░░░░████░░░░░░ (Weeks 5-7)
├─ Database Sharding       ░░░░░░░░░░████░░░░ (Weeks 8-10)
├─ Microservices Eval      ░░░░░░░░░░░░████░░ (Weeks 11-13)
└─ Disaster Recovery       ░░░░░░░░░░░░░░████ (Weeks 14-15)
```

### 8.2 Key Milestones

| Milestone | Target Date | Deliverables | Success Criteria |
|-----------|-------------|--------------|------------------|
| **M1: Foundation Complete** | Month 3 | Testing, Security, Monitoring | 80% test coverage, virus scanning active, APM operational |
| **M2: Performance Optimized** | Month 7 | Caching, PWA, DB optimization | 3x faster page loads, offline mode working |
| **M3: Feature Enhanced** | Month 11 | MFA, Notifications, APIs | All Phase 3 features deployed |
| **M4: Enterprise Ready** | Month 18 | Multi-tenancy, DR, Scaling | Support 10x growth, 99.9% uptime |

### 8.3 Critical Path

**Critical Path Items** (must be sequential):
1. Testing Framework (P1-001) → *All other features depend on this*
2. Redis Setup (P1-004) → Virus Scanning (P1-002), Caching (P2-006)
3. Multi-Tenancy (P4-001) → Event-Driven Architecture (P4-002)
4. Database Sharding (P4-003) → Microservices (P4-004)

**Parallel Work Opportunities:**
- Phase 1: Testing + APM can run in parallel
- Phase 2: Accessibility + Mobile UX + Data Viz can run in parallel
- Phase 3: All items can run in parallel
- Phase 4: Multi-tenancy must complete before others

---

## 9. Resource Requirements

### 9.1 Team Composition

**Core Team (4-6 people)**

| Role | FTE | Responsibilities | Skillset |
|------|-----|------------------|----------|
| **Senior Backend Engineer** | 1.0 | Phase 1-4 backend work, API design, database | Node.js, TypeScript, PostgreSQL, Redis |
| **Senior Frontend Engineer** | 1.0 | Phase 1-4 frontend work, PWA, accessibility | React, TypeScript, PWA, WCAG |
| **Full-Stack Engineer** | 1.0 | Support both backend and frontend | Node.js, React, TypeScript |
| **DevOps Engineer** | 0.5 | Infrastructure, CI/CD, monitoring | Docker, Kubernetes, AWS/Azure |
| **QA Engineer** | 0.5-1.0 | Testing, automation, quality assurance | Playwright, Jest, Testing strategies |
| **Product Manager** | 0.25 | Requirements, prioritization, stakeholders | Agile, Product management |

**Extended Team (as needed)**

| Role | When Needed | Duration |
|------|-------------|----------|
| **Security Consultant** | Phase 1 (P1-002, P1-003) | 5 days |
| **Accessibility Specialist** | Phase 2 (P2-001) | 3 days (audit + guidance) |
| **Database Architect** | Phase 4 (P4-001, P4-003) | 10 days |
| **UX Designer** | Phase 2-3 (UI/UX work) | 15 days |

### 9.2 External Services & Tools

**Required Services**

| Service | Purpose | Estimated Cost | When |
|---------|---------|----------------|------|
| **Redis Cloud** | Distributed caching | $50-200/month | Phase 1 |
| **AWS Secrets Manager** | Secrets storage | $40/month | Phase 1 |
| **Datadog APM** | Performance monitoring | $100-500/month | Phase 1 |
| **Sentry** | Error tracking | $26-80/month | Phase 1 |
| **ClamAV** | Virus scanning | Self-hosted (free) | Phase 1 |

**Optional Services**

| Service | Purpose | Estimated Cost | When |
|---------|---------|----------------|------|
| **LogRocket** | Session replay | $99-299/month | Phase 2 |
| **Chromatic** | Visual regression | $149-499/month | Phase 1 |
| **AWS S3** | File storage + backups | $50-200/month | Phase 2 |
| **CloudFront CDN** | Static asset delivery | $50-300/month | Phase 2 |
| **RabbitMQ Cloud** | Message broker | $100-400/month | Phase 4 |

**Total Monthly Recurring Cost:** $500-2,500/month (scales with usage)

### 9.3 Infrastructure Requirements

**Development Environment**
- **Local:** Docker Compose setup (existing)
- **CI/CD:** GitHub Actions (existing)
- **Cost:** ~$0 (using free tiers)

**Staging Environment**
- **Servers:** 2 app servers, 1 Redis, 1 PostgreSQL
- **Specs:** 4 CPU, 8GB RAM each
- **Cost:** ~$200-400/month

**Production Environment (Small Scale)**
- **App Servers:** 2-3 instances (auto-scaling)
- **Database:** PostgreSQL 15 (4 CPU, 16GB RAM)
- **Redis:** 2GB memory, persistence enabled
- **Load Balancer:** AWS ALB or equivalent
- **Cost:** ~$500-1000/month

**Production Environment (Large Scale - Post Phase 4)**
- **App Servers:** 5-10 instances (auto-scaling)
- **Database:** Primary + 2 read replicas
- **Redis:** Cluster mode (3 nodes)
- **Message Broker:** RabbitMQ cluster
- **Cost:** ~$2000-5000/month

### 9.4 Budget Summary

| Category | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Total |
|----------|---------|---------|---------|---------|-------|
| **Labor** (4 devs @ $150k/year avg) | $150k | $175k | $147k | $120k | $592k |
| **External Services** | $2.5k | $5k | $7.5k | $10k | $25k |
| **Infrastructure** | $1.2k | $2.4k | $3.6k | $12k | $19.2k |
| **Tools & Software** | $5k | $2k | $2k | $3k | $12k |
| **Consultants** | $10k | $5k | $0 | $15k | $30k |
| **Contingency (15%)** | $25k | $28k | $24k | $24k | $101k |
| **TOTAL** | **$194k** | **$217k** | **$184k** | **$184k** | **$779k** |

**Total Budget: $780,000** over 18 months

**Cost per Phase:**
- Phase 1 (3 months): $194k
- Phase 2 (4 months): $217k
- Phase 3 (4 months): $184k
- Phase 4 (6 months): $184k

---

## 10. Risk Management

### 10.1 Technical Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| **Test coverage goals not met** | Medium | High | Start early, set incremental targets, dedicate resources |
| **Performance degradation from monitoring** | Low | Medium | Use sampling, profiling in staging first |
| **Redis caching bugs (stale data)** | Medium | High | Conservative TTLs, comprehensive invalidation, testing |
| **Multi-tenancy data leakage** | Low | Critical | Extensive testing, security audit, automated checks |
| **PWA offline sync conflicts** | Medium | Medium | Implement last-write-wins with user confirmation |
| **Third-party service downtime** | Medium | Medium | Graceful degradation, fallback strategies |
| **Database migration failures** | Low | Critical | Test in staging, backup before migration, rollback plan |

### 10.2 Business Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| **Budget overrun** | Medium | High | Phased approach, defer non-critical features |
| **Timeline delays** | High | Medium | Buffer time in estimates, parallel work where possible |
| **Scope creep** | High | High | Strict change control, prioritization matrix |
| **User resistance to change** | Medium | Medium | Gradual rollout, training, communication |
| **Competitor launches similar features** | Medium | Medium | Focus on unique value props, quality over speed |
| **Team turnover** | Low | High | Documentation, knowledge sharing, pair programming |

### 10.3 Operational Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| **Production outage during deployment** | Low | Critical | Blue-green deployment, feature flags, rollback plan |
| **Data loss during migration** | Low | Critical | Multiple backups, test restores, dry-run migrations |
| **Performance degradation in production** | Medium | High | Load testing, gradual rollout, monitoring alerts |
| **Security breach** | Low | Critical | Security audits, penetration testing, incident response plan |
| **Compliance violations (GDPR, CCPA)** | Low | High | Legal review, privacy by design, data mapping |

### 10.4 Risk Response Plans

**P1-001 (Testing) - Risk: Test coverage goals not met**
- **Trigger:** After 2 weeks, coverage < 40%
- **Response:** 
  1. Reassess goals (maybe 70% instead of 80%)
  2. Hire additional QA resource
  3. Reduce feature scope in Phase 2 to focus on testing
  4. Use mutation testing to focus on high-value tests

**P4-001 (Multi-Tenancy) - Risk: Data leakage**
- **Trigger:** Any data leakage detected in testing
- **Response:**
  1. Immediate halt to deployment
  2. Security audit of tenant isolation code
  3. Add automated tenant isolation tests to CI
  4. Consider alternative multi-tenancy approach (database-per-tenant)
  5. External security consultant review

**Budget Overrun Risk**
- **Trigger:** Burn rate > 10% above plan for 2 consecutive months
- **Response:**
  1. Review and cut non-critical features
  2. Extend timeline (reduce team size, not features)
  3. Seek additional funding
  4. Prioritize revenue-generating features

---

## 11. Success Metrics

### 11.1 Technical Metrics (KPIs)

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Test Coverage** | ~50% | 80% backend, 70% frontend | Codecov reports |
| **Bug Escape Rate** | Unknown | <5% to production | Sentry error tracking |
| **API Response Time (p95)** | ~1000ms | <500ms | Datadog APM |
| **Page Load Time (LCP)** | ~3.5s | <2.5s | Lighthouse CI |
| **Uptime** | 99.5% | 99.9% | Datadog monitors |
| **Cache Hit Rate** | N/A (no Redis) | >70% | Redis INFO stats |
| **MTTR (Mean Time to Restore)** | Unknown | <1 hour | Incident tracking |
| **MTTD (Mean Time to Detect)** | Unknown | <5 minutes | Datadog alerts |

### 11.2 User Experience Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Accessibility Score** | ~75/100 | >90/100 | Lighthouse, axe-core |
| **Mobile Usability** | Basic | Excellent | User testing, analytics |
| **User Task Completion Rate** | Unknown | >95% | User testing |
| **User Satisfaction (NPS)** | Unknown | >50 | Surveys |
| **Support Ticket Volume** | Unknown | -30% | Support system |
| **Time to First Value (New Users)** | Unknown | <5 minutes | Analytics, onboarding tracking |

### 11.3 Business Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Max Concurrent Users** | ~100 | 1000+ | Load testing, production monitoring |
| **Max Events per Month** | ~10 | 100+ | Database metrics |
| **Feature Adoption Rate** | N/A | >60% for new features | Analytics |
| **Security Incidents** | 0 | 0 | Security logs |
| **Data Loss Incidents** | 0 | 0 | Backup verification |

### 11.4 Phase-Specific Success Criteria

**Phase 1 Success:**
- ✅ Test coverage ≥80% backend, ≥70% frontend
- ✅ Zero malware uploads in production
- ✅ Zero secrets in .env files
- ✅ Redis cache hit rate ≥70%
- ✅ MTTD for errors <5 minutes
- ✅ All Phase 1 features deployed to production

**Phase 2 Success:**
- ✅ Lighthouse accessibility score ≥90
- ✅ PWA installable and offline mode working
- ✅ Page load time (LCP) <2.5s
- ✅ Mobile usability score >85
- ✅ p95 API response time <500ms
- ✅ User onboarding completion rate >80%

**Phase 3 Success:**
- ✅ MFA adoption >60% of admin users
- ✅ Webhook delivery success rate >99%
- ✅ Custom field adoption >40% of organizations
- ✅ API key creation >50% of power users
- ✅ Notification opt-in rate >70%

**Phase 4 Success:**
- ✅ Support 10 tenants with zero data leakage
- ✅ PITR tested and verified (monthly)
- ✅ Event-driven architecture handles 1000 events/sec
- ✅ Database sharding supports 10M+ records
- ✅ Uptime >99.9%

---

## 12. Migration & Deployment Strategy

### 12.1 Deployment Approach

**Blue-Green Deployment**
```
┌─────────────────────────────────────────────┐
│          Load Balancer (Nginx/ALB)          │
└───────────────┬─────────────────────────────┘
                │
        Switch traffic here
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
┌───────────────┐  ┌───────────────┐
│  Blue (Old)   │  │ Green (New)   │
│  Version 1.0  │  │ Version 2.0   │
└───────────────┘  └───────────────┘
```

**Deployment Steps:**
1. Deploy new version to "Green" environment
2. Run smoke tests on Green
3. Switch 10% traffic to Green (canary)
4. Monitor for 30 minutes
5. If success, switch 100% traffic to Green
6. If failure, rollback to Blue (instant)
7. Keep Blue running for 24 hours
8. After verification, Blue becomes next Green

### 12.2 Feature Flag Strategy

**Feature Flags for Gradual Rollout**

```typescript
// Feature flag service
class FeatureFlagService {
  async isEnabled(flag: string, userId?: string): Promise<boolean> {
    const flagConfig = await redis.get(`feature:${flag}`);
    
    if (!flagConfig) return false;
    
    const config = JSON.parse(flagConfig);
    
    // Global enable/disable
    if (!config.enabled) return false;
    
    // Percentage rollout
    if (config.rolloutPercentage < 100) {
      const hash = hashUserId(userId);
      if (hash % 100 >= config.rolloutPercentage) return false;
    }
    
    // User whitelist
    if (config.whitelist && userId) {
      return config.whitelist.includes(userId);
    }
    
    return true;
  }
}

// Usage in controllers
export const eventController = {
  async getEvents(req, res) {
    const newCachingEnabled = await featureFlags.isEnabled('new-caching', req.user.id);
    
    if (newCachingEnabled) {
      // Use new Redis caching strategy
      return await this.getEventsWithRedisCache(req, res);
    } else {
      // Use old in-memory caching
      return await this.getEventsWithMemoryCache(req, res);
    }
  }
};
```

**Feature Flags for Each Phase:**
- Phase 1: `virus-scanning`, `redis-caching`, `sentry-tracking`
- Phase 2: `offline-mode`, `accessibility-enhancements`, `mobile-gestures`
- Phase 3: `mfa-authentication`, `notification-center`, `api-webhooks`
- Phase 4: `multi-tenancy`, `event-driven-arch`, `database-sharding`

### 12.3 Data Migration Strategy

**Migration Types**

1. **Schema Migrations (Prisma)**
   - Use Prisma Migrate for all schema changes
   - Always backwards compatible within major version
   - Test migrations on staging with production data copy
   
2. **Data Migrations**
   - Use TypeScript migration scripts in `/migrations/` folder
   - Run as part of deployment pipeline
   - Include rollback capability
   
3. **Zero-Downtime Migrations**
   - Expand-contract pattern:
     1. **Expand:** Add new column/table alongside old
     2. **Migrate:** Backfill data, write to both old and new
     3. **Contract:** Remove old column/table after verification

**Example: Adding Multi-Tenancy**

```typescript
// Step 1: Add tenantId column (nullable)
// prisma/migrations/20250112_add_tenant_id/migration.sql
ALTER TABLE "Event" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Contest" ADD COLUMN "tenantId" TEXT;
-- ... all other tables

// Step 2: Backfill default tenant
// migrations/20250112_backfill_tenant.ts
export async function up() {
  const defaultTenant = await prisma.tenant.create({
    data: {
      name: 'Default Organization',
      subdomain: 'default',
      databaseUrl: process.env.DATABASE_URL,
      plan: 'ENTERPRISE'
    }
  });

  // Backfill all existing data with default tenant
  await prisma.$executeRaw`
    UPDATE "Event" SET "tenantId" = ${defaultTenant.id} WHERE "tenantId" IS NULL;
  `;
  await prisma.$executeRaw`
    UPDATE "Contest" SET "tenantId" = ${defaultTenant.id} WHERE "tenantId" IS NULL;
  `;
  // ... all other tables
}

export async function down() {
  // Remove tenant references
  await prisma.$executeRaw`UPDATE "Event" SET "tenantId" = NULL;`;
  // Delete default tenant
  await prisma.tenant.deleteMany({ where: { subdomain: 'default' } });
}

// Step 3: Make tenantId required
// prisma/migrations/20250113_tenant_required/migration.sql
ALTER TABLE "Event" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Contest" ALTER COLUMN "tenantId" SET NOT NULL;
-- ... all other tables

// Step 4: Add tenant middleware and routing
```

### 12.4 Rollback Procedures

**Immediate Rollback (Application)**
```bash
# Rollback to previous version (Blue-Green)
./scripts/rollback.sh

# What it does:
# 1. Switch load balancer back to Blue environment
# 2. Verify traffic is flowing to Blue
# 3. Keep Green running for debugging
# 4. Alert team of rollback
```

**Database Rollback**
```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back 20250112_add_feature

# Restore from backup (if data corrupted)
./scripts/restore-db.sh 2025-01-12-14-30

# What it does:
# 1. Stop application
# 2. Drop database
# 3. Restore from backup
# 4. Run migrations to match app version
# 5. Restart application
```

**Partial Rollback (Feature Flag)**
```typescript
// Disable feature for all users
await featureFlags.disable('new-feature');

// Disable for specific users
await featureFlags.removeFromWhitelist('new-feature', userId);

// Reduce rollout percentage
await featureFlags.setRolloutPercentage('new-feature', 10);
```

**Rollback Decision Matrix**

| Issue Severity | Detection Time | Rollback Strategy |
|----------------|----------------|-------------------|
| **Critical** (data loss, security breach) | Any | Immediate rollback to previous version |
| **High** (major feature broken, >50% users affected) | <30 min | Rollback |
| **High** | >30 min | Fix forward with hotfix |
| **Medium** (minor feature broken, <50% users) | Any | Fix forward with hotfix |
| **Low** (cosmetic, non-blocking) | Any | Fix in next release |

### 12.5 Monitoring During Deployment

**Key Metrics to Watch**
```yaml
# Datadog deployment tracking
deployment:
  version: "2.0.0"
  timestamp: "2025-01-12T15:00:00Z"
  
  metrics:
    - name: error_rate
      threshold: 1%
      action: rollback
    
    - name: response_time_p95
      threshold: 1000ms
      action: alert
    
    - name: success_rate
      threshold: 99%
      action: rollback
    
    - name: cache_hit_rate
      threshold: 60%
      action: alert

  alerts:
    - slack: "#deployments"
    - pagerduty: "on-call-team"
```

**Deployment Checklist**
- [ ] All tests passing in CI
- [ ] Code review approved
- [ ] Database migrations tested in staging
- [ ] Feature flags configured
- [ ] Rollback plan documented
- [ ] On-call engineer notified
- [ ] Monitoring dashboards open
- [ ] Stakeholders informed (if major release)
- [ ] Deployment window scheduled (off-peak hours)
- [ ] Backup verified (< 1 hour old)

---

## 13. Maintenance & Support Plan

### 13.1 Documentation Updates

**Documentation Types**

| Document | Location | Update Frequency | Owner |
|----------|----------|------------------|-------|
| **Architecture Docs** | `/docs/architecture/` | After major changes | Tech Lead |
| **API Documentation** | `/docs/api/` (Swagger) | Automatically generated | Backend Team |
| **User Guide** | `/docs/user-guide/` | Per feature release | Product Manager |
| **Deployment Guide** | `/docs/deployment/` | Per infrastructure change | DevOps |
| **Troubleshooting** | `/docs/troubleshooting/` | As issues discovered | All Team |
| **Runbooks** | `/docs/runbooks/` | Per service addition | DevOps |

**Documentation Standards**
- Use Markdown format
- Include code examples
- Add diagrams (Mermaid syntax)
- Keep a CHANGELOG.md
- Version documentation with code

### 13.2 Training Requirements

**Developer Onboarding (New Team Members)**
- **Week 1:** Architecture overview, local setup, first PR
- **Week 2:** Service layer deep dive, testing practices
- **Week 3:** Deployment process, monitoring, on-call duties
- **Week 4:** Independent feature development

**Ongoing Training**
- **Monthly:** Lunch & Learn sessions on new technologies
- **Quarterly:** Security training and best practices
- **Annually:** Accessibility training, performance optimization

**User Training (End Users)**
- **Initial Rollout:** Live webinar + recorded session
- **New Features:** Video tutorial + help center article
- **Power Users:** Advanced features workshop (quarterly)
- **Admin Training:** System administration course (annually)

### 13.3 Support Procedures

**Support Tiers**

**Tier 1: Help Center & Documentation**
- Self-service help center
- FAQ section
- Video tutorials
- Search functionality
- Resolution time: Instant

**Tier 2: Email Support**
- Support email: support@eventmanager.com
- Response time: 24 hours
- Resolution time: 48 hours
- Handled by: Support team or junior developers

**Tier 3: Live Support (Chat/Phone)**
- Business hours: 9 AM - 5 PM EST
- Response time: <1 hour
- Resolution time: 4 hours
- Handled by: Senior developers

**Tier 4: Critical Issues**
- 24/7 on-call engineer
- Response time: <15 minutes
- Resolution time: 2 hours
- Handled by: On-call engineer + manager

**Issue Escalation**
```
User reports issue
      │
      ▼
Check Help Center
      │
      ▼
Email Support (Tier 2)
      │
      ├─ Simple issue → Resolved
      │
      ├─ Bug → Create GitHub issue → Engineering team
      │
      └─ Critical → Escalate to Tier 4 → On-call engineer
```

### 13.4 Incident Response

**Incident Severity Levels**

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| **SEV-1** | Complete outage | 15 minutes | Database down, app crashed |
| **SEV-2** | Major feature broken | 1 hour | Login broken, scoring unavailable |
| **SEV-3** | Minor feature broken | 4 hours | Reports not generating, cosmetic bug |
| **SEV-4** | Enhancement request | Next release | New feature request |

**Incident Response Process**
1. **Detection** (via monitoring, user report)
2. **Acknowledgment** (on-call engineer)
3. **Assessment** (determine severity)
4. **Communication** (status page, stakeholders)
5. **Investigation** (logs, metrics, traces)
6. **Mitigation** (fix or rollback)
7. **Verification** (issue resolved)
8. **Postmortem** (root cause analysis)
9. **Prevention** (implement safeguards)

**Postmortem Template**
```markdown
# Incident Postmortem: [Title]

**Date:** 2025-01-12
**Duration:** 2 hours
**Severity:** SEV-2
**Impact:** 500 users unable to submit scores

## Timeline
- 14:00: Issue detected by monitoring alert
- 14:05: On-call engineer acknowledged
- 14:15: Root cause identified (Redis connection timeout)
- 14:30: Fix deployed (increased timeout, added retry logic)
- 16:00: Issue resolved, monitoring normal

## Root Cause
Redis connection timeout due to network latency spike.

## Resolution
1. Increased Redis connection timeout from 5s to 30s
2. Added exponential backoff retry logic
3. Added alerting for Redis connection failures

## Action Items
- [ ] Implement Redis connection pooling (Owner: @engineer1)
- [ ] Add Redis failover to secondary instance (Owner: @devops)
- [ ] Update runbook with troubleshooting steps (Owner: @engineer2)

## Lessons Learned
- Need better visibility into Redis performance
- Connection timeouts too aggressive for production
- Alert fatigue prevented early detection
```

### 13.5 Long-Term Maintenance

**Quarterly Maintenance Tasks**
- [ ] Security audit and penetration testing
- [ ] Dependency updates (npm audit, renovate PRs)
- [ ] Database maintenance (VACUUM, ANALYZE, index optimization)
- [ ] Performance review (identify bottlenecks)
- [ ] Code quality review (SonarQube analysis)
- [ ] Backup restoration test (verify backups work)
- [ ] Disaster recovery drill (practice DR procedures)
- [ ] Review and clean up feature flags

**Annual Maintenance Tasks**
- [ ] Major dependency upgrades (Node.js, PostgreSQL, Redis)
- [ ] Architecture review (identify technical debt)
- [ ] Capacity planning (forecast growth, plan scaling)
- [ ] Security recertification (SOC 2, ISO 27001 if applicable)
- [ ] User feedback review (NPS, support tickets)
- [ ] Technology evaluation (new tools, frameworks)

**Monitoring & Alerting Maintenance**
- Review and adjust alert thresholds monthly
- Clean up unused dashboards quarterly
- Update runbooks when procedures change
- Test on-call rotation and escalation procedures

**Technical Debt Management**
- Allocate 20% of sprint capacity to technical debt
- Prioritize debt by impact (security > performance > maintainability)
- Track debt in GitHub issues with "tech-debt" label
- Regular refactoring sessions (2 hours per week)

---

## Appendix A: Implementation Checklist

### Phase 1 Checklist

#### P1-001: Comprehensive Testing
- [ ] Backend unit tests (80% coverage)
- [ ] Frontend component tests (70% coverage)
- [ ] Integration tests (critical workflows)
- [ ] E2E tests (user journeys)
- [ ] Visual regression tests (Percy/Chromatic)
- [ ] Contract tests (Pact)
- [ ] Mutation tests (Stryker)
- [ ] CI/CD integration
- [ ] Pre-commit hooks

#### P1-002: Virus Scanning
- [ ] ClamAV installed and configured
- [ ] Virus scanning service implemented
- [ ] Middleware integrated
- [ ] Background scanning job
- [ ] Quarantine directory created
- [ ] Admin dashboard for scan logs
- [ ] Testing with EICAR test file

#### P1-003: Secrets Management
- [ ] AWS Secrets Manager configured
- [ ] Secrets service implemented
- [ ] Config loader updated
- [ ] Server initialization updated
- [ ] Secret rotation implemented
- [ ] Testing script
- [ ] Documentation updated

#### P1-004: Redis Caching
- [ ] Redis deployed (Docker Compose)
- [ ] Cache service implemented
- [ ] User cache migrated
- [ ] Query result caching
- [ ] HTTP response caching middleware
- [ ] Socket.IO Redis adapter
- [ ] Cache warming job
- [ ] Cache monitoring endpoint

#### P1-005: APM & Monitoring
- [ ] Datadog APM configured
- [ ] Custom instrumentation added
- [ ] Sentry error tracking
- [ ] Frontend performance monitoring
- [ ] Alerting configured
- [ ] Dashboards created
- [ ] Lighthouse CI in GitHub Actions
- [ ] Monitoring documentation

### Phase 2 Checklist

#### P2-001: Accessibility
- [ ] Accessibility audit completed
- [ ] Color contrast fixes
- [ ] Semantic HTML updates
- [ ] ARIA labels added
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] Screen reader announcements
- [ ] Form accessibility
- [ ] Automated testing (axe-core, pa11y)
- [ ] Accessibility documentation

#### Remaining Phase 2-4 Items
- [ ] PWA offline capabilities
- [ ] Mobile UX enhancements
- [ ] User onboarding tour
- [ ] Data visualization
- [ ] Database optimizations
- [ ] Background job processing
- [ ] MFA & SSO
- [ ] Notification center
- [ ] Bulk operations
- [ ] Workflow customization
- [ ] API & webhooks
- [ ] Custom fields
- [ ] Multi-tenancy
- [ ] Event-driven architecture
- [ ] Database sharding
- [ ] Disaster recovery

---

## Appendix B: Key Contacts

| Role | Name | Email | Responsibility |
|------|------|-------|----------------|
| **Tech Lead** | TBD | tech-lead@example.com | Overall technical direction |
| **Product Manager** | TBD | pm@example.com | Requirements and prioritization |
| **DevOps Lead** | TBD | devops@example.com | Infrastructure and deployment |
| **Security Lead** | TBD | security@example.com | Security audits and compliance |
| **QA Lead** | TBD | qa@example.com | Testing strategy and execution |
| **On-Call Engineer** | Rotation | on-call@example.com | Production incidents |

---

## Appendix C: Useful Commands

### Development
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Start development server
npm run dev

# Build for production
npm run build
```

### Deployment
```bash
# Deploy to staging
./scripts/deploy-staging.sh

# Deploy to production
./scripts/deploy-production.sh

# Rollback
./scripts/rollback.sh

# Check deployment status
./scripts/deployment-status.sh
```

### Database
```bash
# Run migrations
npx prisma migrate deploy

# Create migration
npx prisma migrate dev --name add_feature

# Reset database (dev only)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

### Monitoring
```bash
# View logs
./scripts/logs.sh production

# View metrics
curl https://api.eventmanager.com/metrics

# Check health
curl https://api.eventmanager.com/api/health

# Cache statistics
curl https://api.eventmanager.com/api/cache/stats
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-12 | Claude (Sonnet 4.5) | Initial comprehensive implementation plan |

---

**End of Implementation Plan**

This comprehensive plan covers all requested enhancement areas with detailed implementation steps, risk assessments, timelines, and success criteria. The plan is structured to be executed over 12-18 months with clear phases, deliverables, and milestones.

For questions or clarifications, please contact the project Tech Lead or Product Manager.
