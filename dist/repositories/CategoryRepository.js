"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRepository = void 0;
const tsyringe_1 = require("tsyringe");
const BaseRepository_1 = require("./BaseRepository");
let CategoryRepository = class CategoryRepository extends BaseRepository_1.BaseRepository {
    getModelName() {
        return 'category';
    }
    async findByContestId(contestId) {
        return this.findMany({
            contestId,
            contest: {
                event: {
                    archived: false
                }
            }
        }, { orderBy: { createdAt: 'asc' } });
    }
    async findCategoryWithDetails(categoryId) {
        return this.getModel().findUnique({
            where: { id: categoryId },
            include: {
                contest: {
                    include: {
                        event: true,
                    },
                },
                criteria: true,
                judges: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                preferredName: true,
                            },
                        },
                    },
                },
                contestants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                preferredName: true,
                                contestantNumber: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async searchCategories(query) {
        return this.findMany({
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
            ],
        });
    }
    async getCategoryStats(categoryId) {
        const category = await this.getModel().findUnique({
            where: { id: categoryId },
            include: {
                _count: {
                    select: {
                        contestants: true,
                        judges: true,
                        criteria: true,
                    },
                },
            },
        });
        if (!category) {
            return {
                totalContestants: 0,
                totalJudges: 0,
                totalCriteria: 0,
            };
        }
        return {
            totalContestants: category._count.contestants,
            totalJudges: category._count.judges,
            totalCriteria: category._count.criteria,
        };
    }
    async certifyTotals(categoryId, certified) {
        return this.update(categoryId, { totalsCertified: certified });
    }
};
exports.CategoryRepository = CategoryRepository;
exports.CategoryRepository = CategoryRepository = __decorate([
    (0, tsyringe_1.injectable)()
], CategoryRepository);
//# sourceMappingURL=CategoryRepository.js.map