/**
 * CommentaryService Unit Tests
 * Comprehensive tests for score commentary functionality
 */

import 'reflect-metadata';
import { CommentaryService } from '../../../src/services/CommentaryService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../../src/services/BaseService';

describe('CommentaryService', () => {
  let service: CommentaryService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new CommentaryService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CommentaryService);
    });
  });

  describe('create', () => {
    const validCommentData = {
      scoreId: 'score1',
      criterionId: 'criterion1',
      contestantId: 'contestant1',
      judgeId: 'judge1',
      comment: 'Great performance!',
      isPrivate: false
    };

    const mockComment = {
      id: 'comment1',
      ...validCommentData,
      createdAt: new Date(),
      updatedAt: new Date(),
      judge: {
        name: 'Judge Smith',
        email: 'judge@example.com'
      }
    };

    it('should create a new comment successfully', async () => {
      mockPrisma.scoreComment.create.mockResolvedValue(mockComment as any);

      const result = await service.create(validCommentData);

      expect(result).toEqual(mockComment);
      expect(mockPrisma.scoreComment.create).toHaveBeenCalledWith({
        data: {
          scoreId: validCommentData.scoreId,
          criterionId: validCommentData.criterionId,
          contestantId: validCommentData.contestantId,
          judgeId: validCommentData.judgeId,
          comment: validCommentData.comment,
          isPrivate: false
        },
        include: {
          judge: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
    });

    it('should default isPrivate to false when not provided', async () => {
      const dataWithoutPrivacy = { ...validCommentData };
      delete dataWithoutPrivacy.isPrivate;

      mockPrisma.scoreComment.create.mockResolvedValue(mockComment as any);

      await service.create(dataWithoutPrivacy);

      expect(mockPrisma.scoreComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPrivate: false
          })
        })
      );
    });

    it('should create private comment when isPrivate is true', async () => {
      const privateComment = { ...validCommentData, isPrivate: true };
      mockPrisma.scoreComment.create.mockResolvedValue({ ...mockComment, isPrivate: true } as any);

      const result = await service.create(privateComment);

      expect(mockPrisma.scoreComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPrivate: true
          })
        })
      );
    });

    it('should throw BadRequestError when scoreId is missing', async () => {
      const invalidData = { ...validCommentData };
      delete invalidData.scoreId;

      await expect(service.create(invalidData as any)).rejects.toThrow(BadRequestError);
      expect(mockPrisma.scoreComment.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when criterionId is missing', async () => {
      const invalidData = { ...validCommentData };
      delete invalidData.criterionId;

      await expect(service.create(invalidData as any)).rejects.toThrow(BadRequestError);
      expect(mockPrisma.scoreComment.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when contestantId is missing', async () => {
      const invalidData = { ...validCommentData };
      delete invalidData.contestantId;

      await expect(service.create(invalidData as any)).rejects.toThrow(BadRequestError);
      expect(mockPrisma.scoreComment.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when comment is missing', async () => {
      const invalidData = { ...validCommentData };
      delete invalidData.comment;

      await expect(service.create(invalidData as any)).rejects.toThrow(BadRequestError);
      expect(mockPrisma.scoreComment.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when comment is empty string', async () => {
      const invalidData = { ...validCommentData, comment: '' };

      await expect(service.create(invalidData)).rejects.toThrow(BadRequestError);
      expect(mockPrisma.scoreComment.create).not.toHaveBeenCalled();
    });
  });

  describe('getCommentsForScore', () => {
    const mockComments = [
      {
        id: 'comment1',
        scoreId: 'score1',
        comment: 'Public comment',
        isPrivate: false,
        judge: { name: 'Judge A', email: 'a@example.com' },
        criterion: { name: 'Criterion 1', description: 'Test criterion' },
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'comment2',
        scoreId: 'score1',
        comment: 'Private comment',
        isPrivate: true,
        judge: { name: 'Judge B', email: 'b@example.com' },
        criterion: { name: 'Criterion 2', description: 'Another criterion' },
        createdAt: new Date('2024-01-02')
      }
    ];

    it('should retrieve all comments for admin users', async () => {
      mockPrisma.scoreComment.findMany.mockResolvedValue(mockComments as any);

      const result = await service.getCommentsForScore('score1', 'ADMIN');

      expect(result).toEqual(mockComments);
      expect(mockPrisma.scoreComment.findMany).toHaveBeenCalledWith({
        where: { scoreId: 'score1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' }
      });
    });

    it('should retrieve all comments for organizer users', async () => {
      mockPrisma.scoreComment.findMany.mockResolvedValue(mockComments as any);

      await service.getCommentsForScore('score1', 'ORGANIZER');

      expect(mockPrisma.scoreComment.findMany).toHaveBeenCalledWith({
        where: { scoreId: 'score1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' }
      });
    });

    it('should retrieve all comments for board users', async () => {
      mockPrisma.scoreComment.findMany.mockResolvedValue(mockComments as any);

      await service.getCommentsForScore('score1', 'BOARD');

      expect(mockPrisma.scoreComment.findMany).toHaveBeenCalledWith({
        where: { scoreId: 'score1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' }
      });
    });

    it('should filter private comments for non-privileged users', async () => {
      const publicComments = [mockComments[0]];
      mockPrisma.scoreComment.findMany.mockResolvedValue(publicComments as any);

      await service.getCommentsForScore('score1', 'JUDGE');

      expect(mockPrisma.scoreComment.findMany).toHaveBeenCalledWith({
        where: { scoreId: 'score1', isPrivate: false },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' }
      });
    });

    it('should filter private comments for contestant users', async () => {
      mockPrisma.scoreComment.findMany.mockResolvedValue([mockComments[0]] as any);

      await service.getCommentsForScore('score1', 'CONTESTANT');

      expect(mockPrisma.scoreComment.findMany).toHaveBeenCalledWith({
        where: { scoreId: 'score1', isPrivate: false },
        include: expect.any(Object),
        orderBy: { createdAt: 'asc' }
      });
    });

    it('should sort comments by createdAt ascending', async () => {
      mockPrisma.scoreComment.findMany.mockResolvedValue(mockComments as any);

      await service.getCommentsForScore('score1', 'ADMIN');

      expect(mockPrisma.scoreComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' }
        })
      );
    });

    it('should return empty array when no comments found', async () => {
      mockPrisma.scoreComment.findMany.mockResolvedValue([]);

      const result = await service.getCommentsForScore('score999', 'ADMIN');

      expect(result).toEqual([]);
    });
  });

  describe('getCommentsByContestant', () => {
    const mockContestantComments = [
      {
        id: 'comment1',
        contestantId: 'contestant1',
        comment: 'Comment 1',
        isPrivate: false,
        scoreId: 'score1',
        judge: { name: 'Judge A', email: 'a@example.com' },
        criterion: { name: 'Criterion 1', description: 'Test' },
        score: {
          category: {
            contest: {
              event: { id: 'event1', name: 'Event 1' }
            }
          }
        },
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'comment2',
        contestantId: 'contestant1',
        comment: 'Private comment',
        isPrivate: true,
        scoreId: 'score2',
        judge: { name: 'Judge B', email: 'b@example.com' },
        criterion: { name: 'Criterion 2', description: 'Test 2' },
        score: {
          category: {
            contest: {
              event: { id: 'event1', name: 'Event 1' }
            }
          }
        },
        createdAt: new Date('2024-01-02')
      }
    ];

    it('should retrieve all comments for contestant for admin users', async () => {
      mockPrisma.scoreComment.findMany.mockResolvedValue(mockContestantComments as any);

      const result = await service.getCommentsByContestant('contestant1', 'ADMIN');

      expect(result).toEqual(mockContestantComments);
      expect(mockPrisma.scoreComment.findMany).toHaveBeenCalledWith({
        where: { contestantId: 'contestant1' },
        include: expect.objectContaining({
          judge: expect.any(Object),
          criterion: expect.any(Object),
          score: expect.any(Object)
        }),
        orderBy: [
          { scoreId: 'desc' },
          { createdAt: 'asc' }
        ]
      });
    });

    it('should filter private comments for non-admin users', async () => {
      mockPrisma.scoreComment.findMany.mockResolvedValue([mockContestantComments[0]] as any);

      await service.getCommentsByContestant('contestant1', 'JUDGE');

      expect(mockPrisma.scoreComment.findMany).toHaveBeenCalledWith({
        where: { contestantId: 'contestant1', isPrivate: false },
        include: expect.any(Object),
        orderBy: expect.any(Array)
      });
    });

    it('should include nested relationships', async () => {
      mockPrisma.scoreComment.findMany.mockResolvedValue(mockContestantComments as any);

      await service.getCommentsByContestant('contestant1', 'ADMIN');

      expect(mockPrisma.scoreComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            score: {
              include: {
                category: {
                  include: {
                    contest: {
                      include: {
                        event: true
                      }
                    }
                  }
                }
              }
            }
          })
        })
      );
    });

    it('should sort by scoreId desc and createdAt asc', async () => {
      mockPrisma.scoreComment.findMany.mockResolvedValue(mockContestantComments as any);

      await service.getCommentsByContestant('contestant1', 'ORGANIZER');

      expect(mockPrisma.scoreComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { scoreId: 'desc' },
            { createdAt: 'asc' }
          ]
        })
      );
    });
  });

  describe('update', () => {
    const existingComment = {
      id: 'comment1',
      scoreId: 'score1',
      judgeId: 'judge1',
      comment: 'Original comment',
      isPrivate: false
    };

    const updatedComment = {
      ...existingComment,
      comment: 'Updated comment',
      judge: { name: 'Judge Smith', email: 'judge@example.com' }
    };

    it('should update comment when user is the owner', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);
      mockPrisma.scoreComment.update.mockResolvedValue(updatedComment as any);

      const result = await service.update('comment1', { comment: 'Updated comment' }, 'judge1', 'JUDGE');

      expect(result).toEqual(updatedComment);
      expect(mockPrisma.scoreComment.update).toHaveBeenCalledWith({
        where: { id: 'comment1' },
        data: { comment: 'Updated comment' },
        include: {
          judge: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
    });

    it('should update comment when user is admin', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);
      mockPrisma.scoreComment.update.mockResolvedValue(updatedComment as any);

      await service.update('comment1', { comment: 'Updated by admin' }, 'admin1', 'ADMIN');

      expect(mockPrisma.scoreComment.update).toHaveBeenCalled();
    });

    it('should update comment when user is organizer', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);
      mockPrisma.scoreComment.update.mockResolvedValue(updatedComment as any);

      await service.update('comment1', { comment: 'Updated by organizer' }, 'organizer1', 'ORGANIZER');

      expect(mockPrisma.scoreComment.update).toHaveBeenCalled();
    });

    it('should update isPrivate field', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);
      mockPrisma.scoreComment.update.mockResolvedValue({ ...updatedComment, isPrivate: true } as any);

      await service.update('comment1', { isPrivate: true }, 'judge1', 'JUDGE');

      expect(mockPrisma.scoreComment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isPrivate: true }
        })
      );
    });

    it('should update both comment and isPrivate', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);
      mockPrisma.scoreComment.update.mockResolvedValue(updatedComment as any);

      await service.update('comment1', { comment: 'New comment', isPrivate: true }, 'judge1', 'JUDGE');

      expect(mockPrisma.scoreComment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            comment: 'New comment',
            isPrivate: true
          }
        })
      );
    });

    it('should throw NotFoundError when comment does not exist', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { comment: 'Test' }, 'judge1', 'JUDGE')
      ).rejects.toThrow(NotFoundError);

      expect(mockPrisma.scoreComment.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not owner and not admin', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);

      await expect(
        service.update('comment1', { comment: 'Unauthorized update' }, 'otherJudge', 'JUDGE')
      ).rejects.toThrow(ForbiddenError);

      expect(mockPrisma.scoreComment.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not owner and is board member', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);

      await expect(
        service.update('comment1', { comment: 'Board update' }, 'board1', 'BOARD')
      ).rejects.toThrow(ForbiddenError);

      expect(mockPrisma.scoreComment.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const existingComment = {
      id: 'comment1',
      scoreId: 'score1',
      judgeId: 'judge1',
      comment: 'Comment to delete',
      isPrivate: false
    };

    it('should delete comment when user is the owner', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);
      mockPrisma.scoreComment.delete.mockResolvedValue(existingComment as any);

      await service.delete('comment1', 'judge1', 'JUDGE');

      expect(mockPrisma.scoreComment.delete).toHaveBeenCalledWith({
        where: { id: 'comment1' }
      });
    });

    it('should delete comment when user is admin', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);
      mockPrisma.scoreComment.delete.mockResolvedValue(existingComment as any);

      await service.delete('comment1', 'admin1', 'ADMIN');

      expect(mockPrisma.scoreComment.delete).toHaveBeenCalled();
    });

    it('should delete comment when user is organizer', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);
      mockPrisma.scoreComment.delete.mockResolvedValue(existingComment as any);

      await service.delete('comment1', 'organizer1', 'ORGANIZER');

      expect(mockPrisma.scoreComment.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundError when comment does not exist', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(null);

      await expect(
        service.delete('nonexistent', 'judge1', 'JUDGE')
      ).rejects.toThrow(NotFoundError);

      expect(mockPrisma.scoreComment.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not owner and not admin', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);

      await expect(
        service.delete('comment1', 'otherJudge', 'JUDGE')
      ).rejects.toThrow(ForbiddenError);

      expect(mockPrisma.scoreComment.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is not owner and is board member', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);

      await expect(
        service.delete('comment1', 'board1', 'BOARD')
      ).rejects.toThrow(ForbiddenError);

      expect(mockPrisma.scoreComment.delete).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user is contestant', async () => {
      mockPrisma.scoreComment.findUnique.mockResolvedValue(existingComment as any);

      await expect(
        service.delete('comment1', 'contestant1', 'CONTESTANT')
      ).rejects.toThrow(ForbiddenError);

      expect(mockPrisma.scoreComment.delete).not.toHaveBeenCalled();
    });
  });
});
