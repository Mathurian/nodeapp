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
exports.EventTemplateService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const client_1 = require("@prisma/client");
let EventTemplateService = class EventTemplateService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async create(data) {
        if (!data.name || !data.contests || !data.categories) {
            throw this.badRequestError('Name, contests, and categories are required');
        }
        const template = await this.prisma.eventTemplate.create({
            data: {
                name: data.name,
                description: data.description || null,
                contests: JSON.stringify(data.contests),
                categories: JSON.stringify(data.categories),
                createdBy: data.createdBy
            }
        });
        return {
            id: template.id,
            name: template.name,
            description: template.description,
            contests: JSON.parse(template.contests),
            categories: JSON.parse(template.categories),
            createdAt: template.createdAt
        };
    }
    async getAll() {
        const templates = await this.prisma.eventTemplate.findMany({
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return templates.map(template => ({
            id: template.id,
            name: template.name,
            description: template.description,
            contests: JSON.parse(template.contests),
            categories: JSON.parse(template.categories),
            creator: template.creator,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt
        }));
    }
    async getById(id) {
        const template = await this.prisma.eventTemplate.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        if (!template) {
            throw this.notFoundError('Template', id);
        }
        return {
            id: template.id,
            name: template.name,
            description: template.description,
            contests: JSON.parse(template.contests),
            categories: JSON.parse(template.categories),
            creator: template.creator,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt
        };
    }
    async update(id, data) {
        if (!data.name || !data.contests || !data.categories) {
            throw this.badRequestError('Name, contests, and categories are required');
        }
        const template = await this.prisma.eventTemplate.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description || null,
                contests: JSON.stringify(data.contests),
                categories: JSON.stringify(data.categories)
            }
        });
        return {
            id: template.id,
            name: template.name,
            description: template.description,
            contests: JSON.parse(template.contests),
            categories: JSON.parse(template.categories),
            updatedAt: template.updatedAt
        };
    }
    async delete(id) {
        await this.prisma.eventTemplate.delete({ where: { id } });
    }
    async createEventFromTemplate(data) {
        if (!data.templateId || !data.eventName || !data.startDate || !data.endDate) {
            throw this.badRequestError('Template ID, event name, start date, and end date are required');
        }
        const template = await this.prisma.eventTemplate.findUnique({
            where: { id: data.templateId }
        });
        if (!template) {
            throw this.notFoundError('Template', data.templateId);
        }
        const contests = JSON.parse(template.contests);
        const categories = JSON.parse(template.categories);
        const event = await this.prisma.event.create({
            data: {
                name: data.eventName,
                description: data.eventDescription || null,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate)
            }
        });
        for (const contestTemplate of contests) {
            const contest = await this.prisma.contest.create({
                data: {
                    eventId: event.id,
                    name: contestTemplate.name,
                    description: contestTemplate.description || null
                }
            });
            const contestCategories = categories.filter((cat) => cat.contestId === contestTemplate.id);
            for (const categoryTemplate of contestCategories) {
                const createdCategory = await this.prisma.category.create({
                    data: {
                        contestId: contest.id,
                        name: categoryTemplate.name,
                        description: categoryTemplate.description || null,
                        scoreCap: categoryTemplate.scoreCap || null,
                        timeLimit: categoryTemplate.timeLimit || null,
                        contestantMin: categoryTemplate.contestantMin || null,
                        contestantMax: categoryTemplate.contestantMax || null
                    }
                });
                if (categoryTemplate.criteria && categoryTemplate.criteria.length > 0) {
                    await this.prisma.criterion.createMany({
                        data: categoryTemplate.criteria.map((c) => ({
                            categoryId: createdCategory.id,
                            name: c.name,
                            maxScore: c.maxScore || 10
                        }))
                    });
                }
            }
        }
        return {
            id: event.id,
            name: event.name,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            createdAt: event.createdAt
        };
    }
};
exports.EventTemplateService = EventTemplateService;
exports.EventTemplateService = EventTemplateService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], EventTemplateService);
//# sourceMappingURL=EventTemplateService.js.map