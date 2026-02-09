/**
 * UserFieldVisibilityService Unit Tests
 * Comprehensive tests for user field visibility management
 */

import 'reflect-metadata';
import { UserFieldVisibilityService } from '../../../src/services/UserFieldVisibilityService';
import prisma from '../../../src/utils/prisma';

describe('UserFieldVisibilityService', () => {
  let service: UserFieldVisibilityService;
  let findManySpy: jest.SpyInstance;
  let findFirstSpy: jest.SpyInstance;
  let updateSpy: jest.SpyInstance;
  let createSpy: jest.SpyInstance;
  let deleteManySpy: jest.SpyInstance;
  let customFieldFindManySpy: jest.SpyInstance;

  beforeEach(() => {
    // Use spyOn to mock prisma methods
    findManySpy = jest.spyOn(prisma.systemSetting, 'findMany').mockResolvedValue([]);
    findFirstSpy = jest.spyOn(prisma.systemSetting, 'findFirst').mockResolvedValue(null);
    updateSpy = jest.spyOn(prisma.systemSetting, 'update').mockResolvedValue({} as any);
    createSpy = jest.spyOn(prisma.systemSetting, 'create').mockResolvedValue({} as any);
    deleteManySpy = jest.spyOn(prisma.systemSetting, 'deleteMany').mockResolvedValue({ count: 0 });
    customFieldFindManySpy = jest.spyOn(prisma.customField, 'findMany').mockResolvedValue([]);

    service = new UserFieldVisibilityService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(UserFieldVisibilityService);
    });
  });

  describe('getFieldVisibilitySettings', () => {
    it('should return default settings when no custom settings exist', async () => {
      const result = await service.getFieldVisibilitySettings();

      expect(result).toBeDefined();
      expect(result.name).toEqual({ visible: true, required: true });
      expect(result.email).toEqual({ visible: true, required: true });
      expect(result.role).toEqual({ visible: true, required: true });
      expect(result.phone).toEqual({ visible: true, required: false });
    });

    it('should merge custom settings with defaults', async () => {
      const customSettings = [
        {
          id: '1',
          key: 'user_field_visibility_phone',
          value: JSON.stringify({ visible: false, required: false }),
          tenantId: null,
          description: null,
          category: null,
          updatedBy: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          key: 'user_field_visibility_bio',
          value: JSON.stringify({ visible: true, required: true }),
          tenantId: null,
          description: null,
          category: null,
          updatedBy: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      findManySpy.mockResolvedValue(customSettings);

      const result = await service.getFieldVisibilitySettings();

      expect(result.phone).toEqual({ visible: false, required: false });
      expect(result.bio).toEqual({ visible: true, required: true });
      expect(result.name).toEqual({ visible: true, required: true });
    });

    it('should skip invalid JSON in settings', async () => {
      const invalidSettings = [
        {
          id: '1',
          key: 'user_field_visibility_phone',
          value: 'invalid json',
          tenantId: null,
          description: null,
          category: null,
          updatedBy: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      findManySpy.mockResolvedValue(invalidSettings);

      const result = await service.getFieldVisibilitySettings();

      // Should skip invalid JSON and use defaults
      expect(result.phone).toEqual({ visible: true, required: false });
    });

    it('should include all default fields', async () => {
      const result = await service.getFieldVisibilitySettings();

      const expectedFields = [
        'name', 'email', 'role', 'phone', 'address', 'bio',
        'preferredName', 'pronouns', 'gender', 'judgeNumber',
        'judgeLevel', 'isHeadJudge', 'contestantNumber', 'age',
        'school', 'grade', 'parentGuardian', 'parentPhone'
      ];

      expectedFields.forEach(field => {
        expect(result[field]).toBeDefined();
        expect(result[field]).toHaveProperty('visible');
        expect(result[field]).toHaveProperty('required');
      });
    });

    it('should include custom fields in visibility settings', async () => {
      customFieldFindManySpy.mockResolvedValue([
        { id: 'cf-1', key: 'shirt_size', label: 'Shirt Size', type: 'TEXT', required: false, active: true, order: 1 }
      ]);

      const result = await service.getFieldVisibilitySettings();

      expect(result['custom_shirt_size']).toEqual({
        visible: true,
        required: false,
        isCustomField: true,
        customFieldId: 'cf-1',
        label: 'Shirt Size',
        type: 'TEXT'
      });
    });
  });

  describe('updateFieldVisibility', () => {
    it('should create new field visibility setting when none exists', async () => {
      createSpy.mockResolvedValue({
        id: 'setting-1',
        key: 'user_field_visibility_phone',
        value: JSON.stringify({ visible: false, required: false })
      });

      const result = await service.updateFieldVisibility('phone', false, false, 'user123');

      expect(result).toEqual({
        message: 'Field visibility updated successfully',
        field: 'phone',
        visible: false,
        required: false
      });
      expect(createSpy).toHaveBeenCalled();
    });

    it('should update existing field visibility setting', async () => {
      findFirstSpy.mockResolvedValue({
        id: 'setting-1',
        key: 'user_field_visibility_bio'
      });
      updateSpy.mockResolvedValue({
        key: 'user_field_visibility_bio',
        value: JSON.stringify({ visible: true, required: true })
      });

      const result = await service.updateFieldVisibility('bio', true, true, 'admin123');

      expect(result).toEqual({
        message: 'Field visibility updated successfully',
        field: 'bio',
        visible: true,
        required: true
      });
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should default required to false when not provided', async () => {
      const result = await service.updateFieldVisibility('phone', true, undefined, 'user123');

      expect(result.required).toBe(false);
    });

    it('should throw error when field is missing', async () => {
      await expect(
        service.updateFieldVisibility('', true, false, 'user123')
      ).rejects.toThrow();
    });

    it('should throw error when visible is missing', async () => {
      await expect(
        service.updateFieldVisibility('phone', undefined as any, false, 'user123')
      ).rejects.toThrow();
    });
  });

  describe('resetFieldVisibility', () => {
    it('should delete all field visibility settings', async () => {
      deleteManySpy.mockResolvedValue({ count: 5 });

      const result = await service.resetFieldVisibility();

      expect(result).toEqual({
        message: 'Field visibility reset to defaults successfully'
      });
      expect(deleteManySpy).toHaveBeenCalledWith({
        where: {
          key: {
            startsWith: 'user_field_visibility_'
          }
        }
      });
    });

    it('should succeed even when no settings exist', async () => {
      deleteManySpy.mockResolvedValue({ count: 0 });

      const result = await service.resetFieldVisibility();

      expect(result.message).toBe('Field visibility reset to defaults successfully');
    });
  });
});
