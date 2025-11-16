"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.getFileStats = exports.updateFile = exports.getFileById = exports.uploadFiles = exports.getAllFiles = exports.deleteFile = exports.downloadFile = exports.listFiles = exports.FileController = void 0;
const container_1 = require("../config/container");
const FileService_1 = require("../services/FileService");
const responseHelpers_1 = require("../utils/responseHelpers");
class FileController {
    fileService;
    prisma;
    constructor() {
        this.fileService = container_1.container.resolve(FileService_1.FileService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    listFiles = async (req, res, next) => {
        try {
            const { directory } = req.query;
            const files = await this.fileService.listFiles(directory);
            return (0, responseHelpers_1.sendSuccess)(res, files);
        }
        catch (error) {
            next(error);
        }
    };
    downloadFile = async (req, res, next) => {
        try {
            const { filename } = req.params;
            const filePath = await this.fileService.getFilePath(filename);
            res.download(filePath, filename);
        }
        catch (error) {
            next(error);
        }
    };
    deleteFile = async (req, res, next) => {
        try {
            const { filename } = req.params;
            await this.fileService.deleteFile(filename);
            return (0, responseHelpers_1.sendSuccess)(res, null, 'File deleted');
        }
        catch (error) {
            next(error);
        }
    };
    getAllFiles = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const category = req.query.category;
            const eventId = req.query.eventId;
            const skip = (page - 1) * limit;
            const where = {};
            if (category)
                where.category = category;
            if (eventId)
                where.eventId = eventId;
            const [files, total] = await Promise.all([
                this.prisma.file.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { uploadedAt: 'desc' }
                }),
                this.prisma.file.count({ where })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                files,
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
            next(error);
        }
    };
    uploadFiles = async (req, res, next) => {
        try {
            if (!req.user) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'User not authenticated', 401);
            }
            const files = req.files;
            const { category, eventId, contestId, categoryId, isPublic } = req.body;
            if (!files || files.length === 0) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'No files provided', 400);
            }
            const uploadedFiles = await Promise.all(files.map(async (file) => {
                return this.prisma.file.create({
                    data: {
                        tenantId: req.user.tenantId,
                        filename: file.filename,
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                        size: file.size,
                        path: file.path,
                        category: category || 'OTHER',
                        uploadedBy: req.user.id,
                        isPublic: isPublic === 'true',
                        ...(eventId && { eventId }),
                        ...(contestId && { contestId }),
                        ...(categoryId && { categoryId })
                    }
                });
            }));
            return (0, responseHelpers_1.sendSuccess)(res, {
                files: uploadedFiles,
                count: uploadedFiles.length
            }, 'Files uploaded successfully', 201);
        }
        catch (error) {
            next(error);
        }
    };
    getFileById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const file = await this.prisma.file.findUnique({
                where: { id },
            });
            if (!file) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'File not found', 404);
            }
            return (0, responseHelpers_1.sendSuccess)(res, file);
        }
        catch (error) {
            next(error);
        }
    };
    updateFile = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { category, isPublic, metadata } = req.body;
            const existing = await this.prisma.file.findUnique({
                where: { id }
            });
            if (!existing) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'File not found', 404);
            }
            const updateData = {};
            if (category !== undefined)
                updateData.category = category;
            if (isPublic !== undefined)
                updateData.isPublic = isPublic;
            if (metadata !== undefined)
                updateData.metadata = JSON.stringify(metadata);
            const file = await this.prisma.file.update({
                where: { id },
                data: updateData
            });
            return (0, responseHelpers_1.sendSuccess)(res, file, 'File updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getFileStats = async (req, res, next) => {
        try {
            const [totalFiles, totalSize, byCategory, recentUploads] = await Promise.all([
                this.prisma.file.count(),
                this.prisma.file.aggregate({
                    _sum: { size: true }
                }),
                this.prisma.file.groupBy({
                    by: ['category'],
                    _count: { id: true },
                    _sum: { size: true }
                }),
                this.prisma.file.findMany({
                    take: 10,
                    orderBy: { uploadedAt: 'desc' },
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        size: true,
                        uploadedAt: true
                    }
                })
            ]);
            const stats = {
                totalFiles,
                totalSize: totalSize._sum.size || 0,
                totalSizeMB: ((totalSize._sum.size || 0) / 1024 / 1024).toFixed(2),
                byCategory: byCategory.map(cat => ({
                    category: cat.category,
                    count: cat._count.id,
                    size: cat._sum.size || 0,
                    sizeMB: ((cat._sum.size || 0) / 1024 / 1024).toFixed(2)
                })),
                recentUploads
            };
            return (0, responseHelpers_1.sendSuccess)(res, stats);
        }
        catch (error) {
            next(error);
        }
    };
    upload = async (req, res, next) => {
        try {
            if (!req.user) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'User not authenticated', 401);
            }
            const file = req.file;
            const { category, eventId, isPublic, metadata } = req.body;
            if (!file) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'No file provided', 400);
            }
            const uploadedFile = await this.prisma.file.create({
                data: {
                    tenantId: req.user.tenantId,
                    filename: file.filename,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    path: file.path,
                    category: category || 'OTHER',
                    uploadedBy: req.user.id,
                    isPublic: isPublic === 'true',
                    ...(eventId && { eventId }),
                    ...(metadata && { metadata: JSON.stringify(metadata) })
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, uploadedFile, 'File uploaded successfully', 201);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.FileController = FileController;
const controller = new FileController();
exports.listFiles = controller.listFiles;
exports.downloadFile = controller.downloadFile;
exports.deleteFile = controller.deleteFile;
exports.getAllFiles = controller.getAllFiles;
exports.uploadFiles = controller.uploadFiles;
exports.getFileById = controller.getFileById;
exports.updateFile = controller.updateFile;
exports.getFileStats = controller.getFileStats;
exports.upload = controller.upload;
//# sourceMappingURL=fileController.js.map