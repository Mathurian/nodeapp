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
exports.RestrictionService = void 0;
const client_1 = require("@prisma/client");
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
let RestrictionService = class RestrictionService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async setContestantViewRestriction(dto, _userId, userRole) {
        if (!['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
            throw this.forbiddenError('You do not have permission to set contestant view restrictions');
        }
        if (dto.eventId) {
            const event = await this.prisma.event.findUnique({
                where: { id: dto.eventId }
            });
            if (!event) {
                throw this.createNotFoundError('Event not found');
            }
            await this.prisma.event.update({
                where: { id: dto.eventId },
                data: {}
            });
            if (dto.restricted) {
                await this.prisma.contest.updateMany({
                    where: { eventId: dto.eventId },
                    data: {}
                });
            }
        }
        else if (dto.contestId) {
            const contest = await this.prisma.contest.findUnique({
                where: { id: dto.contestId }
            });
            if (!contest) {
                throw this.createNotFoundError('Contest not found');
            }
            await this.prisma.contest.update({
                where: { id: dto.contestId },
                data: {}
            });
        }
        else {
            throw this.validationError('Either eventId or contestId must be provided');
        }
    }
    async canContestantView(eventId, contestId) {
        if (contestId) {
            const contest = await this.prisma.contest.findUnique({
                where: { id: contestId },
                include: {
                    event: {
                        select: {
                            id: true,
                            contestantViewRestricted: true,
                            contestantViewReleaseDate: true
                        }
                    }
                }
            });
            if (!contest) {
                return false;
            }
            if (contest.event.contestantViewRestricted) {
                if (contest.event.contestantViewReleaseDate) {
                    return new Date() >= contest.event.contestantViewReleaseDate;
                }
                return false;
            }
            return true;
        }
        else if (eventId) {
            const event = await this.prisma.event.findUnique({
                where: { id: eventId }
            });
            if (!event) {
                return false;
            }
            if (event.contestantViewRestricted) {
                if (event.contestantViewReleaseDate) {
                    return new Date() >= event.contestantViewReleaseDate;
                }
                return false;
            }
            return true;
        }
        return true;
    }
    async lockEventContest(dto, userId, userRole) {
        if (!['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
            throw this.forbiddenError('You do not have permission to lock events/contests');
        }
        if (dto.eventId) {
            const event = await this.prisma.event.findUnique({
                where: { id: dto.eventId }
            });
            if (!event) {
                throw this.createNotFoundError('Event not found');
            }
            if (dto.locked) {
                await this.prisma.event.update({
                    where: { id: dto.eventId },
                    data: {
                        lockedAt: new Date(),
                        lockVerifiedBy: null,
                    }
                });
                await this.prisma.contest.updateMany({
                    where: { eventId: dto.eventId },
                    data: {
                        isLocked: true,
                        lockedAt: new Date(),
                        lockVerifiedBy: null
                    }
                });
            }
            else {
                if (!dto.verifiedBy || dto.verifiedBy === userId) {
                    throw this.validationError('Unlocking requires verification from a different admin/organizer/board user');
                }
                const verifier = await this.prisma.user.findUnique({
                    where: { id: dto.verifiedBy },
                    select: { role: true }
                });
                if (!verifier || !['ADMIN', 'ORGANIZER', 'BOARD'].includes(verifier.role)) {
                    throw this.validationError('Verifier must be an admin, organizer, or board member');
                }
                await this.prisma.event.update({
                    where: { id: dto.eventId },
                    data: {
                        lockVerifiedBy: dto.verifiedBy,
                    }
                });
                await this.prisma.contest.updateMany({
                    where: { eventId: dto.eventId },
                    data: {
                        lockVerifiedBy: dto.verifiedBy,
                    }
                });
            }
        }
        else if (dto.contestId) {
            const contest = await this.prisma.contest.findUnique({
                where: { id: dto.contestId }
            });
            if (!contest) {
                throw this.createNotFoundError('Contest not found');
            }
            if (dto.locked) {
                await this.prisma.contest.update({
                    where: { id: dto.contestId },
                    data: {
                        lockedAt: new Date(),
                        lockVerifiedBy: null,
                    }
                });
            }
            else {
                if (!dto.verifiedBy || dto.verifiedBy === userId) {
                    throw this.validationError('Unlocking requires verification from a different admin/organizer/board user');
                }
                const verifier = await this.prisma.user.findUnique({
                    where: { id: dto.verifiedBy },
                    select: { role: true }
                });
                if (!verifier || !['ADMIN', 'ORGANIZER', 'BOARD'].includes(verifier.role)) {
                    throw this.validationError('Verifier must be an admin, organizer, or board member');
                }
                await this.prisma.contest.update({
                    where: { id: dto.contestId },
                    data: {
                        lockVerifiedBy: dto.verifiedBy,
                    }
                });
            }
        }
        else {
            throw this.validationError('Either eventId or contestId must be provided');
        }
    }
    async isLocked(eventId, contestId) {
        if (contestId) {
            const contest = await this.prisma.contest.findUnique({
                where: { id: contestId },
                include: {
                    event: true
                }
            });
            if (!contest) {
                return false;
            }
            if (contest.event.isLocked) {
                return true;
            }
            return contest.isLocked;
        }
        else if (eventId) {
            const event = await this.prisma.event.findUnique({
                where: { id: eventId }
            });
            if (!event) {
                return false;
            }
            return event.isLocked;
        }
        return false;
    }
};
exports.RestrictionService = RestrictionService;
exports.RestrictionService = RestrictionService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], RestrictionService);
//# sourceMappingURL=RestrictionService.js.map