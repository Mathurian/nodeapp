/**
 * BioService Unit Tests
 * Comprehensive tests for bio management functionality
 */

import 'reflect-metadata';
import { BioService } from '../../../src/services/BioService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError } from '../../../src/services/BaseService';

describe('BioService', () => {
  let service: BioService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new BioService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(BioService);
    });
  });

  describe('getContestantBios', () => {
    const mockContestants = [
      {
        id: 'contestant1',
        name: 'John Doe',
        bio: 'Test bio',
        imagePath: '/images/john.jpg',
        gender: 'Male',
        pronouns: 'he/him',
        contestantNumber: 1,
        contestContestants: [{
          contest: {
            id: 'contest1',
            name: 'Test Contest',
            event: {
              id: 'event1',
              name: 'Test Event'
            }
          }
        }],
        categoryContestants: [{
          category: {
            id: 'category1',
            name: 'Test Category'
          }
        }]
      },
      {
        id: 'contestant2',
        name: 'Jane Smith',
        bio: 'Another bio',
        imagePath: '/images/jane.jpg',
        gender: 'Female',
        pronouns: 'she/her',
        contestantNumber: 2,
        contestContestants: [{
          contest: {
            id: 'contest1',
            name: 'Test Contest',
            event: {
              id: 'event1',
              name: 'Test Event'
            }
          }
        }],
        categoryContestants: [{
          category: {
            id: 'category1',
            name: 'Test Category'
          }
        }]
      }
    ];

    it('should retrieve contestant bios without filters', async () => {
      mockPrisma.contestant.findMany.mockResolvedValue(mockContestants as any);

      const result = await service.getContestantBios({});

      expect(result).toEqual(mockContestants);
      expect(mockPrisma.contestant.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.objectContaining({
          id: true,
          name: true,
          bio: true,
          imagePath: true,
          gender: true,
          pronouns: true,
          contestantNumber: true
        }),
        orderBy: { contestantNumber: 'asc' }
      });
    });

    it('should filter contestant bios by eventId', async () => {
      mockPrisma.contestant.findMany.mockResolvedValue([mockContestants[0]] as any);

      const result = await service.getContestantBios({ eventId: 'event1' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.contestant.findMany).toHaveBeenCalledWith({
        where: {
          contestContestants: {
            some: {
              contest: {
                eventId: 'event1'
              }
            }
          }
        },
        select: expect.any(Object),
        orderBy: { contestantNumber: 'asc' }
      });
    });

    it('should filter contestant bios by contestId', async () => {
      mockPrisma.contestant.findMany.mockResolvedValue(mockContestants as any);

      const result = await service.getContestantBios({ contestId: 'contest1' });

      expect(result).toHaveLength(2);
      expect(mockPrisma.contestant.findMany).toHaveBeenCalledWith({
        where: {
          contestContestants: {
            some: {
              contestId: 'contest1'
            }
          }
        },
        select: expect.any(Object),
        orderBy: { contestantNumber: 'asc' }
      });
    });

    it('should filter contestant bios by categoryId', async () => {
      mockPrisma.contestant.findMany.mockResolvedValue(mockContestants as any);

      const result = await service.getContestantBios({ categoryId: 'category1' });

      expect(result).toHaveLength(2);
      expect(mockPrisma.contestant.findMany).toHaveBeenCalledWith({
        where: {
          categoryContestants: {
            some: {
              categoryId: 'category1'
            }
          }
        },
        select: expect.any(Object),
        orderBy: { contestantNumber: 'asc' }
      });
    });

    it('should handle multiple filters', async () => {
      mockPrisma.contestant.findMany.mockResolvedValue([mockContestants[0]] as any);

      await service.getContestantBios({
        eventId: 'event1',
        contestId: 'contest1',
        categoryId: 'category1'
      });

      expect(mockPrisma.contestant.findMany).toHaveBeenCalled();
    });

    it('should return empty array when no contestants found', async () => {
      mockPrisma.contestant.findMany.mockResolvedValue([]);

      const result = await service.getContestantBios({ eventId: 'nonexistent' });

      expect(result).toEqual([]);
    });

    it('should sort contestants by contestantNumber ascending', async () => {
      mockPrisma.contestant.findMany.mockResolvedValue(mockContestants as any);

      await service.getContestantBios({});

      expect(mockPrisma.contestant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { contestantNumber: 'asc' }
        })
      );
    });
  });

  describe('getJudgeBios', () => {
    const mockJudges = [
      {
        id: 'judge1',
        name: 'Judge Alice',
        bio: 'Experienced judge',
        imagePath: '/images/alice.jpg',
        gender: 'Female',
        pronouns: 'she/her',
        isHeadJudge: true,
        contestJudges: [{
          contest: {
            id: 'contest1',
            name: 'Test Contest',
            event: {
              id: 'event1',
              name: 'Test Event'
            }
          }
        }],
        categoryJudges: [{
          category: {
            id: 'category1',
            name: 'Test Category'
          }
        }]
      },
      {
        id: 'judge2',
        name: 'Judge Bob',
        bio: 'Expert in scoring',
        imagePath: '/images/bob.jpg',
        gender: 'Male',
        pronouns: 'he/him',
        isHeadJudge: false,
        contestJudges: [{
          contest: {
            id: 'contest1',
            name: 'Test Contest',
            event: {
              id: 'event1',
              name: 'Test Event'
            }
          }
        }],
        categoryJudges: [{
          category: {
            id: 'category1',
            name: 'Test Category'
          }
        }]
      }
    ];

    it('should retrieve judge bios without filters', async () => {
      mockPrisma.judge.findMany.mockResolvedValue(mockJudges as any);

      const result = await service.getJudgeBios({});

      expect(result).toEqual(mockJudges);
      expect(mockPrisma.judge.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.objectContaining({
          id: true,
          name: true,
          bio: true,
          imagePath: true,
          gender: true,
          pronouns: true,
          isHeadJudge: true
        }),
        orderBy: { name: 'asc' }
      });
    });

    it('should filter judge bios by eventId', async () => {
      mockPrisma.judge.findMany.mockResolvedValue([mockJudges[0]] as any);

      const result = await service.getJudgeBios({ eventId: 'event1' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.judge.findMany).toHaveBeenCalledWith({
        where: {
          contestJudges: {
            some: {
              contest: {
                eventId: 'event1'
              }
            }
          }
        },
        select: expect.any(Object),
        orderBy: { name: 'asc' }
      });
    });

    it('should filter judge bios by contestId', async () => {
      mockPrisma.judge.findMany.mockResolvedValue(mockJudges as any);

      const result = await service.getJudgeBios({ contestId: 'contest1' });

      expect(result).toHaveLength(2);
      expect(mockPrisma.judge.findMany).toHaveBeenCalledWith({
        where: {
          contestJudges: {
            some: {
              contestId: 'contest1'
            }
          }
        },
        select: expect.any(Object),
        orderBy: { name: 'asc' }
      });
    });

    it('should filter judge bios by categoryId', async () => {
      mockPrisma.judge.findMany.mockResolvedValue(mockJudges as any);

      const result = await service.getJudgeBios({ categoryId: 'category1' });

      expect(result).toHaveLength(2);
      expect(mockPrisma.judge.findMany).toHaveBeenCalledWith({
        where: {
          categoryJudges: {
            some: {
              categoryId: 'category1'
            }
          }
        },
        select: expect.any(Object),
        orderBy: { name: 'asc' }
      });
    });

    it('should handle multiple filters for judges', async () => {
      mockPrisma.judge.findMany.mockResolvedValue([mockJudges[0]] as any);

      await service.getJudgeBios({
        eventId: 'event1',
        contestId: 'contest1',
        categoryId: 'category1'
      });

      expect(mockPrisma.judge.findMany).toHaveBeenCalled();
    });

    it('should return empty array when no judges found', async () => {
      mockPrisma.judge.findMany.mockResolvedValue([]);

      const result = await service.getJudgeBios({ eventId: 'nonexistent' });

      expect(result).toEqual([]);
    });

    it('should sort judges by name ascending', async () => {
      mockPrisma.judge.findMany.mockResolvedValue(mockJudges as any);

      await service.getJudgeBios({});

      expect(mockPrisma.judge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' }
        })
      );
    });
  });

  describe('updateContestantBio', () => {
    const mockContestant = {
      id: 'contestant1',
      name: 'John Doe',
      bio: 'Updated bio',
      imagePath: '/images/updated.jpg'
    };

    it('should update contestant bio', async () => {
      mockPrisma.contestant.findUnique.mockResolvedValue({ id: 'contestant1' } as any);
      mockPrisma.contestant.update.mockResolvedValue(mockContestant as any);

      const result = await service.updateContestantBio('contestant1', {
        bio: 'Updated bio'
      });

      expect(result).toEqual(mockContestant);
      expect(mockPrisma.contestant.findUnique).toHaveBeenCalledWith({
        where: { id: 'contestant1' }
      });
      expect(mockPrisma.contestant.update).toHaveBeenCalledWith({
        where: { id: 'contestant1' },
        data: { bio: 'Updated bio' },
        select: {
          id: true,
          name: true,
          bio: true,
          imagePath: true
        }
      });
    });

    it('should update contestant image path', async () => {
      mockPrisma.contestant.findUnique.mockResolvedValue({ id: 'contestant1' } as any);
      mockPrisma.contestant.update.mockResolvedValue(mockContestant as any);

      const result = await service.updateContestantBio('contestant1', {
        imagePath: '/images/new.jpg'
      });

      expect(result.imagePath).toBe('/images/updated.jpg');
      expect(mockPrisma.contestant.update).toHaveBeenCalledWith({
        where: { id: 'contestant1' },
        data: { imagePath: '/images/new.jpg' },
        select: expect.any(Object)
      });
    });

    it('should update both bio and image path', async () => {
      mockPrisma.contestant.findUnique.mockResolvedValue({ id: 'contestant1' } as any);
      mockPrisma.contestant.update.mockResolvedValue(mockContestant as any);

      await service.updateContestantBio('contestant1', {
        bio: 'New bio',
        imagePath: '/images/new.jpg'
      });

      expect(mockPrisma.contestant.update).toHaveBeenCalledWith({
        where: { id: 'contestant1' },
        data: {
          bio: 'New bio',
          imagePath: '/images/new.jpg'
        },
        select: expect.any(Object)
      });
    });

    it('should throw NotFoundError when contestant does not exist', async () => {
      mockPrisma.contestant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateContestantBio('nonexistent', { bio: 'Test' })
      ).rejects.toThrow(NotFoundError);

      expect(mockPrisma.contestant.update).not.toHaveBeenCalled();
    });

    it('should handle empty update data', async () => {
      mockPrisma.contestant.findUnique.mockResolvedValue({ id: 'contestant1' } as any);
      mockPrisma.contestant.update.mockResolvedValue(mockContestant as any);

      await service.updateContestantBio('contestant1', {});

      expect(mockPrisma.contestant.update).toHaveBeenCalledWith({
        where: { id: 'contestant1' },
        data: {},
        select: expect.any(Object)
      });
    });

    it('should update with empty string bio', async () => {
      mockPrisma.contestant.findUnique.mockResolvedValue({ id: 'contestant1' } as any);
      mockPrisma.contestant.update.mockResolvedValue({ ...mockContestant, bio: '' } as any);

      const result = await service.updateContestantBio('contestant1', { bio: '' });

      expect(result.bio).toBe('');
    });
  });

  describe('updateJudgeBio', () => {
    const mockJudge = {
      id: 'judge1',
      name: 'Judge Alice',
      bio: 'Updated bio',
      imagePath: '/images/updated.jpg'
    };

    it('should update judge bio', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge1' } as any);
      mockPrisma.judge.update.mockResolvedValue(mockJudge as any);

      const result = await service.updateJudgeBio('judge1', {
        bio: 'Updated bio'
      });

      expect(result).toEqual(mockJudge);
      expect(mockPrisma.judge.findUnique).toHaveBeenCalledWith({
        where: { id: 'judge1' }
      });
      expect(mockPrisma.judge.update).toHaveBeenCalledWith({
        where: { id: 'judge1' },
        data: { bio: 'Updated bio' },
        select: {
          id: true,
          name: true,
          bio: true,
          imagePath: true
        }
      });
    });

    it('should update judge image path', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge1' } as any);
      mockPrisma.judge.update.mockResolvedValue(mockJudge as any);

      const result = await service.updateJudgeBio('judge1', {
        imagePath: '/images/new.jpg'
      });

      expect(result.imagePath).toBe('/images/updated.jpg');
      expect(mockPrisma.judge.update).toHaveBeenCalledWith({
        where: { id: 'judge1' },
        data: { imagePath: '/images/new.jpg' },
        select: expect.any(Object)
      });
    });

    it('should update both bio and image path for judge', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge1' } as any);
      mockPrisma.judge.update.mockResolvedValue(mockJudge as any);

      await service.updateJudgeBio('judge1', {
        bio: 'New bio',
        imagePath: '/images/new.jpg'
      });

      expect(mockPrisma.judge.update).toHaveBeenCalledWith({
        where: { id: 'judge1' },
        data: {
          bio: 'New bio',
          imagePath: '/images/new.jpg'
        },
        select: expect.any(Object)
      });
    });

    it('should throw NotFoundError when judge does not exist', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue(null);

      await expect(
        service.updateJudgeBio('nonexistent', { bio: 'Test' })
      ).rejects.toThrow(NotFoundError);

      expect(mockPrisma.judge.update).not.toHaveBeenCalled();
    });

    it('should handle empty update data for judge', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge1' } as any);
      mockPrisma.judge.update.mockResolvedValue(mockJudge as any);

      await service.updateJudgeBio('judge1', {});

      expect(mockPrisma.judge.update).toHaveBeenCalledWith({
        where: { id: 'judge1' },
        data: {},
        select: expect.any(Object)
      });
    });

    it('should update with empty string bio for judge', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge1' } as any);
      mockPrisma.judge.update.mockResolvedValue({ ...mockJudge, bio: '' } as any);

      const result = await service.updateJudgeBio('judge1', { bio: '' });

      expect(result.bio).toBe('');
    });
  });
});
