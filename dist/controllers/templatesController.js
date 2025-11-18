"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.duplicateTemplate = exports.deleteTemplate = exports.updateTemplate = exports.createTemplate = exports.getTemplateById = exports.getAllTemplates = exports.TemplatesController = void 0;
const container_1 = require("../config/container");
const TemplateService_1 = require("../services/TemplateService");
const responseHelpers_1 = require("../utils/responseHelpers");
class TemplatesController {
    templateService;
    constructor() {
        this.templateService = container_1.container.resolve(TemplateService_1.TemplateService);
    }
    getAllTemplates = async (req, res, next) => {
        try {
            const templates = await this.templateService.getAllTemplates(req.user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, templates, 'Templates retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getTemplateById = async (req, res, next) => {
        try {
            const id = req.params.id;
            const template = await this.templateService.getTemplateById(id, req.user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, template, 'Template retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    createTemplate = async (req, res, next) => {
        try {
            const { name, description, criteria } = req.body;
            const template = await this.templateService.createTemplate({
                name,
                description,
                criteria,
                tenantId: req.user.tenantId
            });
            (0, responseHelpers_1.sendCreated)(res, template, 'Template created successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    updateTemplate = async (req, res, next) => {
        try {
            const id = req.params.id;
            const { name, description, criteria } = req.body;
            const template = await this.templateService.updateTemplate(id, req.user.tenantId, {
                name,
                description,
                criteria
            });
            (0, responseHelpers_1.sendSuccess)(res, template, 'Template updated successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    deleteTemplate = async (req, res, next) => {
        try {
            const id = req.params.id;
            await this.templateService.deleteTemplate(id, req.user.tenantId);
            (0, responseHelpers_1.sendNoContent)(res);
        }
        catch (error) {
            return next(error);
        }
    };
    duplicateTemplate = async (req, res, next) => {
        try {
            const id = req.params.id;
            const template = await this.templateService.duplicateTemplate(id, req.user.tenantId);
            (0, responseHelpers_1.sendCreated)(res, template, 'Template duplicated successfully');
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.TemplatesController = TemplatesController;
const controller = new TemplatesController();
exports.getAllTemplates = controller.getAllTemplates;
exports.getTemplateById = controller.getTemplateById;
exports.createTemplate = controller.createTemplate;
exports.updateTemplate = controller.updateTemplate;
exports.deleteTemplate = controller.deleteTemplate;
exports.duplicateTemplate = controller.duplicateTemplate;
//# sourceMappingURL=templatesController.js.map