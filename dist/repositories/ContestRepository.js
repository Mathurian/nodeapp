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
exports.ContestRepository = void 0;
const client_1 = require("@prisma/client");
const tsyringe_1 = require("tsyringe");
const BaseRepository_1 = require("./BaseRepository");
let ContestRepository = class ContestRepository extends BaseRepository_1.BaseRepository {
    constructor(prisma) {
        super(prisma);
    }
    getModelName() {
        return 'contest';
    }
    async findByEventId(eventId, includeArchivedEvents = false) {
        const where = { eventId };
        if (!includeArchivedEvents) {
            where.event = {
                archived: false
            };
        }
        return this.findMany(where, { orderBy: { createdAt: 'asc' } });
    }
    async findByEventIdWithArchived(eventId, includeArchivedContests = false) {
        const where = { eventId };
        if (!includeArchivedContests) {
            where.archived = false;
        }
        return this.findMany(where, { orderBy: { createdAt: 'asc' } });
    }
    async findActiveByEventId(eventId) {
        return this.findMany({
            eventId,
            archived: false,
            event: {
                archived: false
            }
        }, { orderBy: { createdAt: 'asc' } });
    }
    async findArchivedContests() {
        return this.findMany({ archived: true }, { orderBy: { createdAt: 'desc' } });
    }
    async findContestWithDetails(contestId) {
        return this.getModel().findUnique({
            where: { id: contestId },
            include: {
                event: true,
                categories: {
                    include: {
                        criteria: true,
                        judges: {
                            include: {
                                judge: {
                                    include: {
                                        users: {
                                            select: {
                                                id: true,
                                                name: true,
                                                email: true,
                                                preferredName: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        contestants: {
                            include: {
                                contestant: {
                                    include: {
                                        users: {
                                            select: {
                                                id: true,
                                                name: true,
                                                email: true,
                                                preferredName: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                contestants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                preferredName: true,
                                contestantNumber: true,
                            },
                        },
                    },
                },
                judges: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                preferredName: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async findContestWithScores(contestId) {
        return this.getModel().findUnique({
            where: { id: contestId },
            include: {
                categories: {
                    include: {
                        criteria: true,
                        contestants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        preferredName: true,
                                        contestantNumber: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }
    async searchContests(query) {
        return this.findMany({
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
            ],
        });
    }
    async archiveContest(contestId) {
        return this.update(contestId, { archived: true });
    }
    async unarchiveContest(contestId) {
        return this.update(contestId, { archived: false });
    }
    async getContestStats(contestId) {
        const contest = await this.getModel().findUnique({
            where: { id: contestId },
            include: {
                categories: {
                    include: {
                        _count: {
                            select: {
                                contestants: true,
                                judges: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        contestants: true,
                        judges: true,
                    },
                },
            },
        });
        if (!contest) {
            return {
                totalCategories: 0,
                totalContestants: 0,
                totalJudges: 0,
                totalScores: 0,
            };
        }
        return {
            totalCategories: contest.categories.length,
            totalContestants: contest._count.contestants,
            totalJudges: contest._count.judges,
            totalScores: 0,
        };
    }
    async getNextContestantNumber(contestId) {
        const contest = await this.findById(contestId);
        return contest?.nextContestantNumber || 1;
    }
    async incrementContestantNumber(contestId) {
        const contest = await this.findById(contestId);
        if (!contest) {
            throw new Error('Contest not found');
        }
        const nextNumber = (contest.nextContestantNumber || 1) + 1;
        return this.update(contestId, { nextContestantNumber: nextNumber });
    }
};
exports.ContestRepository = ContestRepository;
exports.ContestRepository = ContestRepository = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], ContestRepository);
//# sourceMappingURL=ContestRepository.js.map