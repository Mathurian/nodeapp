/**
 * Dependency Injection Container Configuration
 * Using tsyringe for DI
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { prisma } from './database';
import { createLogger } from '../utils/logger';

const logger = createLogger('container');

// Repositories
import { UserRepository } from '../repositories/UserRepository';
import { EventRepository } from '../repositories/EventRepository';
import { ScoreRepository } from '../repositories/ScoreRepository';
import { ContestRepository } from '../repositories/ContestRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { TemplateRepository } from '../repositories/TemplateRepository';
import { DeductionRepository } from '../repositories/DeductionRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { NotificationPreferenceRepository } from '../repositories/NotificationPreferenceRepository';
import { SearchRepository } from '../repositories/SearchRepository';
// import { NotificationTemplateRepository } from '../repositories/NotificationTemplateRepository';

// Services
import { UserService } from '../services/UserService';
import { EventService } from '../services/EventService';
import { ContestService } from '../services/ContestService';
import { CategoryService } from '../services/CategoryService';
import { CacheService } from '../services/CacheService';
import { ScoringService } from '../services/ScoringService';
import { ReportGenerationService } from '../services/ReportGenerationService';
import { ReportExportService } from '../services/ReportExportService';
import { ReportTemplateService } from '../services/ReportTemplateService';
import { ReportEmailService } from '../services/ReportEmailService';
import { ReportInstanceService } from '../services/ReportInstanceService';
import { EmceeService } from '../services/EmceeService';
import { TallyMasterService } from '../services/TallyMasterService';
import { AuditorService } from '../services/AuditorService';
import { BoardService } from '../services/BoardService';
import { CategoryTypeService } from '../services/CategoryTypeService';
import { ArchiveService } from '../services/ArchiveService';
import { UserFieldVisibilityService } from '../services/UserFieldVisibilityService';
import { TemplateService } from '../services/TemplateService';
import { DeductionService } from '../services/DeductionService';
import { PerformanceService } from '../services/PerformanceService';
import { JudgeService } from '../services/JudgeService';
import { ExportService } from '../services/ExportService';
import { WinnerService } from '../services/WinnerService';
import { PrintService } from '../services/PrintService';
import { SettingsService } from '../services/SettingsService';
import { AssignmentService } from '../services/AssignmentService';
import { UploadService } from '../services/UploadService';
import { BioService } from '../services/BioService';
import { RoleAssignmentService } from '../services/RoleAssignmentService';
import { EventTemplateService } from '../services/EventTemplateService';
import { CommentaryService } from '../services/CommentaryService';
import { ScoreRemovalService } from '../services/ScoreRemovalService';
import { LogFilesService } from '../services/LogFilesService';
import { SMSService } from '../services/SMSService';
import { JudgeUncertificationService } from '../services/JudgeUncertificationService';
import { AuditorCertificationService } from '../services/AuditorCertificationService';
import { TrackerService } from '../services/TrackerService';
import { CategoryCertificationService } from '../services/CategoryCertificationService';
import { ContestCertificationService } from '../services/ContestCertificationService';
import { DatabaseBrowserService } from '../services/DatabaseBrowserService';
import { JudgeContestantCertificationService } from '../services/JudgeContestantCertificationService';
import { ErrorHandlingService } from '../services/ErrorHandlingService';
import { MFAService } from '../services/MFAService';
import { FileService } from '../services/FileService';
import { FileBackupService } from '../services/FileBackupService';
import { FileManagementService } from '../services/FileManagementService';
import { AdvancedReportingService } from '../services/AdvancedReportingService';
import { EmailService } from '../services/EmailService';
import { AdminService } from '../services/AdminService';
import { CertificationService } from '../services/CertificationService';
import { ResultsService } from '../services/ResultsService';
import { NotificationService } from '../services/NotificationService';
import { RateLimitService } from '../services/RateLimitService';
import { MetricsService } from '../services/MetricsService';
import { ScoreFileService } from '../services/ScoreFileService';
import { RestrictionService } from '../services/RestrictionService';
import { DataWipeService } from '../services/DataWipeService';
import { TestEventSetupService } from '../services/TestEventSetupService';
import { BulkCertificationResetService } from '../services/BulkCertificationResetService';
import { SearchService } from '../services/SearchService';

/**
 * Register dependencies in the container
 */
