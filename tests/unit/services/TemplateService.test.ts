/**
 * TemplateService Tests
 *
 * Comprehensive test suite for category template management including
 * CRUD operations, template cloning, and criteria management.
 *
 * Test Coverage:
 * - Template retrieval (all and by ID)
 * - Template creation with criteria
 * - Template updates
 * - Template deletion
 * - Template duplication/cloning
 * - Validation and error handling
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { mock, MockProxy } from 'jest-mock-extended';
import { TemplateService } from '../../src/services/TemplateService';
import { TemplateRepository } from '../../src/repositories/TemplateRepository';
import { NotFoundError, ValidationError } from '../../src/services/BaseService';

describe('TemplateService', () => {
  let service: TemplateService;
  let templateRepoMock: MockProxy<TemplateRepository>;

  beforeEach(() => {
    templateRepoMock = mock<TemplateRepository>();
    service = new TemplateService(templateRepoMock as any);
  });

  describe('getAllTemplates', () => {
    it('should retrieve all templates with criteria', async () => {
      const mockTemplates = [
        {
          id: 't1',
          name: 'Dance Template',
          criteria: [
            { id: 'cr1', name: 'Technique', maxScore: 10 },
            { id: 'cr2', name: 'Creativity', maxScore: 10 },
          ],
        },
        {
          id: 't2',
          name: 'Vocal Template',
          criteria: [{ id: 'cr3', name: 'Tone', maxScore: 10 }],
        },
      ];

      templateRepoMock.findAllWithCriteria.mockResolvedValue(mockTemplates as any);

      const result = await service.getAllTemplates();

      expect(result).toEqual(mockTemplates);
      expect(result).toHaveLength(2);
      expect(templateRepoMock.findAllWithCriteria).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no templates exist', async () => {
      templateRepoMock.findAllWithCriteria.mockResolvedValue([]);

      const result = await service.getAllTemplates();

      expect(result).toEqual([]);
    });

    it('should include template criteria', async () => {
      const mockTemplates = [
        {
          id: 't1',
          name: 'Template',
          criteria: [{ id: 'cr1', name: 'Criterion' }],
        },
      ];

      templateRepoMock.findAllWithCriteria.mockResolvedValue(mockTemplates as any);

      const result = await service.getAllTemplates();

      expect(result[0].criteria).toBeDefined();
      expect(result[0].criteria).toHaveLength(1);
    });
  });

  describe('getTemplateById', () => {
    it('should retrieve a specific template with criteria', async () => {
      const mockTemplate = {
        id: 't1',
        name: 'Dance Template',
        description: 'For dance competitions',
        criteria: [
          { id: 'cr1', name: 'Technique', maxScore: 10 },
          { id: 'cr2', name: 'Performance', maxScore: 10 },
        ],
      };

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(mockTemplate as any);

      const result = await service.getTemplateById('t1');

      expect(result).toEqual(mockTemplate);
      expect(result.criteria).toHaveLength(2);
      expect(templateRepoMock.findByIdWithCriteria).toHaveBeenCalledWith('t1');
    });

    it('should throw ValidationError when id is missing', async () => {
      await expect(service.getTemplateById('')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when template does not exist', async () => {
      templateRepoMock.findByIdWithCriteria.mockResolvedValue(null);

      await expect(service.getTemplateById('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(service.getTemplateById('nonexistent')).rejects.toThrow(
        'Template with ID nonexistent not found'
      );
    });
  });

  describe('createTemplate', () => {
    it('should create a new template with criteria', async () => {
      const templateData = {
        name: 'New Template',
        description: 'Test template',
        criteria: [
          { name: 'Technique', maxScore: 10, order: 1 },
          { name: 'Creativity', maxScore: 10, order: 2 },
        ],
      };

      const mockCreated = {
        id: 't1',
        ...templateData,
        criteria: templateData.criteria.map((c, i) => ({ ...c, id: `cr${i + 1}` })),
      };

      templateRepoMock.createWithCriteria.mockResolvedValue(mockCreated as any);

      const result = await service.createTemplate(templateData);

      expect(result.id).toBe('t1');
      expect(result.name).toBe('New Template');
      expect(result.criteria).toHaveLength(2);
      expect(templateRepoMock.createWithCriteria).toHaveBeenCalledWith(templateData);
    });

    it('should throw ValidationError when name is missing', async () => {
      await expect(
        service.createTemplate({ name: '' } as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should create template without criteria', async () => {
      const templateData = {
        name: 'Simple Template',
        criteria: [],
      };

      templateRepoMock.createWithCriteria.mockResolvedValue({
        id: 't1',
        ...templateData,
      } as any);

      const result = await service.createTemplate(templateData);

      expect(result.criteria).toEqual([]);
    });

    it('should handle optional description', async () => {
      const templateData = {
        name: 'Template',
        description: null,
      };

      templateRepoMock.createWithCriteria.mockResolvedValue({
        id: 't1',
        ...templateData,
      } as any);

      await service.createTemplate(templateData as any);

      expect(templateRepoMock.createWithCriteria).toHaveBeenCalledWith(templateData);
    });
  });

  describe('updateTemplate', () => {
    it('should update template properties', async () => {
      const mockExisting = {
        id: 't1',
        name: 'Old Name',
        criteria: [],
      };

      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const mockUpdated = {
        id: 't1',
        ...updateData,
        criteria: [],
      };

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(mockExisting as any);
      templateRepoMock.updateWithCriteria.mockResolvedValue(mockUpdated as any);

      const result = await service.updateTemplate('t1', updateData);

      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated description');
      expect(templateRepoMock.updateWithCriteria).toHaveBeenCalledWith('t1', updateData);
    });

    it('should throw ValidationError when id is missing', async () => {
      await expect(service.updateTemplate('', {})).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when template does not exist', async () => {
      templateRepoMock.findByIdWithCriteria.mockResolvedValue(null);

      await expect(
        service.updateTemplate('nonexistent', { name: 'Test' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should update criteria', async () => {
      const mockExisting = {
        id: 't1',
        name: 'Template',
        criteria: [{ id: 'cr1', name: 'Old Criterion' }],
      };

      const updateData = {
        criteria: [
          { id: 'cr1', name: 'Updated Criterion', maxScore: 15 },
          { name: 'New Criterion', maxScore: 10 },
        ],
      };

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(mockExisting as any);
      templateRepoMock.updateWithCriteria.mockResolvedValue({
        ...mockExisting,
        criteria: updateData.criteria,
      } as any);

      const result = await service.updateTemplate('t1', updateData);

      expect(result.criteria).toHaveLength(2);
    });

    it('should allow partial updates', async () => {
      const mockExisting = {
        id: 't1',
        name: 'Template',
        description: 'Original',
        criteria: [],
      };

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(mockExisting as any);
      templateRepoMock.updateWithCriteria.mockResolvedValue({
        ...mockExisting,
        name: 'Updated',
      } as any);

      await service.updateTemplate('t1', { name: 'Updated' });

      expect(templateRepoMock.updateWithCriteria).toHaveBeenCalledWith('t1', { name: 'Updated' });
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      const mockTemplate = { id: 't1', name: 'Template', criteria: [] };

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(mockTemplate as any);
      templateRepoMock.delete.mockResolvedValue(undefined);

      await service.deleteTemplate('t1');

      expect(templateRepoMock.delete).toHaveBeenCalledWith('t1');
    });

    it('should throw ValidationError when id is missing', async () => {
      await expect(service.deleteTemplate('')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when template does not exist', async () => {
      templateRepoMock.findByIdWithCriteria.mockResolvedValue(null);

      await expect(service.deleteTemplate('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should verify template exists before deletion', async () => {
      const mockTemplate = { id: 't1', name: 'Template', criteria: [] };

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(mockTemplate as any);
      templateRepoMock.delete.mockResolvedValue(undefined);

      await service.deleteTemplate('t1');

      expect(templateRepoMock.findByIdWithCriteria).toHaveBeenCalledWith('t1');
      expect(templateRepoMock.delete).toHaveBeenCalledWith('t1');
    });
  });

  describe('duplicateTemplate', () => {
    it('should duplicate a template with all criteria', async () => {
      const mockOriginal = {
        id: 't1',
        name: 'Original Template',
        description: 'Original description',
        criteria: [
          { id: 'cr1', name: 'Technique', maxScore: 10, order: 1 },
          { id: 'cr2', name: 'Creativity', maxScore: 10, order: 2 },
        ],
      };

      const mockDuplicated = {
        id: 't2',
        name: 'Original Template (Copy)',
        description: 'Original description',
        criteria: [
          { id: 'cr3', name: 'Technique', maxScore: 10, order: 1 },
          { id: 'cr4', name: 'Creativity', maxScore: 10, order: 2 },
        ],
      };

      templateRepoMock.duplicateTemplate.mockResolvedValue(mockDuplicated as any);

      const result = await service.duplicateTemplate('t1');

      expect(result.id).toBe('t2');
      expect(result.name).toBe('Original Template (Copy)');
      expect(result.criteria).toHaveLength(2);
      expect(templateRepoMock.duplicateTemplate).toHaveBeenCalledWith('t1');
    });

    it('should throw ValidationError when id is missing', async () => {
      await expect(service.duplicateTemplate('')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when template does not exist', async () => {
      templateRepoMock.duplicateTemplate.mockResolvedValue(null);

      await expect(service.duplicateTemplate('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(service.duplicateTemplate('nonexistent')).rejects.toThrow(
        'Template with ID nonexistent not found'
      );
    });

    it('should create new IDs for duplicated criteria', async () => {
      const mockDuplicated = {
        id: 't2',
        name: 'Copy',
        criteria: [
          { id: 'new-cr1', name: 'Criterion 1' },
          { id: 'new-cr2', name: 'Criterion 2' },
        ],
      };

      templateRepoMock.duplicateTemplate.mockResolvedValue(mockDuplicated as any);

      const result = await service.duplicateTemplate('t1');

      expect(result.criteria[0].id).not.toBe('cr1');
      expect(result.criteria[1].id).not.toBe('cr2');
    });

    it('should handle templates with no criteria', async () => {
      const mockDuplicated = {
        id: 't2',
        name: 'Copy',
        criteria: [],
      };

      templateRepoMock.duplicateTemplate.mockResolvedValue(mockDuplicated as any);

      const result = await service.duplicateTemplate('t1');

      expect(result.criteria).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle template with null description', async () => {
      const mockTemplate = {
        id: 't1',
        name: 'Template',
        description: null,
        criteria: [],
      };

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(mockTemplate as any);

      const result = await service.getTemplateById('t1');

      expect(result.description).toBeNull();
    });

    it('should handle template with empty criteria array', async () => {
      const mockTemplate = {
        id: 't1',
        name: 'Template',
        criteria: [],
      };

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(mockTemplate as any);

      const result = await service.getTemplateById('t1');

      expect(result.criteria).toEqual([]);
    });

    it('should handle criteria with all properties', async () => {
      const mockTemplate = {
        id: 't1',
        name: 'Template',
        criteria: [
          {
            id: 'cr1',
            name: 'Technique',
            description: 'Technical skill',
            maxScore: 10,
            order: 1,
          },
        ],
      };

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(mockTemplate as any);

      const result = await service.getTemplateById('t1');

      expect(result.criteria[0]).toEqual({
        id: 'cr1',
        name: 'Technique',
        description: 'Technical skill',
        maxScore: 10,
        order: 1,
      });
    });

    it('should preserve criteria order', async () => {
      const mockTemplate = {
        id: 't1',
        name: 'Template',
        criteria: [
          { id: 'cr1', name: 'First', order: 1 },
          { id: 'cr2', name: 'Second', order: 2 },
          { id: 'cr3', name: 'Third', order: 3 },
        ],
      };

      templateRepoMock.findByIdWithCriteria.mockResolvedValue(mockTemplate as any);

      const result = await service.getTemplateById('t1');

      expect(result.criteria[0].order).toBe(1);
      expect(result.criteria[1].order).toBe(2);
      expect(result.criteria[2].order).toBe(3);
    });
  });

  describe('repository integration', () => {
    it('should call repository methods with correct parameters', async () => {
      const createData = { name: 'Test', criteria: [] };
      templateRepoMock.createWithCriteria.mockResolvedValue({ id: 't1', ...createData } as any);

      await service.createTemplate(createData);

      expect(templateRepoMock.createWithCriteria).toHaveBeenCalledWith(createData);
      expect(templateRepoMock.createWithCriteria).toHaveBeenCalledTimes(1);
    });

    it('should propagate repository errors', async () => {
      templateRepoMock.findAllWithCriteria.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllTemplates()).rejects.toThrow('Database error');
    });

    it('should handle concurrent operations', async () => {
      const mockTemplates = [{ id: 't1', name: 'Template', criteria: [] }];
      templateRepoMock.findAllWithCriteria.mockResolvedValue(mockTemplates as any);

      const promises = [
        service.getAllTemplates(),
        service.getAllTemplates(),
        service.getAllTemplates(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toEqual(mockTemplates);
      });
    });
  });
});
