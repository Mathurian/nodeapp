import { injectable, inject } from 'tsyringe';
import { PrismaClient, FileCategory } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { BaseService } from './BaseService';

export interface FileInfo {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedBy: string;
  category?: FileCategory;
  eventId?: string;
  contestId?: string;
  categoryId?: string;
}

@injectable()
export class UploadService extends BaseService {
  private uploadDir: string;

  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
    this.uploadDir = path.join(process.cwd(), 'uploads');
    // Ensure uploads directory exists
    this.ensureUploadsDir();
  }

  /**
   * Ensure uploads directory exists
   */
  private async ensureUploadsDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logWarn('Could not create uploads directory', { error: (error as Error).message });
    }
  }

  /**
   * Process uploaded file and save to database
   */
  async processUploadedFile(
    file: Express.Multer.File,
    userId: string,
    options?: {
      category?: FileCategory;
      eventId?: string;
      contestId?: string;
      categoryId?: string;
      tenantId?: string;
    }
  ): Promise<FileInfo> {
    if (!file) {
      throw this.createBadRequestError('No file uploaded');
    }

    // Calculate checksum
    const fileBuffer = await fs.readFile(file.path);
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');

    // Determine file category
    const fileCategory = options?.category || FileCategory.OTHER;

    // Save to database - use relative path
    const relativePath = path.relative(process.cwd(), file.path);
    const dbFile: any = await this.prisma.file.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: relativePath,
        category: fileCategory,
        uploadedBy: userId,
        checksum,
        tenantId: options?.tenantId || 'default_tenant',
        eventId: options?.eventId,
        contestId: options?.contestId,
        categoryId: options?.categoryId
      }
    });

    return {
      id: dbFile.id,
      filename: dbFile.filename,
      originalName: dbFile.originalName,
      mimetype: dbFile.mimeType,
      size: dbFile.size,
      path: dbFile.path,
      uploadedBy: dbFile.uploadedBy,
      category: dbFile.category,
      eventId: dbFile.eventId || undefined,
      contestId: dbFile.contestId || undefined,
      categoryId: dbFile.categoryId || undefined
    };
  }

  /**
   * Get all files from upload directory
   */
  async getFiles(userId?: string): Promise<any[]> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      return [];
    }

    const files = await fs.readdir(this.uploadDir);
    const fileList = [];

    for (const file of files) {
      const filePath = path.join(this.uploadDir, file);
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        fileList.push({
          id: file,
          filename: file,
          filepath: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
          uploadedBy: userId || 'system',
        });
      }
    }

    return fileList.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<void> {
    // Try to find in database first
    try {
      const file: any = await this.prisma.file.findUnique({
        where: { id: fileId },
      });

      if (file) {
        // Delete physical file
        try {
          await fs.unlink(file.path);
        } catch (error) {
          this.logWarn('Physical file not found', { path: file.path });
        }

        // Delete database record
        await this.prisma.file.delete({
          where: { id: fileId },
        });

        return;
      }
    } catch {
      // File not in database, try to delete from filesystem
    }

    // If not in database, assume fileId is filename
    const filePath = path.join(this.uploadDir, fileId);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw this.createNotFoundError('File not found');
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId: string): Promise<any> {
    try {
      const file: any = await this.prisma.file.findUnique({
        where: { id: fileId },
      });

      if (file) {
        return file;
      }
    } catch {
      // Not in database
    }

    // Try filesystem
    const filePath = path.join(this.uploadDir, fileId);

    try {
      const stats = await fs.stat(filePath);
      return {
        id: fileId,
        filename: fileId,
        filepath: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
      };
    } catch {
      throw this.createNotFoundError('File not found');
    }
  }
}
