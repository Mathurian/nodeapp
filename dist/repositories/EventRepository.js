"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRepository = void 0;
const tsyringe_1 = require("tsyringe");
const BaseRepository_1 = require("./BaseRepository");
let EventRepository = class EventRepository extends BaseRepository_1.BaseRepository {
    getModelName() {
        return 'event';
    }
    async findActiveEvents() {
        return this.findMany({ archived: false }, { orderBy: { startDate: 'desc' } });
    }
    async findArchivedEvents() {
        return this.findMany({ archived: true }, { orderBy: { startDate: 'desc' } });
    }
    async findUpcomingEvents() {
        const now = new Date();
        return this.findMany({
            archived: false,
            startDate: { gte: now }
        }, { orderBy: { startDate: 'asc' } });
    }
    async findOngoingEvents() {
        const now = new Date();
        return this.findMany({
            archived: false,
            startDate: { lte: now },
            endDate: { gte: now }
        });
    }
    async findPastEvents() {
        const now = new Date();
        return this.findMany({
            archived: false,
            endDate: { lt: now }
        }, { orderBy: { endDate: 'desc' } });
    }
    async findEventWithDetails(eventId) {
        return this.getModel().findUnique({
            where: { id: eventId },
            include: {
                contests: {
                    include: {
                        categories: true,
                        contestants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true
                                    }
                                }
                            }
                        },
                        judges: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                },
                assignments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            }
        });
    }
    async findEventsByDateRange(startDate, endDate) {
        return this.findMany({
            OR: [
                {
                    startDate: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                {
                    endDate: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                {
                    AND: [
                        { startDate: { lte: startDate } },
                        { endDate: { gte: endDate } }
                    ]
                }
            ]
        });
    }
    async searchEvents(query) {
        return this.findMany({
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { location: { contains: query, mode: 'insensitive' } }
            ]
        });
    }
    async archiveEvent(eventId) {
        return this.update(eventId, { archived: true });
    }
    async unarchiveEvent(eventId) {
        return this.update(eventId, { archived: false });
    }
    async getEventStats(eventId) {
        const event = await this.getModel().findUnique({
            where: { id: eventId },
            include: {
                contests: {
                    include: {
                        categories: true,
                        contestants: true,
                        judges: true,
                        _count: {
                            select: {
                                scores: true
                            }
                        }
                    }
                }
            }
        });
        if (!event) {
            return {
                totalContests: 0,
                totalCategories: 0,
                totalContestants: 0,
                totalJudges: 0,
                totalScores: 0
            };
        }
        const totalCategories = event.contests.reduce((sum, contest) => sum + contest.categories.length, 0);
        const contestantIds = new Set();
        const judgeIds = new Set();
        let totalScores = 0;
        event.contests.forEach((contest) => {
            contest.contestants.forEach((c) => contestantIds.add(c.userId));
            contest.judges.forEach((j) => judgeIds.add(j.userId));
            totalScores += contest._count.scores;
        });
        return {
            totalContests: event.contests.length,
            totalCategories,
            totalContestants: contestantIds.size,
            totalJudges: judgeIds.size,
            totalScores
        };
    }
    async getEventsRequiringAttention() {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        return this.getModel().findMany({
            where: {
                archived: false,
                startDate: {
                    lte: threeDaysFromNow,
                    gte: new Date()
                },
                contests: {
                    none: {}
                }
            }
        });
    }
};
exports.EventRepository = EventRepository;
exports.EventRepository = EventRepository = __decorate([
    (0, tsyringe_1.injectable)()
], EventRepository);
//# sourceMappingURL=EventRepository.js.map