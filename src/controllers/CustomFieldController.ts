import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CustomFieldService } from '../services/CustomFieldService';
import { createLogger as loggerFactory } from '../utils/logger';
import { sendSuccess, sendError } from '../utils/responseHelpers';

const logger = loggerFactory('CustomFieldController');
const prisma = new PrismaClient();
const customFieldService = new CustomFieldService(prisma);

export class CustomFieldController {
  /**
   * GET /api/custom-fields/:entityType
   * Get all custom fields for an entity type
   */
  async getCustomFields(req: Request, res: Response): Promise<void> {
    try {
      const { entityType } = req.params;
      const { active } = req.query;

      const activeOnly = active === 'true' || active === undefined;
      const customFields = await customFieldService.getCustomFieldsByEntityType(entityType, activeOnly, req.user!.tenantId);

      sendSuccess(res, customFields, 'Custom fields retrieved successfully');
    } catch (error: any) {
      logger.error('Error in getCustomFields', { error });
      sendError(res, error.message || 'Failed to retrieve custom fields', 500);
    }
  }

  /**
   * GET /api/custom-fields/field/:id
   * Get a single custom field by ID
   */
  async getCustomFieldById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const customField = await customFieldService.getCustomFieldById(id, req.user!.tenantId);

      if (!customField) {
        sendError(res, 'Custom field not found', 404);
        return;
      }

