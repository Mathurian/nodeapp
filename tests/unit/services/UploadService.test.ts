import 'reflect-metadata';
import { UploadService } from '../../../src/services/UploadService';
import { PrismaClient, FileCategory } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { promises as fs } from 'fs';

describe('UploadService', () => {
  let service: UploadService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  // Spies for fs.promises methods
  let mkdirSpy: jest.SpyInstance;
  let readFileSpy: jest.SpyInstance;
  let readdirSpy: jest.SpyInstance;
  let unlinkSpy: jest.SpyInstance;
  let accessSpy: jest.SpyInstance;
  let statSpy: jest.SpyInstance;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    filename: 'test-123.pdf',
    path: '/uploads/test-123.pdf',
    size: 1024,
    destination: '/uploads',
    buffer: Buffer.from('test'),
    stream: null as any,
  };

  beforeEach(() => {
    // Set up spies using jest.spyOn pattern
    mkdirSpy = jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    readFileSpy = jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('test'));
    readdirSpy = jest.spyOn(fs, 'readdir').mockResolvedValue([]);
    unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);
    accessSpy = jest.spyOn(fs, 'access').mockResolvedValue(undefined);
    statSpy = jest.spyOn(fs, 'stat').mockResolvedValue({
      isFile: () => true,
      size: 1024,
      birthtime: new Date(),
      mtime: new Date(),
    } as any);

    mockPrisma = mockDeep<PrismaClient>();
    service = new UploadService(mockPrisma as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (mockPrisma) {
      mockReset(mockPrisma);
    }
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(UploadService);
    });

    it('should initialize uploads directory', () => {
      expect(mkdirSpy).toHaveBeenCalled();
    });
  });

  describe('processUploadedFile', () => {
    it('should process file and save to database', async () => {
      const userId = 'user-123';

      mockPrisma.file.create.mockResolvedValue({
        id: 'file-123',
        filename: mockFile.filename,
        originalName: mockFile.originalname,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        path: 'uploads/test-123.pdf',
        category: FileCategory.OTHER,
        uploadedBy: userId,
        checksum: 'abc123',
        eventId: null,
        contestId: null,
        categoryId: null,
        tenantId: 'default_tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.processUploadedFile(mockFile, userId);

      expect(result).toMatchObject({
        id: 'file-123',
        filename: mockFile.filename,
        originalName: mockFile.originalname,
        mimetype: mockFile.mimetype,
        size: mockFile.size,
      });
      expect(mockPrisma.file.create).toHaveBeenCalled();
    });

    it('should throw error if no file provided', async () => {
      await expect(
        service.processUploadedFile(null as any, 'user-123')
      ).rejects.toThrow('No file uploaded');
    });

    it('should calculate file checksum', async () => {
      const userId = 'user-123';

      mockPrisma.file.create.mockResolvedValue({
        id: 'file-123',
        filename: mockFile.filename,
        originalName: mockFile.originalname,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        path: 'uploads/test-123.pdf',
        category: FileCategory.OTHER,
        uploadedBy: userId,
        checksum: 'abc123',
        eventId: null,
        contestId: null,
        categoryId: null,
        tenantId: 'default_tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.processUploadedFile(mockFile, userId);

      // Verify checksum was calculated and passed to database
      expect(mockPrisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            checksum: expect.any(String),
          }),
        })
      );
      // Verify the checksum is a valid MD5 hash (32 hex characters)
      const callArg = mockPrisma.file.create.mock.calls[0][0] as any;
      expect(callArg.data.checksum).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should use provided file category', async () => {
      const userId = 'user-123';

      mockPrisma.file.create.mockResolvedValue({
        id: 'file-123',
        filename: mockFile.filename,
        originalName: mockFile.originalname,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        path: 'uploads/test-123.pdf',
        category: FileCategory.DOCUMENT,
        uploadedBy: userId,
        checksum: 'abc123',
        eventId: null,
        contestId: null,
        categoryId: null,
        tenantId: 'default_tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.processUploadedFile(mockFile, userId, {
        category: FileCategory.DOCUMENT,
      });

      expect(mockPrisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: FileCategory.DOCUMENT,
          }),
        })
      );
    });

    it('should save event association', async () => {
      const userId = 'user-123';
      const eventId = 'event-123';

      mockPrisma.file.create.mockResolvedValue({
        id: 'file-123',
        filename: mockFile.filename,
        originalName: mockFile.originalname,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        path: 'uploads/test-123.pdf',
        category: FileCategory.OTHER,
        uploadedBy: userId,
        checksum: 'abc123',
        eventId,
        contestId: null,
        categoryId: null,
        tenantId: 'default_tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.processUploadedFile(mockFile, userId, { eventId });

      expect(mockPrisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventId }),
        })
      );
    });

    it('should save contest association', async () => {
      const userId = 'user-123';
      const contestId = 'contest-123';

      mockPrisma.file.create.mockResolvedValue({
        id: 'file-123',
        filename: mockFile.filename,
        originalName: mockFile.originalname,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        path: 'uploads/test-123.pdf',
        category: FileCategory.OTHER,
        uploadedBy: userId,
        checksum: 'abc123',
        eventId: null,
        contestId,
        categoryId: null,
        tenantId: 'default_tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.processUploadedFile(mockFile, userId, { contestId });

      expect(mockPrisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ contestId }),
        })
      );
    });

    it('should use relative path for storage', async () => {
      const userId = 'user-123';

      mockPrisma.file.create.mockResolvedValue({
        id: 'file-123',
        filename: mockFile.filename,
        originalName: mockFile.originalname,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        path: 'uploads/test-123.pdf',
        category: FileCategory.OTHER,
        uploadedBy: userId,
        checksum: 'abc123',
        eventId: null,
        contestId: null,
        categoryId: null,
        tenantId: 'default_tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.processUploadedFile(mockFile, userId);

      expect(mockPrisma.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            path: expect.any(String),
          }),
        })
      );
    });

    it('should handle file read errors', async () => {
      readFileSpy.mockRejectedValue(new Error('Read error'));

      await expect(
        service.processUploadedFile(mockFile, 'user-123')
      ).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      mockPrisma.file.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.processUploadedFile(mockFile, 'user-123')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getFiles', () => {
    it('should return empty array if directory does not exist', async () => {
      accessSpy.mockRejectedValue(new Error('ENOENT'));

      const result = await service.getFiles();

      expect(result).toEqual([]);
    });

    it('should list all files in upload directory', async () => {
      accessSpy.mockResolvedValue(undefined);
      readdirSpy.mockResolvedValue(['file1.pdf', 'file2.jpg']);
      statSpy.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-02'),
      });

      const result = await service.getFiles('user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'file1.pdf',
        filename: 'file1.pdf',
        size: 1024,
      });
    });

    it('should skip directories', async () => {
      accessSpy.mockResolvedValue(undefined);
      readdirSpy.mockResolvedValue(['file1.pdf', 'subdir']);
      statSpy
        .mockResolvedValueOnce({
          isFile: () => true,
          size: 1024,
          birthtime: new Date(),
          mtime: new Date(),
        })
        .mockResolvedValueOnce({
          isFile: () => false,
          size: 0,
          birthtime: new Date(),
          mtime: new Date(),
        });

      const result = await service.getFiles();

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('file1.pdf');
    });

    it('should sort files by creation date descending', async () => {
      accessSpy.mockResolvedValue(undefined);
      readdirSpy.mockResolvedValue(['old.pdf', 'new.pdf']);
      statSpy
        .mockResolvedValueOnce({
          isFile: () => true,
          size: 1024,
          birthtime: new Date('2024-01-01'),
          mtime: new Date('2024-01-01'),
        })
        .mockResolvedValueOnce({
          isFile: () => true,
          size: 2048,
          birthtime: new Date('2024-01-10'),
          mtime: new Date('2024-01-10'),
        });

      const result = await service.getFiles();

      expect(result[0].filename).toBe('new.pdf');
      expect(result[1].filename).toBe('old.pdf');
    });

    it('should include user ID in file info', async () => {
      const userId = 'user-123';
      accessSpy.mockResolvedValue(undefined);
      readdirSpy.mockResolvedValue(['file1.pdf']);
      statSpy.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await service.getFiles(userId);

      expect(result[0].uploadedBy).toBe(userId);
    });

    it('should use system as default uploader', async () => {
      accessSpy.mockResolvedValue(undefined);
      readdirSpy.mockResolvedValue(['file1.pdf']);
      statSpy.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        birthtime: new Date(),
        mtime: new Date(),
      });

      const result = await service.getFiles();

      expect(result[0].uploadedBy).toBe('system');
    });
  });

  describe('deleteFile', () => {
    it('should delete file from database and filesystem', async () => {
      const fileId = 'file-123';
      mockPrisma.file.findUnique.mockResolvedValue({
        id: fileId,
        filename: 'test.pdf',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/test.pdf',
        category: FileCategory.OTHER,
        uploadedBy: 'user-123',
        checksum: 'abc123',
        eventId: null,
        contestId: null,
        categoryId: null,
        tenantId: 'default_tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      unlinkSpy.mockResolvedValue(undefined);
      mockPrisma.file.delete.mockResolvedValue({} as any);

      await service.deleteFile(fileId);

      expect(mockPrisma.file.findUnique).toHaveBeenCalledWith({
        where: { id: fileId },
      });
      expect(unlinkSpy).toHaveBeenCalledWith('/uploads/test.pdf');
      expect(mockPrisma.file.delete).toHaveBeenCalledWith({
        where: { id: fileId },
      });
    });

    it('should handle physical file not found', async () => {
      const fileId = 'file-123';
      mockPrisma.file.findUnique.mockResolvedValue({
        id: fileId,
        filename: 'test.pdf',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/test.pdf',
        category: FileCategory.OTHER,
        uploadedBy: 'user-123',
        checksum: 'abc123',
        eventId: null,
        contestId: null,
        categoryId: null,
        tenantId: 'default_tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      unlinkSpy.mockRejectedValue(new Error('ENOENT'));
      mockPrisma.file.delete.mockResolvedValue({} as any);

      await service.deleteFile(fileId);

      expect(mockPrisma.file.delete).toHaveBeenCalled();
    });

    it('should try filesystem if not in database', async () => {
      const filename = 'test.pdf';
      mockPrisma.file.findUnique.mockResolvedValue(null);
      unlinkSpy.mockResolvedValue(undefined);

      await service.deleteFile(filename);

      expect(unlinkSpy).toHaveBeenCalled();
    });

    it('should throw error if file not found anywhere', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);
      unlinkSpy.mockRejectedValue(new Error('ENOENT'));

      await expect(service.deleteFile('nonexistent')).rejects.toThrow(
        'File not found'
      );
    });
  });

  describe('getFileById', () => {
    it('should return file from database', async () => {
      const fileId = 'file-123';
      const mockFileRecord = {
        id: fileId,
        filename: 'test.pdf',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/test.pdf',
        category: FileCategory.OTHER,
        uploadedBy: 'user-123',
        checksum: 'abc123',
        eventId: null,
        contestId: null,
        categoryId: null,
        tenantId: 'default_tenant',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.file.findUnique.mockResolvedValue(mockFileRecord);

      const result = await service.getFileById(fileId);

      expect(result).toEqual(mockFileRecord);
      expect(mockPrisma.file.findUnique).toHaveBeenCalledWith({
        where: { id: fileId },
      });
    });

    it('should return null if not in database', async () => {
      const filename = 'test.pdf';
      mockPrisma.file.findUnique.mockResolvedValue(null);

      const result = await service.getFileById(filename);

      expect(result).toBeNull();
    });

    it('should return null if file not found', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);

      const result = await service.getFileById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
