/**
 * Custom Fields Controller
 * Handles HTTP requests for custom field management
 */

import { Request, Response } from 'express';
import { CustomFieldService, CustomFieldType } from '../services/CustomFieldService';
import { createLogger } from '../utils/logger';
import { getRequiredParam } from '../utils/routeHelpers';
import { resolveRequestTenantId } from '../utils/tenantContext';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    tenantId: string;
  };
  tenantId?: string;
};

const logger = createLogger('CustomFieldsController');

const VALID_FIELD_TYPES: CustomFieldType[] = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'TEXT_AREA', 'EMAIL', 'PHONE', 'URL'];

const getTenantIdOrRespond = (req: AuthenticatedRequest, res: Response): string | null => {
  const tenantId = resolveRequestTenantId(req);
  if (!tenantId) {
    res.status(400).json({
      success: false,
      message: 'Tenant context is required'
    });
    return null;
  }
  return tenantId;
};

const getCustomFieldService = (req: Request, res: Response): CustomFieldService | null => {
  if (!req.prisma) {
    res.status(500).json({
      success: false,
      message: 'Tenant database context unavailable'
    });
    return null;
  }
  return new CustomFieldService(req.prisma);
};

const parseJsonField = <T>(value: unknown): T | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
};

const toLegacyField = (field: any): Record<string, unknown> => ({
  ...field,
  fieldName: field.key,
  fieldLabel: field.name,
  fieldType: field.type,
  displayOrder: field.order,
  helpText: field.helpText,
  options: parseJsonField(field.options),
  validation: parseJsonField(field.validation),
});

const mapLegacyFieldBody = (entityType: string, body: Record<string, unknown>): Record<string, unknown> => ({
  ...body,
  entityType,
  name: body['fieldLabel'] ?? body['name'],
  key: body['fieldName'] ?? body['key'],
  type: body['fieldType'] ?? body['type'],
  order: body['displayOrder'] ?? body['order'],
});

/**
 * Create custom field
 * POST /api/custom-fields
 */
export const createCustomField = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, key, type, entityType, required, defaultValue, options, validation, order } = authReq.body;

    logger.debug('Create custom field request', {
      body: authReq.body,
      user: authReq.user,
      tenantId: authReq.tenantId,
      hasName: !!name,
      hasKey: !!key,
      hasType: !!type,
      hasEntityType: !!entityType
    });

    // Validate required fields
    if (!name || !key || !type || !entityType) {
      logger.warn('Missing required fields', { name, key, type, entityType });
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

    if ((type === 'SELECT' || type === 'MULTI_SELECT') && (!options || (Array.isArray(options) && options.length === 0))) {
      res.status(400).json({
        success: false,
        message: 'SELECT and MULTI_SELECT fields require options'
      });
      return;
    }

    const tenantId = getTenantIdOrRespond(authReq, res);
    if (!tenantId) {
      return;
    }
    const customFieldService = getCustomFieldService(authReq, res);
    if (!customFieldService) {
      return;
    }

    const field = await customFieldService.createCustomField({
      tenantId,
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

export const createLegacyCustomField = async (req: Request, res: Response): Promise<void> => {
  const entityType = getRequiredParam(req, 'entityType');
  req.body = mapLegacyFieldBody(entityType, req.body);

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode === 201 && body && typeof body === 'object' && 'data' in body) {
      return originalJson(toLegacyField((body as { data: unknown }).data));
    }
    return originalJson(body);
  }) as typeof res.json;

  await createCustomField(req, res);
};

/**
 * Get all custom fields (all entity types)
 * GET /api/custom-fields
 */
