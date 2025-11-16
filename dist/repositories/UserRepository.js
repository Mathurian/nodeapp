"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const tsyringe_1 = require("tsyringe");
const BaseRepository_1 = require("./BaseRepository");
let UserRepository = class UserRepository extends BaseRepository_1.BaseRepository {
    getModelName() {
        return 'user';
    }
    async findByName(name) {
        return this.findFirst({ name });
    }
    async findByEmail(email) {
        return this.findFirst({ email });
    }
    async findByNameOrEmail(nameOrEmail) {
        return this.findFirst({
            OR: [
                { name: nameOrEmail },
                { email: nameOrEmail }
            ]
        });
    }
    async findByRole(role) {
        return this.findMany({ role });
    }
    async findActiveUsers() {
        return this.findMany({
            isActive: true,
            archived: false
        });
    }
    async findUsersWithAssignments(eventId) {
        return this.getModel().findMany({
            where: {
                assignedAssignments: { some: { eventId } }
            },
            include: {
                assignedAssignments: {
                    where: { eventId }
                },
                contestant: true,
                judge: true
            }
        });
    }
    async searchUsers(query) {
        return this.findMany({
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { preferredName: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } }
            ]
        });
    }
    async updateLastLogin(userId) {
        return this.update(userId, {
            lastLoginAt: new Date()
        });
    }
    async updatePassword(userId, hashedPassword) {
        return this.update(userId, {
            password: hashedPassword
        });
    }
    async toggleActiveStatus(userId) {
        const user = await this.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return this.update(userId, {
            isActive: !user.isActive
        });
    }
    async getUserStats(userId) {
        const user = await this.getModel().findUnique({
            where: { id: userId },
            include: {
                assignedAssignments: {
                    distinct: ['eventId']
                }
            }
        });
        if (!user) {
            return {
                totalAssignments: 0,
                eventsParticipated: 0
            };
        }
        const eventIds = new Set([
            ...user.assignedAssignments.map((a) => a.eventId)
        ]);
        return {
            totalAssignments: user.assignedAssignments.length,
            eventsParticipated: eventIds.size
        };
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = __decorate([
    (0, tsyringe_1.injectable)()
], UserRepository);
//# sourceMappingURL=UserRepository.js.map