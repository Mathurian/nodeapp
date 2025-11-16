"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
exports.setupContainer = setupContainer;
exports.getService = getService;
exports.resetContainer = resetContainer;
require("reflect-metadata");
const tsyringe_1 = require("tsyringe");
Object.defineProperty(exports, "container", { enumerable: true, get: function () { return tsyringe_1.container; } });
const database_1 = require("./database");
const UserRepository_1 = require("../repositories/UserRepository");
const EventRepository_1 = require("../repositories/EventRepository");
const ScoreRepository_1 = require("../repositories/ScoreRepository");
const ContestRepository_1 = require("../repositories/ContestRepository");
const CategoryRepository_1 = require("../repositories/CategoryRepository");
const TemplateRepository_1 = require("../repositories/TemplateRepository");
const DeductionRepository_1 = require("../repositories/DeductionRepository");
const NotificationRepository_1 = require("../repositories/NotificationRepository");
const NotificationPreferenceRepository_1 = require("../repositories/NotificationPreferenceRepository");
const SearchRepository_1 = require("../repositories/SearchRepository");
const UserService_1 = require("../services/UserService");
const EventService_1 = require("../services/EventService");
const ContestService_1 = require("../services/ContestService");
const CategoryService_1 = require("../services/CategoryService");
const cacheService_1 = __importStar(require("../services/cacheService"));
const ScoringService_1 = require("../services/ScoringService");
const ReportGenerationService_1 = require("../services/ReportGenerationService");
const ReportExportService_1 = require("../services/ReportExportService");
const ReportTemplateService_1 = require("../services/ReportTemplateService");
const ReportEmailService_1 = require("../services/ReportEmailService");
const ReportInstanceService_1 = require("../services/ReportInstanceService");
const EmceeService_1 = require("../services/EmceeService");
const TallyMasterService_1 = require("../services/TallyMasterService");
const AuditorService_1 = require("../services/AuditorService");
const BoardService_1 = require("../services/BoardService");
const CategoryTypeService_1 = require("../services/CategoryTypeService");
const ArchiveService_1 = require("../services/ArchiveService");
const UserFieldVisibilityService_1 = require("../services/UserFieldVisibilityService");
const TemplateService_1 = require("../services/TemplateService");
const DeductionService_1 = require("../services/DeductionService");
const PerformanceService_1 = require("../services/PerformanceService");
const JudgeService_1 = require("../services/JudgeService");
const ExportService_1 = require("../services/ExportService");
const WinnerService_1 = require("../services/WinnerService");
const PrintService_1 = require("../services/PrintService");
const SettingsService_1 = require("../services/SettingsService");
const AssignmentService_1 = require("../services/AssignmentService");
const UploadService_1 = require("../services/UploadService");
const BioService_1 = require("../services/BioService");
const RoleAssignmentService_1 = require("../services/RoleAssignmentService");
const EventTemplateService_1 = require("../services/EventTemplateService");
const CommentaryService_1 = require("../services/CommentaryService");
const ScoreRemovalService_1 = require("../services/ScoreRemovalService");
const LogFilesService_1 = require("../services/LogFilesService");
const SMSService_1 = require("../services/SMSService");
const JudgeUncertificationService_1 = require("../services/JudgeUncertificationService");
const AuditorCertificationService_1 = require("../services/AuditorCertificationService");
const TrackerService_1 = require("../services/TrackerService");
const CategoryCertificationService_1 = require("../services/CategoryCertificationService");
const ContestCertificationService_1 = require("../services/ContestCertificationService");
const DatabaseBrowserService_1 = require("../services/DatabaseBrowserService");
const JudgeContestantCertificationService_1 = require("../services/JudgeContestantCertificationService");
const ErrorHandlingService_1 = require("../services/ErrorHandlingService");
const MFAService_1 = require("../services/MFAService");
const FileService_1 = require("../services/FileService");
const FileBackupService_1 = require("../services/FileBackupService");
const FileManagementService_1 = require("../services/FileManagementService");
const AdvancedReportingService_1 = require("../services/AdvancedReportingService");
const EmailService_1 = require("../services/EmailService");
const AdminService_1 = require("../services/AdminService");
const CertificationService_1 = require("../services/CertificationService");
const ResultsService_1 = require("../services/ResultsService");
const NotificationService_1 = require("../services/NotificationService");
const RateLimitService_1 = require("../services/RateLimitService");
const MetricsService_1 = require("../services/MetricsService");
const ScoreFileService_1 = require("../services/ScoreFileService");
const RestrictionService_1 = require("../services/RestrictionService");
const DataWipeService_1 = require("../services/DataWipeService");
const TestEventSetupService_1 = require("../services/TestEventSetupService");
const BulkCertificationResetService_1 = require("../services/BulkCertificationResetService");
const SearchService_1 = require("../services/SearchService");
function setupContainer() {
    tsyringe_1.container.register('PrismaClient', {
        useValue: database_1.prisma
    });
    tsyringe_1.container.register(UserRepository_1.UserRepository, {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new UserRepository_1.UserRepository(prisma);
        }
    });
    tsyringe_1.container.register(EventRepository_1.EventRepository, {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new EventRepository_1.EventRepository(prisma);
        }
    });
    tsyringe_1.container.register(ScoreRepository_1.ScoreRepository, {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new ScoreRepository_1.ScoreRepository(prisma);
        }
    });
    tsyringe_1.container.register(ContestRepository_1.ContestRepository, {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new ContestRepository_1.ContestRepository(prisma);
        }
    });
    tsyringe_1.container.register(CategoryRepository_1.CategoryRepository, {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new CategoryRepository_1.CategoryRepository(prisma);
        }
    });
    tsyringe_1.container.register(TemplateRepository_1.TemplateRepository, {
        useFactory: () => {
            return new TemplateRepository_1.TemplateRepository();
        }
    });
    tsyringe_1.container.register(DeductionRepository_1.DeductionRepository, {
        useFactory: () => {
            return new DeductionRepository_1.DeductionRepository();
        }
    });
    tsyringe_1.container.register(NotificationRepository_1.NotificationRepository, {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new NotificationRepository_1.NotificationRepository(prisma);
        }
    });
    tsyringe_1.container.register(NotificationPreferenceRepository_1.NotificationPreferenceRepository, {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new NotificationPreferenceRepository_1.NotificationPreferenceRepository(prisma);
        }
    });
    tsyringe_1.container.register(SearchRepository_1.SearchRepository, {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new SearchRepository_1.SearchRepository(prisma);
        }
    });
    tsyringe_1.container.register('EventRepository', {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new EventRepository_1.EventRepository(prisma);
        }
    });
    tsyringe_1.container.register('ContestRepository', {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new ContestRepository_1.ContestRepository(prisma);
        }
    });
    tsyringe_1.container.register('CategoryRepository', {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new CategoryRepository_1.CategoryRepository(prisma);
        }
    });
    tsyringe_1.container.register('ScoreRepository', {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new ScoreRepository_1.ScoreRepository(prisma);
        }
    });
    tsyringe_1.container.register('TemplateRepository', { useClass: TemplateRepository_1.TemplateRepository });
    tsyringe_1.container.register('DeductionRepository', { useClass: DeductionRepository_1.DeductionRepository });
    tsyringe_1.container.register('NotificationRepository', {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new NotificationRepository_1.NotificationRepository(prisma);
        }
    });
    tsyringe_1.container.register('SearchRepository', {
        useFactory: (c) => {
            const prisma = c.resolve('PrismaClient');
            return new SearchRepository_1.SearchRepository(prisma);
        }
    });
    tsyringe_1.container.register(cacheService_1.CacheService, { useValue: cacheService_1.default });
    tsyringe_1.container.register('CacheService', { useValue: cacheService_1.default });
    tsyringe_1.container.register(UserService_1.UserService, UserService_1.UserService);
    tsyringe_1.container.register(EventService_1.EventService, EventService_1.EventService);
    tsyringe_1.container.register(ContestService_1.ContestService, ContestService_1.ContestService);
    tsyringe_1.container.register(CategoryService_1.CategoryService, CategoryService_1.CategoryService);
    tsyringe_1.container.register(ScoringService_1.ScoringService, ScoringService_1.ScoringService);
    tsyringe_1.container.register(ReportGenerationService_1.ReportGenerationService, ReportGenerationService_1.ReportGenerationService);
    tsyringe_1.container.register(ReportExportService_1.ReportExportService, ReportExportService_1.ReportExportService);
    tsyringe_1.container.register(ReportTemplateService_1.ReportTemplateService, ReportTemplateService_1.ReportTemplateService);
    tsyringe_1.container.register(ReportEmailService_1.ReportEmailService, ReportEmailService_1.ReportEmailService);
    tsyringe_1.container.register(ReportInstanceService_1.ReportInstanceService, ReportInstanceService_1.ReportInstanceService);
    tsyringe_1.container.register(EmceeService_1.EmceeService, EmceeService_1.EmceeService);
    tsyringe_1.container.register(TallyMasterService_1.TallyMasterService, TallyMasterService_1.TallyMasterService);
    tsyringe_1.container.register(AuditorService_1.AuditorService, AuditorService_1.AuditorService);
    tsyringe_1.container.register(BoardService_1.BoardService, BoardService_1.BoardService);
    tsyringe_1.container.register(CategoryTypeService_1.CategoryTypeService, CategoryTypeService_1.CategoryTypeService);
    tsyringe_1.container.register(ArchiveService_1.ArchiveService, ArchiveService_1.ArchiveService);
    tsyringe_1.container.register(UserFieldVisibilityService_1.UserFieldVisibilityService, UserFieldVisibilityService_1.UserFieldVisibilityService);
    tsyringe_1.container.register(TemplateService_1.TemplateService, TemplateService_1.TemplateService);
    tsyringe_1.container.register(DeductionService_1.DeductionService, DeductionService_1.DeductionService);
    tsyringe_1.container.register(PerformanceService_1.PerformanceService, PerformanceService_1.PerformanceService);
    tsyringe_1.container.register(JudgeService_1.JudgeService, JudgeService_1.JudgeService);
    tsyringe_1.container.register(ExportService_1.ExportService, ExportService_1.ExportService);
    tsyringe_1.container.register(WinnerService_1.WinnerService, WinnerService_1.WinnerService);
    tsyringe_1.container.register(PrintService_1.PrintService, PrintService_1.PrintService);
    tsyringe_1.container.register(SettingsService_1.SettingsService, SettingsService_1.SettingsService);
    tsyringe_1.container.register(AssignmentService_1.AssignmentService, AssignmentService_1.AssignmentService);
    tsyringe_1.container.register(UploadService_1.UploadService, UploadService_1.UploadService);
    tsyringe_1.container.register(BioService_1.BioService, BioService_1.BioService);
    tsyringe_1.container.register(RoleAssignmentService_1.RoleAssignmentService, RoleAssignmentService_1.RoleAssignmentService);
    tsyringe_1.container.register(EventTemplateService_1.EventTemplateService, EventTemplateService_1.EventTemplateService);
    tsyringe_1.container.register(CommentaryService_1.CommentaryService, CommentaryService_1.CommentaryService);
    tsyringe_1.container.register(ScoreRemovalService_1.ScoreRemovalService, ScoreRemovalService_1.ScoreRemovalService);
    tsyringe_1.container.register(LogFilesService_1.LogFilesService, LogFilesService_1.LogFilesService);
    tsyringe_1.container.register(SMSService_1.SMSService, SMSService_1.SMSService);
    tsyringe_1.container.register(JudgeUncertificationService_1.JudgeUncertificationService, JudgeUncertificationService_1.JudgeUncertificationService);
    tsyringe_1.container.register(AuditorCertificationService_1.AuditorCertificationService, AuditorCertificationService_1.AuditorCertificationService);
    tsyringe_1.container.register(TrackerService_1.TrackerService, TrackerService_1.TrackerService);
    tsyringe_1.container.register(CategoryCertificationService_1.CategoryCertificationService, CategoryCertificationService_1.CategoryCertificationService);
    tsyringe_1.container.register(ContestCertificationService_1.ContestCertificationService, ContestCertificationService_1.ContestCertificationService);
    tsyringe_1.container.register(DatabaseBrowserService_1.DatabaseBrowserService, DatabaseBrowserService_1.DatabaseBrowserService);
    tsyringe_1.container.register(JudgeContestantCertificationService_1.JudgeContestantCertificationService, JudgeContestantCertificationService_1.JudgeContestantCertificationService);
    tsyringe_1.container.register(ErrorHandlingService_1.ErrorHandlingService, ErrorHandlingService_1.ErrorHandlingService);
    tsyringe_1.container.register('MFAService', { useClass: MFAService_1.MFAService });
    tsyringe_1.container.register(FileService_1.FileService, FileService_1.FileService);
    tsyringe_1.container.register(FileBackupService_1.FileBackupService, FileBackupService_1.FileBackupService);
    tsyringe_1.container.register(FileManagementService_1.FileManagementService, FileManagementService_1.FileManagementService);
    tsyringe_1.container.register(AdvancedReportingService_1.AdvancedReportingService, AdvancedReportingService_1.AdvancedReportingService);
    tsyringe_1.container.register(EmailService_1.EmailService, EmailService_1.EmailService);
    tsyringe_1.container.register(AdminService_1.AdminService, AdminService_1.AdminService);
    tsyringe_1.container.register(CertificationService_1.CertificationService, CertificationService_1.CertificationService);
    tsyringe_1.container.register(ResultsService_1.ResultsService, ResultsService_1.ResultsService);
    tsyringe_1.container.register(NotificationService_1.NotificationService, NotificationService_1.NotificationService);
    tsyringe_1.container.register(RateLimitService_1.RateLimitService, RateLimitService_1.RateLimitService);
    tsyringe_1.container.register(MetricsService_1.MetricsService, MetricsService_1.MetricsService);
    tsyringe_1.container.register(ScoreFileService_1.ScoreFileService, ScoreFileService_1.ScoreFileService);
    tsyringe_1.container.register(RestrictionService_1.RestrictionService, RestrictionService_1.RestrictionService);
    tsyringe_1.container.register(DataWipeService_1.DataWipeService, DataWipeService_1.DataWipeService);
    tsyringe_1.container.register(TestEventSetupService_1.TestEventSetupService, TestEventSetupService_1.TestEventSetupService);
    tsyringe_1.container.register(BulkCertificationResetService_1.BulkCertificationResetService, BulkCertificationResetService_1.BulkCertificationResetService);
    tsyringe_1.container.register(SearchService_1.SearchService, SearchService_1.SearchService);
    console.log('✓ Dependency injection container configured');
    console.log('✓ Registered 63 services and 12 repositories');
}
function getService(token) {
    return tsyringe_1.container.resolve(token);
}
function resetContainer() {
    tsyringe_1.container.clearInstances();
}
setupContainer();
exports.default = tsyringe_1.container;
//# sourceMappingURL=container.js.map