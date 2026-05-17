/**
 * Score File Controller
 * Handles HTTP requests for score file uploads and management
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ScoreFileService } from '../services/ScoreFileService';
import { ScoreDelegationService } from '../services/ScoreDelegationService';
import { ScoreSheetImportService } from '../services/ScoreSheetImportService';
import { sendSuccess, sendError, sendNoContent , sendUnauthorized} from '../utils/responseHelpers';
import { createRequestLogger } from '../utils/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { getRequiredParam } from '../utils/routeHelpers';
import {
  getOfflineWriteTimeoutMs,
  matchOfflineWriteOwnershipRoute,
} from '../config/offlineWriteOwnership.config';
import { createCommentaryViewerContext } from '../utils/commentaryAccess';

export class ScoreFileController {
  private scoreFileService: ScoreFileService;
  private scoreDelegationService: ScoreDelegationService;
  private scoreSheetImportService: ScoreSheetImportService;

  constructor() {
    this.scoreFileService = container.resolve(ScoreFileService);
    this.scoreDelegationService = container.resolve(ScoreDelegationService);
    this.scoreSheetImportService = container.resolve(ScoreSheetImportService);
  }

  /**
   * Upload a score file
   */
  uploadScoreFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      const {
        categoryId,
        contestantId,
        criterionId,
        notes,
        contextType,
        representedJudgeId,
        importIntent,
        templateKey,
      } = req.body;

      if (!req.user) {
        throw new Error('User not authenticated');
      }
      if (!req.file) {
        sendError(res, 'File is required', 400);
        return;
      }
      if (!categoryId) {
        sendError(res, 'categoryId is required', 400);
        return;
      }

      const actingJudge = await this.scoreDelegationService.resolveActingJudgeContext(
        req.user,
        req.user.tenantId,
        categoryId,
        representedJudgeId || req.body.judgeId,
      );

      const relativeFilePath = path.relative(process.cwd(), req.file.path);
      const timeoutMs = getOfflineWriteTimeoutMs(
        matchOfflineWriteOwnershipRoute(req.method, req.originalUrl || req.path),
      );
      const normalizedIntent = importIntent === 'SCORESHEET_IMPORT'
        ? 'SCORESHEET_IMPORT'
        : 'COMMENTARY_ATTACHMENT';

      if (normalizedIntent === 'SCORESHEET_IMPORT' && !contestantId) {
        sendError(res, 'contestantId is required for scoresheet import uploads', 400);
        return;
      }

      const normalizedContextType = typeof contextType === 'string'
        && ['CRITERION_COMMENT', 'CONTESTANT', 'CATEGORY', 'SCORESHEET_IMPORT'].includes(contextType)
        ? contextType
        : undefined;
      const contextMetadata = {
        contextType: normalizedIntent === 'SCORESHEET_IMPORT'
          ? 'SCORESHEET_IMPORT'
          : (normalizedContextType || (criterionId ? 'CRITERION_COMMENT' : (contestantId ? 'CONTESTANT' : 'CATEGORY'))),
        criterionId: criterionId || null,
        noteText: notes || null,
        intent: normalizedIntent,
        templateKey: normalizedIntent === 'SCORESHEET_IMPORT' && typeof templateKey === 'string'
          ? templateKey
          : null,
      };

      const scoreFile = await this.scoreFileService.uploadScoreFile(
        {
          categoryId,
          judgeId: actingJudge.judgeId,
          contestantId,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          filePath: relativeFilePath,
          fileSize: req.file.size,
          notes: JSON.stringify(contextMetadata),
          tenantId: req.user.tenantId,
          entryMode: actingJudge.entryMode,
          delegationGrantId: actingJudge.delegationGrantId,
        },
        req.user.id,
        timeoutMs,
      );

      log.info('Score file uploaded', { categoryId, judgeId: actingJudge.judgeId, fileId: scoreFile.id });
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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const id = getRequiredParam(req, 'id');

      const file = await this.scoreFileService.getScoreFileById(
        id,
        req.user.tenantId,
        createCommentaryViewerContext(req.user),
      );

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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const categoryId = getRequiredParam(req, 'categoryId');

      const files = await this.scoreFileService.getScoreFilesByCategory(
        categoryId,
        req.user.tenantId,
        createCommentaryViewerContext(req.user),
      );

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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const judgeId = getRequiredParam(req, 'judgeId');

      const files = await this.scoreFileService.getScoreFilesByJudge(
        judgeId,
        req.user.tenantId,
        createCommentaryViewerContext(req.user),
      );

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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const contestantId = getRequiredParam(req, 'contestantId');

      const files = await this.scoreFileService.getScoreFilesByContestant(
        contestantId,
        req.user.tenantId,
        createCommentaryViewerContext(req.user),
      );

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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { categoryId, judgeId, contestantId, status, criterionId, contextType } = req.query;

      const files = await this.scoreFileService.getAllScoreFiles(
        req.user.tenantId,
        {
          categoryId: categoryId as string | undefined,
          judgeId: judgeId as string | undefined,
          contestantId: contestantId as string | undefined,
          status: status as string | undefined
        },
        createCommentaryViewerContext(req.user),
      );

      const filteredFiles = files.filter((file: any) => {
        if (criterionId && file?.metadata?.criterionId !== criterionId) return false;
        if (contextType && file?.metadata?.contextType !== contextType) return false;
        return true;
      });

      log.info('All score files retrieved', { count: filteredFiles.length });
      sendSuccess(res, filteredFiles);
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
        req.user.role,
        getOfflineWriteTimeoutMs(
          matchOfflineWriteOwnershipRoute(req.method, req.originalUrl || req.path),
        ),
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
        req.user.role,
        getOfflineWriteTimeoutMs(
          matchOfflineWriteOwnershipRoute(req.method, req.originalUrl || req.path),
        ),
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

      const fileInfo = await this.scoreFileService.getScoreFileById(
        id,
        req.user.tenantId,
        createCommentaryViewerContext(req.user),
      );

      if (!fileInfo) {
        sendError(res, 'Score file not found', 404);
        return;
      }

      // Set headers for file download
      res.setHeader('Content-Type', fileInfo.fileType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);

      // Stream the file
      const resolvedPath = path.isAbsolute(fileInfo.filePath)
        ? fileInfo.filePath
        : path.join(process.cwd(), fileInfo.filePath.replace(/^\/+/, ''));
      const fileStream = await fs.readFile(resolvedPath);
      res.send(fileStream);

      log.info('Score file downloaded', { id });
    } catch (error) {
      log.error('Download score file error', { error: (error as Error).message });
      return next(error);
    }
  };

  processScoresheetImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const id = getRequiredParam(req, 'id');
      const requestedTemplateKey = typeof req.body?.templateKey === 'string' ? req.body.templateKey : undefined;
      const draft = await this.scoreSheetImportService.processScoreFile(
        id,
        req.user.tenantId,
        requestedTemplateKey ? { templateKey: requestedTemplateKey } : undefined,
      );

      log.info('Scoresheet import processed', { scoreFileId: id, draftId: draft.id, status: draft.status });
      sendSuccess(res, draft, 'Scoresheet import processed');
    } catch (error) {
      log.error('Process scoresheet import error', { error: (error as Error).message });
      return next(error);
    }
  };

  getScoresheetImportDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoreFile');
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const id = getRequiredParam(req, 'id');
      const draft = await this.scoreSheetImportService.getDraftByScoreFileId(id, req.user.tenantId);

      if (!draft) {
        sendError(res, 'Scoresheet import draft not found', 404);
        return;
      }

      log.info('Scoresheet import draft retrieved', { scoreFileId: id, draftId: draft.id });
      sendSuccess(res, draft);
    } catch (error) {
      log.error('Get scoresheet import draft error', { error: (error as Error).message });
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
export const processScoresheetImport = controller.processScoresheetImport;
export const getScoresheetImportDraft = controller.getScoresheetImportDraft;
