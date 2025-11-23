/**
 * Custom Fields Controller
 * Handles HTTP requests for custom field management
 */

import { Request, Response } from 'express';
import { CustomFieldService, CustomFieldType } from '../services/CustomFieldService';
import prisma from '../config/database';
import { createLogger } from '../utils/logger';
import { getRequiredParam } from '../utils/routeHelpers';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    tenantId: string;
  };
  tenantId?: string;
};

const logger = createLogger('CustomFieldsController');
const customFieldService = new CustomFieldService(prisma);

const VALID_FIELD_TYPES: CustomFieldType[] = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'TEXT_AREA', 'EMAIL', 'PHONE', 'URL'];

/**
 * Create custom field
 * POST /api/custom-fields
 */
export const createCustomField = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, key, type, entityType, required, defaultValue, options, validation, order } = authReq.body;

    // Validate required fields
    if (!name || !key || !type || !entityType) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: name, key, type, entityType'
      });
      return;
    }

    // Validate type
    if (!VALID_FIELD_TYPES.includes(type as CustomFieldType)) {
      res.status(400).json({
        success: false,
        message: `Invalid field type. Must be one of: ${VALID_FIELD_TYPES.join(', ')}`
      });
      return;
    }

    const field = await customFieldService.createCustomField({
      tenantId: authReq.user?.tenantId || 'default',
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

    logger.info(`Custom field created: ${field.id}`, { userId: authReq.user?.id });

    res.status(201).json({
      success: true,
      data: field
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error creating custom field:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to create custom field'
    });
  }
};

/**
 * Get all custom fields (all entity types)
 * GET /api/custom-fields
 */
export const getAllCustomFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const activeOnly = authReq.query['activeOnly'] !== 'false';
    const tenantId = authReq.user?.tenantId || 'default';

    // Get all custom fields by querying each entity type
    const entityTypes = ['EVENT', 'CONTEST', 'CATEGORY', 'USER', 'CONTESTANT'];
    const allFields = [];

    for (const entityType of entityTypes) {
      const fields = await customFieldService.getCustomFieldsByEntityType(entityType, tenantId, activeOnly);
      allFields.push(...fields);
    }

    res.json({
      success: true,
      data: allFields
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting all custom fields:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to get custom fields'
    });
  }
};

/**
 * Get custom fields by entity type
 * GET /api/custom-fields/:entityType
 */
export const getCustomFieldsByEntityType = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const entityType = getRequiredParam(req, 'entityType');
    const activeOnly = authReq.query['activeOnly'] !== 'false';

    const fields = await customFieldService.getCustomFieldsByEntityType(entityType, authReq.user?.tenantId || 'default', activeOnly);

    res.json({
      success: true,
      data: fields
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting custom fields:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to get custom fields'
    });
  }
};

/**
 * Get custom field by ID
 * GET /api/custom-fields/field/:id
 */
export const getCustomFieldById = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = getRequiredParam(req, 'id');

    const field = await customFieldService.getCustomFieldById(id, authReq.user?.tenantId || 'default');

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
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting custom field:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to get custom field'
    });
  }
};

/**
 * Update custom field
 * PUT /api/custom-fields/:id
 */
export const updateCustomField = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = getRequiredParam(req, 'id');
    const updateData = authReq.body;

    const field = await customFieldService.updateCustomField(id, authReq.user?.tenantId || 'default', updateData);

    logger.info(`Custom field updated: ${id}`, { userId: authReq.user?.id });

    res.json({
      success: true,
      data: field
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error updating custom field:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update custom field'
    });
  }
};

/**
 * Delete custom field
 * DELETE /api/custom-fields/:id
 */
export const deleteCustomField = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = getRequiredParam(req, 'id');

    await customFieldService.deleteCustomField(id, authReq.user?.tenantId || 'default');

    logger.info(`Custom field deleted: ${id}`, { userId: authReq.user?.id });

    res.json({
      success: true,
      message: 'Custom field deleted successfully'
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error deleting custom field:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete custom field'
    });
  }
};

/**
 * Set custom field value
 * POST /api/custom-fields/values
 */
export const setCustomFieldValue = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { customFieldId, entityId, value } = authReq.body;

    if (!customFieldId || !entityId) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: customFieldId, entityId'
      });
      return;
    }

    // Get field for validation
    const field = await customFieldService.getCustomFieldById(customFieldId, authReq.user?.tenantId || 'default');
    if (!field) {
      res.status(404).json({
        success: false,
        message: 'Custom field not found'
      });
      return;
    }

    // Validate value
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
      tenantId: authReq.user?.tenantId || 'default'
    });

    res.json({
      success: true,
      data: fieldValue
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error setting custom field value:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to set custom field value'
    });
  }
};

/**
 * Bulk set custom field values
 * POST /api/custom-fields/values/bulk
 */
export const bulkSetCustomFieldValues = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { entityId, values } = authReq.body;

    if (!entityId || !values) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: entityId, values'
      });
      return;
    }

    await customFieldService.bulkSetCustomFieldValues(entityId, authReq.user?.tenantId || 'default', values);

    res.json({
      success: true,
      message: 'Custom field values set successfully'
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error bulk setting custom field values:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to set custom field values'
    });
  }
};

/**
 * Get custom field values for entity
 * GET /api/custom-fields/values/:entityId
 */
export const getCustomFieldValues = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const entityId = getRequiredParam(req, 'entityId');
    const { entityType } = authReq.query;

    if (!entityType) {
      res.status(400).json({
        success: false,
        message: 'Missing required query parameter: entityType'
      });
      return;
    }

    const values = await customFieldService.getCustomFieldValues(entityId, entityType as string, authReq.user?.tenantId || 'default');

    res.json({
      success: true,
      data: values
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting custom field values:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to get custom field values'
    });
  }
};

/**
 * Delete custom field value
 * DELETE /api/custom-fields/values/:customFieldId/:entityId
 */
export const deleteCustomFieldValue = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { customFieldId, entityId } = authReq.params;

    await customFieldService.deleteCustomFieldValue(customFieldId!, entityId!, authReq.user?.tenantId || 'default');

    res.json({
      success: true,
      message: 'Custom field value deleted successfully'
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error deleting custom field value:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete custom field value'
    });
  }
};

/**
 * Reorder custom fields
 * POST /api/custom-fields/reorder
 */
export const reorderCustomFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { fieldIds, entityType } = authReq.body;

    if (!fieldIds || !entityType) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: fieldIds, entityType'
      });
      return;
    }

    await customFieldService.reorderCustomFields(fieldIds, entityType, authReq.user?.tenantId || 'default');

    res.json({
      success: true,
      message: 'Custom fields reordered successfully'
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Error reordering custom fields:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to reorder custom fields'
    });
  }
};
