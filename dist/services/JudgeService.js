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
exports.JudgeService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const BaseService_1 = require("./BaseService");
let JudgeService = class JudgeService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getJudgeIdFromUser(userId, tenantId) {
        const userWithJudge = await this.prisma.user.findFirst({
            where: { id: userId, tenantId },
            include: { judge: true },
        });
        if (!userWithJudge || !userWithJudge.judge) {
            return null;
        }
        return userWithJudge.judge.id;
    }
    async getStats(userId, tenantId) {
        const judgeId = await this.getJudgeIdFromUser(userId, tenantId);
        if (!judgeId) {
            throw this.forbiddenError('User is not linked to a Judge record');
        }
        const [totalAssignments, pendingAssignments, activeAssignments, completedAssignments, totalScores,] = await Promise.all([
            this.prisma.assignment.count({ where: { judgeId, tenantId } }),
            this.prisma.assignment.count({ where: { judgeId, tenantId, status: 'PENDING' } }),
            this.prisma.assignment.count({ where: { judgeId, tenantId, status: 'ACTIVE' } }),
            this.prisma.assignment.count({ where: { judgeId, tenantId, status: 'COMPLETED' } }),
            this.prisma.score.count({ where: { judgeId, tenantId } }),
        ]);
        return {
            totalAssignments,
            pendingAssignments,
            activeAssignments,
            completedAssignments,
            totalScores,
        };
    }
    async getAssignments(userId, userRole, tenantId) {
        const judgeId = await this.getJudgeIdFromUser(userId, tenantId);
        if (userRole === 'JUDGE' && !judgeId) {
            throw this.forbiddenError('User is not linked to a Judge record');
        }
        const whereClause = userRole === 'JUDGE' && judgeId ? { judgeId, tenantId } : { tenantId };
        const assignments = await this.prisma.assignment.findMany({
            where: whereClause,
            orderBy: { assignedAt: 'desc' },
        });
        return assignments;
    }
    async updateAssignmentStatus(assignmentId, status, userId, userRole, tenantId) {
        const judgeId = await this.getJudgeIdFromUser(userId, tenantId);
        if (userRole === 'JUDGE') {
            if (!judgeId) {
                throw this.forbiddenError('User is not linked to a Judge record');
            }
            const assignment = await this.prisma.assignment.findFirst({
                where: { id: assignmentId, tenantId },
            });
            if (!assignment || assignment.judgeId !== judgeId) {
                throw this.forbiddenError('Not authorized to update this assignment');
            }
        }
        const updatedAssignment = await this.prisma.assignment.update({
            where: { id: assignmentId },
            data: { status: status },
        });
        return updatedAssignment;
    }
    async getScoringInterface(categoryId, userId, tenantId) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, tenantId },
            include: { judge: true },
        });
        if (!user || !user.judge) {
            throw this.forbiddenError('User is not linked to a Judge record');
        }
        const judgeId = user.judge.id;
        const assignment = await this.prisma.assignment.findFirst({
            where: {
                judgeId,
                categoryId,
                tenantId,
                status: { in: ['ACTIVE', 'COMPLETED'] },
            },
        });
        if (!assignment) {
            throw this.forbiddenError('Not assigned to this category');
        }
        const category = await this.prisma.category.findFirst({
            where: { id: categoryId, tenantId },
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
        const [criteria, categoryContestants, scores] = await Promise.all([
            this.prisma.criterion.findMany({
                where: { categoryId, tenantId },
            }),
            this.prisma.categoryContestant.findMany({
                where: { categoryId, tenantId },
                include: {
                    contestant: {
                        include: {
                            users: {
                                select: {
                                    id: true,
                                    name: true,
                                    preferredName: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.score.findMany({
                where: { judgeId, categoryId, tenantId },
                include: {
                    criterion: true,
                    contestant: true,
                },
            }),
        ]);
        const contestants = categoryContestants.map((cc) => cc.contestant);
        return {
            category: {
                id: category.id,
                name: category.name,
                description: category.description,
                scoreCap: category.scoreCap,
            },
            contest: {
                id: category.contest.id,
                name: category.contest.name,
                eventName: category.contest.event.name,
            },
            criteria,
            contestants,
            scores,
            assignment: {
                id: assignment.id,
                status: assignment.status,
                assignedAt: assignment.assignedAt,
            },
        };
    }
    async submitScore(data, userId) {
        const { categoryId, contestantId, criterionId, score, comment, tenantId } = data;
        const judgeId = await this.getJudgeIdFromUser(userId, tenantId);
        if (!judgeId) {
            throw this.forbiddenError('User is not linked to a Judge record');
        }
        const assignment = await this.prisma.assignment.findFirst({
            where: {
                judgeId,
                categoryId,
                tenantId,
                status: { in: ['ACTIVE', 'COMPLETED'] },
            },
        });
        if (!assignment) {
            throw this.forbiddenError('Not assigned to this category');
        }
        let criterion = null;
        if (criterionId) {
            criterion = await this.prisma.criterion.findFirst({
                where: { id: criterionId, tenantId },
            });
            if (!criterion) {
                throw this.notFoundError('Criterion', criterionId);
            }
            if (score !== undefined && (score < 0 || score > criterion.maxScore)) {
                throw this.validationError(`Score must be between 0 and ${criterion.maxScore}`);
            }
        }
        const finalScore = score !== undefined ? score : null;
        const existingScore = await this.prisma.score.findFirst({
            where: {
                judgeId,
                categoryId,
                contestantId,
                tenantId,
                ...(criterionId && { criterionId }),
            },
        });
        let scoreRecord;
        if (existingScore) {
            scoreRecord = await this.prisma.score.update({
                where: { id: existingScore.id },
                data: {
                    score: finalScore,
                    ...(comment !== undefined && { comment }),
                },
                include: {
                    criterion: true,
                    contestant: true,
                },
            });
        }
        else {
            scoreRecord = await this.prisma.score.create({
                data: {
                    judgeId,
                    categoryId,
                    contestantId,
                    tenantId,
                    criterionId: criterionId || null,
                    score: finalScore,
                    comment: comment || null,
                },
                include: {
                    criterion: true,
                    contestant: true,
                },
            });
        }
        return scoreRecord;
    }
    async getCertificationWorkflow(categoryId, userId, tenantId) {
        const judgeId = await this.getJudgeIdFromUser(userId, tenantId);
        if (!judgeId) {
            throw this.forbiddenError('User is not linked to a Judge record');
        }
        const assignment = await this.prisma.assignment.findFirst({
            where: {
                judgeId,
                categoryId,
                tenantId,
                status: { in: ['ACTIVE', 'COMPLETED'] },
            },
        });
        if (!assignment) {
            throw this.forbiddenError('Not assigned to this category');
        }
        const category = await this.prisma.category.findFirst({
            where: { id: categoryId, tenantId },
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
        let certifications = [];
        try {
            certifications = await this.prisma.categoryCertification?.findMany({
                where: { categoryId, tenantId },
                orderBy: { certifiedAt: 'desc' },
            }) || [];
        }
        catch (error) {
            certifications = [];
        }
        return {
            category,
            assignment,
            certifications,
        };
    }
    async getContestantBios(categoryId, userId, tenantId) {
        const judgeId = await this.getJudgeIdFromUser(userId, tenantId);
        if (!judgeId) {
            throw this.forbiddenError('User is not linked to a Judge record');
        }
        const assignment = await this.prisma.assignment.findFirst({
            where: {
                judgeId,
                categoryId,
                tenantId,
            },
        });
        if (!assignment) {
            throw this.forbiddenError('Not assigned to this category');
        }
        const categoryContestants = await this.prisma.categoryContestant.findMany({
            where: { categoryId, tenantId },
            include: {
                contestant: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                name: true,
                                preferredName: true,
                                email: true,
                                bio: true,
                            },
                        },
                    },
                },
            },
        });
        const contestants = categoryContestants.map((cc) => cc.contestant);
        return contestants;
    }
    async getContestantBio(contestantId, userId, tenantId) {
        const judgeId = await this.getJudgeIdFromUser(userId, tenantId);
        if (!judgeId) {
            throw this.forbiddenError('User is not linked to a Judge record');
        }
        const contestant = await this.prisma.contestant.findFirst({
            where: { id: contestantId, tenantId },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        preferredName: true,
                        email: true,
                        bio: true,
                    },
                },
            },
        });
        if (!contestant) {
            throw this.notFoundError('Contestant', contestantId);
        }
        const categoryContestant = await this.prisma.categoryContestant.findFirst({
            where: {
                contestantId,
                tenantId,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        if (!categoryContestant) {
            throw this.notFoundError('Category assignment for contestant', contestantId);
        }
        const assignment = await this.prisma.assignment.findFirst({
            where: {
                judgeId,
                categoryId: categoryContestant.categoryId,
                tenantId,
            },
        });
        if (!assignment) {
            throw this.forbiddenError('Not assigned to this category');
        }
        return {
            ...contestant,
            category: categoryContestant.category,
        };
    }
    async getJudgeHistory(userId, tenantId, query = {}) {
        const judgeId = await this.getJudgeIdFromUser(userId, tenantId);
        if (!judgeId) {
            throw this.forbiddenError('User is not linked to a Judge record');
        }
        const { page = 1, limit = 50, categoryId, eventId } = query;
        const whereClause = {
            judgeId,
            tenantId,
            ...(categoryId && { categoryId }),
            ...(eventId && {
                category: {
                    contest: {
                        eventId,
                    },
                },
            }),
        };
        const [scores, total] = await Promise.all([
            this.prisma.score.findMany({
                where: whereClause,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    contestant: true,
                    criterion: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit),
            }),
            this.prisma.score.count({ where: whereClause }),
        ]);
        return {
            scores,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        };
    }
};
exports.JudgeService = JudgeService;
exports.JudgeService = JudgeService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], JudgeService);
//# sourceMappingURL=JudgeService.js.map