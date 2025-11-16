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
exports.RoleAssignmentService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let RoleAssignmentService = class RoleAssignmentService extends BaseService_1.BaseService {
    prisma;
    VALID_ROLES = ['BOARD', 'TALLY_MASTER', 'AUDITOR'];
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async getAll(filters) {
        const whereClause = {};
        if (filters.role)
            whereClause.role = filters.role;
        if (filters.contestId)
            whereClause.contestId = filters.contestId;
        if (filters.eventId)
            whereClause.eventId = filters.eventId;
        if (filters.categoryId)
            whereClause.categoryId = filters.categoryId;
        return await this.prisma.roleAssignment.findMany({
            where: whereClause,
            orderBy: [{ assignedAt: 'desc' }]
        });
    }
    async create(data) {
        if (!data.userId || !data.role) {
            throw this.badRequestError('userId and role are required');
        }
        if (!data.contestId && !data.eventId && !data.categoryId) {
            throw this.badRequestError('At least one of contestId, eventId, or categoryId is required');
        }
        if (!this.VALID_ROLES.includes(data.role)) {
            throw this.badRequestError('Invalid role');
        }
        const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
        if (!user)
            throw this.notFoundError('User', data.userId);
        const existingAssignment = await this.prisma.roleAssignment.findFirst({
            where: {
                userId: data.userId,
                role: data.role,
                contestId: data.contestId || null,
                eventId: data.eventId || null,
                categoryId: data.categoryId || null,
                isActive: true
            }
        });
        if (existingAssignment) {
            throw this.badRequestError('This assignment already exists');
        }
        return await this.prisma.roleAssignment.create({
            data: {
                tenantId: '',
                userId: data.userId,
                role: data.role,
                contestId: data.contestId || null,
                eventId: data.eventId || null,
                categoryId: data.categoryId || null,
                assignedBy: data.assignedBy
            }
        });
    }
    async update(id, data) {
        const assignment = await this.prisma.roleAssignment.findUnique({ where: { id } });
        if (!assignment)
            throw this.notFoundError('Assignment', id);
        return await this.prisma.roleAssignment.update({
            where: { id },
            data: {
                ...(data.isActive !== undefined && { isActive: data.isActive })
            }
        });
    }
    async delete(id) {
        const assignment = await this.prisma.roleAssignment.findUnique({ where: { id } });
        if (!assignment)
            throw this.notFoundError('Assignment', id);
        await this.prisma.roleAssignment.delete({ where: { id } });
    }
};
exports.RoleAssignmentService = RoleAssignmentService;
exports.RoleAssignmentService = RoleAssignmentService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], RoleAssignmentService);
//# sourceMappingURL=RoleAssignmentService.js.map