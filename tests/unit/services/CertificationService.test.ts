/**
 * CertificationService Unit Tests
 * Comprehensive tests for certification service
 */

import 'reflect-metadata';
import { CertificationService } from '../../../src/services/CertificationService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('CertificationService', () => {
  let service: CertificationService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockEvent = {
    id: 'event-1',
    name: 'Summer Festival',
    date: new Date(),
    location: 'Main Hall',
    description: 'Annual event',
    status: 'ACTIVE',
    currentEventId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContest = {
    id: 'contest-1',
    name: 'Solo Dance',
    eventId: 'event-1',
    order: 1,
    description: null,
    maxScore: 100,
    certificationLevel: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategory = {
    id: 'category-1',
    name: 'Junior',
    contestId: 'contest-1',
    order: 1,
    description: null,
    ageMin: 10,
    ageMax: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCertification = {
    id: 'cert-1',
    categoryId: 'category-1',
    role: 'JUDGE',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new CertificationService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getOverallStatus', () => {
    it('should get certification status for an event', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [
          {
            ...mockContest,
            categories: [
              {
                ...mockCategory,
                certifications: [mockCertification],
              },
            ],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);

      const result = await service.getOverallStatus('event-1');

      expect(result.event).toBe('Summer Festival');
      expect(result.contests).toHaveLength(1);
      expect(result.contests[0].name).toBe('Solo Dance');
      expect(result.contests[0].categories).toHaveLength(1);
      expect(result.contests[0].categories[0].certified).toBe(true);
      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        include: {
          contests: {
            include: {
              categories: {
                include: {
                  certifications: true,
                },
              },
            },
          },
        },
      });
    });

    it('should show uncertified categories', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [
          {
            ...mockContest,
            categories: [
              {
                ...mockCategory,
                certifications: [],
              },
            ],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);

      const result = await service.getOverallStatus('event-1');

      expect(result.contests[0].categories[0].certified).toBe(false);
    });

    it('should handle multiple contests and categories', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [
          {
            ...mockContest,
            id: 'contest-1',
            name: 'Solo Dance',
            categories: [
              { ...mockCategory, id: 'cat-1', certifications: [mockCertification] },
              { ...mockCategory, id: 'cat-2', certifications: [] },
            ],
          },
          {
            ...mockContest,
            id: 'contest-2',
            name: 'Group Dance',
            categories: [{ ...mockCategory, id: 'cat-3', certifications: [] }],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);

      const result = await service.getOverallStatus('event-1');

      expect(result.contests).toHaveLength(2);
      expect(result.contests[0].categories).toHaveLength(2);
      expect(result.contests[1].categories).toHaveLength(1);
      expect(result.contests[0].categories[0].certified).toBe(true);
      expect(result.contests[0].categories[1].certified).toBe(false);
    });

    it('should throw error when event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.getOverallStatus('nonexistent')).rejects.toThrow('Event not found');
    });

    it('should handle event with no contests', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);

      const result = await service.getOverallStatus('event-1');

      expect(result.contests).toHaveLength(0);
    });

    it('should handle contest with no categories', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [
          {
            ...mockContest,
            categories: [],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);

      const result = await service.getOverallStatus('event-1');

      expect(result.contests[0].categories).toHaveLength(0);
    });
  });

  describe('certifyAll', () => {
    it('should certify all categories in an event', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [
          {
            ...mockContest,
            categories: [
              { ...mockCategory, id: 'cat-1' },
              { ...mockCategory, id: 'cat-2' },
            ],
          },
          {
            ...mockContest,
            id: 'contest-2',
            categories: [{ ...mockCategory, id: 'cat-3' }],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);
      mockPrisma.categoryCertification.create.mockResolvedValue(mockCertification);

      const result = await service.certifyAll('event-1', 'user-1', 'ADMIN');

      expect(result.success).toBe(true);
      expect(result.message).toBe('All categories certified');
      expect(mockPrisma.categoryCertification.create).toHaveBeenCalledTimes(3);
      expect(mockPrisma.categoryCertification.create).toHaveBeenCalledWith({
        data: { categoryId: 'cat-1', role: 'ADMIN', userId: 'user-1' },
      });
      expect(mockPrisma.categoryCertification.create).toHaveBeenCalledWith({
        data: { categoryId: 'cat-2', role: 'ADMIN', userId: 'user-1' },
      });
      expect(mockPrisma.categoryCertification.create).toHaveBeenCalledWith({
        data: { categoryId: 'cat-3', role: 'ADMIN', userId: 'user-1' },
      });
    });

    it('should throw error when event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.certifyAll('nonexistent', 'user-1', 'ADMIN')).rejects.toThrow(
        'Event not found'
      );
    });

    it('should handle event with no contests', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);

      const result = await service.certifyAll('event-1', 'user-1', 'ADMIN');

      expect(result.success).toBe(true);
      expect(mockPrisma.categoryCertification.create).not.toHaveBeenCalled();
    });

    it('should ignore already certified categories', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [
          {
            ...mockContest,
            categories: [{ ...mockCategory, id: 'cat-1' }],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);
      mockPrisma.categoryCertification.create.mockRejectedValue(
        new Error('Unique constraint violation')
      );

      const result = await service.certifyAll('event-1', 'user-1', 'ADMIN');

      expect(result.success).toBe(true);
      expect(result.message).toBe('All categories certified');
    });

    it('should certify with different user roles', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [
          {
            ...mockContest,
            categories: [{ ...mockCategory, id: 'cat-1' }],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);
      mockPrisma.categoryCertification.create.mockResolvedValue(mockCertification);

      await service.certifyAll('event-1', 'user-1', 'TALLY_MASTER');

      expect(mockPrisma.categoryCertification.create).toHaveBeenCalledWith({
        data: { categoryId: 'cat-1', role: 'TALLY_MASTER', userId: 'user-1' },
      });
    });

    it('should handle partial certification failures gracefully', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [
          {
            ...mockContest,
            categories: [
              { ...mockCategory, id: 'cat-1' },
              { ...mockCategory, id: 'cat-2' },
            ],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);
      mockPrisma.categoryCertification.create
        .mockResolvedValueOnce(mockCertification)
        .mockRejectedValueOnce(new Error('Already exists'));

      const result = await service.certifyAll('event-1', 'user-1', 'ADMIN');

      expect(result.success).toBe(true);
      expect(mockPrisma.categoryCertification.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors in getOverallStatus', async () => {
      mockPrisma.event.findUnique.mockRejectedValue(new Error('Connection failed'));

      await expect(service.getOverallStatus('event-1')).rejects.toThrow('Connection failed');
    });

    it('should handle database connection errors in certifyAll', async () => {
      mockPrisma.event.findUnique.mockRejectedValue(new Error('Connection failed'));

      await expect(service.certifyAll('event-1', 'user-1', 'ADMIN')).rejects.toThrow(
        'Connection failed'
      );
    });

    it('should handle invalid event IDs', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.getOverallStatus('invalid-id')).rejects.toThrow('Event not found');
    });

    it('should handle malformed data structures', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        contests: null as any,
      });

      await expect(service.getOverallStatus('event-1')).rejects.toThrow();
    });
  });

  describe('certification status tracking', () => {
    it('should correctly identify fully certified events', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [
          {
            ...mockContest,
            categories: [
              { ...mockCategory, id: 'cat-1', certifications: [mockCertification] },
              { ...mockCategory, id: 'cat-2', certifications: [mockCertification] },
            ],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);

      const result = await service.getOverallStatus('event-1');

      const allCertified = result.contests.every((contest) =>
        contest.categories.every((cat) => cat.certified)
      );
      expect(allCertified).toBe(true);
    });

    it('should correctly identify partially certified events', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [
          {
            ...mockContest,
            categories: [
              { ...mockCategory, id: 'cat-1', certifications: [mockCertification] },
              { ...mockCategory, id: 'cat-2', certifications: [] },
            ],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);

      const result = await service.getOverallStatus('event-1');

      const anyCertified = result.contests.some((contest) =>
        contest.categories.some((cat) => cat.certified)
      );
      const allCertified = result.contests.every((contest) =>
        contest.categories.every((cat) => cat.certified)
      );
      expect(anyCertified).toBe(true);
      expect(allCertified).toBe(false);
    });

    it('should correctly identify uncertified events', async () => {
      const eventWithData = {
        ...mockEvent,
        contests: [
          {
            ...mockContest,
            categories: [
              { ...mockCategory, id: 'cat-1', certifications: [] },
              { ...mockCategory, id: 'cat-2', certifications: [] },
            ],
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(eventWithData as any);

      const result = await service.getOverallStatus('event-1');

      const anyCertified = result.contests.some((contest) =>
        contest.categories.some((cat) => cat.certified)
      );
      expect(anyCertified).toBe(false);
    });
  });
});