export const getAllCustomFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const activeOnly = authReq.query['activeOnly'] !== 'false';
    const tenantId = getTenantIdOrRespond(authReq, res);
    if (!tenantId) {
      return;
    }
    const customFieldService = getCustomFieldService(authReq, res);
    if (!customFieldService) {
      return;
    }

    // Get all custom fields by querying each entity type
    const entityTypes = ['EVENT', 'CONTEST', 'CATEGORY', 'USER', 'CONTESTANT'];
    const allFields = [];

    for (const entityType of entityTypes) {
      const fields = await customFieldService.getCustomFieldsByEntityType(entityType, tenantId, activeOnly);
      allFields.push(...fields);
    }

    // Parse JSON fields for frontend consumption
    const parsedFields = allFields.map(field => {
      let parsedOptions = null;
      let parsedValidation = null;

      try {
        if (field.options) {
          if (typeof field.options === 'string') {
            parsedOptions = JSON.parse(field.options);
          } else {
            parsedOptions = field.options;
          }
        }
      } catch (err) {
        logger.warn(`Failed to parse options for field ${field.id}:`, err);
        parsedOptions = null;
      }

      try {
        if (field.validation) {
          if (typeof field.validation === 'string') {
            parsedValidation = JSON.parse(field.validation);
          } else {
            parsedValidation = field.validation;
          }
        }
      } catch (err) {
        logger.warn(`Failed to parse validation for field ${field.id}:`, err);
        parsedValidation = null;
      }

      return {
        ...field,
        options: parsedOptions,
        validation: parsedValidation,
      };
    });

    logger.debug(`Returning ${parsedFields.length} custom fields`);

    res.json({
      success: true,
      data: parsedFields
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
    const tenantId = getTenantIdOrRespond(authReq, res);
    if (!tenantId) {
      return;
    }
    const customFieldService = getCustomFieldService(authReq, res);
    if (!customFieldService) {
      return;
    }

    const fields = await customFieldService.getCustomFieldsByEntityType(entityType, tenantId, activeOnly);

    res.json(fields.map(toLegacyField));
  } catch (error) {
    const err = error as Error;
    logger.error('Error getting custom fields:', error);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to get custom fields'
    });
  }
};

export const updateLegacyCustomField = async (req: Request, res: Response): Promise<void> => {
  req.params['id'] = getRequiredParam(req, 'id');
  req.body = {
    ...req.body,
    name: req.body['fieldLabel'] ?? req.body['name'],
    type: req.body['fieldType'] ?? req.body['type'],
    order: req.body['displayOrder'] ?? req.body['order'],
  };

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode === 200 && body && typeof body === 'object' && 'data' in body) {
      return originalJson({
        ...toLegacyField((body as { data: unknown }).data),
        helpText: req.body['helpText'],
      });
    }
    return originalJson(body);
  }) as typeof res.json;

  await updateCustomField(req, res);
};

export const deleteLegacyCustomField = async (req: Request, res: Response): Promise<void> => {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode === 200 && body && typeof body === 'object' && (body as { success?: boolean }).success) {
      return res.status(204).send();
    }
    return originalJson(body);
  }) as typeof res.json;

  await deleteCustomField(req, res);
};

/**
 * Get custom field by ID
 * GET /api/custom-fields/field/:id
 */
export const getCustomFieldById = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const id = getRequiredParam(req, 'id');
    const tenantId = getTenantIdOrRespond(authReq, res);
    if (!tenantId) {
      return;
    }
    const customFieldService = getCustomFieldService(authReq, res);
    if (!customFieldService) {
      return;
    }

    const field = await customFieldService.getCustomFieldById(id, tenantId);

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

export const setLegacyCustomFieldValue = async (req: Request, res: Response): Promise<void> => {
  req.body = {
    customFieldId: req.body['fieldId'] ?? req.body['customFieldId'],
    entityId: getRequiredParam(req, 'entityId'),
    value: req.body['value'],
  };

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode === 200 && body && typeof body === 'object' && 'data' in body) {
      res.status(201);
      return originalJson((body as { data: unknown }).data);
    }
    return originalJson(body);
  }) as typeof res.json;

  await setCustomFieldValue(req, res);
};

