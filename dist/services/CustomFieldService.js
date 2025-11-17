"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomFieldService = void 0;
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('CustomFieldService');
class CustomFieldService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCustomField(data) {
        try {
            const field = await this.prisma.customField.create({
                data: {
                    name: data.name,
                    key: data.key,
                    type: data.type,
                    entityType: data.entityType,
                    tenantId: data.tenantId,
                    required: data.required ?? false,
                    defaultValue: data.defaultValue,
                    options: data.options ? JSON.stringify(data.options) : undefined,
                    validation: data.validation ? JSON.stringify(data.validation) : undefined,
                    order: data.order ?? 0,
                    active: data.active ?? true,
                },
            });
            logger.info('Custom field created', { id: field.id, key: field.key });
            return field;
        }
        catch (error) {
            logger.error('Error creating custom field', { error, data });
            throw new Error('Failed to create custom field');
        }
    }
    async getCustomFieldsByEntityType(entityType, tenantId, activeOnly = true) {
        try {
            const where = { entityType, tenantId };
            if (activeOnly) {
                where.active = true;
            }
            const fields = await this.prisma.customField.findMany({
                where,
                orderBy: { order: 'asc' },
            });
            return fields;
        }
        catch (error) {
            logger.error('Error fetching custom fields', { error, entityType });
            throw new Error('Failed to fetch custom fields');
        }
    }
    async getCustomFieldById(id, tenantId) {
        try {
            const field = await this.prisma.customField.findFirst({
                where: { id, tenantId },
            });
            return field;
        }
        catch (error) {
            logger.error('Error fetching custom field', { error, id });
            throw new Error('Failed to fetch custom field');
        }
    }
    async getCustomFieldByKey(key, entityType, tenantId) {
        try {
            const field = await this.prisma.customField.findFirst({
                where: {
                    key,
                    entityType,
                    tenantId,
                },
            });
            return field;
        }
        catch (error) {
            logger.error('Error fetching custom field by key', { error, key, entityType });
            throw new Error('Failed to fetch custom field');
        }
    }
    async updateCustomField(id, tenantId, data) {
        try {
            const existing = await this.prisma.customField.findFirst({
                where: { id, tenantId }
            });
            if (!existing) {
                throw new Error('Custom field not found');
            }
            const updateData = {};
            if (data.name !== undefined)
                updateData.name = data.name;
            if (data.type !== undefined)
                updateData.type = data.type;
            if (data.required !== undefined)
                updateData.required = data.required;
            if (data.defaultValue !== undefined)
                updateData.defaultValue = data.defaultValue;
            if (data.options !== undefined)
                updateData.options = JSON.stringify(data.options);
            if (data.validation !== undefined)
                updateData.validation = JSON.stringify(data.validation);
            if (data.order !== undefined)
                updateData.order = data.order;
            if (data.active !== undefined)
                updateData.active = data.active;
            const field = await this.prisma.customField.update({
                where: { id },
                data: updateData,
            });
            logger.info('Custom field updated', { id });
            return field;
        }
        catch (error) {
            logger.error('Error updating custom field', { error, id, data });
            throw new Error('Failed to update custom field');
        }
    }
    async deleteCustomField(id, tenantId) {
        try {
            const existing = await this.prisma.customField.findFirst({
                where: { id, tenantId }
            });
            if (!existing) {
                throw new Error('Custom field not found');
            }
            await this.prisma.customField.delete({
                where: { id },
            });
            logger.info('Custom field deleted', { id });
        }
        catch (error) {
            logger.error('Error deleting custom field', { error, id });
            throw new Error('Failed to delete custom field');
        }
    }
    async setCustomFieldValue(data) {
        try {
            const field = await this.prisma.customField.findFirst({
                where: { id: data.fieldId, tenantId: data.tenantId }
            });
            if (!field) {
                throw new Error('Custom field not found');
            }
            const value = await this.prisma.customFieldValue.upsert({
                where: {
                    customFieldId_entityId: {
                        customFieldId: data.fieldId,
                        entityId: data.entityId,
                    },
                },
                create: {
                    customFieldId: data.fieldId,
                    entityId: data.entityId,
                    tenantId: data.tenantId,
                    value: data.value,
                },
                update: {
                    value: data.value,
                },
            });
            logger.info('Custom field value set', { fieldId: data.fieldId, entityId: data.entityId });
            return value;
        }
        catch (error) {
            logger.error('Error setting custom field value', { error, data });
            throw new Error('Failed to set custom field value');
        }
    }
    async getCustomFieldValues(entityId, entityType, tenantId) {
        try {
            const fields = await this.prisma.customField.findMany({
                where: {
                    entityType,
                    tenantId,
                    active: true,
                },
            });
            const fieldIds = fields.map(f => f.id);
            const values = await this.prisma.customFieldValue.findMany({
                where: {
                    entityId,
                    tenantId,
                    customFieldId: { in: fieldIds },
                },
            });
            return values;
        }
        catch (error) {
            logger.error('Error fetching custom field values', { error, entityId, entityType });
            throw new Error('Failed to fetch custom field values');
        }
    }
    async getCustomFieldValue(fieldId, entityId, tenantId) {
        try {
            const value = await this.prisma.customFieldValue.findFirst({
                where: {
                    customFieldId: fieldId,
                    entityId,
                    tenantId,
                },
            });
            return value;
        }
        catch (error) {
            logger.error('Error fetching custom field value', { error, fieldId, entityId });
            throw new Error('Failed to fetch custom field value');
        }
    }
    async deleteCustomFieldValue(fieldId, entityId, tenantId) {
        try {
            const value = await this.prisma.customFieldValue.findFirst({
                where: {
                    customFieldId: fieldId,
                    entityId,
                    tenantId,
                },
            });
            if (!value) {
                throw new Error('Custom field value not found');
            }
            await this.prisma.customFieldValue.delete({
                where: {
                    customFieldId_entityId: {
                        customFieldId: fieldId,
                        entityId,
                    },
                },
            });
            logger.info('Custom field value deleted', { fieldId, entityId });
        }
        catch (error) {
            logger.error('Error deleting custom field value', { error, fieldId, entityId });
            throw new Error('Failed to delete custom field value');
        }
    }
    async bulkSetCustomFieldValues(entityId, tenantId, values) {
        try {
            for (const [fieldId, value] of Object.entries(values)) {
                await this.setCustomFieldValue({
                    fieldId,
                    entityId,
                    tenantId,
                    value,
                });
            }
            logger.info('Bulk custom field values set', { entityId, count: Object.keys(values).length });
        }
        catch (error) {
            logger.error('Error bulk setting custom field values', { error, entityId });
            throw new Error('Failed to bulk set custom field values');
        }
    }
    validateCustomFieldValue(field, value) {
        try {
            if (field.required && (!value || value.trim() === '')) {
                return { valid: false, error: `${field.name} is required` };
            }
            switch (field.type) {
                case 'NUMBER':
                    if (value && isNaN(Number(value))) {
                        return { valid: false, error: `${field.name} must be a number` };
                    }
                    break;
                case 'EMAIL':
                    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        return { valid: false, error: `${field.name} must be a valid email` };
                    }
                    break;
                case 'URL':
                    if (value) {
                        try {
                            new URL(value);
                        }
                        catch {
                            return { valid: false, error: `${field.name} must be a valid URL` };
                        }
                    }
                    break;
                case 'PHONE':
                    if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
                        return { valid: false, error: `${field.name} must be a valid phone number` };
                    }
                    break;
                case 'DATE':
                    if (value && isNaN(Date.parse(value))) {
                        return { valid: false, error: `${field.name} must be a valid date` };
                    }
                    break;
                case 'BOOLEAN':
                    if (value && !['true', 'false', '1', '0'].includes(value.toLowerCase())) {
                        return { valid: false, error: `${field.name} must be true or false` };
                    }
                    break;
                case 'SELECT':
                    if (value && field.options) {
                        const options = typeof field.options === 'string'
                            ? JSON.parse(field.options)
                            : field.options;
                        if (Array.isArray(options) && !options.includes(value)) {
                            return { valid: false, error: `${field.name} must be one of the allowed options` };
                        }
                    }
                    break;
                case 'MULTI_SELECT':
                    if (value && field.options) {
                        const options = typeof field.options === 'string'
                            ? JSON.parse(field.options)
                            : field.options;
                        const selectedValues = value.split(',').map(v => v.trim());
                        if (Array.isArray(options) && !selectedValues.every(v => options.includes(v))) {
                            return { valid: false, error: `${field.name} contains invalid options` };
                        }
                    }
                    break;
            }
            if (field.validation) {
                const validation = typeof field.validation === 'string'
                    ? JSON.parse(field.validation)
                    : field.validation;
                if (validation.minLength && value && value.length < validation.minLength) {
                    return { valid: false, error: `${field.name} must be at least ${validation.minLength} characters` };
                }
                if (validation.maxLength && value && value.length > validation.maxLength) {
                    return { valid: false, error: `${field.name} must be at most ${validation.maxLength} characters` };
                }
                if (validation.min && value && Number(value) < validation.min) {
                    return { valid: false, error: `${field.name} must be at least ${validation.min}` };
                }
                if (validation.max && value && Number(value) > validation.max) {
                    return { valid: false, error: `${field.name} must be at most ${validation.max}` };
                }
                if (validation.pattern && value && !new RegExp(validation.pattern).test(value)) {
                    return { valid: false, error: `${field.name} does not match the required pattern` };
                }
            }
            return { valid: true };
        }
        catch (error) {
            logger.error('Error validating custom field value', { error, field: field.id, value });
            return { valid: false, error: 'Validation error' };
        }
    }
    async reorderCustomFields(fieldIds, entityType, tenantId) {
        try {
            const fields = await this.prisma.customField.findMany({
                where: {
                    id: { in: fieldIds },
                    tenantId,
                    entityType,
                },
            });
            if (fields.length !== fieldIds.length) {
                throw new Error('Some fields not found or do not belong to tenant');
            }
            for (let i = 0; i < fieldIds.length; i++) {
                await this.prisma.customField.update({
                    where: { id: fieldIds[i] },
                    data: { order: i },
                });
            }
            logger.info('Custom fields reordered', { entityType, count: fieldIds.length });
        }
        catch (error) {
            logger.error('Error reordering custom fields', { error, fieldIds, entityType });
            throw new Error('Failed to reorder custom fields');
        }
    }
}
exports.CustomFieldService = CustomFieldService;
//# sourceMappingURL=CustomFieldService.js.map