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
    getAllTemplates = async (_req, res, next) => {
        try {
            const templates = await this.templateService.getAllTemplates();
            (0, responseHelpers_1.sendSuccess)(res, templates, 'Templates retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getTemplateById = async (req, res, next) => {
        try {
            const id = req.params.id;
            const template = await this.templateService.getTemplateById(id);
            (0, responseHelpers_1.sendSuccess)(res, template, 'Template retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    createTemplate = async (req, res, next) => {
        try {
            const { name, description, criteria } = req.body;
            const template = await this.templateService.createTemplate({
                name,
                description,
                criteria
            });
            (0, responseHelpers_1.sendCreated)(res, template, 'Template created successfully');
        }
        catch (error) {
            next(error);
        }
    };
    updateTemplate = async (req, res, next) => {
        try {
            const id = req.params.id;
            const { name, description, criteria } = req.body;
            const template = await this.templateService.updateTemplate(id, {
                name,
                description,
                criteria
            });
            (0, responseHelpers_1.sendSuccess)(res, template, 'Template updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    deleteTemplate = async (req, res, next) => {
        try {
            const id = req.params.id;
            await this.templateService.deleteTemplate(id);
            (0, responseHelpers_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    };
    duplicateTemplate = async (req, res, next) => {
        try {
            const id = req.params.id;
            const template = await this.templateService.duplicateTemplate(id);
            (0, responseHelpers_1.sendCreated)(res, template, 'Template duplicated successfully');
        }
        catch (error) {
            next(error);
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