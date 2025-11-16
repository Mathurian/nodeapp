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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const BaseService_1 = require("./BaseService");
let UploadService = class UploadService extends BaseService_1.BaseService {
    prisma;
    uploadDir;
    constructor(prisma) {
        super();
        this.prisma = prisma;
        this.uploadDir = path.join(process.cwd(), 'uploads');
        this.ensureUploadsDir();
    }
    async ensureUploadsDir() {
        try {
            await fs_1.promises.mkdir(this.uploadDir, { recursive: true });
        }
        catch (error) {
            this.logWarn('Could not create uploads directory', { error: error.message });
        }
    }
    async processUploadedFile(file, userId, options) {
        if (!file) {
            throw this.createBadRequestError('No file uploaded');
        }
        const fileBuffer = await fs_1.promises.readFile(file.path);
        const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
        const fileCategory = options?.category || client_1.FileCategory.OTHER;
        const relativePath = path.relative(process.cwd(), file.path);
        const dbFile = await this.prisma.file.create({
            data: {
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                path: relativePath,
                category: fileCategory,
                uploadedBy: userId,
                checksum,
                tenantId: options?.tenantId || 'default_tenant',
                eventId: options?.eventId,
                contestId: options?.contestId,
                categoryId: options?.categoryId
            }
        });
        return {
            id: dbFile.id,
            filename: dbFile.filename,
            originalName: dbFile.originalName,
            mimetype: dbFile.mimeType,
            size: dbFile.size,
            path: dbFile.path,
            uploadedBy: dbFile.uploadedBy,
            category: dbFile.category,
            eventId: dbFile.eventId || undefined,
            contestId: dbFile.contestId || undefined,
            categoryId: dbFile.categoryId || undefined
        };
    }
    async getFiles(userId) {
        try {
            await fs_1.promises.access(this.uploadDir);
        }
        catch {
            return [];
        }
        const files = await fs_1.promises.readdir(this.uploadDir);
        const fileList = [];
        for (const file of files) {
            const filePath = path.join(this.uploadDir, file);
            const stats = await fs_1.promises.stat(filePath);
            if (stats.isFile()) {
                fileList.push({
                    id: file,
                    filename: file,
                    filepath: filePath,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    updatedAt: stats.mtime,
                    uploadedBy: userId || 'system',
                });
            }
        }
        return fileList.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }
    async deleteFile(fileId) {
        try {
            const file = await this.prisma.file.findUnique({
                where: { id: fileId },
            });
            if (file) {
                try {
                    await fs_1.promises.unlink(file.path);
                }
                catch (error) {
                    this.logWarn('Physical file not found', { path: file.path });
                }
                await this.prisma.file.delete({
                    where: { id: fileId },
                });
                return;
            }
        }
        catch {
        }
        const filePath = path.join(this.uploadDir, fileId);
        try {
            await fs_1.promises.unlink(filePath);
        }
        catch (error) {
            throw this.createNotFoundError('File not found');
        }
    }
    async getFileById(fileId) {
        try {
            const file = await this.prisma.file.findUnique({
                where: { id: fileId },
            });
            if (file) {
                return file;
            }
        }
        catch {
        }
        const filePath = path.join(this.uploadDir, fileId);
        try {
            const stats = await fs_1.promises.stat(filePath);
            return {
                id: fileId,
                filename: fileId,
                filepath: filePath,
                size: stats.size,
                createdAt: stats.birthtime,
                updatedAt: stats.mtime,
            };
        }
        catch {
            throw this.createNotFoundError('File not found');
        }
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], UploadService);
//# sourceMappingURL=UploadService.js.map