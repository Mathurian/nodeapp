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
exports.ContestCertificationService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let ContestCertificationService = class ContestCertificationService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getCertificationProgress(contestId) {
        const contest = await this.prisma.contest.findUnique({
            where: { id: contestId },
            select: {
                id: true,
                name: true,
                description: true,
                eventId: true
            }
        });
        if (!contest)
            throw this.notFoundError('Contest', contestId);
        const certs = await this.prisma.contestCertification.findMany({
            where: { contestId }
        });
        const byRole = certs.reduce((acc, c) => {
            acc[c.role] = c;
            return acc;
        }, {});
        return {
            contestId,
            tallyMaster: !!byRole['TALLY_MASTER'],
            auditor: !!byRole['AUDITOR'],
            board: !!byRole['BOARD'],
            organizer: !!byRole['ORGANIZER'],
            certifications: certs
        };
    }
    async certifyContest(contestId, userId, userRole, tenantId) {
        const allowedRoles = ['TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER'];
        if (!allowedRoles.includes(userRole)) {
            throw this.forbiddenError('Role not authorized to certify contest');
        }
        const contest = await this.prisma.contest.findUnique({
            where: { id: contestId }
        });
        if (!contest)
            throw this.notFoundError('Contest', contestId);
        const existing = await this.prisma.contestCertification.findFirst({
            where: { contestId, role: userRole }
        });
        if (existing) {
            throw this.badRequestError('Contest already certified for this role');
        }
        return await this.prisma.contestCertification.create({
            data: {
                tenantId,
                contestId,
                role: userRole,
                userId
            }
        });
    }
};
exports.ContestCertificationService = ContestCertificationService;
exports.ContestCertificationService = ContestCertificationService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], ContestCertificationService);
//# sourceMappingURL=ContestCertificationService.js.map