      sendSuccess(res, customField, 'Custom field retrieved successfully');
    } catch (error: any) {
      logger.error('Error in getCustomFieldById', { error });
      sendError(res, error.message || 'Failed to retrieve custom field', 500);
    }
  }

  /**
   * POST /api/custom-fields
   * Create a new custom field
   */
  async createCustomField(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;

      // Validate required fields
      if (!data.name || !data.key || !data.type || !data.entityType) {
        sendError(res, 'Missing required fields: name, key, type, entityType', 400);
        return;
      }

      // Check if custom field with same key and entity type already exists
      const existing = await customFieldService.getCustomFieldByKey(data.key, data.entityType, req.user!.tenantId);
      if (existing) {
        sendError(res, 'Custom field with this key already exists for this entity type', 400);
        return;
      }

      data.tenantId = req.user!.tenantId;
      const customField = await customFieldService.createCustomField(data);

      sendSuccess(res, customField, 'Custom field created successfully', 201);
    } catch (error: any) {
      logger.error('Error in createCustomField', { error });
      sendError(res, error.message || 'Failed to create custom field', 500);
    }
  }

  /**
   * PUT /api/custom-fields/:id
   * Update a custom field
   */
  async updateCustomField(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      // Check if custom field exists
      const existing = await customFieldService.getCustomFieldById(id, req.user!.tenantId);
      if (!existing) {
        sendError(res, 'Custom field not found', 404);
        return;
      }

      const customField = await customFieldService.updateCustomField(id, req.user!.tenantId, data);

      sendSuccess(res, customField, 'Custom field updated successfully');
    } catch (error: any) {
      logger.error('Error in updateCustomField', { error });
      sendError(res, error.message || 'Failed to update custom field', 500);
    }
  }

  /**
   * DELETE /api/custom-fields/:id
   * Delete a custom field
   */
  async deleteCustomField(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if custom field exists
      const existing = await customFieldService.getCustomFieldById(id, req.user!.tenantId);
      if (!existing) {
        sendError(res, 'Custom field not found', 404);
        return;
      }

      await customFieldService.deleteCustomField(id, req.user!.tenantId);

      sendSuccess(res, null, 'Custom field deleted successfully');
    } catch (error: any) {
      logger.error('Error in deleteCustomField', { error });
      sendError(res, error.message || 'Failed to delete custom field', 500);
    }
  }

  /**
   * GET /api/custom-fields/values/:entityId
   * Get all custom field values for an entity
   */
  async getCustomFieldValues(req: Request, res: Response): Promise<void> {
    try {
      const { entityId } = req.params;
      const { entityType } = req.query;

      if (!entityType) {
        sendError(res, 'entityType query parameter is required', 400);
        return;
      }

      const values = await customFieldService.getCustomFieldValues(entityId, entityType as string, req.user!.tenantId);

      sendSuccess(res, values, 'Custom field values retrieved successfully');
    } catch (error: any) {
      logger.error('Error in getCustomFieldValues', { error });
      sendError(res, error.message || 'Failed to retrieve custom field values', 500);
    }
  }

  /**
   * POST /api/custom-fields/values
   * Set a custom field value
   */
  async setCustomFieldValue(req: Request, res: Response): Promise<void> {
    try {
      const { customFieldId, entityId, value } = req.body;

      if (!customFieldId || !entityId) {
        sendError(res, 'Missing required fields: customFieldId, entityId', 400);
        return;
      }

      // Get custom field for validation
      const customField = await customFieldService.getCustomFieldById(customFieldId, req.user!.tenantId);
      if (!customField) {
        sendError(res, 'Custom field not found', 404);
        return;
      }

      // Validate the value
      const validation = customFieldService.validateCustomFieldValue(customField, value);
      if (!validation.valid) {
        sendError(res, validation.error || 'Invalid value', 400);
        return;
      }

      const fieldValue = await customFieldService.setCustomFieldValue({
        fieldId: customFieldId,
        entityId,
        value,
        tenantId: req.user!.tenantId
      });

      sendSuccess(res, fieldValue, 'Custom field value set successfully');
    } catch (error: any) {
      logger.error('Error in setCustomFieldValue', { error });
      sendError(res, error.message || 'Failed to set custom field value', 500);
    }
  }

  /**
   * POST /api/custom-fields/values/bulk
   * Bulk set custom field values for an entity
   */
  async bulkSetCustomFieldValues(req: Request, res: Response): Promise<void> {
    try {
      const { entityId, values } = req.body;

      if (!entityId || !values) {
        sendError(res, 'Missing required fields: entityId, values', 400);
        return;
      }

      // Validate all values first
      const validationErrors: string[] = [];
      for (const [customFieldId, value] of Object.entries(values)) {
        const customField = await customFieldService.getCustomFieldById(customFieldId, req.user!.tenantId);
        if (!customField) {
          validationErrors.push(`Custom field ${customFieldId} not found`);
          continue;
        }

        const validation = customFieldService.validateCustomFieldValue(customField, value as string);
        if (!validation.valid) {
          validationErrors.push(validation.error || `Invalid value for ${customField.name}`);
        }
      }

      if (validationErrors.length > 0) {
        sendError(res, validationErrors.join('; '), 400);
        return;
      }

      await customFieldService.bulkSetCustomFieldValues(entityId, values, req.user!.tenantId);

      sendSuccess(res, null, 'Custom field values set successfully');
    } catch (error: any) {
      logger.error('Error in bulkSetCustomFieldValues', { error });
      sendError(res, error.message || 'Failed to bulk set custom field values', 500);
    }
  }

  /**
   * DELETE /api/custom-fields/values/:customFieldId/:entityId
   * Delete a custom field value
   */
  async deleteCustomFieldValue(req: Request, res: Response): Promise<void> {
    try {
      const { customFieldId, entityId } = req.params;

      await customFieldService.deleteCustomFieldValue(customFieldId, entityId, req.user!.tenantId);

      sendSuccess(res, null, 'Custom field value deleted successfully');
    } catch (error: any) {
      logger.error('Error in deleteCustomFieldValue', { error });
      sendError(res, error.message || 'Failed to delete custom field value', 500);
    }
  }

  /**
   * POST /api/custom-fields/reorder
   * Reorder custom fields
   */
  async reorderCustomFields(req: Request, res: Response): Promise<void> {
    try {
      const { fieldIds, entityType } = req.body;

      if (!fieldIds || !Array.isArray(fieldIds) || !entityType) {
        sendError(res, 'Missing required fields: fieldIds (array), entityType', 400);
        return;
      }

      await customFieldService.reorderCustomFields(fieldIds, entityType, req.user!.tenantId);

      sendSuccess(res, null, 'Custom fields reordered successfully');
    } catch (error: any) {
      logger.error('Error in reorderCustomFields', { error });
      sendError(res, error.message || 'Failed to reorder custom fields', 500);
    }
  }
}

export const customFieldController = new CustomFieldController();
