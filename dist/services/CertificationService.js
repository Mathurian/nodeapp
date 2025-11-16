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
exports.CertificationService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let CertificationService = class CertificationService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getOverallStatus(eventId) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            include: {}
        });
        if (!event)
            throw this.notFoundError('Event', eventId);
        return {
            event: event.name,
            contests: []
        };
    }
    async certifyAll(eventId, userId, userRole) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
        });
        if (!event)
            throw this.notFoundError('Event', eventId);
        return { success: true, message: 'All categories certified (contests not available)' };
    }
};
exports.CertificationService = CertificationService;
exports.CertificationService = CertificationService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], CertificationService);
//# sourceMappingURL=CertificationService.js.map