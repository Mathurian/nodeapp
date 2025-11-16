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
exports.TemplateService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const TemplateRepository_1 = require("../repositories/TemplateRepository");
let TemplateService = class TemplateService extends BaseService_1.BaseService {
    templateRepo;
    constructor(templateRepo) {
        super();
        this.templateRepo = templateRepo;
    }
    async getAllTemplates() {
        return await this.templateRepo.findAllWithCriteria();
    }
    async getTemplateById(id) {
        this.validateRequired({ id }, ['id']);
        const template = await this.templateRepo.findByIdWithCriteria(id);
        if (!template) {
            throw new BaseService_1.NotFoundError('Template', id);
        }
        return template;
    }
    async createTemplate(data) {
        this.validateRequired(data, ['name']);
        return await this.templateRepo.createWithCriteria(data);
    }
    async updateTemplate(id, data) {
        this.validateRequired({ id }, ['id']);
        await this.getTemplateById(id);
        return await this.templateRepo.updateWithCriteria(id, data);
    }
    async deleteTemplate(id) {
        this.validateRequired({ id }, ['id']);
        await this.getTemplateById(id);
        await this.templateRepo.delete(id);
    }
    async duplicateTemplate(id) {
        this.validateRequired({ id }, ['id']);
        const duplicated = await this.templateRepo.duplicateTemplate(id);
        if (!duplicated) {
            throw new BaseService_1.NotFoundError('Template', id);
        }
        return duplicated;
    }
};
exports.TemplateService = TemplateService;
exports.TemplateService = TemplateService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('TemplateRepository')),
    __metadata("design:paramtypes", [TemplateRepository_1.TemplateRepository])
], TemplateService);
//# sourceMappingURL=TemplateService.js.map