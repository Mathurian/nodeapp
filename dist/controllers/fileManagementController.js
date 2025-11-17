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
exports.bulkCheckFileIntegrity = exports.checkFileIntegrity = exports.getFileAnalytics = exports.getFileSearchSuggestions = exports.bulkFileOperations = exports.getFilesWithFilters = exports.copyFile = exports.moveFile = exports.getFileInfo = exports.FileManagementController = void 0;
const container_1 = require("../config/container");
const FileManagementService_1 = require("../services/FileManagementService");
const responseHelpers_1 = require("../utils/responseHelpers");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
class FileManagementController {
    fileManagementService;
    prisma;
    constructor() {
        this.fileManagementService = container_1.container.resolve(FileManagementService_1.FileManagementService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    getFileInfo = async (req, res, next) => {
        try {
            const { filename } = req.params;
            const info = await this.fileManagementService.getFileInfo(filename);
            return (0, responseHelpers_1.sendSuccess)(res, info);
        }
        catch (error) {
            return next(error);
        }
    };
    moveFile = async (req, res, next) => {
        try {
            const { filename } = req.params;
            const { newPath } = req.body;
            const result = await this.fileManagementService.moveFile(filename, newPath);
            return (0, responseHelpers_1.sendSuccess)(res, result, 'File moved');
        }
        catch (error) {
            return next(error);
        }
    };
    copyFile = async (req, res, next) => {
        try {
            const { filename } = req.params;
            const { newPath } = req.body;
            const result = await this.fileManagementService.copyFile(filename, newPath);
            return (0, responseHelpers_1.sendSuccess)(res, result, 'File copied');
        }
        catch (error) {
            return next(error);
        }
    };
    getFilesWithFilters = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;
            const category = req.query.category;
            const eventId = req.query.eventId;
            const contestId = req.query.contestId;
            const categoryId = req.query.categoryId;
            const isPublic = req.query.isPublic;
            const uploadedBy = req.query.uploadedBy;
            const mimeType = req.query.mimeType;
            const minSize = req.query.minSize ? parseInt(req.query.minSize) : undefined;
            const maxSize = req.query.maxSize ? parseInt(req.query.maxSize) : undefined;
            const search = req.query.search;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const where = {};
            if (category)
                where.category = category;
            if (eventId)
                where.eventId = eventId;
            if (contestId)
                where.contestId = contestId;
            if (categoryId)
                where.categoryId = categoryId;
            if (isPublic !== undefined)
                where.isPublic = isPublic === 'true';
            if (uploadedBy)
                where.uploadedBy = uploadedBy;
            if (mimeType)
                where.mimeType = { contains: mimeType };
            if (minSize !== undefined || maxSize !== undefined) {
                where.size = {};
                if (minSize !== undefined)
                    where.size.gte = minSize;
                if (maxSize !== undefined)
                    where.size.lte = maxSize;
            }
            if (search) {
                where.OR = [
                    { filename: { contains: search, mode: 'insensitive' } },
                    { originalName: { contains: search, mode: 'insensitive' } }
                ];
            }
            if (startDate || endDate) {
                where.uploadedAt = {};
                if (startDate)
                    where.uploadedAt.gte = new Date(startDate);
                if (endDate)
                    where.uploadedAt.lte = new Date(endDate);
            }
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
                },
                filters: {
                    category, eventId, contestId, categoryId, isPublic, uploadedBy,
                    mimeType, minSize, maxSize, search, startDate, endDate
                }
            });
        }
        catch (error) {
            return next(error);
        }
    };
    bulkFileOperations = async (req, res, next) => {
        try {
            const { operation, fileIds, options } = req.body;
            if (!operation || !fileIds || !Array.isArray(fileIds)) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'operation and fileIds array are required', 400);
            }
            if (fileIds.length === 0) {
                return (0, responseHelpers_1.sendSuccess)(res, { processed: 0 }, 'No files to process');
            }
            let result = { processed: 0, failed: 0, total: fileIds.length };
            switch (operation) {
                case 'delete':
                    const deleteResult = await this.prisma.file.deleteMany({
                        where: {
                            id: { in: fileIds }
                        }
                    });
                    result.processed = deleteResult.count;
                    result.failed = fileIds.length - deleteResult.count;
                    break;
                case 'update':
                    if (!options) {
                        return (0, responseHelpers_1.sendSuccess)(res, {}, 'options object is required for update operation', 400);
                    }
                    const updateData = {};
                    if (options.category !== undefined)
                        updateData.category = options.category;
                    if (options.isPublic !== undefined)
                        updateData.isPublic = options.isPublic;
                    if (options.eventId !== undefined)
                        updateData.eventId = options.eventId;
                    if (options.contestId !== undefined)
                        updateData.contestId = options.contestId;
                    if (options.categoryId !== undefined)
                        updateData.categoryId = options.categoryId;
                    const updateResult = await this.prisma.file.updateMany({
                        where: {
                            id: { in: fileIds }
                        },
                        data: updateData
                    });
                    result.processed = updateResult.count;
                    result.failed = fileIds.length - updateResult.count;
                    break;
                case 'move':
                case 'copy':
                    const operations = await Promise.allSettled(fileIds.map(async (fileId) => {
                        const file = await this.prisma.file.findUnique({ where: { id: fileId } });
                        if (!file)
                            throw new Error(`File ${fileId} not found`);
                        if (operation === 'move') {
                            return await this.fileManagementService.moveFile(file.filename, options.newPath);
                        }
                        else {
                            return await this.fileManagementService.copyFile(file.filename, options.newPath);
                        }
                    }));
                    result.processed = operations.filter(op => op.status === 'fulfilled').length;
                    result.failed = operations.filter(op => op.status === 'rejected').length;
                    break;
                default:
                    return (0, responseHelpers_1.sendSuccess)(res, {}, 'Invalid operation. Supported: delete, update, move, copy', 400);
            }
            return (0, responseHelpers_1.sendSuccess)(res, result, `Bulk ${operation} operation completed`);
        }
        catch (error) {
            return next(error);
        }
    };
    getFileSearchSuggestions = async (req, res, next) => {
        try {
            const { query } = req.query;
            const limit = parseInt(req.query.limit) || 10;
            if (!query || typeof query !== 'string') {
                return (0, responseHelpers_1.sendSuccess)(res, [], 'query parameter is required');
            }
            const suggestions = await this.prisma.file.findMany({
                where: {
                    OR: [
                        { filename: { contains: query, mode: 'insensitive' } },
                        { originalName: { contains: query, mode: 'insensitive' } }
                    ]
                },
                select: {
                    id: true,
                    filename: true,
                    originalName: true,
                    mimeType: true,
                    size: true,
                    uploadedAt: true,
                    category: true
                },
                take: limit,
                orderBy: { uploadedAt: 'desc' }
            });
            return (0, responseHelpers_1.sendSuccess)(res, suggestions);
        }
        catch (error) {
            return next(error);
        }
    };
    getFileAnalytics = async (req, res, next) => {
        try {
            const days = parseInt(req.query.days) || 30;
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const files = await this.prisma.file.findMany({
                where: {
                    uploadedAt: { gte: since }
                },
                select: {
                    id: true,
                    size: true,
                    category: true,
                    mimeType: true,
                    uploadedAt: true,
                    uploadedBy: true
                }
            });
            const analytics = {
                timeRange: { days, since },
                totalFiles: files.length,
                totalSize: files.reduce((sum, f) => sum + f.size, 0),
                totalSizeMB: (files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2),
                byCategory: files.reduce((acc, file) => {
                    const cat = file.category || 'UNKNOWN';
                    if (!acc[cat]) {
                        acc[cat] = { count: 0, size: 0 };
                    }
                    acc[cat].count++;
                    acc[cat].size += file.size;
                    return acc;
                }, {}),
                byMimeType: files.reduce((acc, file) => {
                    const mime = file.mimeType || 'unknown';
                    if (!acc[mime]) {
                        acc[mime] = { count: 0, size: 0 };
                    }
                    acc[mime].count++;
                    acc[mime].size += file.size;
                    return acc;
                }, {}),
                uploadsByDay: files.reduce((acc, file) => {
                    const day = file.uploadedAt.toISOString().split('T')[0];
                    if (!acc[day]) {
                        acc[day] = { count: 0, size: 0 };
                    }
                    acc[day].count++;
                    acc[day].size += file.size;
                    return acc;
                }, {}),
                topUploaders: Object.entries(files.reduce((acc, file) => {
                    const userId = file.uploadedBy;
                    if (!acc[userId]) {
                        acc[userId] = { count: 0, size: 0 };
                    }
                    acc[userId].count++;
                    acc[userId].size += file.size;
                    return acc;
                }, {}))
                    .map(([userId, stats]) => ({ userId, ...stats }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
            };
            return (0, responseHelpers_1.sendSuccess)(res, analytics);
        }
        catch (error) {
            return next(error);
        }
    };
    checkFileIntegrity = async (req, res, next) => {
        try {
            const { id } = req.params;
            const file = await this.prisma.file.findUnique({
                where: { id }
            });
            if (!file) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'File not found', 404);
            }
            const fileExists = fs.existsSync(file.path);
            if (!fileExists) {
                return (0, responseHelpers_1.sendSuccess)(res, {
                    id: file.id,
                    filename: file.filename,
                    integrity: 'FAILED',
                    reason: 'File not found on disk',
                    expectedPath: file.path
                });
            }
            let checksumMatch = null;
            let currentChecksum = null;
            if (file.checksum) {
                const fileBuffer = fs.readFileSync(file.path);
                currentChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                checksumMatch = currentChecksum === file.checksum;
            }
            const stats = fs.statSync(file.path);
            const sizeMatch = stats.size === file.size;
            const integrity = fileExists && sizeMatch && (checksumMatch === null || checksumMatch)
                ? 'OK'
                : 'FAILED';
            return (0, responseHelpers_1.sendSuccess)(res, {
                id: file.id,
                filename: file.filename,
                integrity,
                checks: {
                    fileExists,
                    sizeMatch,
                    expectedSize: file.size,
                    actualSize: stats.size,
                    checksumMatch,
                    expectedChecksum: file.checksum,
                    currentChecksum
                }
            });
        }
        catch (error) {
            return next(error);
        }
    };
    bulkCheckFileIntegrity = async (req, res, next) => {
        try {
            const { fileIds } = req.body;
            if (!fileIds || !Array.isArray(fileIds)) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'fileIds array is required', 400);
            }
            if (fileIds.length === 0) {
                return (0, responseHelpers_1.sendSuccess)(res, { checked: 0, results: [] }, 'No files to check');
            }
            const results = await Promise.allSettled(fileIds.map(async (fileId) => {
                const file = await this.prisma.file.findUnique({ where: { id: fileId } });
                if (!file) {
                    return {
                        id: fileId,
                        integrity: 'NOT_FOUND',
                        reason: 'File record not found in database'
                    };
                }
                const fileExists = fs.existsSync(file.path);
                if (!fileExists) {
                    return {
                        id: file.id,
                        filename: file.filename,
                        integrity: 'FAILED',
                        reason: 'File not found on disk'
                    };
                }
                const stats = fs.statSync(file.path);
                const sizeMatch = stats.size === file.size;
                let checksumMatch = null;
                if (file.checksum) {
                    const fileBuffer = fs.readFileSync(file.path);
                    const currentChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                    checksumMatch = currentChecksum === file.checksum;
                }
                const integrity = fileExists && sizeMatch && (checksumMatch === null || checksumMatch)
                    ? 'OK'
                    : 'FAILED';
                return {
                    id: file.id,
                    filename: file.filename,
                    integrity,
                    sizeMatch,
                    checksumMatch
                };
            }));
            const processedResults = results.map((r, index) => {
                if (r.status === 'fulfilled') {
                    return r.value;
                }
                else {
                    return {
                        id: fileIds[index],
                        integrity: 'ERROR',
                        reason: r.reason?.toString() || 'Unknown error'
                    };
                }
            });
            const summary = {
                total: fileIds.length,
                ok: processedResults.filter((r) => r.integrity === 'OK').length,
                failed: processedResults.filter((r) => r.integrity === 'FAILED').length,
                notFound: processedResults.filter((r) => r.integrity === 'NOT_FOUND').length,
                errors: processedResults.filter((r) => r.integrity === 'ERROR').length
            };
            return (0, responseHelpers_1.sendSuccess)(res, {
                summary,
                results: processedResults
            });
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.FileManagementController = FileManagementController;
const controller = new FileManagementController();
exports.getFileInfo = controller.getFileInfo;
exports.moveFile = controller.moveFile;
exports.copyFile = controller.copyFile;
exports.getFilesWithFilters = controller.getFilesWithFilters;
exports.bulkFileOperations = controller.bulkFileOperations;
exports.getFileSearchSuggestions = controller.getFileSearchSuggestions;
exports.getFileAnalytics = controller.getFileAnalytics;
exports.checkFileIntegrity = controller.checkFileIntegrity;
exports.bulkCheckFileIntegrity = controller.bulkCheckFileIntegrity;
//# sourceMappingURL=fileManagementController.js.map