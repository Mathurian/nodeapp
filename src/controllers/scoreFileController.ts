/**
 * Score File Controller
 * Handles HTTP requests for score file uploads and management
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ScoreFileService } from '../services/ScoreFileService';
import { sendSuccess, sendError, sendNoContent } from '../utils/responseHelpers';
import { createRequestLogger } from '../utils/logger';
import { promises as fs } from 'fs';
import { getRequiredParam } from '../utils/routeHelpers';

export class ScoreFileController {
  private scoreFileService: ScoreFileService;

  constructor() {
    this.scoreFileService = container.resolve(ScoreFileService);
  }

  /**
   * Upload a score file
   */
  uploadScoreFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      const { categoryId, judgeId, contestantId, fileName, fileType, filePath, fileSize, notes } = req.body;

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const scoreFile = await this.scoreFileService.uploadScoreFile(
        {
          categoryId,
          judgeId,
          contestantId,
          fileName,
          fileType,
          filePath,
          fileSize,
          notes,
          tenantId: req.user.tenantId
        },
        req.user.id
      );

      log.info('Score file uploaded', { categoryId, judgeId, fileId: scoreFile.id });
      sendSuccess(res, scoreFile, 'Score file uploaded successfully');
    } catch (error) {
      log.error('Upload score file error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Get score file by ID
   */
  getScoreFileById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      const id = getRequiredParam(req, 'id');

      const file = await this.scoreFileService.getScoreFileById(id, req.user!.tenantId);

      if (!file) {
        sendError(res, 'Score file not found', 404);
        return;
      }

      log.info('Score file retrieved', { id });
      sendSuccess(res, file);
    } catch (error) {
      log.error('Get score file error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Get score files by category
   */
  getScoreFilesByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      const categoryId = getRequiredParam(req, 'categoryId');

      const files = await this.scoreFileService.getScoreFilesByCategory(categoryId, req.user!.tenantId);

      log.info('Score files retrieved by category', { categoryId, count: files.length });
      sendSuccess(res, files);
    } catch (error) {
      log.error('Get score files by category error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Get score files by judge
   */
  getScoreFilesByJudge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      const judgeId = getRequiredParam(req, 'judgeId');

      const files = await this.scoreFileService.getScoreFilesByJudge(judgeId, req.user!.tenantId);

      log.info('Score files retrieved by judge', { judgeId, count: files.length });
      sendSuccess(res, files);
    } catch (error) {
      log.error('Get score files by judge error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Get score files by contestant
   */
  getScoreFilesByContestant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      const contestantId = getRequiredParam(req, 'contestantId');

      const files = await this.scoreFileService.getScoreFilesByContestant(contestantId, req.user!.tenantId);

      log.info('Score files retrieved by contestant', { contestantId, count: files.length });
      sendSuccess(res, files);
    } catch (error) {
      log.error('Get score files by contestant error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Get all score files with optional filters
   */
  getAllScoreFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      const { categoryId, judgeId, contestantId, status } = req.query;

      const files = await this.scoreFileService.getAllScoreFiles(req.user!.tenantId, {
        categoryId: categoryId as string | undefined,
        judgeId: judgeId as string | undefined,
        contestantId: contestantId as string | undefined,
        status: status as string | undefined
      });

      log.info('All score files retrieved', { count: files.length });
      sendSuccess(res, files);
    } catch (error) {
      log.error('Get all score files error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Update score file status/notes
   */
  updateScoreFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      const id = getRequiredParam(req, 'id');
      const { status, notes } = req.body;

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const scoreFile = await this.scoreFileService.updateScoreFile(
        id,
        req.user.tenantId,
        { status, notes },
        req.user.id,
        req.user.role
      );

      log.info('Score file updated', { id });
      sendSuccess(res, scoreFile, 'Score file updated successfully');
    } catch (error) {
      log.error('Update score file error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Delete score file
   */
  deleteScoreFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      const id = getRequiredParam(req, 'id');

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await this.scoreFileService.deleteScoreFile(
        id,
        req.user.tenantId,
        req.user.id,
        req.user.role
      );

      log.info('Score file deleted', { id });
      sendNoContent(res);
    } catch (error) {
      log.error('Delete score file error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Download a score file
   */
  downloadScoreFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      const id = getRequiredParam(req, 'id');

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const fileInfo = await this.scoreFileService.getScoreFileById(id, req.user.tenantId);

      if (!fileInfo) {
        sendError(res, 'Score file not found', 404);
        return;
      }

      // Set headers for file download
      res.setHeader('Content-Type', fileInfo.fileType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);

      // Stream the file
      const fileStream = await fs.readFile(fileInfo.filePath);
      res.send(fileStream);

      log.info('Score file downloaded', { id });
    } catch (error) {
      log.error('Download score file error', { error: (error as Error).message });
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new ScoreFileController();

export const uploadScoreFile = controller.uploadScoreFile;
export const getScoreFileById = controller.getScoreFileById;
export const getScoreFilesByCategory = controller.getScoreFilesByCategory;
export const getScoreFilesByJudge = controller.getScoreFilesByJudge;
export const getScoreFilesByContestant = controller.getScoreFilesByContestant;
export const getAllScoreFiles = controller.getAllScoreFiles;
export const updateScoreFile = controller.updateScoreFile;
export const deleteScoreFile = controller.deleteScoreFile;
export const downloadScoreFile = controller.downloadScoreFile;
