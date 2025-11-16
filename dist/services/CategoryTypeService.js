"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryTypeService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const prisma_1 = __importDefault(require("../utils/prisma"));
let CategoryTypeService = class CategoryTypeService extends BaseService_1.BaseService {
    async getAllCategoryTypes() {
        return await prisma_1.default.categoryType.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async createCategoryType(name, description, createdById, tenantId = '') {
        this.validateRequired({ name }, ['name']);
        const categoryType = await prisma_1.default.categoryType.create({
            data: {
                tenantId,
                name,
                description: description || null,
                isSystem: false,
                createdById: createdById
            }
        });
        return categoryType;
    }
    async updateCategoryType(id, name, description) {
        const categoryType = await prisma_1.default.categoryType.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description: description || null }),
            },
        });
        return categoryType;
    }
    async deleteCategoryType(id) {
        const categoryType = await prisma_1.default.categoryType.findUnique({
            where: { id },
        });
        if (!categoryType) {
            throw this.notFoundError('CategoryType', id);
        }
        if (categoryType.isSystem) {
            throw this.validationError('Cannot delete system category types');
        }
        await prisma_1.default.categoryType.delete({
            where: { id },
        });
    }
};
exports.CategoryTypeService = CategoryTypeService;
exports.CategoryTypeService = CategoryTypeService = __decorate([
    (0, tsyringe_1.injectable)()
], CategoryTypeService);
//# sourceMappingURL=CategoryTypeService.js.map