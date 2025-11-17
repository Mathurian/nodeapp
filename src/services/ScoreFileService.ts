/**
 * Score File Service
 * Manages uploaded score sheets and judge documents
 */

import { PrismaClient, ScoreFile } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { promises as fs } from 'fs';

export interface UploadScoreFileDTO {
  categoryId: string;
  judgeId: string;
  contestantId?: string;
  tenantId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  notes?: string;
}

export interface UpdateScoreFileDTO {
  status?: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface ScoreFileInfo {
  id: string;
  categoryId: string;
  judgeId: string;
  contestantId: string | null;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize: number;
  uploadedById: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@injectable()
export class ScoreFileService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Upload a score file
   */
  async uploadScoreFile(
    data: UploadScoreFileDTO,
    uploadedById: string
  ): Promise<ScoreFile> {
    // Verify category exists in tenant
    const category = await this.prisma.category.findFirst({
      where: { id: data.categoryId, tenantId: data.tenantId }
    });

    if (!category) {
      throw this.createNotFoundError('Category not found');
    }

    // Verify judge exists in tenant
    const judge = await this.prisma.judge.findFirst({
      where: { id: data.judgeId, tenantId: data.tenantId }
    });

    if (!judge) {
      throw this.createNotFoundError('Judge not found');
    }

    // If contestantId provided, verify contestant exists in tenant
    if (data.contestantId) {
      const contestant = await this.prisma.contestant.findFirst({
        where: { id: data.contestantId, tenantId: data.tenantId }
      });

      if (!contestant) {
        throw this.createNotFoundError('Contestant not found');
      }
    }

    // Create score file record
    const scoreFile = await this.prisma.scoreFile.create({
      data: {
        categoryId: data.categoryId,
        judgeId: data.judgeId,
        contestantId: data.contestantId || null,
        tenantId: data.tenantId,
        fileName: data.fileName,
        fileType: data.fileType,
        filePath: data.filePath,
        fileSize: data.fileSize,
        uploadedById,
        status: 'pending',
        notes: data.notes || null,
        updatedAt: new Date()
      }
    });

    return scoreFile;
  }

  /**
   * Get score file by ID
   */
  async getScoreFileById(id: string, tenantId: string): Promise<ScoreFile | null> {
    return await this.prisma.scoreFile.findFirst({
      where: { id, tenantId }
    });
  }

  /**
   * Get score files for a category
   */
  async getScoreFilesByCategory(categoryId: string, tenantId: string): Promise<ScoreFile[]> {
    return await this.prisma.scoreFile.findMany({
      where: { categoryId, tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get score files for a judge
   */
  async getScoreFilesByJudge(judgeId: string, tenantId: string): Promise<ScoreFile[]> {
    return await this.prisma.scoreFile.findMany({
      where: { judgeId, tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get score files for a contestant
   */
  async getScoreFilesByContestant(contestantId: string, tenantId: string): Promise<ScoreFile[]> {
    return await this.prisma.scoreFile.findMany({
      where: { contestantId, tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Update score file status/notes
   */
  async updateScoreFile(
    id: string,
    tenantId: string,
    data: UpdateScoreFileDTO,
    _userId: string,
    userRole: string
  ): Promise<ScoreFile> {
    const scoreFile = await this.prisma.scoreFile.findFirst({
      where: { id, tenantId }
    });

    if (!scoreFile) {
      throw this.createNotFoundError('Score file not found');
    }

    // Only admins, organizers, board can update status
    const canUpdateStatus = ['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole);

    if (data.status && !canUpdateStatus) {
      throw this.forbiddenError('You do not have permission to update score file status');
    }

    const updated = await this.prisma.scoreFile.update({
      where: { id },
      data: {
        status: data.status || scoreFile.status,
        notes: data.notes !== undefined ? data.notes : scoreFile.notes,
        updatedAt: new Date()
      }
    });

    return updated;
  }

  /**
   * Delete score file
   */
  async deleteScoreFile(
    id: string,
    tenantId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    const scoreFile = await this.prisma.scoreFile.findFirst({
      where: { id, tenantId }
    });

    if (!scoreFile) {
      throw this.createNotFoundError('Score file not found');
    }

    // Only admins, organizers, board, or the uploader can delete
    const isUploader = scoreFile.uploadedById === userId;
    const isAuthorized = ['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole);

    if (!isUploader && !isAuthorized) {
      throw this.forbiddenError('You do not have permission to delete this score file');
    }

    // Delete the physical file
    try {
      await fs.unlink(scoreFile.filePath);
    } catch (error) {
      console.error('Failed to delete physical file:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await this.prisma.scoreFile.delete({
      where: { id }
    });
  }

  /**
   * Get all score files (with optional filters)
   */
  async getAllScoreFiles(tenantId: string, filters?: {
    categoryId?: string;
    judgeId?: string;
    contestantId?: string;
    status?: string;
  }): Promise<ScoreFile[]> {
    return await this.prisma.scoreFile.findMany({
      where: {
        tenantId,
        categoryId: filters?.categoryId,
        judgeId: filters?.judgeId,
        contestantId: filters?.contestantId,
        status: filters?.status
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
