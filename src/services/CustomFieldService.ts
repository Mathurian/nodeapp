import { PrismaClient, CustomField, CustomFieldValue, Prisma } from '@prisma/client';
import { createLogger as loggerFactory } from '../utils/logger';

const logger = loggerFactory('CustomFieldService');

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'TEXTAREA' | 'EMAIL' | 'PHONE' | 'URL';

export interface CreateCustomFieldDTO {
  name: string;
  key: string;
  type: CustomFieldType;
  entityType: string;
  required?: boolean;
  defaultValue?: string;
  options?: any;
  validation?: any;
  order?: number;
  active?: boolean;
  tenantId: string;
}

export interface UpdateCustomFieldDTO {
  name?: string;
  type?: CustomFieldType;
  required?: boolean;
  defaultValue?: string;
  options?: any;
  validation?: any;
  order?: number;
  active?: boolean;
}

export interface SetCustomFieldValueDTO {
  fieldId: string;
  entityId: string;
  value: string;
}

export class CustomFieldService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a new custom field
   */
  async createCustomField(data: CreateCustomFieldDTO): Promise<CustomField> {
    try {
      const field = await this.prisma.customField.create({
        data: {
          name: data.name,
          key: data.key,
          type: data.type as any, // Cast to Prisma enum type
          entityType: data.entityType,
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
    } catch (error) {
      logger.error('Error creating custom field', { error, data });
      throw new Error('Failed to create custom field');
    }
  }

  /**
   * Get all custom fields for an entity type
   */
  async getCustomFieldsByEntityType(entityType: string, activeOnly: boolean = true): Promise<CustomField[]> {
    try {
      const where: Prisma.CustomFieldWhereInput = { entityType };
      if (activeOnly) {
        where.active = true;
      }

      const fields = await this.prisma.customField.findMany({
        where,
        orderBy: { order: 'asc' },
      });

      return fields;
    } catch (error) {
      logger.error('Error fetching custom fields', { error, entityType });
      throw new Error('Failed to fetch custom fields');
    }
  }

  /**
   * Get a custom field by ID
   */
  async getCustomFieldById(id: string): Promise<CustomField | null> {
    try {
      const field = await this.prisma.customField.findUnique({
        where: { id },
        // No values relation in schema
      });

      return field;
    } catch (error) {
      logger.error('Error fetching custom field', { error, id });
      throw new Error('Failed to fetch custom field');
    }
  }

  /**
   * Get a custom field by key and entity type
   */
  async getCustomFieldByKey(key: string, entityType: string): Promise<CustomField | null> {
    try {
      const field = await this.prisma.customField.findFirst({
        where: {
          key,
          entityType,
        },
      });

      return field;
    } catch (error) {
      logger.error('Error fetching custom field by key', { error, key, entityType });
      throw new Error('Failed to fetch custom field');
    }
  }

  /**
   * Update a custom field
   */
  async updateCustomField(id: string, data: UpdateCustomFieldDTO): Promise<CustomField> {
    try {
      const updateData: Prisma.CustomFieldUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.type !== undefined) updateData.type = data.type as any; // Cast to Prisma enum
      if (data.required !== undefined) updateData.required = data.required;
      if (data.defaultValue !== undefined) updateData.defaultValue = data.defaultValue;
      if (data.options !== undefined) updateData.options = JSON.stringify(data.options);
      if (data.validation !== undefined) updateData.validation = JSON.stringify(data.validation);
      if (data.order !== undefined) updateData.order = data.order;
      if (data.active !== undefined) updateData.active = data.active;

      const field = await this.prisma.customField.update({
        where: { id },
        data: updateData,
      });

      logger.info('Custom field updated', { id });
      return field;
    } catch (error) {
      logger.error('Error updating custom field', { error, id, data });
      throw new Error('Failed to update custom field');
    }
  }

  /**
   * Delete a custom field (and all its values)
   */
  async deleteCustomField(id: string): Promise<void> {
    try {
      await this.prisma.customField.delete({
        where: { id },
      });

      logger.info('Custom field deleted', { id });
    } catch (error) {
      logger.error('Error deleting custom field', { error, id });
      throw new Error('Failed to delete custom field');
    }
  }

  /**
   * Set a custom field value for an entity
   */
  async setCustomFieldValue(data: SetCustomFieldValueDTO): Promise<CustomFieldValue> {
    try {
      // Upsert the value
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
          value: data.value,
        },
        update: {
          value: data.value,
        },
      });

      logger.info('Custom field value set', { fieldId: data.fieldId, entityId: data.entityId });
      return value;
    } catch (error) {
      logger.error('Error setting custom field value', { error, data });
      throw new Error('Failed to set custom field value');
    }
  }

  /**
   * Get all custom field values for an entity
   */
  async getCustomFieldValues(entityId: string, entityType: string): Promise<CustomFieldValue[]> {
    try {
      // Get all custom fields for this entity type
      const fields = await this.prisma.customField.findMany({
        where: {
          entityType,
          active: true,
        },
      });

      const fieldIds = fields.map(f => f.id);

      // Get values for these fields
      const values = await this.prisma.customFieldValue.findMany({
        where: {
          entityId,
          customFieldId: { in: fieldIds },
        },
      });

      return values;
    } catch (error) {
      logger.error('Error fetching custom field values', { error, entityId, entityType });
      throw new Error('Failed to fetch custom field values');
    }
  }

  /**
   * Get a specific custom field value
   */
  async getCustomFieldValue(fieldId: string, entityId: string): Promise<CustomFieldValue | null> {
    try {
      const value = await this.prisma.customFieldValue.findUnique({
        where: {
          customFieldId_entityId: {
            customFieldId: fieldId,
            entityId,
          },
        },
      });

      return value;
    } catch (error) {
      logger.error('Error fetching custom field value', { error, fieldId, entityId });
      throw new Error('Failed to fetch custom field value');
    }
  }

  /**
   * Delete a custom field value
   */
  async deleteCustomFieldValue(fieldId: string, entityId: string): Promise<void> {
    try {
      await this.prisma.customFieldValue.delete({
        where: {
          customFieldId_entityId: {
            customFieldId: fieldId,
            entityId,
          },
        },
      });

      logger.info('Custom field value deleted', { fieldId, entityId });
    } catch (error) {
      logger.error('Error deleting custom field value', { error, fieldId, entityId });
      throw new Error('Failed to delete custom field value');
    }
  }

  /**
   * Bulk set custom field values for an entity
   */
  async bulkSetCustomFieldValues(entityId: string, values: Record<string, string>): Promise<void> {
    try {
      // Process each field value
      for (const [fieldId, value] of Object.entries(values)) {
        await this.setCustomFieldValue({
          fieldId,
          entityId,
          value,
        });
      }

      logger.info('Bulk custom field values set', { entityId, count: Object.keys(values).length });
    } catch (error) {
      logger.error('Error bulk setting custom field values', { error, entityId });
      throw new Error('Failed to bulk set custom field values');
    }
  }

  /**
   * Validate a custom field value
   */
  validateCustomFieldValue(field: CustomField, value: string): { valid: boolean; error?: string } {
    try {
      // Required validation
      if (field.required && (!value || value.trim() === '')) {
        return { valid: false, error: `${field.name} is required` };
      }

      // Type-specific validation
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
            } catch {
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

      // Custom validation rules
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
    } catch (error) {
      logger.error('Error validating custom field value', { error, field: field.id, value });
      return { valid: false, error: 'Validation error' };
    }
  }

  /**
   * Reorder custom fields
   */
  async reorderCustomFields(fieldIds: string[], entityType: string): Promise<void> {
    try {
      // Update each field's order
      for (let i = 0; i < fieldIds.length; i++) {
        await this.prisma.customField.update({
          where: { id: fieldIds[i] },
          data: { order: i },
        });
      }

      logger.info('Custom fields reordered', { entityType, count: fieldIds.length });
    } catch (error) {
      logger.error('Error reordering custom fields', { error, fieldIds, entityType });
      throw new Error('Failed to reorder custom fields');
    }
  }
}
