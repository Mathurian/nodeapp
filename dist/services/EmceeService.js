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
exports.EmceeService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let EmceeService = class EmceeService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getStats() {
        const stats = {
            totalScripts: await this.prisma.emceeScript.count(),
            totalEvents: await this.prisma.event.count(),
            totalContests: await this.prisma.contest.count(),
            totalCategories: await this.prisma.category.count(),
        };
        return stats;
    }
    async getScripts(filters) {
        const whereClause = {};
        if (filters.eventId)
            whereClause.eventId = filters.eventId;
        if (filters.contestId)
            whereClause.contestId = filters.contestId;
        if (filters.categoryId)
            whereClause.categoryId = filters.categoryId;
        const scripts = await this.prisma.emceeScript.findMany({
            where: whereClause,
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        });
        return scripts;
    }
    async getScript(scriptId) {
        const script = await this.prisma.emceeScript.findUnique({
            where: { id: scriptId },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        startDate: true,
                        endDate: true,
                    },
                },
                contest: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        startTime: true,
                        endTime: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        maxScore: true,
                    },
                },
                author: {
                    select: {
                        id: true,
                        name: true,
                        preferredName: true,
                        email: true,
                    },
                },
            },
        });
        if (!script) {
            throw this.notFoundError('Script', scriptId);
        }
        return script;
    }
    async getContestantBios(filters) {
        if (filters.categoryId) {
            const assignments = await this.prisma.categoryContestant.findMany({
                where: { categoryId: filters.categoryId },
                include: {
                    contestant: {
                        include: {
                            users: {
                                select: {
                                    id: true,
                                    name: true,
                                    preferredName: true,
                                    email: true,
                                    pronouns: true,
                                    gender: true,
                                    imagePath: true,
                                    phone: true,
                                    address: true,
                                    city: true,
                                    state: true,
                                    zipCode: true,
                                    country: true,
                                    bio: true,
                                    contestantBio: true,
                                    grade: true,
                                    parentGuardian: true,
                                    parentPhone: true,
                                },
                            },
                            contestContestants: {
                                include: {
                                    contest: {
                                        include: {
                                            event: {
                                                select: {
                                                    id: true,
                                                    name: true,
                                                    description: true,
                                                    startDate: true,
                                                    endDate: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            categoryContestants: {
                                include: {
                                    category: {
                                        select: {
                                            id: true,
                                            name: true,
                                            description: true,
                                            scoreCap: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            return assignments.map((a) => a.contestant);
        }
        let categoryIds = [];
        if (filters.eventId) {
            const contests = await this.prisma.contest.findMany({
                where: { eventId: filters.eventId },
                select: { id: true },
            });
            const categories = await this.prisma.category.findMany({
                where: { contestId: { in: contests.map((c) => c.id) } },
                select: { id: true },
            });
            categoryIds = categories.map((c) => c.id);
        }
        else if (filters.contestId) {
            const categories = await this.prisma.category.findMany({
                where: { contestId: filters.contestId },
                select: { id: true },
            });
            categoryIds = categories.map((c) => c.id);
        }
        if (categoryIds.length === 0) {
            return [];
        }
        const assignments = await this.prisma.categoryContestant.findMany({
            where: { categoryId: { in: categoryIds } },
            include: {
                contestant: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                name: true,
                                preferredName: true,
                                email: true,
                                pronouns: true,
                            },
                        },
                        contestContestants: {
                            include: {
                                contest: {
                                    include: {
                                        event: {
                                            select: {
                                                id: true,
                                                name: true,
                                                description: true,
                                                startDate: true,
                                                endDate: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        categoryContestants: {
                            include: {
                                category: {
                                    select: {
                                        id: true,
                                        name: true,
                                        description: true,
                                        scoreCap: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        const seen = new Map();
        const contestants = [];
        for (const assignment of assignments) {
            if (!seen.has(assignment.contestant.id)) {
                seen.set(assignment.contestant.id, true);
                contestants.push(assignment.contestant);
            }
        }
        return contestants.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    async getJudgeBios(filters) {
        let userIds = null;
        if (filters.eventId || filters.contestId || filters.categoryId) {
            let contestIds = [];
            if (filters.eventId) {
                const contests = await this.prisma.contest.findMany({
                    where: { eventId: filters.eventId },
                    select: { id: true },
                });
                contestIds = contests.map((c) => c.id);
            }
            else if (filters.contestId) {
                contestIds = [filters.contestId];
            }
            const assignmentFilter = {};
            if (filters.categoryId) {
                assignmentFilter.categoryId = filters.categoryId;
            }
            if (contestIds.length > 0) {
                assignmentFilter.contestId = { in: contestIds };
            }
            const assignments = await this.prisma.assignment.findMany({
                where: assignmentFilter,
                select: { judgeId: true },
                distinct: ['judgeId'],
            });
            const judgeIds = assignments.map((a) => a.judgeId).filter(Boolean);
            if (judgeIds.length === 0) {
                return [];
            }
            const judges = await this.prisma.judge.findMany({
                where: { id: { in: judgeIds } },
                include: {
                    users: {
                        select: { id: true },
                    },
                },
            });
            userIds = judges.flatMap((j) => (j.users || []).map((u) => u.id));
            if (userIds.length === 0) {
                return [];
            }
        }
        const whereClause = {
            role: { in: ['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER'] },
            judgeId: { not: null },
        };
        if (userIds !== null) {
            whereClause.id = { in: userIds };
        }
        const judges = await this.prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                preferredName: true,
                email: true,
                role: true,
                pronouns: true,
                gender: true,
                imagePath: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                judgeBio: true,
                judgeSpecialties: true,
                judgeCertifications: true,
                judge: {
                    select: {
                        id: true,
                        bio: true,
                        imagePath: true,
                        isHeadJudge: true,
                    },
                },
                createdAt: true,
            },
            orderBy: { name: 'asc' },
        });
        return judges;
    }
    async getEvents() {
        const events = await this.prisma.event.findMany({
            include: {
                contests: {
                    include: {
                        categories: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                scoreCap: true,
                            },
                        },
                    },
                },
            },
            orderBy: { startDate: 'asc' },
        });
        return events;
    }
    async getEvent(eventId) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            include: {
                contests: {
                    include: {
                        categories: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                scoreCap: true,
                            },
                        },
                    },
                },
            },
        });
        if (!event) {
            throw this.notFoundError('Event', eventId);
        }
        return event;
    }
    async getContests(eventId) {
        const whereClause = {};
        if (eventId)
            whereClause.eventId = eventId;
        const contests = await this.prisma.contest.findMany({
            where: whereClause,
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        startDate: true,
                        endDate: true,
                    },
                },
                categories: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        scoreCap: true,
                    },
                    orderBy: { name: 'asc' },
                },
            },
        });
        return contests;
    }
    async getContest(contestId) {
        const contest = await this.prisma.contest.findUnique({
            where: { id: contestId },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        startDate: true,
                        endDate: true,
                    },
                },
                categories: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        scoreCap: true,
                    },
                    orderBy: { name: 'asc' },
                },
            },
        });
        if (!contest) {
            throw this.notFoundError('Contest', contestId);
        }
        return contest;
    }
    async getEmceeHistory(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const scripts = await this.prisma.emceeScript.findMany({
            where: { isActive: true },
            include: {
                event: true,
                contest: true,
                category: true,
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
        });
        const total = await this.prisma.emceeScript.count();
        return {
            scripts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async uploadScript(data) {
        this.validateRequired(data, ['title', 'tenantId']);
        if (!data.content && !data.filePath) {
            throw this.validationError('Content or file is required');
        }
        const script = await this.prisma.emceeScript.create({
            data: {
                tenantId: data.tenantId,
                title: data.title,
                content: data.content || `Script file: ${data.filePath}`,
                file_path: data.filePath || null,
                eventId: data.eventId || null,
                contestId: data.contestId || null,
                categoryId: data.categoryId || null,
                order: data.order || 0,
            },
        });
        return script;
    }
    async updateScript(id, data) {
        const script = await this.prisma.emceeScript.update({
            where: { id },
            data: {
                title: data.title,
                content: data.content,
                eventId: data.eventId || null,
                contestId: data.contestId || null,
                categoryId: data.categoryId || null,
                order: data.order || 0,
            },
        });
        return script;
    }
    async deleteScript(id) {
        await this.prisma.emceeScript.delete({
            where: { id },
        });
    }
    async getScriptFileInfo(scriptId) {
        const script = await this.prisma.emceeScript.findUnique({
            where: { id: scriptId },
        });
        if (!script || !script.file_path) {
            throw this.notFoundError('Script file', scriptId);
        }
        return script;
    }
};
exports.EmceeService = EmceeService;
exports.EmceeService = EmceeService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], EmceeService);
//# sourceMappingURL=EmceeService.js.map