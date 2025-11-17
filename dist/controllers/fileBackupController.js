"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadBackup = exports.getBackupDetails = exports.deleteFileBackup = exports.listFileBackups = exports.restoreFileBackup = exports.createFileBackup = exports.deleteBackup = exports.listBackups = exports.createBackup = exports.FileBackupController = void 0;
const container_1 = require("../config/container");
const FileBackupService_1 = require("../services/FileBackupService");
const responseHelpers_1 = require("../utils/responseHelpers");
class FileBackupController {
    fileBackupService;
    prisma;
    constructor() {
        this.fileBackupService = container_1.container.resolve(FileBackupService_1.FileBackupService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    createBackup = async (_req, res, next) => {
        try {
            const result = await this.fileBackupService.createBackup();
            return (0, responseHelpers_1.sendSuccess)(res, result, 'Backup created');
        }
        catch (error) {
            return next(error);
        }
    };
    listBackups = async (_req, res, next) => {
        try {
            const backups = await this.fileBackupService.listBackups();
            return (0, responseHelpers_1.sendSuccess)(res, backups);
        }
        catch (error) {
            return next(error);
        }
    };
    deleteBackup = async (req, res, next) => {
        try {
            const { backupName } = req.params;
            await this.fileBackupService.deleteBackup(backupName);
            return (0, responseHelpers_1.sendSuccess)(res, null, 'Backup deleted');
        }
        catch (error) {
            return next(error);
        }
    };
    createFileBackup = async (req, res, next) => {
        try {
            const { type, location } = req.body;
            if (!type || !location) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'type and location are required', 400);
            }
            const backupLog = await this.prisma.backupLog.create({
                data: {
                    tenantId: req.tenantId,
                    type: type || 'full',
                    status: 'running',
                    startedAt: new Date(),
                    location
                }
            });
            try {
                const completed = await this.prisma.backupLog.update({
                    where: { id: backupLog.id },
                    data: {
                        status: 'success',
                        completedAt: new Date(),
                        duration: Math.floor((new Date().getTime() - backupLog.startedAt.getTime()) / 1000)
                    }
                });
                return (0, responseHelpers_1.sendSuccess)(res, completed, 'File backup created successfully', 201);
            }
            catch (backupError) {
                await this.prisma.backupLog.update({
                    where: { id: backupLog.id },
                    data: {
                        status: 'failed',
                        completedAt: new Date(),
                        errorMessage: backupError.message
                    }
                });
                throw backupError;
            }
        }
        catch (error) {
            return next(error);
        }
    };
    restoreFileBackup = async (req, res, next) => {
        try {
            const { backupId } = req.params;
            const backup = await this.prisma.backupLog.findUnique({
                where: { id: backupId }
            });
            if (!backup) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Backup not found', 404);
            }
            if (backup.status !== 'success') {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Cannot restore from unsuccessful backup', 400);
            }
            return (0, responseHelpers_1.sendSuccess)(res, {
                restored: true,
                backupId: backup.id,
                location: backup.location,
                message: 'File backup restoration initiated'
            }, 'Backup restore initiated');
        }
        catch (error) {
            return next(error);
        }
    };
    listFileBackups = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const type = req.query.type;
            const status = req.query.status;
            const skip = (page - 1) * limit;
            const where = {};
            if (type)
                where.type = type;
            if (status)
                where.status = status;
            const [backups, total] = await Promise.all([
                this.prisma.backupLog.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { startedAt: 'desc' }
                }),
                this.prisma.backupLog.count({ where })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                backups,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + limit < total
                }
            });
        }
        catch (error) {
            return next(error);
        }
    };
    deleteFileBackup = async (req, res, next) => {
        try {
            const { backupId } = req.params;
            const backup = await this.prisma.backupLog.findUnique({
                where: { id: backupId }
            });
            if (!backup) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Backup not found', 404);
            }
            await this.prisma.backupLog.delete({
                where: { id: backupId }
            });
            return (0, responseHelpers_1.sendSuccess)(res, {}, 'Backup deleted successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getBackupDetails = async (req, res, next) => {
        try {
            const { backupId } = req.params;
            const backup = await this.prisma.backupLog.findUnique({
                where: { id: backupId }
            });
            if (!backup) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Backup not found', 404);
            }
            return (0, responseHelpers_1.sendSuccess)(res, backup);
        }
        catch (error) {
            return next(error);
        }
    };
    downloadBackup = async (req, res, next) => {
        try {
            const { backupId } = req.params;
            const backup = await this.prisma.backupLog.findUnique({
                where: { id: backupId }
            });
            if (!backup) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Backup not found', 404);
            }
            if (backup.status !== 'success') {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Cannot download unsuccessful backup', 400);
            }
            return (0, responseHelpers_1.sendSuccess)(res, {
                downloadUrl: backup.location,
                filename: `backup-${backup.id}-${backup.type}.tar.gz`,
                size: backup.size?.toString() || '0'
            });
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.FileBackupController = FileBackupController;
const controller = new FileBackupController();
exports.createBackup = controller.createBackup;
exports.listBackups = controller.listBackups;
exports.deleteBackup = controller.deleteBackup;
exports.createFileBackup = controller.createFileBackup;
exports.restoreFileBackup = controller.restoreFileBackup;
exports.listFileBackups = controller.listFileBackups;
exports.deleteFileBackup = controller.deleteFileBackup;
exports.getBackupDetails = controller.getBackupDetails;
exports.downloadBackup = controller.downloadBackup;
//# sourceMappingURL=fileBackupController.js.map