import 'reflect-metadata';
import { ScoreFileService } from '../../../src/services/ScoreFileService';
import { PrismaClient, ScoreFile } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { promises as fs } from 'fs';

jest.mock('fs', () => ({
  promises: {
    unlink: jest.fn(),
  },
}));

describe('ScoreFileService', () => {
  let service: ScoreFileService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockScoreFile: ScoreFile = {
    id: 'file-123',
    categoryId: 'cat-123',
    judgeId: 'judge-123',
    contestantId: 'contestant-123',
    fileName: 'score.pdf',
    fileType: 'application/pdf',
    filePath: '/uploads/score.pdf',
    fileSize: 1024,
    uploadedById: 'user-123',
    status: 'pending',
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ScoreFileService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ScoreFileService);
    });
  });

  describe('uploadScoreFile', () => {
    const uploadData = {
      categoryId: 'cat-123',
      judgeId: 'judge-123',
      contestantId: 'contestant-123',
      fileName: 'score.pdf',
      fileType: 'application/pdf',
      filePath: '/uploads/score.pdf',
      fileSize: 1024,
      notes: 'Test notes',
    };

    it('should upload score file successfully', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-123' } as any);
      mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge-123' } as any);
      mockPrisma.contestant.findUnique.mockResolvedValue({ id: 'contestant-123' } as any);
      mockPrisma.scoreFile.create.mockResolvedValue(mockScoreFile);

      const result = await service.uploadScoreFile(uploadData, 'user-123');

      expect(result).toEqual(mockScoreFile);
      expect(mockPrisma.scoreFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          categoryId: uploadData.categoryId,
          judgeId: uploadData.judgeId,
          uploadedById: 'user-123',
          status: 'pending',
        }),
      });
    });

    it('should throw error if category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadScoreFile(uploadData, 'user-123')
      ).rejects.toThrow('Category not found');
    });

    it('should throw error if judge not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-123' } as any);
      mockPrisma.judge.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadScoreFile(uploadData, 'user-123')
      ).rejects.toThrow('Judge not found');
    });

    it('should throw error if contestant not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-123' } as any);
      mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge-123' } as any);
      mockPrisma.contestant.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadScoreFile(uploadData, 'user-123')
      ).rejects.toThrow('Contestant not found');
    });

    it('should upload without contestant if not provided', async () => {
      const dataWithoutContestant = { ...uploadData, contestantId: undefined };
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-123' } as any);
      mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge-123' } as any);
      mockPrisma.scoreFile.create.mockResolvedValue({
        ...mockScoreFile,
        contestantId: null,
      });

      const result = await service.uploadScoreFile(dataWithoutContestant, 'user-123');

      expect(result.contestantId).toBeNull();
      expect(mockPrisma.scoreFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contestantId: null,
        }),
      });
    });

    it('should set status to pending by default', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-123' } as any);
      mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge-123' } as any);
      mockPrisma.scoreFile.create.mockResolvedValue(mockScoreFile);

      await service.uploadScoreFile(uploadData, 'user-123');

      expect(mockPrisma.scoreFile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'pending' }),
      });
    });
  });

  describe('getScoreFileById', () => {
    it('should get score file by ID', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(mockScoreFile as any);

      const result = await service.getScoreFileById('file-123');

      expect(result).toEqual(mockScoreFile);
      expect(mockPrisma.scoreFile.findUnique).toHaveBeenCalledWith({
        where: { id: 'file-123' },
        include: expect.any(Object),
      });
    });

    it('should return null if not found', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(null);

      const result = await service.getScoreFileById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getScoreFilesByCategory', () => {
    it('should get all score files for a category', async () => {
      const files = [mockScoreFile, { ...mockScoreFile, id: 'file-124' }];
      mockPrisma.scoreFile.findMany.mockResolvedValue(files as any);

      const result = await service.getScoreFilesByCategory('cat-123');

      expect(result).toEqual(files);
      expect(mockPrisma.scoreFile.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat-123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no files found', async () => {
      mockPrisma.scoreFile.findMany.mockResolvedValue([]);

      const result = await service.getScoreFilesByCategory('cat-123');

      expect(result).toEqual([]);
    });
  });

  describe('getScoreFilesByJudge', () => {
    it('should get all score files for a judge', async () => {
      const files = [mockScoreFile];
      mockPrisma.scoreFile.findMany.mockResolvedValue(files as any);

      const result = await service.getScoreFilesByJudge('judge-123');

      expect(result).toEqual(files);
      expect(mockPrisma.scoreFile.findMany).toHaveBeenCalledWith({
        where: { judgeId: 'judge-123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getScoreFilesByContestant', () => {
    it('should get all score files for a contestant', async () => {
      const files = [mockScoreFile];
      mockPrisma.scoreFile.findMany.mockResolvedValue(files as any);

      const result = await service.getScoreFilesByContestant('contestant-123');

      expect(result).toEqual(files);
      expect(mockPrisma.scoreFile.findMany).toHaveBeenCalledWith({
        where: { contestantId: 'contestant-123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateScoreFile', () => {
    it('should update score file status (admin)', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(mockScoreFile);
      mockPrisma.scoreFile.update.mockResolvedValue({
        ...mockScoreFile,
        status: 'approved',
      });

      const result = await service.updateScoreFile(
        'file-123',
        { status: 'approved' },
        'user-123',
        'ADMIN'
      );

      expect(result.status).toBe('approved');
      expect(mockPrisma.scoreFile.update).toHaveBeenCalledWith({
        where: { id: 'file-123' },
        data: expect.objectContaining({ status: 'approved' }),
      });
    });

    it('should update notes without changing status', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(mockScoreFile);
      mockPrisma.scoreFile.update.mockResolvedValue({
        ...mockScoreFile,
        notes: 'Updated notes',
      });

      const result = await service.updateScoreFile(
        'file-123',
        { notes: 'Updated notes' },
        'user-123',
        'JUDGE'
      );

      expect(result.notes).toBe('Updated notes');
    });

    it('should throw error if file not found', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateScoreFile('nonexistent', {}, 'user-123', 'ADMIN')
      ).rejects.toThrow('Score file not found');
    });

    it('should throw error if non-admin tries to update status', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(mockScoreFile);

      await expect(
        service.updateScoreFile(
          'file-123',
          { status: 'approved' },
          'user-123',
          'JUDGE'
        )
      ).rejects.toThrow('You do not have permission to update score file status');
    });

    it('should allow organizer to update status', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(mockScoreFile);
      mockPrisma.scoreFile.update.mockResolvedValue({
        ...mockScoreFile,
        status: 'approved',
      });

      const result = await service.updateScoreFile(
        'file-123',
        { status: 'approved' },
        'user-123',
        'ORGANIZER'
      );

      expect(result.status).toBe('approved');
    });

    it('should allow board to update status', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(mockScoreFile);
      mockPrisma.scoreFile.update.mockResolvedValue({
        ...mockScoreFile,
        status: 'rejected',
      });

      const result = await service.updateScoreFile(
        'file-123',
        { status: 'rejected' },
        'user-123',
        'BOARD'
      );

      expect(result.status).toBe('rejected');
    });
  });

  describe('deleteScoreFile', () => {
    it('should delete score file and physical file (admin)', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(mockScoreFile);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      mockPrisma.scoreFile.delete.mockResolvedValue(mockScoreFile);

      await service.deleteScoreFile('file-123', 'user-123', 'ADMIN');

      expect(fs.unlink).toHaveBeenCalledWith(mockScoreFile.filePath);
      expect(mockPrisma.scoreFile.delete).toHaveBeenCalledWith({
        where: { id: 'file-123' },
      });
    });

    it('should allow uploader to delete their own file', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(mockScoreFile);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      mockPrisma.scoreFile.delete.mockResolvedValue(mockScoreFile);

      await service.deleteScoreFile('file-123', 'user-123', 'JUDGE');

      expect(mockPrisma.scoreFile.delete).toHaveBeenCalled();
    });

    it('should throw error if file not found', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteScoreFile('nonexistent', 'user-123', 'ADMIN')
      ).rejects.toThrow('Score file not found');
    });

    it('should throw error if unauthorized user tries to delete', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(mockScoreFile);

      await expect(
        service.deleteScoreFile('file-123', 'other-user', 'JUDGE')
      ).rejects.toThrow('You do not have permission to delete this score file');
    });

    it('should continue deletion even if physical file deletion fails', async () => {
      mockPrisma.scoreFile.findUnique.mockResolvedValue(mockScoreFile);
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('File not found'));
      mockPrisma.scoreFile.delete.mockResolvedValue(mockScoreFile);

      await service.deleteScoreFile('file-123', 'user-123', 'ADMIN');

      expect(mockPrisma.scoreFile.delete).toHaveBeenCalled();
    });
  });

  describe('getAllScoreFiles', () => {
    it('should get all score files', async () => {
      const files = [mockScoreFile];
      mockPrisma.scoreFile.findMany.mockResolvedValue(files as any);

      const result = await service.getAllScoreFiles();

      expect(result).toEqual(files);
    });

    it('should filter by category', async () => {
      mockPrisma.scoreFile.findMany.mockResolvedValue([mockScoreFile] as any);

      await service.getAllScoreFiles({ categoryId: 'cat-123' });

      expect(mockPrisma.scoreFile.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ categoryId: 'cat-123' }),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by judge', async () => {
      mockPrisma.scoreFile.findMany.mockResolvedValue([mockScoreFile] as any);

      await service.getAllScoreFiles({ judgeId: 'judge-123' });

      expect(mockPrisma.scoreFile.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ judgeId: 'judge-123' }),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by contestant', async () => {
      mockPrisma.scoreFile.findMany.mockResolvedValue([mockScoreFile] as any);

      await service.getAllScoreFiles({ contestantId: 'contestant-123' });

      expect(mockPrisma.scoreFile.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ contestantId: 'contestant-123' }),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      mockPrisma.scoreFile.findMany.mockResolvedValue([mockScoreFile] as any);

      await service.getAllScoreFiles({ status: 'approved' });

      expect(mockPrisma.scoreFile.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: 'approved' }),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should apply multiple filters', async () => {
      mockPrisma.scoreFile.findMany.mockResolvedValue([mockScoreFile] as any);

      await service.getAllScoreFiles({
        categoryId: 'cat-123',
        judgeId: 'judge-123',
        status: 'approved',
      });

      expect(mockPrisma.scoreFile.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          categoryId: 'cat-123',
          judgeId: 'judge-123',
          status: 'approved',
        }),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
