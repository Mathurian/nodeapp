/**
 * TemplateService unit tests.
 * Aligned with the current tenant-aware TemplateRepository contract.
 */

import { beforeEach, describe, expect, it } from '@jest/globals';
import { mock, MockProxy } from 'jest-mock-extended';
import { CategoryTemplate } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../src/services/BaseService';
import { TemplateService } from '../../../src/services/TemplateService';
import {
  CreateTemplateData,
  TemplateRepository,
  TemplateWithCriteria,
  UpdateTemplateData,
} from '../../../src/repositories/TemplateRepository';

describe('TemplateService', () => {
  let service: TemplateService;
  let templateRepoMock: MockProxy<TemplateRepository>;

  const TEST_TENANT_ID = 'tenant-123';
  const BASE_TIME = new Date('2026-02-25T12:00:00.000Z');

  const buildTemplate = (
    overrides: Partial<CategoryTemplate> = {},
    criteria: Array<{
      id: string;
      name: string;
      maxScore: number;
      templateId: string;
    }> = []
  ): TemplateWithCriteria => ({
    id: 'template-1',
    name: 'Dance Template',
    description: 'For dance competitions',
    tenantId: TEST_TENANT_ID,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    ...overrides,
    templateCriteria: criteria,
  });

  beforeEach(() => {
    templateRepoMock = mock<TemplateRepository>();
    service = new TemplateService(templateRepoMock as any);
  });

  describe('getAllTemplates', () => {
    it('returns all templates for a tenant', async () => {
      const templates = [
        buildTemplate(
          { id: 'template-1', name: 'Dance Template' },
          [{ id: 'criterion-1', name: 'Technique', maxScore: 10, templateId: 'template-1' }]
        ),
        buildTemplate({ id: 'template-2', name: 'Vocal Template' }),
      ];
      templateRepoMock.findAllWithCriteria.mockResolvedValue(templates);

      const result = await service.getAllTemplates(TEST_TENANT_ID);

      expect(result).toEqual(templates);
      expect(templateRepoMock.findAllWithCriteria).toHaveBeenCalledWith(TEST_TENANT_ID);
    });

    it('returns an empty array when the tenant has no templates', async () => {
      templateRepoMock.findAllWithCriteria.mockResolvedValue([]);

      const result = await service.getAllTemplates(TEST_TENANT_ID);

      expect(result).toEqual([]);
    });
  });

  describe('getTemplateById', () => {
    it('returns the template when it exists', async () => {
      const template = buildTemplate(
        { id: 'template-1' },
        [
          { id: 'criterion-1', name: 'Technique', maxScore: 10, templateId: 'template-1' },
          { id: 'criterion-2', name: 'Creativity', maxScore: 15, templateId: 'template-1' },
        ]
      );
      templateRepoMock.findByIdWithCriteria.mockResolvedValue(template);

      const result = await service.getTemplateById('template-1', TEST_TENANT_ID);

      expect(result).toEqual(template);
      expect(result.templateCriteria).toHaveLength(2);
      expect(templateRepoMock.findByIdWithCriteria).toHaveBeenCalledWith(
        'template-1',
        TEST_TENANT_ID
      );
    });

    it('throws ValidationError when id is missing', async () => {
      await expect(service.getTemplateById('', TEST_TENANT_ID)).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError when the template does not exist', async () => {
      templateRepoMock.findByIdWithCriteria.mockResolvedValue(null);

      await expect(service.getTemplateById('missing', TEST_TENANT_ID)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('createTemplate', () => {
    it('creates a template with criteria', async () => {
      const input: CreateTemplateData = {
        name: 'New Template',
        description: 'Test template',
        tenantId: TEST_TENANT_ID,
        criteria: [
          { name: 'Technique', maxScore: 10 },
          { name: 'Creativity', maxScore: 15 },
        ],
      };
      const created = buildTemplate(
        { id: 'template-2', name: input.name, description: input.description },
        [
          { id: 'criterion-1', name: 'Technique', maxScore: 10, templateId: 'template-2' },
          { id: 'criterion-2', name: 'Creativity', maxScore: 15, templateId: 'template-2' },
        ]
      );
      templateRepoMock.createWithCriteria.mockResolvedValue(created);

      const result = await service.createTemplate(input);

      expect(result).toEqual(created);
      expect(templateRepoMock.createWithCriteria).toHaveBeenCalledWith(input);
    });

    it('throws ValidationError when required fields are missing', async () => {
      await expect(service.createTemplate({ name: '', tenantId: TEST_TENANT_ID })).rejects.toThrow(
        ValidationError
      );
      await expect(service.createTemplate({ name: 'Name', tenantId: '' })).rejects.toThrow(
        ValidationError
      );
    });

    it('allows a template without criteria', async () => {
      const input: CreateTemplateData = {
        name: 'Simple Template',
        tenantId: TEST_TENANT_ID,
      };
      const created = buildTemplate({ id: 'template-3', name: 'Simple Template' });
      templateRepoMock.createWithCriteria.mockResolvedValue(created);

      const result = await service.createTemplate(input);

      expect(result.templateCriteria).toEqual([]);
    });
  });

  describe('updateTemplate', () => {
    it('updates the template after verifying it exists', async () => {
      const existing = buildTemplate({ id: 'template-1', name: 'Old Name' });
      const updateData: UpdateTemplateData = {
        name: 'Updated Name',
        description: 'Updated description',
      };
      const updated = buildTemplate({
        id: 'template-1',
        name: 'Updated Name',
        description: 'Updated description',
      });

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(existing);
      templateRepoMock.updateWithCriteria.mockResolvedValue(updated);

      const result = await service.updateTemplate('template-1', TEST_TENANT_ID, updateData);

      expect(result).toEqual(updated);
      expect(templateRepoMock.findByIdWithCriteria).toHaveBeenCalledWith(
        'template-1',
        TEST_TENANT_ID
      );
      expect(templateRepoMock.updateWithCriteria).toHaveBeenCalledWith(
        'template-1',
        TEST_TENANT_ID,
        updateData
      );
    });

    it('updates criteria when provided', async () => {
      const existing = buildTemplate({ id: 'template-1' });
      const updateData: UpdateTemplateData = {
        criteria: [
          { name: 'Updated Criterion', maxScore: 15 },
          { name: 'New Criterion', maxScore: 10 },
        ],
      };
      const updated = buildTemplate(
        { id: 'template-1' },
        [
          { id: 'criterion-1', name: 'Updated Criterion', maxScore: 15, templateId: 'template-1' },
          { id: 'criterion-2', name: 'New Criterion', maxScore: 10, templateId: 'template-1' },
        ]
      );

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(existing);
      templateRepoMock.updateWithCriteria.mockResolvedValue(updated);

      const result = await service.updateTemplate('template-1', TEST_TENANT_ID, updateData);

      expect(result.templateCriteria).toHaveLength(2);
    });

    it('throws ValidationError when id is missing', async () => {
      await expect(service.updateTemplate('', TEST_TENANT_ID, {})).rejects.toThrow(
        ValidationError
      );
    });

    it('throws NotFoundError when the template does not exist', async () => {
      templateRepoMock.findByIdWithCriteria.mockResolvedValue(null);

      await expect(
        service.updateTemplate('missing', TEST_TENANT_ID, { name: 'Test' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTemplate', () => {
    it('verifies the template exists before deleting it', async () => {
      const template = buildTemplate({ id: 'template-1' });
      templateRepoMock.findByIdWithCriteria.mockResolvedValue(template);
      templateRepoMock.delete.mockResolvedValue(undefined);

      await service.deleteTemplate('template-1', TEST_TENANT_ID);

      expect(templateRepoMock.findByIdWithCriteria).toHaveBeenCalledWith(
        'template-1',
        TEST_TENANT_ID
      );
      expect(templateRepoMock.delete).toHaveBeenCalledWith('template-1');
    });

    it('throws ValidationError when id is missing', async () => {
      await expect(service.deleteTemplate('', TEST_TENANT_ID)).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError when the template does not exist', async () => {
      templateRepoMock.findByIdWithCriteria.mockResolvedValue(null);

      await expect(service.deleteTemplate('missing', TEST_TENANT_ID)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('duplicateTemplate', () => {
    it('duplicates a template through the repository', async () => {
      const duplicated = buildTemplate(
        { id: 'template-copy', name: 'Dance Template (Copy)' },
        [{ id: 'criterion-copy', name: 'Technique', maxScore: 10, templateId: 'template-copy' }]
      );
      templateRepoMock.duplicateTemplate.mockResolvedValue(duplicated);

      const result = await service.duplicateTemplate('template-1', TEST_TENANT_ID);

      expect(result).toEqual(duplicated);
      expect(templateRepoMock.duplicateTemplate).toHaveBeenCalledWith(
        'template-1',
        TEST_TENANT_ID
      );
    });

    it('throws ValidationError when id is missing', async () => {
      await expect(service.duplicateTemplate('', TEST_TENANT_ID)).rejects.toThrow(
        ValidationError
      );
    });

    it('throws NotFoundError when duplication returns null', async () => {
      templateRepoMock.duplicateTemplate.mockResolvedValue(null);

      await expect(service.duplicateTemplate('missing', TEST_TENANT_ID)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('error propagation', () => {
    it('propagates repository errors from getAllTemplates', async () => {
      templateRepoMock.findAllWithCriteria.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllTemplates(TEST_TENANT_ID)).rejects.toThrow('Database error');
    });
  });
});
