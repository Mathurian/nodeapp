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
exports.CommentaryService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let CommentaryService = class CommentaryService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async create(data) {
        if (!data.scoreId || !data.criterionId || !data.contestantId || !data.comment) {
            throw this.badRequestError('Score ID, criterion ID, contestant ID, and comment are required');
        }
        const score = await this.prisma.score.findUnique({
            where: { id: data.scoreId },
            select: { tenantId: true },
        });
        if (!score) {
            throw this.notFoundError('Score', data.scoreId);
        }
        return await this.prisma.scoreComment.create({
            data: {
                tenantId: score.tenantId,
                scoreId: data.scoreId,
                criterionId: data.criterionId,
                contestantId: data.contestantId,
                judgeId: data.judgeId,
                comment: data.comment,
                isPrivate: data.isPrivate || false
            },
            include: {
                judge: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });
    }
    async getCommentsForScore(scoreId, userRole) {
        const whereClause = { scoreId };
        if (!['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
            whereClause.isPrivate = false;
        }
        return await this.prisma.scoreComment.findMany({
            where: whereClause,
            include: {
                judge: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                criterion: {
                    select: {
                        name: true,
                        description: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
    }
    async getCommentsByContestant(contestantId, userRole) {
        const whereClause = { contestantId };
        if (!['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
            whereClause.isPrivate = false;
        }
        return await this.prisma.scoreComment.findMany({
            where: whereClause,
            include: {
                judge: {
                    select: {
                        name: true,
                        email: true
                    }
                },
                criterion: {
                    select: {
                        name: true,
                        maxScore: true
                    }
                },
                score: {
                    include: {
                        category: {
                            include: {
                                contest: {
                                    include: {
                                        event: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [
                { scoreId: 'desc' },
                { createdAt: 'asc' }
            ]
        });
    }
    async update(id, data, userId, userRole) {
        const existingComment = await this.prisma.scoreComment.findUnique({
            where: { id }
        });
        if (!existingComment) {
            throw this.notFoundError('Comment', id);
        }
        if (existingComment.judgeId !== userId && !['ADMIN', 'ORGANIZER'].includes(userRole)) {
            throw this.forbiddenError('Insufficient permissions to update this comment');
        }
        return await this.prisma.scoreComment.update({
            where: { id },
            data: {
                ...(data.comment !== undefined && { comment: data.comment }),
                ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate })
            },
            include: {
                judge: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });
    }
    async delete(id, userId, userRole) {
        const existingComment = await this.prisma.scoreComment.findUnique({
            where: { id }
        });
        if (!existingComment) {
            throw this.notFoundError('Comment', id);
        }
        if (existingComment.judgeId !== userId && !['ADMIN', 'ORGANIZER'].includes(userRole)) {
            throw this.forbiddenError('Insufficient permissions to delete this comment');
        }
        await this.prisma.scoreComment.delete({
            where: { id }
        });
    }
};
exports.CommentaryService = CommentaryService;
exports.CommentaryService = CommentaryService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], CommentaryService);
//# sourceMappingURL=CommentaryService.js.map