"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventFromTemplate = exports.deleteTemplate = exports.updateTemplate = exports.getTemplate = exports.getTemplates = exports.createTemplate = exports.EventTemplateController = void 0;
const container_1 = require("../config/container");
const EventTemplateService_1 = require("../services/EventTemplateService");
const responseHelpers_1 = require("../utils/responseHelpers");
class EventTemplateController {
    eventTemplateService;
    constructor() {
        this.eventTemplateService = container_1.container.resolve(EventTemplateService_1.EventTemplateService);
    }
    createTemplate = async (req, res, next) => {
        try {
            const { name, description, contests, categories } = req.body;
            const template = await this.eventTemplateService.create({
                name,
                description,
                contests,
                categories,
                createdBy: req.user.id
            });
            return (0, responseHelpers_1.sendSuccess)(res, template, 'Template created', 201);
        }
        catch (error) {
            next(error);
        }
    };
    getTemplates = async (req, res, next) => {
        try {
            const templates = await this.eventTemplateService.getAll();
            return (0, responseHelpers_1.sendSuccess)(res, templates);
        }
        catch (error) {
            next(error);
        }
    };
    getTemplate = async (req, res, next) => {
        try {
            const { id } = req.params;
            const template = await this.eventTemplateService.getById(id);
            return (0, responseHelpers_1.sendSuccess)(res, template);
        }
        catch (error) {
            next(error);
        }
    };
    updateTemplate = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { name, description, contests, categories } = req.body;
            const template = await this.eventTemplateService.update(id, {
                name,
                description,
                contests,
                categories
            });
            return (0, responseHelpers_1.sendSuccess)(res, template, 'Template updated');
        }
        catch (error) {
            next(error);
        }
    };
    deleteTemplate = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.eventTemplateService.delete(id);
            return (0, responseHelpers_1.sendSuccess)(res, null, 'Template deleted');
        }
        catch (error) {
            next(error);
        }
    };
    createEventFromTemplate = async (req, res, next) => {
        try {
            const { templateId, eventName, eventDescription, startDate, endDate } = req.body;
            const event = await this.eventTemplateService.createEventFromTemplate({
                templateId,
                eventName,
                eventDescription,
                startDate,
                endDate
            });
            return (0, responseHelpers_1.sendSuccess)(res, event, 'Event created from template', 201);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.EventTemplateController = EventTemplateController;
const controller = new EventTemplateController();
exports.createTemplate = controller.createTemplate;
exports.getTemplates = controller.getTemplates;
exports.getTemplate = controller.getTemplate;
exports.updateTemplate = controller.updateTemplate;
exports.deleteTemplate = controller.deleteTemplate;
exports.createEventFromTemplate = controller.createEventFromTemplate;
//# sourceMappingURL=eventTemplateController.js.map