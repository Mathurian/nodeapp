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
exports.AssignmentService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const BaseService_1 = require("./BaseService");
let AssignmentService = class AssignmentService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getAllAssignments(filters) {
        const assignments = await this.prisma.assignment.findMany({
            where: {
                ...(filters.status && { status: filters.status }),
                ...(filters.judgeId && { judgeId: filters.judgeId }),
                ...(filters.categoryId && { categoryId: filters.categoryId }),
                ...(filters.contestId && { contestId: filters.contestId }),
                ...(filters.eventId && { eventId: filters.eventId }),
            },
            include: {
                judge: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        bio: true,
                        isHeadJudge: true,
                    },
                },
                assignedByUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        scoreCap: true,
                    },
                },
                contest: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                    },
                },
                event: {
                    select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true,
                    },
                },
            },
            orderBy: [{ priority: 'desc' }, { assignedAt: 'desc' }],
        });
        const categoryJudgeWhere = {};
        if (filters.judgeId) {
            categoryJudgeWhere.judgeId = filters.judgeId;
        }
        if (filters.categoryId) {
            categoryJudgeWhere.categoryId = filters.categoryId;
        }
        const categoryJudges = await this.prisma.categoryJudge.findMany({
            where: categoryJudgeWhere,
            include: {
                judge: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        bio: true,
                        isHeadJudge: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        scoreCap: true,
                        contest: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                event: {
                                    select: {
                                        id: true,
                                        name: true,
                                        startDate: true,
                                        endDate: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        const categoryJudgeAssignments = categoryJudges
            .map((cj) => {
            const contest = cj.category.contest;
            const event = contest.event;
            if (filters.contestId && contest.id !== filters.contestId)
                return null;
            if (filters.eventId && event.id !== filters.eventId)
                return null;
            return {
                id: `categoryJudge_${cj.categoryId}_${cj.judgeId}`,
                judgeId: cj.judgeId,
                categoryId: cj.categoryId,
                contestId: contest.id,
                eventId: event.id,
                status: 'ACTIVE',
                assignedAt: new Date(),
                assignedBy: null,
                notes: null,
                priority: 0,
                judge: cj.judge,
                category: {
                    id: cj.category.id,
                    name: cj.category.name,
                    description: cj.category.description,
                    scoreCap: cj.category.scoreCap,
                },
                contest: {
                    id: contest.id,
                    name: contest.name,
                    description: contest.description,
                },
                event: {
                    id: event.id,
                    name: event.name,
                    startDate: event.startDate,
                    endDate: event.endDate,
                },
                assignedByUser: null,
                _source: 'categoryJudge',
            };
        })
            .filter(Boolean);
        const assignmentMap = new Map();
        categoryJudgeAssignments.forEach((assignment) => {
            const key = `${assignment.judgeId}_${assignment.categoryId}`;
            assignmentMap.set(key, assignment);
        });
        assignments.forEach((assignment) => {
            const key = `${assignment.judgeId}_${assignment.categoryId}`;
            assignmentMap.set(key, assignment);
        });
        return Array.from(assignmentMap.values());
    }
    async createAssignment(data, userId) {
        this.validateRequired(data, ['judgeId']);
        if (!data.categoryId && !data.contestId) {
            throw this.createBadRequestError('Either categoryId or contestId is required');
        }
        let finalContestId = data.contestId;
        let finalEventId = data.eventId;
        if (data.categoryId) {
            const category = await this.prisma.category.findUnique({
                where: { id: data.categoryId },
                include: {
                    contest: {
                        include: {
                            event: true,
                        },
                    },
                },
            });
            if (!category) {
                throw this.createNotFoundError('Category not found');
            }
            finalContestId = category.contestId;
            finalEventId = category.contest.eventId;
            const existingAssignment = await this.prisma.assignment.findUnique({
                where: {
                    judgeId_categoryId: { judgeId: data.judgeId, categoryId: data.categoryId },
                },
            });
            if (existingAssignment) {
                throw this.conflictError('Assignment already exists for this judge and category');
            }
        }
        else if (data.contestId && !data.eventId) {
            const contest = await this.prisma.contest.findUnique({
                where: { id: data.contestId },
                include: { event: true },
            });
            if (!contest) {
                throw this.createNotFoundError('Contest not found');
            }
            finalEventId = contest.eventId;
        }
        return await this.prisma.assignment.create({
            data: {
                judgeId: data.judgeId,
                categoryId: data.categoryId || null,
                contestId: finalContestId || null,
                eventId: finalEventId || null,
                notes: data.notes || null,
                priority: data.priority || 0,
                status: 'PENDING',
                assignedBy: userId,
                assignedAt: new Date(),
            },
            include: {
                judge: true,
                category: true,
                contest: true,
                event: true,
                assignedByUser: true,
            },
        });
    }
    async getAssignmentById(id) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id },
            include: {
                judge: true,
                category: true,
                contest: true,
                event: true,
                assignedByUser: true,
            },
        });
        if (!assignment) {
            throw this.createNotFoundError('Assignment not found');
        }
        return assignment;
    }
    async updateAssignment(id, data) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id },
        });
        if (!assignment) {
            throw this.createNotFoundError('Assignment not found');
        }
        return await this.prisma.assignment.update({
            where: { id },
            data,
            include: {
                judge: true,
                category: true,
                contest: true,
                event: true,
                assignedByUser: true,
            },
        });
    }
    async deleteAssignment(id) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id },
        });
        if (!assignment) {
            throw this.createNotFoundError('Assignment not found');
        }
        await this.prisma.assignment.delete({
            where: { id },
        });
    }
    async getAssignmentsForJudge(judgeId) {
        return await this.prisma.assignment.findMany({
            where: { judgeId },
            include: {
                category: true,
                contest: true,
                event: true,
            },
            orderBy: [{ priority: 'desc' }, { assignedAt: 'desc' }],
        });
    }
    async getAssignmentsForCategory(categoryId) {
        return await this.prisma.assignment.findMany({
            where: { categoryId },
            include: {
                judge: true,
                assignedByUser: true,
            },
            orderBy: [{ priority: 'desc' }, { assignedAt: 'desc' }],
        });
    }
    async bulkAssignJudges(categoryId, judgeIds, userId) {
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
            throw this.createNotFoundError('Category not found');
        }
        let assignedCount = 0;
        for (const judgeId of judgeIds) {
            const existingAssignment = await this.prisma.assignment.findUnique({
                where: {
                    judgeId_categoryId: { judgeId, categoryId },
                },
            });
            if (!existingAssignment) {
                await this.prisma.assignment.create({
                    data: {
                        judgeId,
                        categoryId,
                        contestId: category.contestId,
                        eventId: category.contest.eventId,
                        status: 'PENDING',
                        assignedBy: userId,
                        assignedAt: new Date(),
                    },
                });
                assignedCount++;
            }
        }
        return assignedCount;
    }
    async getJudges() {
        return await this.prisma.judge.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                bio: true,
                isHeadJudge: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
    }
    async getContestants() {
        const contestants = await this.prisma.contestant.findMany({
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
        return contestants.map(contestant => ({
            id: contestant.id,
            name: contestant.name,
            email: contestant.users && contestant.users.length > 0
                ? contestant.users.find(u => u.role === 'CONTESTANT')?.email || contestant.users[0].email || contestant.email
                : contestant.email,
            contestantNumber: contestant.contestantNumber,
            bio: contestant.bio,
        }));
    }
    async getCategories() {
        return await this.prisma.category.findMany({
            where: {
                contest: {
                    event: {
                        archived: false
                    }
                }
            },
            include: {
                contest: {
                    select: {
                        id: true,
                        name: true,
                        event: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    }
    async getAllContestantAssignments(filters) {
        const where = {};
        if (filters?.categoryId) {
            where.categoryId = filters.categoryId;
        }
        if (filters?.contestId) {
            where.category = {
                contestId: filters.contestId,
            };
        }
        return await this.prisma.categoryContestant.findMany({
            where,
            include: {
                contestant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        contestantNumber: true,
                    },
                },
                category: {
                    include: {
                        contest: {
                            include: {
                                event: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                contestant: {
                    name: 'asc',
                },
            },
        });
    }
    async getCategoryContestants(categoryId) {
        return await this.prisma.categoryContestant.findMany({
            where: { categoryId },
            include: {
                contestant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        contestantNumber: true,
                        bio: true,
                    },
                },
            },
            orderBy: {
                contestant: {
                    name: 'asc',
                },
            },
        });
    }
    async assignContestantToCategory(categoryId, contestantId) {
        const category = await this.prisma.category.findUnique({
            where: { id: categoryId },
            include: {
                contest: {
                    include: {
                        event: true
                    }
                }
            }
        });
        if (!category) {
            throw this.createNotFoundError('Category not found');
        }
        const existing = await this.prisma.categoryContestant.findUnique({
            where: {
                categoryId_contestantId: {
                    categoryId,
                    contestantId,
                },
            },
        });
        if (existing) {
            throw this.conflictError('Contestant is already assigned to this category');
        }
        return await this.prisma.categoryContestant.create({
            data: {
                categoryId,
                contestantId,
            },
            include: {
                contestant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        contestantNumber: true,
                    },
                },
                category: {
                    include: {
                        contest: {
                            include: {
                                event: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }
    async removeContestantFromCategory(categoryId, contestantId) {
        await this.prisma.categoryContestant.delete({
            where: {
                categoryId_contestantId: {
                    categoryId,
                    contestantId,
                },
            },
        });
    }
    async createJudge(data) {
        this.validateRequired(data, ['name']);
        return await this.prisma.judge.create({
            data: {
                name: data.name,
                email: data.email || null,
                bio: data.bio || null,
                isHeadJudge: data.isHeadJudge || false,
                gender: data.gender || null,
                pronouns: data.pronouns || null,
            },
        });
    }
    async updateJudge(id, data) {
        return await this.prisma.judge.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.email !== undefined && { email: data.email || null }),
                ...(data.bio !== undefined && { bio: data.bio || null }),
                ...(data.isHeadJudge !== undefined && { isHeadJudge: data.isHeadJudge }),
                ...(data.gender !== undefined && { gender: data.gender || null }),
                ...(data.pronouns !== undefined && { pronouns: data.pronouns || null }),
            },
        });
    }
    async deleteJudge(id) {
        await this.prisma.judge.delete({
            where: { id },
        });
    }
    async createContestant(data) {
        this.validateRequired(data, ['name']);
        return await this.prisma.contestant.create({
            data: {
                name: data.name,
                email: data.email || null,
                contestantNumber: data.contestantNumber || null,
                bio: data.bio || null,
                gender: data.gender || null,
                pronouns: data.pronouns || null,
            },
        });
    }
    async updateContestant(id, data) {
        return await this.prisma.contestant.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.email !== undefined && { email: data.email || null }),
                ...(data.contestantNumber !== undefined && { contestantNumber: data.contestantNumber || null }),
                ...(data.bio !== undefined && { bio: data.bio || null }),
                ...(data.gender !== undefined && { gender: data.gender || null }),
                ...(data.pronouns !== undefined && { pronouns: data.pronouns || null }),
            },
        });
    }
    async deleteContestant(id) {
        await this.prisma.contestant.delete({
            where: { id },
        });
    }
    async bulkDeleteJudges(judgeIds) {
        if (!judgeIds || judgeIds.length === 0) {
            throw this.validationError('No judge IDs provided');
        }
        const result = await this.prisma.judge.deleteMany({
            where: {
                id: {
                    in: judgeIds,
                },
            },
        });
        return { deletedCount: result.count };
    }
    async bulkDeleteContestants(contestantIds) {
        if (!contestantIds || contestantIds.length === 0) {
            throw this.validationError('No contestant IDs provided');
        }
        const result = await this.prisma.contestant.deleteMany({
            where: {
                id: {
                    in: contestantIds,
                },
            },
        });
        return { deletedCount: result.count };
    }
    async removeAllAssignmentsForCategory(categoryId) {
        const result = await this.prisma.assignment.deleteMany({
            where: { categoryId },
        });
        return result.count;
    }
};
exports.AssignmentService = AssignmentService;
exports.AssignmentService = AssignmentService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], AssignmentService);
//# sourceMappingURL=AssignmentService.js.map