"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInstancesForEntity = exports.getInstance = exports.advanceWorkflow = exports.startWorkflow = exports.listTemplates = exports.getTemplate = exports.createTemplate = void 0;
const WorkflowService_1 = require("../services/WorkflowService");
const responseHelpers_1 = require("../utils/responseHelpers");
const createTemplate = async (req, res, next) => {
    try {
        const template = await WorkflowService_1.WorkflowService.createTemplate({ ...req.body, tenantId: req.tenantId });
        (0, responseHelpers_1.sendSuccess)(res, template, 'Workflow template created', 201);
    }
    catch (error) {
        return next(error);
    }
};
exports.createTemplate = createTemplate;
const getTemplate = async (req, res, next) => {
    try {
        const template = await WorkflowService_1.WorkflowService.getTemplate(req.params.id, req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, template);
    }
    catch (error) {
        return next(error);
    }
};
exports.getTemplate = getTemplate;
const listTemplates = async (req, res, next) => {
    try {
        const { type } = req.query;
        const templates = await WorkflowService_1.WorkflowService.listTemplates(req.tenantId, type);
        (0, responseHelpers_1.sendSuccess)(res, templates);
    }
    catch (error) {
        return next(error);
    }
};
exports.listTemplates = listTemplates;
const startWorkflow = async (req, res, next) => {
    try {
        const { templateId, entityType, entityId } = req.body;
        const instance = await WorkflowService_1.WorkflowService.startWorkflow(templateId, req.tenantId, entityType, entityId);
        (0, responseHelpers_1.sendSuccess)(res, instance, 'Workflow started', 201);
    }
    catch (error) {
        return next(error);
    }
};
exports.startWorkflow = startWorkflow;
const advanceWorkflow = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { approvalStatus, comments } = req.body;
        const userId = req.user?.id;
        const instance = await WorkflowService_1.WorkflowService.advanceWorkflow(id, userId, approvalStatus, comments);
        (0, responseHelpers_1.sendSuccess)(res, instance, 'Workflow advanced');
    }
    catch (error) {
        return next(error);
    }
};
exports.advanceWorkflow = advanceWorkflow;
const getInstance = async (req, res, next) => {
    try {
        const instance = await WorkflowService_1.WorkflowService.getInstance(req.params.id, req.tenantId);
        (0, responseHelpers_1.sendSuccess)(res, instance);
    }
    catch (error) {
        return next(error);
    }
};
exports.getInstance = getInstance;
const listInstancesForEntity = async (req, res, next) => {
    try {
        const { entityType, entityId } = req.params;
        const instances = await WorkflowService_1.WorkflowService.listInstancesForEntity(req.tenantId, entityType, entityId);
        (0, responseHelpers_1.sendSuccess)(res, instances);
    }
    catch (error) {
        return next(error);
    }
};
exports.listInstancesForEntity = listInstancesForEntity;
//# sourceMappingURL=workflowController.js.map