export const validateLegacyCustomFieldValues = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthenticatedRequest;
  const entityType = getRequiredParam(req, 'entityType');
  const tenantId = getTenantIdOrRespond(authReq, res);
  if (!tenantId) return;
  const customFieldService = getCustomFieldService(authReq, res);
  if (!customFieldService) return;

  const fields = await customFieldService.getCustomFieldsByEntityType(entityType, tenantId, true);
  const values = (req.body['values'] ?? {}) as Record<string, string>;
  const errors = fields
    .filter((field) => field.required && !values[field.key])
    .map((field) => field.key);

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  res.json({ valid: true });
};

export const getLegacyCustomFieldValues = async (req: Request, res: Response): Promise<void> => {
  req.query['entityType'] = getRequiredParam(req, 'entityType');

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode === 200 && body && typeof body === 'object' && 'data' in body) {
      return originalJson((body as { data: unknown }).data);
    }
    return originalJson(body);
  }) as typeof res.json;

  await getCustomFieldValues(req, res);
};

export const bulkSetLegacyCustomFieldValues = async (req: Request, res: Response): Promise<void> => {
  const fieldValues = Array.isArray(req.body['fieldValues']) ? req.body['fieldValues'] as Array<{ fieldId: string; value: string }> : [];
  req.body = {
    entityId: getRequiredParam(req, 'entityId'),
    values: Object.fromEntries(fieldValues.map((item) => [item.fieldId, item.value])),
  };

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode === 200 && body && typeof body === 'object' && (body as { success?: boolean }).success) {
      return originalJson({ saved: fieldValues.length });
    }
    return originalJson(body);
  }) as typeof res.json;

  await bulkSetCustomFieldValues(req, res);
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
    const tenantId = getTenantIdOrRespond(authReq, res);
    if (!tenantId) {
      return;
    }
    const customFieldService = getCustomFieldService(authReq, res);
    if (!customFieldService) {
      return;
    }

    const field = await customFieldService.updateCustomField(id, tenantId, updateData);

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
    const tenantId = getTenantIdOrRespond(authReq, res);
    if (!tenantId) {
      return;
    }
    const customFieldService = getCustomFieldService(authReq, res);
    if (!customFieldService) {
      return;
    }

    await customFieldService.deleteCustomField(id, tenantId);

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
    const tenantId = getTenantIdOrRespond(authReq, res);
    if (!tenantId) {
      return;
    }
    const customFieldService = getCustomFieldService(authReq, res);
    if (!customFieldService) {
      return;
    }

    if (!customFieldId || !entityId) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: customFieldId, entityId'
      });
      return;
    }

    // Get field for validation
    const field = await customFieldService.getCustomFieldById(customFieldId, tenantId);
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
      tenantId
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
    const tenantId = getTenantIdOrRespond(authReq, res);
    if (!tenantId) {
      return;
    }
    const customFieldService = getCustomFieldService(authReq, res);
    if (!customFieldService) {
      return;
    }

    if (!entityId || !values) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: entityId, values'
      });
      return;
    }

    await customFieldService.bulkSetCustomFieldValues(entityId, tenantId, values);

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
    const tenantId = getTenantIdOrRespond(authReq, res);
    if (!tenantId) {
      return;
    }
    const customFieldService = getCustomFieldService(authReq, res);
    if (!customFieldService) {
      return;
    }

    if (!entityType) {
      res.status(400).json({
        success: false,
        message: 'Missing required query parameter: entityType'
      });
      return;
    }

    const values = await customFieldService.getCustomFieldValues(entityId, entityType as string, tenantId);

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
    const tenantId = getTenantIdOrRespond(authReq, res);
    if (!tenantId) {
      return;
    }
    const customFieldService = getCustomFieldService(authReq, res);
    if (!customFieldService) {
      return;
    }

    await customFieldService.deleteCustomFieldValue(customFieldId!, entityId!, tenantId);

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
    const tenantId = getTenantIdOrRespond(authReq, res);
    if (!tenantId) {
      return;
    }
    const customFieldService = getCustomFieldService(authReq, res);
    if (!customFieldService) {
      return;
    }

    if (!fieldIds || !entityType) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: fieldIds, entityType'
      });
      return;
    }

    await customFieldService.reorderCustomFields(fieldIds, entityType, tenantId);

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
