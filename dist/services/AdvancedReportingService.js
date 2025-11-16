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
exports.AdvancedReportingService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let AdvancedReportingService = class AdvancedReportingService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async generateScoreReport(eventId, contestId, categoryId) {
        const where = {};
        if (categoryId)
            where.categoryId = categoryId;
        else if (contestId)
            where.category = { contestId };
        else if (eventId)
            where.category = { contest: { eventId } };
        const scores = await this.prisma.score.findMany({
            where,
            include: {
                judge: { select: { name: true } },
                contestant: { select: { name: true } },
                category: { select: { name: true, contest: { select: { name: true } } } }
            }
        });
        return { scores, total: scores.length };
    }
    async generateSummaryReport(eventId) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            include: {
                contests: {
                    include: {
                        categories: {
                            include: {
                                scores: true,
                                contestants: true,
                                judges: true
                            }
                        }
                    }
                }
            }
        });
        if (!event)
            throw this.notFoundError('Event', eventId);
        return {
            event: event.name,
            contests: event.contests.length,
            categories: event.contests.reduce((sum, c) => sum + c.categories.length, 0),
            totalScores: event.contests.reduce((sum, c) => sum + c.categories.reduce((s, cat) => s + cat.scores.length, 0), 0)
        };
    }
};
exports.AdvancedReportingService = AdvancedReportingService;
exports.AdvancedReportingService = AdvancedReportingService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], AdvancedReportingService);
//# sourceMappingURL=AdvancedReportingService.js.map