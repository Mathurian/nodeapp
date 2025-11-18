"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderCustomFields = exports.deleteCustomFieldValue = exports.getCustomFieldValues = exports.bulkSetCustomFieldValues = exports.setCustomFieldValue = exports.deleteCustomField = exports.updateCustomField = exports.getCustomFieldById = exports.getCustomFieldsByEntityType = exports.createCustomField = void 0;
const CustomFieldService_1 = require("../services/CustomFieldService");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('CustomFieldsController');
const customFieldService = new CustomFieldService_1.CustomFieldService(database_1.default);
const VALID_FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTISELECT', 'CHECKBOX', 'TEXTAREA', 'EMAIL', 'PHONE', 'URL'];
const createCustomField = async (req, res) => {
    try {
        const { name, key, type, entityType, required, defaultValue, options, validation, order } = req.body;
        if (!name || !key || !type || !entityType) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: name, key, type, entityType'
            });
            return;
        }
        if (!VALID_FIELD_TYPES.includes(type)) {
            res.status(400).json({
                success: false,
                message: `Invalid field type. Must be one of: ${VALID_FIELD_TYPES.join(', ')}`
            });
            return;
        }
        const field = await customFieldService.createCustomField({
            tenantId: req.user?.tenantId || 'default',
            name,
            key,
            type,
            entityType,
            required,
            defaultValue,
            options,
            validation,
            order
        });
        logger.info(`Custom field created: ${field.id}`, { userId: req.user?.id });
        res.status(201).json({
            success: true,
            data: field
        });
    }
    catch (error) {
        logger.error('Error creating custom field:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create custom field'
        });
    }
};
exports.createCustomField = createCustomField;
const getCustomFieldsByEntityType = async (req, res) => {
    try {
        const { entityType } = req.params;
        const activeOnly = req.query.activeOnly !== 'false';
        const fields = await customFieldService.getCustomFieldsByEntityType(entityType, req.user?.tenantId || 'default', activeOnly);
        res.json({
            success: true,
            data: fields
        });
    }
    catch (error) {
        logger.error('Error getting custom fields:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get custom fields'
        });
    }
};
exports.getCustomFieldsByEntityType = getCustomFieldsByEntityType;
const getCustomFieldById = async (req, res) => {
    try {
        const { id } = req.params;
        const field = await customFieldService.getCustomFieldById(id, req.user?.tenantId || 'default');
        if (!field) {
            res.status(404).json({
                success: false,
                message: 'Custom field not found'
            });
            return;
        }
        res.json({
            success: true,
            data: field
        });
    }
    catch (error) {
        logger.error('Error getting custom field:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get custom field'
        });
    }
};
exports.getCustomFieldById = getCustomFieldById;
const updateCustomField = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const field = await customFieldService.updateCustomField(id, req.user?.tenantId || 'default', updateData);
        logger.info(`Custom field updated: ${id}`, { userId: req.user?.id });
        res.json({
            success: true,
            data: field
        });
    }
    catch (error) {
        logger.error('Error updating custom field:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update custom field'
        });
    }
};
exports.updateCustomField = updateCustomField;
const deleteCustomField = async (req, res) => {
    try {
        const { id } = req.params;
        await customFieldService.deleteCustomField(id, req.user?.tenantId || 'default');
        logger.info(`Custom field deleted: ${id}`, { userId: req.user?.id });
        res.json({
            success: true,
            message: 'Custom field deleted successfully'
        });
    }
    catch (error) {
        logger.error('Error deleting custom field:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete custom field'
        });
    }
};
exports.deleteCustomField = deleteCustomField;
const setCustomFieldValue = async (req, res) => {
    try {
        const { customFieldId, entityId, value } = req.body;
        if (!customFieldId || !entityId) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: customFieldId, entityId'
            });
            return;
        }
        const field = await customFieldService.getCustomFieldById(customFieldId, req.user?.tenantId || 'default');
        if (!field) {
            res.status(404).json({
                success: false,
                message: 'Custom field not found'
            });
            return;
        }
        const validation = customFieldService.validateCustomFieldValue(field, value);
        if (!validation.valid) {
            res.status(400).json({
                success: false,
                message: validation.error
            });
            return;
        }
        const fieldValue = await customFieldService.setCustomFieldValue({
            fieldId: customFieldId,
            entityId,
            value,
            tenantId: req.user?.tenantId || 'default'
        });
        res.json({
            success: true,
            data: fieldValue
        });
    }
    catch (error) {
        logger.error('Error setting custom field value:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to set custom field value'
        });
    }
};
exports.setCustomFieldValue = setCustomFieldValue;
const bulkSetCustomFieldValues = async (req, res) => {
    try {
        const { entityId, values } = req.body;
        if (!entityId || !values) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: entityId, values'
            });
            return;
        }
        await customFieldService.bulkSetCustomFieldValues(entityId, req.user?.tenantId || 'default', values);
        res.json({
            success: true,
            message: 'Custom field values set successfully'
        });
    }
    catch (error) {
        logger.error('Error bulk setting custom field values:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to set custom field values'
        });
    }
};
exports.bulkSetCustomFieldValues = bulkSetCustomFieldValues;
const getCustomFieldValues = async (req, res) => {
    try {
        const { entityId } = req.params;
        const { entityType } = req.query;
        if (!entityType) {
            res.status(400).json({
                success: false,
                message: 'Missing required query parameter: entityType'
            });
            return;
        }
        const values = await customFieldService.getCustomFieldValues(entityId, entityType, req.user?.tenantId || 'default');
        res.json({
            success: true,
            data: values
        });
    }
    catch (error) {
        logger.error('Error getting custom field values:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get custom field values'
        });
    }
};
exports.getCustomFieldValues = getCustomFieldValues;
const deleteCustomFieldValue = async (req, res) => {
    try {
        const { customFieldId, entityId } = req.params;
        await customFieldService.deleteCustomFieldValue(customFieldId, entityId, req.user?.tenantId || 'default');
        res.json({
            success: true,
            message: 'Custom field value deleted successfully'
        });
    }
    catch (error) {
        logger.error('Error deleting custom field value:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete custom field value'
        });
    }
};
exports.deleteCustomFieldValue = deleteCustomFieldValue;
const reorderCustomFields = async (req, res) => {
    try {
        const { fieldIds, entityType } = req.body;
        if (!fieldIds || !entityType) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: fieldIds, entityType'
            });
            return;
        }
        await customFieldService.reorderCustomFields(fieldIds, entityType, req.user?.tenantId || 'default');
        res.json({
            success: true,
            message: 'Custom fields reordered successfully'
        });
    }
    catch (error) {
        logger.error('Error reordering custom fields:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to reorder custom fields'
        });
    }
};
exports.reorderCustomFields = reorderCustomFields;
//# sourceMappingURL=customFieldsController.js.map