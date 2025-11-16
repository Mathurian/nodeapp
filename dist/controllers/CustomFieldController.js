"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customFieldController = exports.CustomFieldController = void 0;
const client_1 = require("@prisma/client");
const CustomFieldService_1 = require("../services/CustomFieldService");
const logger_1 = require("../utils/logger");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger = (0, logger_1.createLogger)('CustomFieldController');
const prisma = new client_1.PrismaClient();
const customFieldService = new CustomFieldService_1.CustomFieldService(prisma);
class CustomFieldController {
    async getCustomFields(req, res) {
        try {
            const { entityType } = req.params;
            const { active } = req.query;
            const activeOnly = active === 'true' || active === undefined;
            const customFields = await customFieldService.getCustomFieldsByEntityType(entityType, activeOnly);
            (0, responseHelpers_1.sendSuccess)(res, customFields, 'Custom fields retrieved successfully');
        }
        catch (error) {
            logger.error('Error in getCustomFields', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to retrieve custom fields', 500);
        }
    }
    async getCustomFieldById(req, res) {
        try {
            const { id } = req.params;
            const customField = await customFieldService.getCustomFieldById(id);
            if (!customField) {
                (0, responseHelpers_1.sendError)(res, 'Custom field not found', 404);
                return;
            }
            (0, responseHelpers_1.sendSuccess)(res, customField, 'Custom field retrieved successfully');
        }
        catch (error) {
            logger.error('Error in getCustomFieldById', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to retrieve custom field', 500);
        }
    }
    async createCustomField(req, res) {
        try {
            const data = req.body;
            if (!data.name || !data.key || !data.type || !data.entityType) {
                (0, responseHelpers_1.sendError)(res, 'Missing required fields: name, key, type, entityType', 400);
                return;
            }
            const existing = await customFieldService.getCustomFieldByKey(data.key, data.entityType);
            if (existing) {
                (0, responseHelpers_1.sendError)(res, 'Custom field with this key already exists for this entity type', 400);
                return;
            }
            const customField = await customFieldService.createCustomField(data);
            (0, responseHelpers_1.sendSuccess)(res, customField, 'Custom field created successfully', 201);
        }
        catch (error) {
            logger.error('Error in createCustomField', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to create custom field', 500);
        }
    }
    async updateCustomField(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;
            const existing = await customFieldService.getCustomFieldById(id);
            if (!existing) {
                (0, responseHelpers_1.sendError)(res, 'Custom field not found', 404);
                return;
            }
            const customField = await customFieldService.updateCustomField(id, data);
            (0, responseHelpers_1.sendSuccess)(res, customField, 'Custom field updated successfully');
        }
        catch (error) {
            logger.error('Error in updateCustomField', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to update custom field', 500);
        }
    }
    async deleteCustomField(req, res) {
        try {
            const { id } = req.params;
            const existing = await customFieldService.getCustomFieldById(id);
            if (!existing) {
                (0, responseHelpers_1.sendError)(res, 'Custom field not found', 404);
                return;
            }
            await customFieldService.deleteCustomField(id);
            (0, responseHelpers_1.sendSuccess)(res, null, 'Custom field deleted successfully');
        }
        catch (error) {
            logger.error('Error in deleteCustomField', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to delete custom field', 500);
        }
    }
    async getCustomFieldValues(req, res) {
        try {
            const { entityId } = req.params;
            const { entityType } = req.query;
            if (!entityType) {
                (0, responseHelpers_1.sendError)(res, 'entityType query parameter is required', 400);
                return;
            }
            const values = await customFieldService.getCustomFieldValues(entityId, entityType);
            (0, responseHelpers_1.sendSuccess)(res, values, 'Custom field values retrieved successfully');
        }
        catch (error) {
            logger.error('Error in getCustomFieldValues', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to retrieve custom field values', 500);
        }
    }
    async setCustomFieldValue(req, res) {
        try {
            const { customFieldId, entityId, value } = req.body;
            if (!customFieldId || !entityId) {
                (0, responseHelpers_1.sendError)(res, 'Missing required fields: customFieldId, entityId', 400);
                return;
            }
            const customField = await customFieldService.getCustomFieldById(customFieldId);
            if (!customField) {
                (0, responseHelpers_1.sendError)(res, 'Custom field not found', 404);
                return;
            }
            const validation = customFieldService.validateCustomFieldValue(customField, value);
            if (!validation.valid) {
                (0, responseHelpers_1.sendError)(res, validation.error || 'Invalid value', 400);
                return;
            }
            const fieldValue = await customFieldService.setCustomFieldValue({
                fieldId: customFieldId,
                entityId,
                value,
            });
            (0, responseHelpers_1.sendSuccess)(res, fieldValue, 'Custom field value set successfully');
        }
        catch (error) {
            logger.error('Error in setCustomFieldValue', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to set custom field value', 500);
        }
    }
    async bulkSetCustomFieldValues(req, res) {
        try {
            const { entityId, values } = req.body;
            if (!entityId || !values) {
                (0, responseHelpers_1.sendError)(res, 'Missing required fields: entityId, values', 400);
                return;
            }
            const validationErrors = [];
            for (const [customFieldId, value] of Object.entries(values)) {
                const customField = await customFieldService.getCustomFieldById(customFieldId);
                if (!customField) {
                    validationErrors.push(`Custom field ${customFieldId} not found`);
                    continue;
                }
                const validation = customFieldService.validateCustomFieldValue(customField, value);
                if (!validation.valid) {
                    validationErrors.push(validation.error || `Invalid value for ${customField.name}`);
                }
            }
            if (validationErrors.length > 0) {
                (0, responseHelpers_1.sendError)(res, validationErrors.join('; '), 400);
                return;
            }
            await customFieldService.bulkSetCustomFieldValues(entityId, values);
            (0, responseHelpers_1.sendSuccess)(res, null, 'Custom field values set successfully');
        }
        catch (error) {
            logger.error('Error in bulkSetCustomFieldValues', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to bulk set custom field values', 500);
        }
    }
    async deleteCustomFieldValue(req, res) {
        try {
            const { customFieldId, entityId } = req.params;
            await customFieldService.deleteCustomFieldValue(customFieldId, entityId);
            (0, responseHelpers_1.sendSuccess)(res, null, 'Custom field value deleted successfully');
        }
        catch (error) {
            logger.error('Error in deleteCustomFieldValue', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to delete custom field value', 500);
        }
    }
    async reorderCustomFields(req, res) {
        try {
            const { fieldIds, entityType } = req.body;
            if (!fieldIds || !Array.isArray(fieldIds) || !entityType) {
                (0, responseHelpers_1.sendError)(res, 'Missing required fields: fieldIds (array), entityType', 400);
                return;
            }
            await customFieldService.reorderCustomFields(fieldIds, entityType);
            (0, responseHelpers_1.sendSuccess)(res, null, 'Custom fields reordered successfully');
        }
        catch (error) {
            logger.error('Error in reorderCustomFields', { error });
            (0, responseHelpers_1.sendError)(res, error.message || 'Failed to reorder custom fields', 500);
        }
    }
}
exports.CustomFieldController = CustomFieldController;
exports.customFieldController = new CustomFieldController();
//# sourceMappingURL=CustomFieldController.js.map