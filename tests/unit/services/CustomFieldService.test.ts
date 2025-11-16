/**
 * CustomFieldService Unit Tests
 * Comprehensive tests for custom field service
 */

import 'reflect-metadata';
import { CustomFieldService } from '../../../src/services/CustomFieldService';
import { PrismaClient, CustomFieldType } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('CustomFieldService', () => {
  let service: CustomFieldService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockCustomField = {
    id: 'field-1',
    name: 'Emergency Contact',
    key: 'emergency_contact',
    type: 'TEXT' as CustomFieldType,
    entityType: 'contestant',
    required: true,
    defaultValue: null,
    options: null,
    validation: JSON.stringify({ minLength: 3, maxLength: 100 }),
    order: 1,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCustomFieldValue = {
    id: 'value-1',
    customFieldId: 'field-1',
    entityId: 'entity-1',
    value: 'John Doe',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new CustomFieldService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('createCustomField', () => {
    it('should create a custom field with required fields', async () => {
      mockPrisma.customField.create.mockResolvedValue(mockCustomField);

      const result = await service.createCustomField({
        name: 'Emergency Contact',
        key: 'emergency_contact',
        type: 'TEXT',
        entityType: 'contestant',
      });

      expect(result).toEqual(mockCustomField);
      expect(mockPrisma.customField.create).toHaveBeenCalledWith({
        data: {
          name: 'Emergency Contact',
          key: 'emergency_contact',
          type: 'TEXT',
          entityType: 'contestant',
          required: false,
          defaultValue: undefined,
          options: undefined,
          validation: undefined,
          order: 0,
          active: true,
        },
      });
    });

    it('should create a custom field with all optional fields', async () => {
      const fullField = { ...mockCustomField, required: true, order: 5 };
      mockPrisma.customField.create.mockResolvedValue(fullField);

      const result = await service.createCustomField({
        name: 'Emergency Contact',
        key: 'emergency_contact',
        type: 'TEXT',
        entityType: 'contestant',
        required: true,
        defaultValue: 'N/A',
        options: ['option1', 'option2'],
        validation: { minLength: 3 },
        order: 5,
        active: true,
      });

      expect(result).toEqual(fullField);
      expect(mockPrisma.customField.create).toHaveBeenCalledWith({
        data: {
          name: 'Emergency Contact',
          key: 'emergency_contact',
          type: 'TEXT',
          entityType: 'contestant',
          required: true,
          defaultValue: 'N/A',
          options: JSON.stringify(['option1', 'option2']),
          validation: JSON.stringify({ minLength: 3 }),
          order: 5,
          active: true,
        },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.customField.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createCustomField({
          name: 'Test Field',
          key: 'test_field',
          type: 'TEXT',
          entityType: 'contestant',
        })
      ).rejects.toThrow('Failed to create custom field');
    });
  });

  describe('getCustomFieldsByEntityType', () => {
    it('should get all active custom fields for an entity type', async () => {
      mockPrisma.customField.findMany.mockResolvedValue([mockCustomField]);

      const result = await service.getCustomFieldsByEntityType('contestant');

      expect(result).toEqual([mockCustomField]);
      expect(mockPrisma.customField.findMany).toHaveBeenCalledWith({
        where: { entityType: 'contestant', active: true },
        orderBy: { order: 'asc' },
      });
    });

    it('should get all custom fields including inactive when activeOnly is false', async () => {
      const inactiveField = { ...mockCustomField, active: false };
      mockPrisma.customField.findMany.mockResolvedValue([mockCustomField, inactiveField]);

      const result = await service.getCustomFieldsByEntityType('contestant', false);

      expect(result).toEqual([mockCustomField, inactiveField]);
      expect(mockPrisma.customField.findMany).toHaveBeenCalledWith({
        where: { entityType: 'contestant' },
        orderBy: { order: 'asc' },
      });
    });

    it('should return empty array when no fields exist', async () => {
      mockPrisma.customField.findMany.mockResolvedValue([]);

      const result = await service.getCustomFieldsByEntityType('contestant');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrisma.customField.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getCustomFieldsByEntityType('contestant')).rejects.toThrow(
        'Failed to fetch custom fields'
      );
    });
  });

  describe('getCustomFieldById', () => {
    it('should get a custom field by id with values', async () => {
      const fieldWithValues = { ...mockCustomField, values: [mockCustomFieldValue] };
      mockPrisma.customField.findUnique.mockResolvedValue(fieldWithValues as any);

      const result = await service.getCustomFieldById('field-1');

      expect(result).toEqual(fieldWithValues);
      expect(mockPrisma.customField.findUnique).toHaveBeenCalledWith({
        where: { id: 'field-1' },
        include: { values: true },
      });
    });

    it('should return null when field not found', async () => {
      mockPrisma.customField.findUnique.mockResolvedValue(null);

      const result = await service.getCustomFieldById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPrisma.customField.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getCustomFieldById('field-1')).rejects.toThrow(
        'Failed to fetch custom field'
      );
    });
  });

  describe('getCustomFieldByKey', () => {
    it('should get a custom field by key and entity type', async () => {
      mockPrisma.customField.findUnique.mockResolvedValue(mockCustomField);

      const result = await service.getCustomFieldByKey('emergency_contact', 'contestant');

      expect(result).toEqual(mockCustomField);
      expect(mockPrisma.customField.findUnique).toHaveBeenCalledWith({
        where: {
          key_entityType: { key: 'emergency_contact', entityType: 'contestant' },
        },
      });
    });

    it('should return null when field not found', async () => {
      mockPrisma.customField.findUnique.mockResolvedValue(null);

      const result = await service.getCustomFieldByKey('nonexistent', 'contestant');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPrisma.customField.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getCustomFieldByKey('emergency_contact', 'contestant')
      ).rejects.toThrow('Failed to fetch custom field');
    });
  });

  describe('updateCustomField', () => {
    it('should update a custom field with partial data', async () => {
      const updated = { ...mockCustomField, name: 'Updated Name' };
      mockPrisma.customField.update.mockResolvedValue(updated);

      const result = await service.updateCustomField('field-1', { name: 'Updated Name' });

      expect(result).toEqual(updated);
      expect(mockPrisma.customField.update).toHaveBeenCalledWith({
        where: { id: 'field-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update all fields when all data provided', async () => {
      const updated = { ...mockCustomField };
      mockPrisma.customField.update.mockResolvedValue(updated);

      const result = await service.updateCustomField('field-1', {
        name: 'New Name',
        type: 'NUMBER',
        required: false,
        defaultValue: '0',
        options: ['opt1'],
        validation: { min: 0 },
        order: 10,
        active: false,
      });

      expect(result).toEqual(updated);
      expect(mockPrisma.customField.update).toHaveBeenCalledWith({
        where: { id: 'field-1' },
        data: {
          name: 'New Name',
          type: 'NUMBER',
          required: false,
          defaultValue: '0',
          options: JSON.stringify(['opt1']),
          validation: JSON.stringify({ min: 0 }),
          order: 10,
          active: false,
        },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.customField.update.mockRejectedValue(new Error('Database error'));

      await expect(service.updateCustomField('field-1', { name: 'Test' })).rejects.toThrow(
        'Failed to update custom field'
      );
    });
  });

  describe('deleteCustomField', () => {
    it('should delete a custom field', async () => {
      mockPrisma.customField.delete.mockResolvedValue(mockCustomField);

      await service.deleteCustomField('field-1');

      expect(mockPrisma.customField.delete).toHaveBeenCalledWith({
        where: { id: 'field-1' },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.customField.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteCustomField('field-1')).rejects.toThrow(
        'Failed to delete custom field'
      );
    });
  });

  describe('setCustomFieldValue', () => {
    it('should create a new custom field value', async () => {
      mockPrisma.customFieldValue.upsert.mockResolvedValue(mockCustomFieldValue);

      const result = await service.setCustomFieldValue({
        customFieldId: 'field-1',
        entityId: 'entity-1',
        value: 'John Doe',
      });

      expect(result).toEqual(mockCustomFieldValue);
      expect(mockPrisma.customFieldValue.upsert).toHaveBeenCalledWith({
        where: {
          customFieldId_entityId: {
            customFieldId: 'field-1',
            entityId: 'entity-1',
          },
        },
        create: {
          customFieldId: 'field-1',
          entityId: 'entity-1',
          value: 'John Doe',
        },
        update: {
          value: 'John Doe',
        },
      });
    });

    it('should update existing custom field value', async () => {
      const updated = { ...mockCustomFieldValue, value: 'Jane Doe' };
      mockPrisma.customFieldValue.upsert.mockResolvedValue(updated);

      const result = await service.setCustomFieldValue({
        customFieldId: 'field-1',
        entityId: 'entity-1',
        value: 'Jane Doe',
      });

      expect(result).toEqual(updated);
    });

    it('should handle database errors', async () => {
      mockPrisma.customFieldValue.upsert.mockRejectedValue(new Error('Database error'));

      await expect(
        service.setCustomFieldValue({
          customFieldId: 'field-1',
          entityId: 'entity-1',
          value: 'Test',
        })
      ).rejects.toThrow('Failed to set custom field value');
    });
  });

  describe('getCustomFieldValues', () => {
    it('should get all custom field values for an entity', async () => {
      const valueWithField = { ...mockCustomFieldValue, customField: mockCustomField };
      mockPrisma.customFieldValue.findMany.mockResolvedValue([valueWithField] as any);

      const result = await service.getCustomFieldValues('entity-1', 'contestant');

      expect(result).toEqual([valueWithField]);
      expect(mockPrisma.customFieldValue.findMany).toHaveBeenCalledWith({
        where: {
          entityId: 'entity-1',
          customField: {
            entityType: 'contestant',
            active: true,
          },
        },
        include: {
          customField: true,
        },
      });
    });

    it('should return empty array when no values exist', async () => {
      mockPrisma.customFieldValue.findMany.mockResolvedValue([]);

      const result = await service.getCustomFieldValues('entity-1', 'contestant');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrisma.customFieldValue.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getCustomFieldValues('entity-1', 'contestant')).rejects.toThrow(
        'Failed to fetch custom field values'
      );
    });
  });

  describe('getCustomFieldValue', () => {
    it('should get a specific custom field value', async () => {
      const valueWithField = { ...mockCustomFieldValue, customField: mockCustomField };
      mockPrisma.customFieldValue.findUnique.mockResolvedValue(valueWithField as any);

      const result = await service.getCustomFieldValue('field-1', 'entity-1');

      expect(result).toEqual(valueWithField);
      expect(mockPrisma.customFieldValue.findUnique).toHaveBeenCalledWith({
        where: {
          customFieldId_entityId: {
            customFieldId: 'field-1',
            entityId: 'entity-1',
          },
        },
        include: {
          customField: true,
        },
      });
    });

    it('should return null when value not found', async () => {
      mockPrisma.customFieldValue.findUnique.mockResolvedValue(null);

      const result = await service.getCustomFieldValue('field-1', 'entity-1');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPrisma.customFieldValue.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getCustomFieldValue('field-1', 'entity-1')).rejects.toThrow(
        'Failed to fetch custom field value'
      );
    });
  });

  describe('deleteCustomFieldValue', () => {
    it('should delete a custom field value', async () => {
      mockPrisma.customFieldValue.delete.mockResolvedValue(mockCustomFieldValue);

      await service.deleteCustomFieldValue('field-1', 'entity-1');

      expect(mockPrisma.customFieldValue.delete).toHaveBeenCalledWith({
        where: {
          customFieldId_entityId: {
            customFieldId: 'field-1',
            entityId: 'entity-1',
          },
        },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.customFieldValue.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteCustomFieldValue('field-1', 'entity-1')).rejects.toThrow(
        'Failed to delete custom field value'
      );
    });
  });

  describe('bulkSetCustomFieldValues', () => {
    it('should set multiple custom field values', async () => {
      mockPrisma.customFieldValue.upsert.mockResolvedValue(mockCustomFieldValue);

      await service.bulkSetCustomFieldValues('entity-1', {
        'field-1': 'value1',
        'field-2': 'value2',
        'field-3': 'value3',
      });

      expect(mockPrisma.customFieldValue.upsert).toHaveBeenCalledTimes(3);
    });

    it('should handle empty values object', async () => {
      await service.bulkSetCustomFieldValues('entity-1', {});

      expect(mockPrisma.customFieldValue.upsert).not.toHaveBeenCalled();
    });

    it('should handle partial failures', async () => {
      mockPrisma.customFieldValue.upsert
        .mockResolvedValueOnce(mockCustomFieldValue)
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.bulkSetCustomFieldValues('entity-1', {
          'field-1': 'value1',
          'field-2': 'value2',
        })
      ).rejects.toThrow('Failed to bulk set custom field values');
    });
  });

  describe('validateCustomFieldValue', () => {
    it('should validate required field with empty value', () => {
      const result = service.validateCustomFieldValue(mockCustomField, '');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should validate required field with valid value', () => {
      const result = service.validateCustomFieldValue(mockCustomField, 'Valid Value');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate NUMBER type with invalid value', () => {
      const numberField = { ...mockCustomField, type: 'NUMBER' as CustomFieldType };
      const result = service.validateCustomFieldValue(numberField, 'not-a-number');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should validate NUMBER type with valid value', () => {
      const numberField = { ...mockCustomField, type: 'NUMBER' as CustomFieldType, required: false };
      const result = service.validateCustomFieldValue(numberField, '123.45');

      expect(result.valid).toBe(true);
    });

    it('should validate EMAIL type with invalid email', () => {
      const emailField = { ...mockCustomField, type: 'EMAIL' as CustomFieldType, required: false };
      const result = service.validateCustomFieldValue(emailField, 'invalid-email');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should validate EMAIL type with valid email', () => {
      const emailField = { ...mockCustomField, type: 'EMAIL' as CustomFieldType, required: false };
      const result = service.validateCustomFieldValue(emailField, 'test@example.com');

      expect(result.valid).toBe(true);
    });

    it('should validate URL type with invalid URL', () => {
      const urlField = { ...mockCustomField, type: 'URL' as CustomFieldType, required: false };
      const result = service.validateCustomFieldValue(urlField, 'not-a-url');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('URL');
    });

    it('should validate URL type with valid URL', () => {
      const urlField = { ...mockCustomField, type: 'URL' as CustomFieldType, required: false };
      const result = service.validateCustomFieldValue(urlField, 'https://example.com');

      expect(result.valid).toBe(true);
    });

    it('should validate PHONE type with invalid phone', () => {
      const phoneField = { ...mockCustomField, type: 'PHONE' as CustomFieldType, required: false };
      const result = service.validateCustomFieldValue(phoneField, 'abc-def-ghij');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('phone');
    });

    it('should validate PHONE type with valid phone', () => {
      const phoneField = { ...mockCustomField, type: 'PHONE' as CustomFieldType, required: false };
      const result = service.validateCustomFieldValue(phoneField, '123-456-7890');

      expect(result.valid).toBe(true);
    });

    it('should validate DATE type with invalid date', () => {
      const dateField = { ...mockCustomField, type: 'DATE' as CustomFieldType, required: false };
      const result = service.validateCustomFieldValue(dateField, 'not-a-date');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('date');
    });

    it('should validate DATE type with valid date', () => {
      const dateField = { ...mockCustomField, type: 'DATE' as CustomFieldType, required: false };
      const result = service.validateCustomFieldValue(dateField, '2024-01-01');

      expect(result.valid).toBe(true);
    });

    it('should validate BOOLEAN type with invalid value', () => {
      const boolField = { ...mockCustomField, type: 'BOOLEAN' as CustomFieldType, required: false };
      const result = service.validateCustomFieldValue(boolField, 'maybe');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('true or false');
    });

    it('should validate BOOLEAN type with valid values', () => {
      const boolField = { ...mockCustomField, type: 'BOOLEAN' as CustomFieldType, required: false };

      expect(service.validateCustomFieldValue(boolField, 'true').valid).toBe(true);
      expect(service.validateCustomFieldValue(boolField, 'false').valid).toBe(true);
      expect(service.validateCustomFieldValue(boolField, '1').valid).toBe(true);
      expect(service.validateCustomFieldValue(boolField, '0').valid).toBe(true);
    });

    it('should validate SELECT type with invalid option', () => {
      const selectField = {
        ...mockCustomField,
        type: 'SELECT' as CustomFieldType,
        options: JSON.stringify(['opt1', 'opt2', 'opt3']),
        required: false,
      };
      const result = service.validateCustomFieldValue(selectField, 'opt4');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('allowed options');
    });

    it('should validate SELECT type with valid option', () => {
      const selectField = {
        ...mockCustomField,
        type: 'SELECT' as CustomFieldType,
        options: JSON.stringify(['opt1', 'opt2', 'opt3']),
        required: false,
      };
      const result = service.validateCustomFieldValue(selectField, 'opt2');

      expect(result.valid).toBe(true);
    });

    it('should validate MULTI_SELECT type with invalid option', () => {
      const multiSelectField = {
        ...mockCustomField,
        type: 'MULTI_SELECT' as CustomFieldType,
        options: JSON.stringify(['opt1', 'opt2', 'opt3']),
        required: false,
      };
      const result = service.validateCustomFieldValue(multiSelectField, 'opt1,opt4');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid options');
    });

    it('should validate MULTI_SELECT type with valid options', () => {
      const multiSelectField = {
        ...mockCustomField,
        type: 'MULTI_SELECT' as CustomFieldType,
        options: JSON.stringify(['opt1', 'opt2', 'opt3']),
        required: false,
      };
      const result = service.validateCustomFieldValue(multiSelectField, 'opt1,opt2');

      expect(result.valid).toBe(true);
    });

    it('should validate minLength constraint', () => {
      const field = {
        ...mockCustomField,
        validation: JSON.stringify({ minLength: 5 }),
        required: false,
      };
      const result = service.validateCustomFieldValue(field, 'ab');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 5 characters');
    });

    it('should validate maxLength constraint', () => {
      const field = {
        ...mockCustomField,
        validation: JSON.stringify({ maxLength: 10 }),
        required: false,
      };
      const result = service.validateCustomFieldValue(field, 'this is too long');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 10 characters');
    });

    it('should validate min constraint for numbers', () => {
      const field = {
        ...mockCustomField,
        type: 'NUMBER' as CustomFieldType,
        validation: JSON.stringify({ min: 10 }),
        required: false,
      };
      const result = service.validateCustomFieldValue(field, '5');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 10');
    });

    it('should validate max constraint for numbers', () => {
      const field = {
        ...mockCustomField,
        type: 'NUMBER' as CustomFieldType,
        validation: JSON.stringify({ max: 100 }),
        required: false,
      };
      const result = service.validateCustomFieldValue(field, '150');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at most 100');
    });

    it('should validate pattern constraint', () => {
      const field = {
        ...mockCustomField,
        validation: JSON.stringify({ pattern: '^[A-Z][0-9]{3}$' }),
        required: false,
      };

      expect(service.validateCustomFieldValue(field, 'A123').valid).toBe(true);
      expect(service.validateCustomFieldValue(field, 'a123').valid).toBe(false);
    });

    it('should handle validation errors gracefully', () => {
      const field = {
        ...mockCustomField,
        validation: 'invalid-json',
      };
      const result = service.validateCustomFieldValue(field, 'test');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Validation error');
    });
  });

  describe('reorderCustomFields', () => {
    it('should reorder custom fields', async () => {
      mockPrisma.customField.update.mockResolvedValue(mockCustomField);

      await service.reorderCustomFields(['field-1', 'field-2', 'field-3'], 'contestant');

      expect(mockPrisma.customField.update).toHaveBeenCalledTimes(3);
      expect(mockPrisma.customField.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'field-1' },
        data: { order: 0 },
      });
      expect(mockPrisma.customField.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'field-2' },
        data: { order: 1 },
      });
      expect(mockPrisma.customField.update).toHaveBeenNthCalledWith(3, {
        where: { id: 'field-3' },
        data: { order: 2 },
      });
    });

    it('should handle empty field array', async () => {
      await service.reorderCustomFields([], 'contestant');

      expect(mockPrisma.customField.update).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockPrisma.customField.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.reorderCustomFields(['field-1', 'field-2'], 'contestant')
      ).rejects.toThrow('Failed to reorder custom fields');
    });
  });
});