export function setupContainer(): void {
  // Register Prisma Client as singleton
  container.register<PrismaClient>('PrismaClient', {
    useValue: prisma
  });

  // Register repositories
  container.register(UserRepository, {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new UserRepository(prisma);
    }
  });

  container.register(EventRepository, {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new EventRepository(prisma);
    }
  });

  container.register(ScoreRepository, {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new ScoreRepository(prisma);
    }
  });

  container.register(ContestRepository, {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new ContestRepository(prisma);
    }
  });

  container.register(CategoryRepository, {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new CategoryRepository(prisma);
    }
  });

  container.register(TemplateRepository, {
    useFactory: () => {
      return new TemplateRepository();
    }
  });

  container.register(DeductionRepository, {
    useFactory: () => {
      return new DeductionRepository();
    }
  });

  container.register(NotificationRepository, {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new NotificationRepository(prisma);
    }
  });

  container.register(NotificationPreferenceRepository, {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new NotificationPreferenceRepository(prisma);
    }
  });

  container.register(SearchRepository, {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new SearchRepository(prisma);
    }
  });

  // container.register(NotificationTemplateRepository, {
  //   useFactory: (c) => {
  //     const prisma = c.resolve<PrismaClient>('PrismaClient');
  //     return new NotificationTemplateRepository(prisma);
  //   }
  // });

  // Register named tokens for services (use same factory as class registration)
  container.register('EventRepository', {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new EventRepository(prisma);
    }
  });
  container.register('ContestRepository', {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new ContestRepository(prisma);
    }
  });
  container.register('CategoryRepository', {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new CategoryRepository(prisma);
    }
  });
  container.register('ScoreRepository', {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new ScoreRepository(prisma);
    }
  });
  container.register('TemplateRepository', { useClass: TemplateRepository });
  container.register('DeductionRepository', { useClass: DeductionRepository });
  container.register('NotificationRepository', {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new NotificationRepository(prisma);
    }
  });
  container.register('SearchRepository', {
    useFactory: (c) => {
      const prisma = c.resolve<PrismaClient>('PrismaClient');
      return new SearchRepository(prisma);
    }
  });

  // Register services
  // Create singleton CacheService instance
  const cacheServiceInstance = new CacheService();
  container.register(CacheService, { useValue: cacheServiceInstance });
  container.register('CacheService', { useValue: cacheServiceInstance });

  container.register(UserService, UserService);
  container.register(EventService, EventService);
  container.register(ContestService, ContestService);
  container.register(CategoryService, CategoryService);
  container.register(ScoringService, ScoringService);

  container.register(ReportGenerationService, ReportGenerationService);
  container.register(ReportExportService, ReportExportService);
  container.register(ReportTemplateService, ReportTemplateService);
  container.register(ReportEmailService, ReportEmailService);
  container.register(ReportInstanceService, ReportInstanceService);

  container.register(EmceeService, EmceeService);
  container.register(TallyMasterService, TallyMasterService);
  container.register(AuditorService, AuditorService);
  container.register(BoardService, BoardService);
  container.register(CategoryTypeService, CategoryTypeService);
  container.register(ArchiveService, ArchiveService);
  container.register(UserFieldVisibilityService, UserFieldVisibilityService);
  container.register(TemplateService, TemplateService);
  container.register(DeductionService, DeductionService);
  container.register(PerformanceService, PerformanceService);
  container.register(JudgeService, JudgeService);
  container.register(ExportService, ExportService);
  container.register(WinnerService, WinnerService);
  container.register(PrintService, PrintService);
  container.register(SettingsService, SettingsService);
  container.register(AssignmentService, AssignmentService);
  container.register(UploadService, UploadService);

  // Register new services from conversion
  container.register(BioService, BioService);
  container.register(RoleAssignmentService, RoleAssignmentService);
  container.register(EventTemplateService, EventTemplateService);
  container.register(CommentaryService, CommentaryService);
  container.register(ScoreRemovalService, ScoreRemovalService);
  container.register(LogFilesService, LogFilesService);
  container.register(SMSService, SMSService);
  container.register(JudgeUncertificationService, JudgeUncertificationService);
  container.register(AuditorCertificationService, AuditorCertificationService);
  container.register(TrackerService, TrackerService);
  container.register(CategoryCertificationService, CategoryCertificationService);
  container.register(ContestCertificationService, ContestCertificationService);
  container.register(DatabaseBrowserService, DatabaseBrowserService);
  container.register(JudgeContestantCertificationService, JudgeContestantCertificationService);
  container.register(ErrorHandlingService, ErrorHandlingService);
  container.register('MFAService', { useClass: MFAService });
  container.register(FileService, FileService);
  container.register(FileBackupService, FileBackupService);
  container.register(FileManagementService, FileManagementService);
  container.register(AdvancedReportingService, AdvancedReportingService);
  container.register(EmailService, EmailService);
  container.register(AdminService, AdminService);
  container.register(CertificationService, CertificationService);
  container.register(ResultsService, ResultsService);
  container.register(NotificationService, NotificationService);
  container.register(RateLimitService, RateLimitService);
  container.register(MetricsService, MetricsService);
  container.register(ScoreFileService, ScoreFileService);
  container.register(RestrictionService, RestrictionService);
  container.register(DataWipeService, DataWipeService);
  container.register(TestEventSetupService, TestEventSetupService);
  container.register(BulkCertificationResetService, BulkCertificationResetService);
  container.register(SearchService, SearchService);

  logger.info('Dependency injection container configured');
  logger.info('Registered 63 services and 12 repositories');
}

/**
 * Get service from container
 */
export function getService<T>(token: any): T {
  return container.resolve<T>(token);
}

/**
 * Reset container (for testing)
 */
export function resetContainer(): void {
  container.clearInstances();
}

// Initialize the container
setupContainer();

export { container };
export default container;
