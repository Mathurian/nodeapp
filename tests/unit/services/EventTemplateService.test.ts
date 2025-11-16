/**
 * EventTemplateService Tests
 *
 * Comprehensive test suite for event template management including
 * template creation, event cloning, and structure preservation.
 *
 * Test Coverage:
 * - Template CRUD operations
 * - Event creation from templates
 * - Contest/category structure preservation
 * - Criteria copying
 * - JSON serialization/deserialization
 * - Validation and error handling
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { mock, MockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { EventTemplateService } from '../../src/services/EventTemplateService';
import { NotFoundError, ValidationError } from '../../src/services/BaseService';

describe('EventTemplateService', () => {
  let service: EventTemplateService;
  let prismaMock: MockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = mock<PrismaClient>();
    service = new EventTemplateService(prismaMock as any);
  });

  describe('create', () => {
    it('should create an event template', async () => {
      const templateData = {
        name: 'Standard Competition',
        description: 'Template for standard competitions',
        contests: [{ id: 'c1', name: 'Talent', description: 'Talent show' }],
        categories: [{ id: 'cat1', contestId: 'c1', name: 'Solo', scoreCap: 100 }],
        createdBy: 'u1',
      };

      const mockTemplate = {
        id: 'temp1',
        name: templateData.name,
        description: templateData.description,
        contests: JSON.stringify(templateData.contests),
        categories: JSON.stringify(templateData.categories),
        createdBy: 'u1',
        createdAt: new Date(),
      };

      prismaMock.eventTemplate.create.mockResolvedValue(mockTemplate as any);

      const result = await service.create(templateData);

      expect(result.id).toBe('temp1');
      expect(result.name).toBe('Standard Competition');
      expect(result.contests).toEqual(templateData.contests);
      expect(result.categories).toEqual(templateData.categories);
    });

    it('should throw ValidationError when required fields are missing', async () => {
      await expect(
        service.create({ name: '', contests: [], categories: [], createdBy: 'u1' })
      ).rejects.toThrow('Name, contests, and categories are required');
    });

    it('should serialize contests and categories as JSON', async () => {
      const templateData = {
        name: 'Template',
        contests: [{ id: 'c1', name: 'Contest' }],
        categories: [{ id: 'cat1', name: 'Category' }],
        createdBy: 'u1',
      };

      prismaMock.eventTemplate.create.mockResolvedValue({
        id: 'temp1',
        contests: '[]',
        categories: '[]',
        createdAt: new Date(),
      } as any);

      await service.create(templateData);

      expect(prismaMock.eventTemplate.create).toHaveBeenCalledWith({
        data: {
          name: 'Template',
          description: null,
          contests: JSON.stringify(templateData.contests),
          categories: JSON.stringify(templateData.categories),
          createdBy: 'u1',
        },
      });
    });

    it('should handle null description', async () => {
      const templateData = {
        name: 'Template',
        description: undefined,
        contests: [],
        categories: [],
        createdBy: 'u1',
      };

      prismaMock.eventTemplate.create.mockResolvedValue({
        id: 'temp1',
        description: null,
        contests: '[]',
        categories: '[]',
        createdAt: new Date(),
      } as any);

      await service.create(templateData);

      expect(prismaMock.eventTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
      });
    });
  });

  describe('getAll', () => {
    it('should retrieve all templates with creator info', async () => {
      const mockTemplates = [
        {
          id: 'temp1',
          name: 'Template 1',
          description: 'Description 1',
          contests: JSON.stringify([{ id: 'c1', name: 'Contest' }]),
          categories: JSON.stringify([{ id: 'cat1', name: 'Category' }]),
          creator: { id: 'u1', name: 'John Doe', email: 'john@test.com' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.eventTemplate.findMany.mockResolvedValue(mockTemplates as any);

      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].contests).toEqual([{ id: 'c1', name: 'Contest' }]);
      expect(result[0].categories).toEqual([{ id: 'cat1', name: 'Category' }]);
      expect(result[0].creator).toEqual({ id: 'u1', name: 'John Doe', email: 'john@test.com' });
    });

    it('should order templates by creation date descending', async () => {
      prismaMock.eventTemplate.findMany.mockResolvedValue([]);

      await service.getAll();

      expect(prismaMock.eventTemplate.findMany).toHaveBeenCalledWith({
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no templates exist', async () => {
      prismaMock.eventTemplate.findMany.mockResolvedValue([]);

      const result = await service.getAll();

      expect(result).toEqual([]);
    });

    it('should parse JSON fields correctly', async () => {
      const mockTemplates = [
        {
          id: 'temp1',
          name: 'Template',
          contests: '[{"id":"c1","name":"Test"}]',
          categories: '[{"id":"cat1","name":"Category"}]',
          creator: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.eventTemplate.findMany.mockResolvedValue(mockTemplates as any);

      const result = await service.getAll();

      expect(result[0].contests).toEqual([{ id: 'c1', name: 'Test' }]);
      expect(result[0].categories).toEqual([{ id: 'cat1', name: 'Category' }]);
    });
  });

  describe('getById', () => {
    it('should retrieve a specific template by ID', async () => {
      const mockTemplate = {
        id: 'temp1',
        name: 'Template',
        description: 'Description',
        contests: JSON.stringify([{ id: 'c1', name: 'Contest' }]),
        categories: JSON.stringify([{ id: 'cat1', contestId: 'c1', name: 'Category' }]),
        creator: { id: 'u1', name: 'Creator', email: 'creator@test.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.eventTemplate.findUnique.mockResolvedValue(mockTemplate as any);

      const result = await service.getById('temp1');

      expect(result.id).toBe('temp1');
      expect(result.contests).toEqual([{ id: 'c1', name: 'Contest' }]);
      expect(result.categories).toEqual([{ id: 'cat1', contestId: 'c1', name: 'Category' }]);
    });

    it('should throw NotFoundError when template does not exist', async () => {
      prismaMock.eventTemplate.findUnique.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should update template properties', async () => {
      const updateData = {
        name: 'Updated Template',
        description: 'Updated description',
        contests: [{ id: 'c1', name: 'Updated Contest' }],
        categories: [{ id: 'cat1', name: 'Updated Category' }],
      };

      const mockUpdated = {
        id: 'temp1',
        ...updateData,
        contests: JSON.stringify(updateData.contests),
        categories: JSON.stringify(updateData.categories),
        updatedAt: new Date(),
      };

      prismaMock.eventTemplate.update.mockResolvedValue(mockUpdated as any);

      const result = await service.update('temp1', updateData);

      expect(result.name).toBe('Updated Template');
      expect(result.contests).toEqual(updateData.contests);
      expect(result.categories).toEqual(updateData.categories);
    });

    it('should throw ValidationError when required fields are missing', async () => {
      await expect(
        service.update('temp1', { name: '', contests: [], categories: [] })
      ).rejects.toThrow('Name, contests, and categories are required');
    });

    it('should serialize updated data to JSON', async () => {
      const updateData = {
        name: 'Template',
        contests: [{ id: 'c1' }],
        categories: [{ id: 'cat1' }],
      };

      prismaMock.eventTemplate.update.mockResolvedValue({
        id: 'temp1',
        contests: '[]',
        categories: '[]',
        updatedAt: new Date(),
      } as any);

      await service.update('temp1', updateData);

      expect(prismaMock.eventTemplate.update).toHaveBeenCalledWith({
        where: { id: 'temp1' },
        data: {
          name: 'Template',
          description: null,
          contests: JSON.stringify(updateData.contests),
          categories: JSON.stringify(updateData.categories),
        },
      });
    });
  });

  describe('delete', () => {
    it('should delete a template', async () => {
      prismaMock.eventTemplate.delete.mockResolvedValue({} as any);

      await service.delete('temp1');

      expect(prismaMock.eventTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'temp1' },
      });
    });

    it('should propagate Prisma errors', async () => {
      prismaMock.eventTemplate.delete.mockRejectedValue(new Error('Record not found'));

      await expect(service.delete('nonexistent')).rejects.toThrow('Record not found');
    });
  });

  describe('createEventFromTemplate', () => {
    it('should create event with full structure from template', async () => {
      const requestData = {
        templateId: 'temp1',
        eventName: 'Spring Competition 2024',
        eventDescription: 'Annual spring event',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-03'),
      };

      const mockTemplate = {
        id: 'temp1',
        name: 'Template',
        contests: JSON.stringify([
          { id: 'temp-c1', name: 'Talent', description: 'Talent show' },
        ]),
        categories: JSON.stringify([
          {
            id: 'temp-cat1',
            contestId: 'temp-c1',
            name: 'Solo',
            scoreCap: 100,
            criteria: [
              { id: 'cr1', name: 'Technique', maxScore: 10 },
              { id: 'cr2', name: 'Creativity', maxScore: 10 },
            ],
          },
        ]),
      };

      const mockEvent = { id: 'e1', name: requestData.eventName, createdAt: new Date() };
      const mockContest = { id: 'c1', eventId: 'e1', name: 'Talent' };
      const mockCategory = { id: 'cat1', contestId: 'c1', name: 'Solo' };

      prismaMock.eventTemplate.findUnique.mockResolvedValue(mockTemplate as any);
      prismaMock.event.create.mockResolvedValue(mockEvent as any);
      prismaMock.contest.create.mockResolvedValue(mockContest as any);
      prismaMock.category.create.mockResolvedValue(mockCategory as any);
      prismaMock.criterion.createMany.mockResolvedValue({ count: 2 } as any);

      const result = await service.createEventFromTemplate(requestData);

      expect(result.id).toBe('e1');
      expect(result.name).toBe('Spring Competition 2024');
      expect(prismaMock.event.create).toHaveBeenCalledWith({
        data: {
          name: requestData.eventName,
          description: requestData.eventDescription,
          startDate: requestData.startDate,
          endDate: requestData.endDate,
        },
      });
    });

    it('should throw ValidationError when required fields are missing', async () => {
      await expect(
        service.createEventFromTemplate({
          templateId: '',
          eventName: 'Test',
          startDate: new Date(),
          endDate: new Date(),
        })
      ).rejects.toThrow('Template ID, event name, start date, and end date are required');
    });

    it('should throw NotFoundError when template does not exist', async () => {
      prismaMock.eventTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.createEventFromTemplate({
          templateId: 'nonexistent',
          eventName: 'Test Event',
          startDate: new Date(),
          endDate: new Date(),
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should create contests with correct event relationship', async () => {
      const mockTemplate = {
        id: 'temp1',
        contests: JSON.stringify([
          { id: 'temp-c1', name: 'Contest 1' },
          { id: 'temp-c2', name: 'Contest 2' },
        ]),
        categories: JSON.stringify([]),
      };

      const mockEvent = { id: 'e1', name: 'Event' };

      prismaMock.eventTemplate.findUnique.mockResolvedValue(mockTemplate as any);
      prismaMock.event.create.mockResolvedValue(mockEvent as any);
      prismaMock.contest.create
        .mockResolvedValueOnce({ id: 'c1', eventId: 'e1' } as any)
        .mockResolvedValueOnce({ id: 'c2', eventId: 'e1' } as any);

      await service.createEventFromTemplate({
        templateId: 'temp1',
        eventName: 'Event',
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(prismaMock.contest.create).toHaveBeenCalledTimes(2);
      expect(prismaMock.contest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ eventId: 'e1' }),
      });
    });

    it('should create categories with criteria', async () => {
      const mockTemplate = {
        id: 'temp1',
        contests: JSON.stringify([{ id: 'temp-c1', name: 'Contest' }]),
        categories: JSON.stringify([
          {
            id: 'temp-cat1',
            contestId: 'temp-c1',
            name: 'Category',
            criteria: [
              { name: 'Technique', maxScore: 10 },
              { name: 'Creativity', maxScore: 10 },
            ],
          },
        ]),
      };

      prismaMock.eventTemplate.findUnique.mockResolvedValue(mockTemplate as any);
      prismaMock.event.create.mockResolvedValue({ id: 'e1' } as any);
      prismaMock.contest.create.mockResolvedValue({ id: 'c1' } as any);
      prismaMock.category.create.mockResolvedValue({ id: 'cat1' } as any);
      prismaMock.criterion.createMany.mockResolvedValue({ count: 2 } as any);

      await service.createEventFromTemplate({
        templateId: 'temp1',
        eventName: 'Event',
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(prismaMock.criterion.createMany).toHaveBeenCalledWith({
        data: [
          { categoryId: 'cat1', name: 'Technique', maxScore: 10 },
          { categoryId: 'cat1', name: 'Creativity', maxScore: 10 },
        ],
      });
    });

    it('should handle categories without criteria', async () => {
      const mockTemplate = {
        id: 'temp1',
        contests: JSON.stringify([{ id: 'temp-c1', name: 'Contest' }]),
        categories: JSON.stringify([
          {
            id: 'temp-cat1',
            contestId: 'temp-c1',
            name: 'Category',
            criteria: [],
          },
        ]),
      };

      prismaMock.eventTemplate.findUnique.mockResolvedValue(mockTemplate as any);
      prismaMock.event.create.mockResolvedValue({ id: 'e1' } as any);
      prismaMock.contest.create.mockResolvedValue({ id: 'c1' } as any);
      prismaMock.category.create.mockResolvedValue({ id: 'cat1' } as any);

      await service.createEventFromTemplate({
        templateId: 'temp1',
        eventName: 'Event',
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(prismaMock.criterion.createMany).not.toHaveBeenCalled();
    });

    it('should preserve category properties', async () => {
      const mockTemplate = {
        id: 'temp1',
        contests: JSON.stringify([{ id: 'temp-c1', name: 'Contest' }]),
        categories: JSON.stringify([
          {
            id: 'temp-cat1',
            contestId: 'temp-c1',
            name: 'Solo Performance',
            description: 'Solo category',
            scoreCap: 100,
            timeLimit: 300,
            contestantMin: 1,
            contestantMax: 50,
          },
        ]),
      };

      prismaMock.eventTemplate.findUnique.mockResolvedValue(mockTemplate as any);
      prismaMock.event.create.mockResolvedValue({ id: 'e1' } as any);
      prismaMock.contest.create.mockResolvedValue({ id: 'c1' } as any);
      prismaMock.category.create.mockResolvedValue({ id: 'cat1' } as any);

      await service.createEventFromTemplate({
        templateId: 'temp1',
        eventName: 'Event',
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(prismaMock.category.create).toHaveBeenCalledWith({
        data: {
          contestId: 'c1',
          name: 'Solo Performance',
          description: 'Solo category',
          scoreCap: 100,
          timeLimit: 300,
          contestantMin: 1,
          contestantMax: 50,
        },
      });
    });

    it('should handle null event description', async () => {
      const mockTemplate = {
        id: 'temp1',
        contests: JSON.stringify([]),
        categories: JSON.stringify([]),
      };

      prismaMock.eventTemplate.findUnique.mockResolvedValue(mockTemplate as any);
      prismaMock.event.create.mockResolvedValue({ id: 'e1' } as any);

      await service.createEventFromTemplate({
        templateId: 'temp1',
        eventName: 'Event',
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(prismaMock.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
      });
    });

    it('should return complete event data', async () => {
      const mockTemplate = {
        id: 'temp1',
        contests: JSON.stringify([]),
        categories: JSON.stringify([]),
      };

      const mockEvent = {
        id: 'e1',
        name: 'Event',
        description: 'Description',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-03'),
        createdAt: new Date(),
      };

      prismaMock.eventTemplate.findUnique.mockResolvedValue(mockTemplate as any);
      prismaMock.event.create.mockResolvedValue(mockEvent as any);

      const result = await service.createEventFromTemplate({
        templateId: 'temp1',
        eventName: 'Event',
        eventDescription: 'Description',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-03'),
      });

      expect(result).toEqual({
        id: 'e1',
        name: 'Event',
        description: 'Description',
        startDate: mockEvent.startDate,
        endDate: mockEvent.endDate,
        createdAt: mockEvent.createdAt,
      });
    });
  });
});
