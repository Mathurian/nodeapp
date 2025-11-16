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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRepository = void 0;
const tsyringe_1 = require("tsyringe");
const BaseRepository_1 = require("./BaseRepository");
const database_1 = require("../config/database");
let TemplateRepository = class TemplateRepository extends BaseRepository_1.BaseRepository {
    constructor() {
        super(database_1.prisma);
    }
    getModelName() {
        return 'categoryTemplate';
    }
    async findAllWithCriteria() {
        return this.getModel().findMany({
            include: {
                criteria: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async findByIdWithCriteria(id) {
        return this.getModel().findUnique({
            where: { id },
            include: {
                criteria: true
            }
        });
    }
    async createWithCriteria(data) {
        return this.getModel().create({
            data: {
                name: data.name,
                description: data.description || null,
                criteria: data.criteria ? {
                    create: data.criteria.map(c => ({
                        name: c.name,
                        maxScore: c.maxScore
                    }))
                } : undefined
            },
            include: {
                criteria: true
            }
        });
    }
    async updateWithCriteria(id, data) {
        if (data.criteria) {
            return this.prisma.$transaction(async (tx) => {
                await tx.categoryTemplate.update({
                    where: { id },
                    data: {
                        name: data.name,
                        description: data.description || null
                    }
                });
                await tx.templateCriterion.deleteMany({
                    where: { templateId: id }
                });
                if (data.criteria && data.criteria.length > 0) {
                    await tx.templateCriterion.createMany({
                        data: data.criteria.map(c => ({
                            templateId: id,
                            name: c.name,
                            maxScore: c.maxScore
                        }))
                    });
                }
                return tx.categoryTemplate.findUnique({
                    where: { id },
                    include: {
                        criteria: true
                    }
                });
            });
        }
        return this.getModel().update({
            where: { id },
            data: {
                name: data.name,
                description: data.description || null
            },
            include: {
                criteria: true
            }
        });
    }
    async duplicateTemplate(id) {
        const original = await this.findByIdWithCriteria(id);
        if (!original) {
            return null;
        }
        return this.getModel().create({
            data: {
                name: `${original.name} (Copy)`,
                description: original.description,
                criteria: {
                    create: original.criteria.map(c => ({
                        name: c.name,
                        maxScore: c.maxScore
                    }))
                }
            },
            include: {
                criteria: true
            }
        });
    }
};
exports.TemplateRepository = TemplateRepository;
exports.TemplateRepository = TemplateRepository = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], TemplateRepository);
//# sourceMappingURL=TemplateRepository.js.map