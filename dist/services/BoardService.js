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
exports.BoardService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let BoardService = class BoardService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getStats() {
        const totalContests = await this.prisma.contest.count();
        const totalCategories = await this.prisma.category.count();
        const categories = await this.prisma.category.findMany({
            include: {
                certifications: true,
            },
        });
        const certified = categories.filter((cat) => cat.certifications.some((cert) => cert.type === 'FINAL')).length;
        const pending = categories.filter((cat) => !cat.certifications.some((cert) => cert.type === 'FINAL')).length;
        return {
            contests: totalContests,
            categories: totalCategories,
            certified,
            pending,
        };
    }
    async getCertifications() {
        const categories = await this.prisma.category.findMany({
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
                scores: {
                    include: {
                        judge: true,
                        contestant: true,
                    },
                },
                certifications: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return categories.filter((cat) => cat.certifications.some((cert) => cert.type === 'FINAL'));
    }
    async approveCertification(categoryId) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
            },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        await this.prisma.category.update({
            where: { id: categoryId },
            data: { boardApproved: true },
        });
        return { message: 'Certification approved', category };
    }
    async rejectCertification(categoryId, reason) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
            },
        });
        if (!category) {
            throw this.notFoundError('Category', categoryId);
        }
        await this.prisma.category.update({
            where: { id: categoryId },
            data: {
                boardApproved: false,
                rejectionReason: reason,
            },
        });
        return { message: 'Certification rejected', category };
    }
    async getCertificationStatus() {
        const categories = await this.prisma.category.findMany({
            include: {
                certifications: {
                    where: {
                        status: {
                            in: ['CERTIFIED', 'PENDING', 'IN_PROGRESS'],
                        },
                    },
                },
            },
        });
        const status = {
            total: categories.length,
            pending: categories.filter((cat) => cat.certifications.length === 0 || cat.certifications.every((cert) => cert.status !== 'CERTIFIED')).length,
            certified: categories.filter((cat) => cat.certifications.some((cert) => cert.status === 'CERTIFIED')).length,
            approved: 0,
        };
        return status;
    }
    async getEmceeScripts() {
        return await this.prisma.emceeScript.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async createEmceeScript(data) {
        this.validateRequired(data, ['title', 'content']);
        const script = await this.prisma.emceeScript.create({
            data: {
                title: data.title,
                content: data.content,
                type: data.type,
                eventId: data.eventId,
                contestId: data.contestId,
                categoryId: data.categoryId,
                order: data.order || 0,
                notes: data.notes,
                isActive: true,
                createdBy: data.userId,
            },
        });
        return script;
    }
    async updateEmceeScript(scriptId, data) {
        const script = await this.prisma.emceeScript.update({
            where: { id: scriptId },
            data,
        });
        return script;
    }
    async deleteEmceeScript(scriptId) {
        await this.prisma.emceeScript.delete({
            where: { id: scriptId },
        });
        return { message: 'Emcee script deleted successfully' };
    }
    async getScoreRemovalRequests(status, page = 1, limit = 20) {
        const whereClause = {};
        if (status)
            whereClause.status = status;
        const requests = await this.prisma.judgeScoreRemovalRequest.findMany({
            where: whereClause,
            include: {
                judge: true,
                category: {
                    include: {
                        contest: {
                            include: {
                                event: true,
                            },
                        },
                    },
                },
                score: {
                    include: {
                        contestant: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });
        const total = await this.prisma.judgeScoreRemovalRequest.count({
            where: whereClause,
        });
        return {
            requests,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async approveScoreRemoval(requestId, userId, reason) {
        const request = await this.prisma.judgeScoreRemovalRequest.findUnique({
            where: { id: requestId },
            include: { score: true },
        });
        if (!request) {
            throw this.notFoundError('Score removal request', requestId);
        }
        await this.prisma.score.delete({
            where: { id: request.scoreId },
        });
        const updatedRequest = await this.prisma.judgeScoreRemovalRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                approvedBy: userId,
                approvedAt: new Date(),
                reason,
            },
        });
        return updatedRequest;
    }
    async rejectScoreRemoval(requestId, userId, reason) {
        const updatedRequest = await this.prisma.judgeScoreRemovalRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                rejectedBy: userId,
                rejectedAt: new Date(),
                reason,
            },
        });
        return updatedRequest;
    }
};
exports.BoardService = BoardService;
exports.BoardService = BoardService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], BoardService);
//# sourceMappingURL=BoardService.js.map