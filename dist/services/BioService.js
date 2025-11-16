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
exports.BioService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let BioService = class BioService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getContestantBios(filters) {
        const where = {};
        if (filters.eventId) {
            where.contestContestants = {
                some: {
                    contest: {
                        eventId: filters.eventId
                    }
                }
            };
        }
        if (filters.contestId) {
            where.contestContestants = {
                some: {
                    contestId: filters.contestId
                }
            };
        }
        if (filters.categoryId) {
            where.categoryContestants = {
                some: {
                    categoryId: filters.categoryId
                }
            };
        }
        return await this.prisma.contestant.findMany({
            where,
            select: {
                id: true,
                name: true,
                bio: true,
                imagePath: true,
                gender: true,
                pronouns: true,
                contestantNumber: true,
                contestContestants: {
                    select: {
                        contest: {
                            select: {
                                id: true,
                                name: true,
                                event: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                },
                categoryContestants: {
                    select: {
                        category: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { contestantNumber: 'asc' }
        });
    }
    async getJudgeBios(filters) {
        const where = {};
        if (filters.eventId) {
            where.contestJudges = {
                some: {
                    contest: {
                        eventId: filters.eventId
                    }
                }
            };
        }
        if (filters.contestId) {
            where.contestJudges = {
                some: {
                    contestId: filters.contestId
                }
            };
        }
        if (filters.categoryId) {
            where.categoryJudges = {
                some: {
                    categoryId: filters.categoryId
                }
            };
        }
        return await this.prisma.judge.findMany({
            where,
            select: {
                id: true,
                name: true,
                bio: true,
                imagePath: true,
                gender: true,
                pronouns: true,
                isHeadJudge: true,
                contestJudges: {
                    select: {
                        contest: {
                            select: {
                                id: true,
                                name: true,
                                event: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                },
                categoryJudges: {
                    select: {
                        category: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
    }
    async updateContestantBio(contestantId, data) {
        const updateData = {};
        if (data.bio !== undefined) {
            updateData.bio = data.bio;
        }
        if (data.imagePath !== undefined) {
            updateData.imagePath = data.imagePath;
        }
        const contestant = await this.prisma.contestant.findUnique({
            where: { id: contestantId }
        });
        if (!contestant) {
            throw this.notFoundError('Contestant', contestantId);
        }
        return await this.prisma.contestant.update({
            where: { id: contestantId },
            data: updateData,
            select: {
                id: true,
                name: true,
                bio: true,
                imagePath: true
            }
        });
    }
    async updateJudgeBio(judgeId, data) {
        const updateData = {};
        if (data.bio !== undefined) {
            updateData.bio = data.bio;
        }
        if (data.imagePath !== undefined) {
            updateData.imagePath = data.imagePath;
        }
        const judge = await this.prisma.judge.findUnique({
            where: { id: judgeId }
        });
        if (!judge) {
            throw this.notFoundError('Judge', judgeId);
        }
        return await this.prisma.judge.update({
            where: { id: judgeId },
            data: updateData,
            select: {
                id: true,
                name: true,
                bio: true,
                imagePath: true
            }
        });
    }
};
exports.BioService = BioService;
exports.BioService = BioService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], BioService);
//# sourceMappingURL=BioService.js.map