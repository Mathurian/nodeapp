"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreFileService = void 0;
const client_1 = require("@prisma/client");
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const fs_1 = require("fs");
let ScoreFileService = class ScoreFileService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async uploadScoreFile(data, uploadedById) {
        const category = await this.prisma.category.findFirst({
            where: { id: data.categoryId, tenantId: data.tenantId }
        });
        if (!category) {
            throw this.createNotFoundError('Category not found');
        }
        const judge = await this.prisma.judge.findFirst({
            where: { id: data.judgeId, tenantId: data.tenantId }
        });
        if (!judge) {
            throw this.createNotFoundError('Judge not found');
        }
        if (data.contestantId) {
            const contestant = await this.prisma.contestant.findFirst({
                where: { id: data.contestantId, tenantId: data.tenantId }
            });
            if (!contestant) {
                throw this.createNotFoundError('Contestant not found');
            }
        }
        const scoreFile = await this.prisma.scoreFile.create({
            data: {
                categoryId: data.categoryId,
                judgeId: data.judgeId,
                contestantId: data.contestantId || null,
                tenantId: data.tenantId,
                fileName: data.fileName,
                fileType: data.fileType,
                filePath: data.filePath,
                fileSize: data.fileSize,
                uploadedById,
                status: 'pending',
                notes: data.notes || null,
                updatedAt: new Date()
            }
        });
        return scoreFile;
    }
    async getScoreFileById(id, tenantId) {
        return await this.prisma.scoreFile.findFirst({
            where: { id, tenantId }
        });
    }
    async getScoreFilesByCategory(categoryId, tenantId) {
        return await this.prisma.scoreFile.findMany({
            where: { categoryId, tenantId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async getScoreFilesByJudge(judgeId, tenantId) {
        return await this.prisma.scoreFile.findMany({
            where: { judgeId, tenantId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async getScoreFilesByContestant(contestantId, tenantId) {
        return await this.prisma.scoreFile.findMany({
            where: { contestantId, tenantId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async updateScoreFile(id, tenantId, data, _userId, userRole) {
        const scoreFile = await this.prisma.scoreFile.findFirst({
            where: { id, tenantId }
        });
        if (!scoreFile) {
            throw this.createNotFoundError('Score file not found');
        }
        const canUpdateStatus = ['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole);
        if (data.status && !canUpdateStatus) {
            throw this.forbiddenError('You do not have permission to update score file status');
        }
        const updated = await this.prisma.scoreFile.update({
            where: { id },
            data: {
                status: data.status || scoreFile.status,
                notes: data.notes !== undefined ? data.notes : scoreFile.notes,
                updatedAt: new Date()
            }
        });
        return updated;
    }
    async deleteScoreFile(id, tenantId, userId, userRole) {
        const scoreFile = await this.prisma.scoreFile.findFirst({
            where: { id, tenantId }
        });
        if (!scoreFile) {
            throw this.createNotFoundError('Score file not found');
        }
        const isUploader = scoreFile.uploadedById === userId;
        const isAuthorized = ['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole);
        if (!isUploader && !isAuthorized) {
            throw this.forbiddenError('You do not have permission to delete this score file');
        }
        try {
            await fs_1.promises.unlink(scoreFile.filePath);
        }
        catch (error) {
            console.error('Failed to delete physical file:', error);
        }
        await this.prisma.scoreFile.delete({
            where: { id }
        });
    }
    async getAllScoreFiles(tenantId, filters) {
        return await this.prisma.scoreFile.findMany({
            where: {
                tenantId,
                categoryId: filters?.categoryId,
                judgeId: filters?.judgeId,
                contestantId: filters?.contestantId,
                status: filters?.status
            },
            orderBy: { createdAt: 'desc' }
        });
    }
};
exports.ScoreFileService = ScoreFileService;
exports.ScoreFileService = ScoreFileService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], ScoreFileService);
//# sourceMappingURL=ScoreFileService.js.map