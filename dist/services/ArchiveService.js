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
exports.ArchiveService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const BaseService_1 = require("./BaseService");
let ArchiveService = class ArchiveService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getAllArchives() {
        return await this.prisma.archivedEvent.findMany({
            include: {
                event: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getActiveEvents() {
        return await this.prisma.event.findMany({
            where: { archived: false },
            include: {
                _count: {
                    select: {
                        contests: true,
                        contestants: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getArchivedEvents() {
        return await this.prisma.event.findMany({
            where: { archived: true },
            include: {
                _count: {
                    select: {
                        contests: true,
                        contestants: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async archiveItem(id, reason, userId) {
        const archive = await this.prisma.archivedEvent.create({
            data: {
                eventId: id,
                reason,
                archivedBy: userId,
            },
        });
        return archive;
    }
    async restoreItem(id) {
        await this.prisma.archivedEvent.deleteMany({
            where: {
                eventId: id,
            },
        });
        return { message: 'Item restored successfully' };
    }
    async deleteArchivedItem(id) {
        await this.prisma.archivedEvent.deleteMany({
            where: {
                eventId: id,
            },
        });
        return { message: 'Archived item deleted successfully' };
    }
    async archiveEvent(eventId, userId, reason) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
        });
        if (!event) {
            throw this.notFoundError('Event', eventId);
        }
        await this.prisma.event.update({
            where: { id: eventId },
            data: { archived: true },
        });
        const archive = await this.prisma.archivedEvent.create({
            data: {
                eventId,
                name: event.name,
                description: event.description,
                startDate: event.startDate,
                endDate: event.endDate,
                archivedById: userId,
            },
        });
        return archive;
    }
    async restoreEvent(eventId) {
        await this.prisma.event.update({
            where: { id: eventId },
            data: { archived: false },
        });
        await this.prisma.archivedEvent.deleteMany({
            where: {
                eventId,
            },
        });
        return { message: 'Event restored successfully' };
    }
};
exports.ArchiveService = ArchiveService;
exports.ArchiveService = ArchiveService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], ArchiveService);
//# sourceMappingURL=ArchiveService.js.map